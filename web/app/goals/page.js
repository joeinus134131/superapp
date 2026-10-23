'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import {
  ensureArray,
  EXPENSE_CATEGORIES,
  formatDate,
  generateId,
  getToday,
  INCOME_CATEGORIES,
} from '@superapp/shared/helpers';
import {
  GOAL_SOURCES,
  GOAL_TEMPLATES,
  GOAL_TYPE_INFO,
  GOAL_TYPES,
  GOAL_UNITS,
  NUMERIC_GOAL_TYPES,
  addGoalEntry,
  addMonths,
  createGoal,
  formatCompactValue,
  formatGoalValue,
  getGoalSnapshot,
  getJourneyStops,
  getRecoveryOptions,
  goalFromTemplate,
  inferGoalFromTitle,
  isLinkedGoal,
  markCelebrated,
  migrateGoal,
  migrateGoals,
  normalizeGoalCategory,
  parseGoalAmount,
  pendingCelebrations,
  pickNextGoalAction,
  removeGoalEntry,
  saveGoalReview,
  setGoalStatus,
  simulateGoal,
  sortGoals,
  toggleGoalMilestone,
  withCachedProgress,
} from '@superapp/shared/goals';
import { addXP, checkAchievements } from '@superapp/shared/gamification';
import { useLanguage } from '@superapp/shared/language';
import { Scene, ProgressRing } from '@/components/WhenyaVisuals';
import Confetti from '@/components/Confetti';
import {
  Target,
  Plus,
  CheckCircle2,
  BarChart2,
  Flame,
  Check,
  Trash2,
  X,
  Star,
  Briefcase,
  Dumbbell,
  Wallet,
  BookOpen,
  Heart,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Calculator,
  Calendar,
  Mail,
  Link2,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STATUS_LABELS = {
  ahead: 'Lebih cepat',
  on_track: 'Sesuai jadwal',
  behind: 'Tertinggal',
  at_risk: 'Perlu perhatian',
  overdue: 'Lewat tenggat',
  no_deadline: 'Tanpa tenggat',
  paused: 'Dijeda',
  completed: 'Tercapai',
};

const SIMPLE_MODES = [
  { id: 'save', idLabel: 'Tabungan', enLabel: 'Savings', type: 'accumulate', unit: 'IDR', category: 'finance' },
  { id: 'debt', idLabel: 'Cicilan', enLabel: 'Payoff', type: 'payoff', unit: 'IDR', category: 'finance' },
  { id: 'metric', idLabel: 'Target Angka', enLabel: 'Number Target', type: 'increase', unit: 'times', category: 'personal' },
  { id: 'steps', idLabel: 'Tahapan', enLabel: 'Checklist', type: 'milestone', unit: 'custom', category: 'personal' },
];

const QUICK_DELTAS = {
  IDR: [
    { label: '+100rb', enLabel: '+100k', value: 100_000 },
    { label: '+500rb', enLabel: '+500k', value: 500_000 },
    { label: '+1jt', enLabel: '+1M', value: 1_000_000 },
  ],
  kg: [
    { label: '-0.5 kg', value: 0.5 },
    { label: '-1 kg', value: 1 },
  ],
  km: [
    { label: '+3 km', value: 3 },
    { label: '+5 km', value: 5 },
  ],
  book: [{ label: '+1', value: 1 }],
  hour: [
    { label: '+1', value: 1 },
    { label: '+2', value: 2 },
  ],
  day: [{ label: '+1', value: 1 }],
  times: [
    { label: '+1', value: 1 },
    { label: '+5', value: 5 },
  ],
  custom: [
    { label: '+1', value: 1 },
    { label: '+5', value: 5 },
  ],
};

function defaultForm() {
  return {
    title: '',
    description: '',
    why: '',
    identity: '',
    category: 'finance',
    type: 'accumulate',
    unit: 'IDR',
    startValue: '0',
    targetValue: '100000000',
    startDate: getToday(),
    targetDate: addMonths(getToday(), 12),
    pinned: false,
    parentId: '',
    source: { kind: 'manual' },
    milestones: [],
    futureLetterText: '',
  };
}

function modeFromType(type) {
  if (type === 'accumulate') return 'save';
  if (type === 'payoff') return 'debt';
  if (['increase', 'decrease', 'consistency'].includes(type)) return 'metric';
  return 'steps';
}

export default function GoalsPage() {
  const { tx: translateCopy, language: uiLanguage, t } = useLanguage();
  const copy = (id, en) => (uiLanguage === 'id' ? id : en);
  const [goals, setGoals] = useState([]);
  const [ctxData, setCtxData] = useState({
    habits: [],
    books: [],
    pomodoro: { sessions: [] },
    health: { workouts: [], weights: [] },
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [newMilestone, setNewMilestone] = useState('');

  const [quickLogGoal, setQuickLogGoal] = useState(null);
  const [logForm, setLogForm] = useState({ amount: '', kind: 'add', date: getToday(), note: '' });

  const [detailGoalId, setDetailGoalId] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [simForm, setSimForm] = useState({ perMonth: '', annualReturn: '6' });
  const [reviewForm, setReviewForm] = useState({ note: '', commitment: '' });

  const [showConfetti, setShowConfetti] = useState(false);
  const [banner, setBanner] = useState('');

  const loadAll = useCallback(async () => {
    const [savedGoals, habits, books, pomodoro, health, transactions] = await Promise.all([
      getData(STORAGE_KEYS.GOALS),
      getData(STORAGE_KEYS.HABITS),
      getData(STORAGE_KEYS.READING),
      getData(STORAGE_KEYS.POMODORO),
      getData(STORAGE_KEYS.HEALTH),
      getData(STORAGE_KEYS.TRANSACTIONS),
    ]);
    const nextCtx = {
      habits: ensureArray(habits),
      books: ensureArray(books),
      pomodoro: pomodoro || { sessions: [] },
      health: health || { workouts: [], weights: [] },
      transactions: ensureArray(transactions),
    };
    const migrated = migrateGoals(ensureArray(savedGoals));
    const fullCtx = { ...nextCtx, goals: migrated };
    setCtxData(nextCtx);
    setGoals(migrated.map(g => withCachedProgress(g, fullCtx)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    window.addEventListener('storage_update', loadAll);
    window.addEventListener('whenya:data-synced', loadAll);
    return () => {
      window.removeEventListener('storage_update', loadAll);
      window.removeEventListener('whenya:data-synced', loadAll);
    };
  }, [loadAll]);

  const fullCtx = useMemo(() => ({ ...ctxData, goals }), [ctxData, goals]);

  const persistGoals = useCallback(async (nextGoals, celebrationGoalId = null) => {
    const localCtx = { ...ctxData, goals: nextGoals };
    let confettiTriggered = false;
    let toastMessage = '';

    const updated = nextGoals.map(raw => {
      let g = migrateGoal(raw);
      const snap = getGoalSnapshot(g, localCtx);
      g = { ...g, progress: snap.percent };

      if (celebrationGoalId && g.id === celebrationGoalId) {
        const newlyReached = pendingCelebrations(g, snap);
        if (newlyReached.length > 0) {
          g = markCelebrated(g, newlyReached);
          confettiTriggered = true;
          const highest = newlyReached[newlyReached.length - 1];
          if (highest === 100) {
            addXP('GOAL_COMPLETE');
            toastMessage = translateCopy('Selamat! Tujuan "{0}" mencapai 100%! (+100 XP)', [g.title]);
          } else {
            addXP('GOAL_CHECKPOINT');
            toastMessage = translateCopy('Checkpoint {0}% tercapai untuk "{1}"! (+35 XP)', [highest, g.title]);
          }
        }
      }
      return g;
    });

    setGoals(updated);
    await setData(STORAGE_KEYS.GOALS, updated);
    window.dispatchEvent(new Event('storage_update'));
    checkAchievements();

    if (confettiTriggered) setShowConfetti(true);
    if (toastMessage) {
      setBanner(toastMessage);
      setTimeout(() => setBanner(''), 4000);
    }
  }, [ctxData, translateCopy]);

  const CAT_ICONS = {
    personal: <Star size={13} />,
    career: <Briefcase size={13} />,
    health: <Dumbbell size={13} />,
    finance: <Wallet size={13} />,
    education: <BookOpen size={13} />,
    relationship: <Heart size={13} />,
    other: <Star size={13} />,
  };

  const getCategoryDisplay = (cat) => {
    const key = normalizeGoalCategory(cat);
    const translated = t(`goals.cat_${key}`);
    if (translated && !translated.startsWith('cat_') && translated !== `goals.cat_${key}`) {
      return translated;
    }
    const labels = {
      personal: translateCopy('Personal'),
      career: translateCopy('Karir'),
      health: translateCopy('Kesehatan'),
      finance: translateCopy('Keuangan'),
      education: translateCopy('Edukasi'),
      relationship: translateCopy('Hubungan'),
      other: translateCopy('Lainnya'),
    };
    return labels[key] || translateCopy('Personal');
  };

  const openAdd = (template = null) => {
    setEditGoal(null);
    setShowAdvanced(false);
    if (template) {
      const tpl = goalFromTemplate(template, fullCtx);
      setForm({
        ...defaultForm(),
        ...tpl,
        title: translateCopy(tpl.title),
        why: translateCopy(tpl.why),
        startValue: String(tpl.startValue ?? 0),
        targetValue: String(tpl.targetValue ?? 0),
        milestones: (tpl.milestones || []).map(m => ({ ...m, text: translateCopy(m.text) })),
      });
    } else {
      setForm(defaultForm());
    }
    setNewMilestone('');
    setShowFormModal(true);
  };

  const openEdit = (goal) => {
    setEditGoal(goal);
    setShowAdvanced(false);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      why: goal.why || '',
      identity: goal.identity || '',
      category: normalizeGoalCategory(goal.category),
      type: goal.type || 'milestone',
      unit: goal.unit || 'IDR',
      startValue: String(goal.startValue ?? 0),
      targetValue: String(goal.targetValue ?? 0),
      startDate: goal.startDate || getToday(),
      targetDate: goal.targetDate || '',
      pinned: !!goal.pinned,
      parentId: goal.parentId || '',
      source: goal.source || { kind: 'manual' },
      milestones: goal.milestones || [],
      futureLetterText: goal.futureLetter?.text || '',
    });
    setNewMilestone('');
    setShowFormModal(true);
  };

  const handleSimpleModeSelect = (mode) => {
    setForm(prev => ({
      ...prev,
      type: mode.type,
      unit: mode.unit,
      category: mode.category,
      startValue: mode.type === 'payoff' ? (prev.startValue === '0' ? '15000000' : prev.startValue) : '0',
      targetValue: mode.type === 'payoff' ? '0' : mode.unit === 'IDR' ? '100000000' : '12',
    }));
  };

  const handleTitleChange = (nextTitle) => {
    const inferred = !editGoal ? inferGoalFromTitle(nextTitle) : null;
    if (inferred) {
      setForm(prev => ({
        ...prev,
        title: nextTitle,
        type: inferred.type,
        unit: inferred.unit,
        category: inferred.category || prev.category,
        startValue: inferred.startValue !== undefined ? String(inferred.startValue) : prev.startValue,
        targetValue: inferred.targetValue !== undefined ? String(inferred.targetValue) : prev.targetValue,
        source: inferred.source || prev.source,
      }));
    } else {
      setForm(prev => ({ ...prev, title: nextTitle }));
    }
  };

  const addMilestoneToForm = () => {
    if (!newMilestone.trim()) return;
    setForm(prev => ({
      ...prev,
      milestones: [...prev.milestones, { id: generateId(), text: newMilestone.trim(), done: false, weight: 1 }],
    }));
    setNewMilestone('');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const isNumeric = NUMERIC_GOAL_TYPES.includes(form.type);
    const parsedStart = isNumeric ? parseGoalAmount(form.startValue) : 0;
    const parsedTarget = isNumeric ? parseGoalAmount(form.targetValue) : 100;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      why: form.why.trim(),
      identity: form.identity.trim(),
      category: normalizeGoalCategory(form.category),
      type: form.type,
      unit: form.unit,
      startValue: Number.isFinite(parsedStart) ? parsedStart : 0,
      targetValue: Number.isFinite(parsedTarget) ? parsedTarget : 0,
      startDate: form.startDate || getToday(),
      targetDate: form.targetDate || '',
      pinned: !!form.pinned,
      parentId: form.parentId || null,
      source: form.source || { kind: 'manual' },
      milestones: form.milestones,
      futureLetter: form.futureLetterText.trim()
        ? { text: form.futureLetterText.trim(), writtenAt: editGoal?.futureLetter?.writtenAt || new Date().toISOString() }
        : null,
    };

    if (editGoal) {
      const next = goals.map(g => (g.id === editGoal.id ? migrateGoal({ ...g, ...payload, updatedAt: new Date().toISOString() }) : g));
      persistGoals(next, editGoal.id);
    } else {
      const created = createGoal(payload);
      persistGoals([created, ...goals], created.id);
    }
    setShowFormModal(false);
  };

  // Instant 1-tap progress increment right from the card — no modal required!
  const handleInstantAdd = (goal, deltaValue) => {
    const updatedGoal = addGoalEntry(goal, {
      amount: deltaValue,
      kind: 'add',
      date: getToday(),
      note: '',
    });
    addXP('GOAL_LOG');
    persistGoals(goals.map(g => (g.id === goal.id ? updatedGoal : g)), goal.id);
  };

  const openQuickLog = (goal, presetDelta = null) => {
    setQuickLogGoal(goal);
    setLogForm({
      amount: presetDelta !== null ? String(presetDelta) : '',
      kind: goal.type === 'decrease' ? 'set' : 'add',
      date: getToday(),
      note: '',
    });
  };

  const handleQuickLogSubmit = (e) => {
    e.preventDefault();
    if (!quickLogGoal) return;
    const parsed = parseGoalAmount(logForm.amount);
    if (!Number.isFinite(parsed)) return;
    const updatedGoal = addGoalEntry(quickLogGoal, {
      amount: parsed,
      kind: logForm.kind,
      date: logForm.date || getToday(),
      note: logForm.note,
    });
    addXP('GOAL_LOG');
    persistGoals(goals.map(g => (g.id === quickLogGoal.id ? updatedGoal : g)), quickLogGoal.id);
    setQuickLogGoal(null);
  };

  const handleToggleMilestone = (goalId, msId) => {
    const next = goals.map(g => (g.id === goalId ? toggleGoalMilestone(g, msId) : g));
    persistGoals(next, goalId);
  };

  const handleStatusChange = (goalId, status) => {
    const next = goals.map(g => (g.id === goalId ? setGoalStatus(g, status) : g));
    persistGoals(next, status === 'completed' ? goalId : null);
  };

  const handleDeleteGoal = (id) => {
    if (detailGoalId === id) setDetailGoalId(null);
    persistGoals(goals.filter(g => g.id !== id));
  };

  const handleRemoveEntry = (goalId, entryId) => {
    const next = goals.map(g => (g.id === goalId ? removeGoalEntry(g, entryId) : g));
    persistGoals(next);
  };

  const applyRecovery = (goal, patch) => {
    const next = goals.map(g => (g.id === goal.id ? migrateGoal({ ...g, ...patch, updatedAt: new Date().toISOString() }) : g));
    persistGoals(next, goal.id);
  };

  const handleSaveReview = (e, goal) => {
    e.preventDefault();
    if (!reviewForm.note.trim() && !reviewForm.commitment.trim()) return;
    const updated = saveGoalReview(goal, reviewForm);
    addXP('GOAL_REVIEW');
    persistGoals(goals.map(g => (g.id === goal.id ? updated : g)));
    setReviewForm({ note: '', commitment: '' });
  };

  const activeGoals = useMemo(
    () => sortGoals(goals.filter(g => g.status === 'active' || g.status === 'paused'), fullCtx),
    [goals, fullCtx],
  );
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);
  const archivedGoals = useMemo(() => goals.filter(g => g.status === 'archived'), [goals]);

  const filteredGoals = useMemo(
    () => (activeTab === 'completed' ? completedGoals : activeTab === 'archived' ? archivedGoals : activeGoals),
    [activeTab, activeGoals, completedGoals, archivedGoals],
  );

  const avgProgress = useMemo(() => {
    const pool = [...activeGoals, ...completedGoals];
    if (!pool.length) return 0;
    return Math.round(pool.reduce((sum, g) => sum + getGoalSnapshot(g, fullCtx).percent, 0) / pool.length);
  }, [activeGoals, completedGoals, fullCtx]);

  const onTrackCount = useMemo(
    () => activeGoals.filter(g => ['ahead', 'on_track'].includes(getGoalSnapshot(g, fullCtx).status)).length,
    [activeGoals, fullCtx],
  );

  const nextBest = useMemo(() => pickNextGoalAction(goals, fullCtx), [goals, fullCtx]);
  const detailGoal = useMemo(() => goals.find(g => g.id === detailGoalId) || null, [goals, detailGoalId]);
  const detailSnap = useMemo(
    () => (detailGoal ? getGoalSnapshot(detailGoal, fullCtx) : null),
    [detailGoal, fullCtx],
  );

  useEffect(() => {
    if (detailGoal && detailSnap?.isNumeric) {
      const suggested = detailSnap.requiredPerMonth
        ? Math.ceil(detailSnap.requiredPerMonth)
        : detailSnap.velocityPerDay > 0
          ? Math.round(detailSnap.velocityPerDay * 30)
          : 0;
      setSimForm(prev => ({ ...prev, perMonth: suggested ? String(suggested) : prev.perMonth || '1000000' }));
    }
  }, [detailGoalId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allFinanceCategories = useMemo(
    () => [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES],
    [],
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-purple)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        {translateCopy('Memuat data goals...')}
      </div>
    );
  }

  const activeSimpleMode = modeFromType(form.type);

  return (
    <div>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <div className="page-header">
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={28} color="#193f30" /> {t('goals.title')}
            </h1>
            <p>{t('goals.desc')}</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => openAdd(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> {t('goals.add_goal')}
          </button>
        </div>
      </div>

      {banner && (
        <div
          className="wy-goal-focus"
          role="status"
          style={{ borderColor: '#b78e51', background: '#fdf9ef', marginBottom: '16px' }}
        >
          <div className="flex items-center gap-1">
            <Sparkles size={18} color="#b78e51" />
            <strong style={{ fontSize: '13px', color: '#193f30' }}>{banner}</strong>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setBanner('')}>
            {translateCopy('Tutup')}
          </button>
        </div>
      )}

      {/* Clean 3-stat overview */}
      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eaf1e7', color: '#193f30' }}>
            <Target size={22} />
          </div>
          <div className="stat-info">
            <h3>{activeGoals.length}</h3>
            <p>{t('goals.active_goals')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff1e3', color: '#265339' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <h3>{onTrackCount}</h3>
            <p>{translateCopy('Sesuai jadwal')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fbefdc', color: '#b78e51' }}>
            <BarChart2 size={22} />
          </div>
          <div className="stat-info">
            <h3>{avgProgress}%</h3>
            <p>{t('goals.avg_progress')}</p>
          </div>
        </div>
      </div>

      {/* Next Best Action banner */}
      {nextBest && activeTab === 'active' && (
        <section className="wy-goal-focus" aria-label={translateCopy('Fokus tujuan hari ini')}>
          <div className="wy-goal-focus-meta">
            <span className="wy-overline">
              <Flame size={12} /> {translateCopy('LANGKAH PALING BERDAMPAK HARI INI')}
            </span>
            <h3>{translateCopy(nextBest.goal.title)}</h3>
            <p>
              {nextBest.snapshot.isNumeric ? (
                <>
                  {formatCompactValue(nextBest.snapshot.current, nextBest.goal.unit, uiLanguage, translateCopy)} /{' '}
                  {formatCompactValue(nextBest.snapshot.target, nextBest.goal.unit, uiLanguage, translateCopy)} (
                  {nextBest.snapshot.percent}%)
                  {nextBest.snapshot.requiredPerMonth !== null && (
                    <>
                      {' · '}
                      {translateCopy('Cukup')}{' '}
                      <strong>
                        {formatCompactValue(
                          nextBest.snapshot.requiredPerMonth,
                          nextBest.goal.unit,
                          uiLanguage,
                          translateCopy,
                        )}
                        /{translateCopy('bulan')}
                      </strong>
                    </>
                  )}
                </>
              ) : (
                <>
                  {nextBest.snapshot.percent}% ·{' '}
                  {translateCopy(nextBest.goal.milestones?.find(m => !m.done)?.text || 'Lanjutkan langkah berikutnya')}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-1" style={{ flexShrink: 0, flexWrap: 'wrap' }}>
            {nextBest.snapshot.isNumeric && !isLinkedGoal(nextBest.goal) && (
              <button className="btn btn-primary btn-sm" onClick={() => openQuickLog(nextBest.goal)}>
                <Plus size={14} /> {translateCopy('Catat progres')}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setDetailGoalId(nextBest.goal.id)}>
              {translateCopy('Buka detail')}
            </button>
          </div>
        </section>
      )}

      {/* Template starter strip when empty */}
      {goals.length === 0 && (
        <section className="wy-panel mb-3">
          <div className="wy-panel-heading">
            <div>
              <h2>{translateCopy('Mulai dalam 1 klik')}</h2>
              <p>{translateCopy('Pilih impianmu, target dan hitungannya langsung siap.')}</p>
            </div>
          </div>
          <div className="wy-template-strip">
            {GOAL_TEMPLATES.slice(0, 6).map(tpl => (
              <button key={tpl.id} type="button" className="wy-template-chip" onClick={() => openAdd(tpl)}>
                <strong>{translateCopy(tpl.title)}</strong>
                <small>
                  {tpl.targetValue ? formatCompactValue(tpl.targetValue, tpl.unit, uiLanguage, translateCopy) : translateCopy('Tahapan')}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Simple 3-tab bar */}
      <div className="tabs mb-2">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          {t('goals.active_goals')} ({activeGoals.length})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          {t('goals.completed_text')} ({completedGoals.length})
        </button>
        {archivedGoals.length > 0 && (
          <button
            className={`tab ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            {translateCopy('Arsip tujuan')} ({archivedGoals.length})
          </button>
        )}
      </div>

      {/* Clean, low-cognitive-load Goal Cards */}
      {filteredGoals.length === 0 ? (
        <div className="card card-padding">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Target size={44} color="#193f30" />
            </div>
            <h3>{t('goals.no_goals_yet')}</h3>
            <p>{t('goals.start_journey')}</p>
            <button
              className="btn btn-primary mt-2"
              onClick={() => openAdd(null)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> {t('goals.add_goal')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-auto mb-3">
          {filteredGoals.map(goal => {
            const snap = getGoalSnapshot(goal, fullCtx);
            const statusLabel = translateCopy(STATUS_LABELS[snap.status] || 'Sesuai jadwal');
            const quickChips = (QUICK_DELTAS[goal.unit] || QUICK_DELTAS.custom).slice(0, 2);

            return (
              <div
                key={goal.id}
                className="wy-goal-card"
                onClick={() => {
                  setDetailGoalId(goal.id);
                  setDetailTab('overview');
                }}
              >
                <div className="wy-goal-card-head">
                  <Scene category={normalizeGoalCategory(goal.category)} />
                  <div className="wy-goal-card-body">
                    <div className="wy-goal-card-top">
                      <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {CAT_ICONS[normalizeGoalCategory(goal.category)] || <Target size={12} />}
                        {getCategoryDisplay(goal.category)}
                      </span>
                      <span className={`wy-status-pill ${snap.status}`}>{statusLabel}</span>
                    </div>
                    <h3>{translateCopy(goal.title)}</h3>
                    {(goal.why || goal.description) && (
                      <p className="wy-goal-why">{translateCopy(goal.why || goal.description)}</p>
                    )}
                  </div>
                </div>

                {/* Big clear progress number + bar */}
                <div>
                  <div className="wy-goal-numbers">
                    <strong>
                      {snap.isNumeric
                        ? `${formatCompactValue(snap.current, goal.unit, uiLanguage, translateCopy)} / ${formatCompactValue(snap.target, goal.unit, uiLanguage, translateCopy)}`
                        : `${(goal.milestones || []).filter(m => m.done).length}/${(goal.milestones || []).length} ${t('goals.milestones_count')}`}
                    </strong>
                    <small style={{ fontWeight: 700, color: '#193f30' }}>{snap.percent}%</small>
                  </div>
                  <div className="wy-progress-track" style={{ height: '7px', marginTop: '6px' }}>
                    <i style={{ width: `${snap.percent}%` }} />
                  </div>
                </div>

                {/* Single human-friendly summary line instead of 4 boxes */}
                <div className="wy-goal-subline">
                  <span>
                    {snap.requiredPerMonth !== null ? (
                      <>
                        {translateCopy('Cukup')}{' '}
                        <b>
                          {formatCompactValue(snap.requiredPerMonth, goal.unit, uiLanguage, translateCopy)}/
                          {translateCopy('bulan')}
                        </b>
                      </>
                    ) : goal.targetDate ? (
                      <>
                        {t('goals.target')} <b>{formatDate(goal.targetDate, uiLanguage)}</b>
                      </>
                    ) : (
                      translateCopy('Ketuk kartu untuk rincian & simulasi')
                    )}
                  </span>
                  {snap.weekStreak > 0 && (
                    <span>
                      🔥 {snap.weekStreak} {translateCopy('minggu')}
                    </span>
                  )}
                </div>

                {/* 1-tap action bar */}
                <div className="wy-goal-card-actions" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                    {snap.isNumeric && !isLinkedGoal(goal) && goal.status === 'active' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => openQuickLog(goal)}
                      >
                        <Plus size={13} /> {translateCopy('Catat progres')}
                      </button>
                    )}
                    {!snap.isNumeric && (goal.milestones || []).some(m => !m.done) && (
                      <button
                        type="button"
                        className="wy-quick-chip"
                        onClick={() => {
                          const nextMs = goal.milestones.find(m => !m.done);
                          if (nextMs) handleToggleMilestone(goal.id, nextMs.id);
                        }}
                      >
                        ✓ {translateCopy(goal.milestones.find(m => !m.done)?.text)}
                      </button>
                    )}
                    {isLinkedGoal(goal) && (
                      <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Link2 size={11} /> {translateCopy(GOAL_SOURCES[goal.source.kind]?.label || 'Otomatis')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {goal.status !== 'completed' ? (
                      <button
                        type="button"
                        className="btn btn-success btn-icon sm"
                        aria-label={translateCopy('Tandai tercapai')}
                        onClick={() => handleStatusChange(goal.id, 'completed')}
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStatusChange(goal.id, 'active')}
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger btn-icon sm"
                      aria-label={translateCopy('Hapus tujuan')}
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clean Quick Log Modal — No Icons, Short Text */}
      {quickLogGoal && (
        <div className="modal-overlay" onClick={() => setQuickLogGoal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div>
                <h2>{copy('Update Progres', 'Update Progress')}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {translateCopy(quickLogGoal.title)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQuickLogGoal(null)}
              >
                {copy('Tutup', 'Close')}
              </button>
            </div>
            <form onSubmit={handleQuickLogSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <div className="wy-quick-chips">
                    {(QUICK_DELTAS[quickLogGoal.unit] || QUICK_DELTAS.custom).map(chip => (
                      <button
                        key={chip.label}
                        type="button"
                        className="wy-quick-chip"
                        onClick={() => setLogForm(prev => ({ ...prev, kind: 'add', amount: String(chip.value) }))}
                      >
                        {uiLanguage === 'id' ? chip.label : (chip.enLabel || chip.label)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{copy('Jumlah', 'Amount')}</label>
                  <input
                    className="form-input"
                    value={logForm.amount}
                    onChange={e => setLogForm({ ...logForm, amount: e.target.value })}
                    placeholder={copy('Contoh: 500rb', 'e.g. 500000')}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{copy('Catatan', 'Note')}</label>
                  <input
                    className="form-input"
                    value={logForm.note}
                    onChange={e => setLogForm({ ...logForm, note: e.target.value })}
                    placeholder={copy('Opsional', 'Optional')}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setQuickLogGoal(null)}>
                  {t('goals.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('goals.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Detail / Update Modal — No Icons, Structured */}
      {detailGoal && detailSnap && (
        <div className="modal-overlay" onClick={() => setDetailGoalId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div>
                <h2>{translateCopy(detailGoal.title)}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {detailSnap.isNumeric
                    ? `${formatGoalValue(detailSnap.current, detailGoal.unit, uiLanguage, translateCopy)} / ${formatGoalValue(detailSnap.target, detailGoal.unit, uiLanguage, translateCopy)} (${detailSnap.percent}%)`
                    : `${detailSnap.percent}% · ${translateCopy(STATUS_LABELS[detailSnap.status] || 'Sesuai jadwal')}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const g = detailGoal;
                    setDetailGoalId(null);
                    openEdit(g);
                  }}
                >
                  {copy('Edit', 'Edit')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDetailGoalId(null)}
                >
                  {copy('Tutup', 'Close')}
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
              {detailGoal.why && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  {translateCopy(detailGoal.why)}
                </p>
              )}

              {/* Clean Progress Bar + 4 Checkpoints */}
              <div className="wy-panel mb-3" style={{ padding: '14px', background: '#fcfbf6' }}>
                <div className="wy-progress-track" style={{ height: '7px', marginBottom: '10px' }}>
                  <i style={{ width: `${detailSnap.percent}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#5c6b57' }}>
                  {getJourneyStops(detailGoal, detailSnap).map(stop => (
                    <span key={stop.percent} style={{ opacity: stop.reached ? 1 : 0.45 }}>
                      {stop.percent}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="tabs mb-2">
                <button
                  type="button"
                  className={`tab ${detailTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setDetailTab('overview')}
                >
                  {copy('Ringkasan', 'Summary')}
                </button>
                {detailSnap.isNumeric && (
                  <button
                    type="button"
                    className={`tab ${detailTab === 'simulator' ? 'active' : ''}`}
                    onClick={() => setDetailTab('simulator')}
                  >
                    {copy('Simulasi', 'Simulation')}
                  </button>
                )}
                <button
                  type="button"
                  className={`tab ${detailTab === 'review' ? 'active' : ''}`}
                  onClick={() => setDetailTab('review')}
                >
                  {copy('Catatan', 'Notes')}
                </button>
              </div>

              {detailTab === 'overview' && (
                <div>
                  {(detailGoal.milestones || []).length > 0 && (
                    <div className="mb-3">
                      <label className="form-label">{copy('Tahapan', 'Steps')}</label>
                      {(detailGoal.milestones || []).map(ms => (
                        <div
                          key={ms.id}
                          className="list-item flex justify-between items-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleMilestone(detailGoal.id, ms.id)}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 600, textDecoration: ms.done ? 'line-through' : 'none', opacity: ms.done ? 0.55 : 1 }}>
                            {translateCopy(ms.text)}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: ms.done ? '#2f6045' : '#8d9783' }}>
                            {ms.done ? translateCopy('Selesai') : copy('Belum', 'Pending')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {detailSnap.isNumeric && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="form-label" style={{ marginBottom: 0 }}>
                          {copy('Riwayat', 'History')}
                        </label>
                        {!isLinkedGoal(detailGoal) && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openQuickLog(detailGoal)}
                          >
                            {copy('Update Progres', 'Update Progress')}
                          </button>
                        )}
                      </div>
                      {(detailGoal.entries || []).length === 0 ? (
                        <p className="text-xs text-muted">
                          {copy('Belum ada riwayat.', 'No history yet.')}
                        </p>
                      ) : (
                        [...(detailGoal.entries || [])].reverse().slice(0, 15).map(entry => (
                          <div key={entry.id} className="list-item flex justify-between items-center">
                            <div>
                              <strong style={{ fontSize: '13px' }}>
                                {entry.kind === 'set' ? '= ' : '+ '}
                                {formatGoalValue(entry.amount, detailGoal.unit, uiLanguage, translateCopy)}
                              </strong>
                              <div className="text-xs text-muted">
                                {entry.date}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--accent-red)' }}
                              onClick={() => handleRemoveEntry(detailGoal.id, entry.id)}
                            >
                              {copy('Hapus', 'Delete')}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'simulator' && detailSnap.isNumeric && (() => {
                const perMonth = parseGoalAmount(simForm.perMonth) || 0;
                const annualReturn = Number(simForm.annualReturn) || 0;
                const sim = simulateGoal({
                  current: detailSnap.current,
                  target: detailSnap.target,
                  start: detailSnap.start,
                  perMonth,
                  annualReturn: detailGoal.unit === 'IDR' && detailGoal.type === 'accumulate' ? annualReturn : 0,
                });
                const recovery = getRecoveryOptions(detailGoal, detailSnap);

                return (
                  <div>
                    <div className="wy-panel mb-3" style={{ padding: '16px' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">{copy('Target per bulan', 'Monthly target')}</label>
                          <input
                            className="form-input"
                            value={simForm.perMonth}
                            onChange={e => setSimForm({ ...simForm, perMonth: e.target.value })}
                            placeholder={copy('2jt / 2000000', '2M / 2000000')}
                          />
                        </div>
                        {detailGoal.unit === 'IDR' && detailGoal.type === 'accumulate' && (
                          <div className="form-group">
                            <label className="form-label">{copy('Bunga / return tahunan (%)', 'Annual return (%)')}</label>
                            <input
                              type="number"
                              step="0.5"
                              className="form-input"
                              value={simForm.annualReturn}
                              onChange={e => setSimForm({ ...simForm, annualReturn: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#193f30', margin: 0 }}>
                        {sim.reachable
                          ? sim.months === 0
                            ? translateCopy('Target sudah tercapai!')
                            : translateCopy('Tercapai dalam {0} bulan ({1})', [
                                sim.months,
                                formatDate(sim.date, uiLanguage),
                              ])
                          : copy('Isi nominal bulanan untuk melihat estimasi.', 'Enter monthly amount to see estimate.')}
                      </p>
                    </div>

                    {recovery && (recovery.extendTo || recovery.reduceTargetTo !== null) && (
                      <div className="wy-panel" style={{ padding: '16px' }}>
                        <label className="form-label">{copy('Sesuaikan jadwal', 'Adjust schedule')}</label>
                        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                          {recovery.extendTo && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => applyRecovery(detailGoal, { targetDate: recovery.extendTo })}
                            >
                              {translateCopy('Geser tenggat ke {0}', [formatDate(recovery.extendTo, uiLanguage)])}
                            </button>
                          )}
                          {recovery.reduceTargetTo !== null && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => applyRecovery(detailGoal, { targetValue: recovery.reduceTargetTo })}
                            >
                              {translateCopy('Sesuaikan target ke {0}', [
                                formatCompactValue(recovery.reduceTargetTo, detailGoal.unit, uiLanguage, translateCopy),
                              ])}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {detailTab === 'review' && (
                <div>
                  <form onSubmit={e => handleSaveReview(e, detailGoal)} className="wy-panel" style={{ padding: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">{copy('Evaluasi singkat', 'Short review')}</label>
                      <textarea
                        className="form-textarea"
                        value={reviewForm.note}
                        onChange={e => setReviewForm({ ...reviewForm, note: e.target.value })}
                        placeholder={copy('Catatan progres minggu ini', 'Progress notes this week')}
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{copy('Langkah berikutnya', 'Next step')}</label>
                      <input
                        className="form-input"
                        value={reviewForm.commitment}
                        onChange={e => setReviewForm({ ...reviewForm, commitment: e.target.value })}
                        placeholder={copy('Opsional', 'Optional')}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {t('goals.save')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clean, Structured, Icon-Free Create / Edit Goal Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{editGoal ? copy('Edit Tujuan', 'Edit Goal') : copy('Tujuan Baru', 'New Goal')}</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFormModal(false)}
              >
                {copy('Tutup', 'Close')}
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                {/* 1. Jenis (4 clean text pills, no emojis/icons) */}
                <div className="form-group">
                  <label className="form-label">{copy('Jenis', 'Type')}</label>
                  <div className="wy-goal-mode-grid">
                    {SIMPLE_MODES.map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`wy-goal-mode-btn ${activeSimpleMode === mode.id ? 'active' : ''}`}
                        onClick={() => handleSimpleModeSelect(mode)}
                        style={{ justifyContent: 'center', textAlign: 'center', padding: '10px 12px' }}
                      >
                        <strong>{uiLanguage === 'id' ? mode.idLabel : mode.enLabel}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Nama Tujuan */}
                <div className="form-group">
                  <label className="form-label">{copy('Nama tujuan', 'Goal name')}</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder={copy('Contoh: Dana Darurat 30jt', 'e.g. Emergency Fund')}
                    autoFocus
                  />
                </div>

                {/* 3. Target */}
                {NUMERIC_GOAL_TYPES.includes(form.type) && (
                  <div className="form-row">
                    {form.type === 'payoff' || form.type === 'decrease' ? (
                      <div className="form-group">
                        <label className="form-label">{copy('Nilai awal', 'Starting value')}</label>
                        <input
                          className="form-input"
                          value={form.startValue}
                          onChange={e => setForm({ ...form, startValue: e.target.value })}
                          placeholder={copy('20jt', '20M')}
                        />
                      </div>
                    ) : null}
                    <div className="form-group">
                      <label className="form-label">{copy('Target', 'Target')}</label>
                      <input
                        className="form-input"
                        value={form.targetValue}
                        onChange={e => setForm({ ...form, targetValue: e.target.value })}
                        placeholder={copy('100jt', '100M')}
                      />
                    </div>
                    {activeSimpleMode === 'metric' && (
                      <div className="form-group">
                        <label className="form-label">{copy('Satuan', 'Unit')}</label>
                        <select
                          className="form-select"
                          value={form.unit}
                          onChange={e => setForm({ ...form, unit: e.target.value })}
                        >
                          {GOAL_UNITS.filter(u => !u.money).map(u => (
                            <option key={u.id} value={u.id}>
                              {translateCopy(u.label)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Batas Waktu */}
                <div className="form-group">
                  <label className="form-label">{copy('Batas waktu', 'Timeline')}</label>
                  <div className="wy-quick-chips mb-1">
                    {[
                      { label: '3 Bulan', months: 3 },
                      { label: '6 Bulan', months: 6 },
                      { label: '1 Tahun', months: 12 },
                      { label: '2 Tahun', months: 24 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        className="wy-quick-chip"
                        onClick={() => setForm(prev => ({ ...prev, targetDate: addMonths(getToday(), opt.months) }))}
                      >
                        {translateCopy(opt.label)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={form.targetDate}
                    onChange={e => setForm({ ...form, targetDate: e.target.value })}
                  />
                </div>

                {/* 5. Tahapan (only when mode === 'steps') */}
                {activeSimpleMode === 'steps' && (
                  <div className="form-group">
                    <label className="form-label">{copy('Daftar tahapan', 'Steps')}</label>
                    {form.milestones.map((ms, i) => (
                      <div key={ms.id} className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-sm flex-1">{ms.text}</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--accent-red)' }}
                          onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, j) => j !== i) })}
                        >
                          {copy('Hapus', 'Delete')}
                        </button>
                      </div>
                    ))}
                    <div className="form-inline mt-1">
                      <input
                        className="form-input"
                        value={newMilestone}
                        onChange={e => setNewMilestone(e.target.value)}
                        placeholder={copy('Tulis langkah…', 'Add a step…')}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMilestoneToForm();
                          }
                        }}
                      />
                      <button type="button" className="btn btn-secondary" onClick={addMilestoneToForm}>
                        {copy('Tambah', 'Add')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsible Extra Details */}
                <button
                  type="button"
                  className="wy-advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced
                    ? copy('Sembunyikan detail tambahan', 'Hide extra details')
                    : copy('Detail tambahan (opsional)', 'Extra details (optional)')}
                </button>

                {showAdvanced && (
                  <div style={{ paddingTop: '10px', borderTop: '1px solid #efefe5', marginTop: '6px' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{copy('Kategori', 'Category')}</label>
                        <select
                          className="form-select"
                          value={form.category}
                          onChange={e => setForm({ ...form, category: e.target.value })}
                        >
                          {['finance', 'career', 'health', 'education', 'personal', 'relationship', 'other'].map(c => (
                            <option key={c} value={c}>
                              {getCategoryDisplay(c)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {NUMERIC_GOAL_TYPES.includes(form.type) && (
                        <div className="form-group">
                          <label className="form-label">{copy('Sumber otomatis', 'Auto source')}</label>
                          <select
                            className="form-select"
                            value={form.source?.kind || 'manual'}
                            onChange={e => setForm({ ...form, source: { kind: e.target.value } })}
                          >
                            {Object.entries(GOAL_SOURCES)
                              .filter(([, meta]) => meta.types.includes(form.type))
                              .map(([key, meta]) => (
                                <option key={key} value={key}>
                                  {translateCopy(meta.label)}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">{copy('Catatan singkat', 'Short note')}</label>
                      <input
                        className="form-input"
                        value={form.why}
                        onChange={e => setForm({ ...form, why: e.target.value })}
                        placeholder={copy('Opsional', 'Optional')}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  {t('goals.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editGoal ? t('goals.save') : copy('Simpan Tujuan', 'Save Goal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
