'use client';

import { normalizeGoal, normalizeGoalCategory } from '@superapp/shared/insights';
import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, getToday } from '@superapp/shared/helpers';
import {
  Target, Plus, CheckCircle2, BarChart2, Flame, Check,
  Trash2, X, Star, Briefcase, Dumbbell, Wallet, BookOpen, Heart
} from 'lucide-react';
import { useLanguage } from '@superapp/shared/language';

export default function GoalsPage() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();

  const { t } = useLanguage();
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Personal', targetDate: '', milestones: [], completed: false
  });
  const [newMilestone, setNewMilestone] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData(STORAGE_KEYS.GOALS).then(saved => {
      if (saved && Array.isArray(saved)) setGoals(saved.map(normalizeGoal));
      setLoading(false);
    });
  }, []);

  const save = (g) => { const normalized = g.map(normalizeGoal); setGoals(normalized); setData(STORAGE_KEYS.GOALS, normalized); };

  const openAdd = () => {
    setEditGoal(null);
    setForm({ title: '', description: '', category: 'Personal', targetDate: '', milestones: [], completed: false });
    setNewMilestone('');
    setShowModal(true);
  };

  const CATEGORY_MAP_TO_WEB = {
    personal: translateCopy("Personal"),
    career: translateCopy("Karir"),
    health: translateCopy("Kesehatan"),
    finance: translateCopy("Keuangan"),
    education: 'Edukasi',
    relationship: translateCopy("Hubungan"),
    other: translateCopy("Personal"),
  };

  const openEdit = (goal) => {
    setEditGoal(goal);
    const cat = CATEGORY_MAP_TO_WEB[normalizeGoalCategory(goal.category)] || goal.category || translateCopy("Personal");
    setForm({ ...goal, category: cat });
    setNewMilestone('');
    setShowModal(true);
  };

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setForm({ ...form, milestones: [...form.milestones, { id: generateId(), text: newMilestone.trim(), done: false }] });
    setNewMilestone('');
  };

  const toggleMilestone = (goalId, msId) => {
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, milestones: g.milestones.map(m => m.id === msId ? { ...m, done: !m.done } : m) };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editGoal) {
      save(goals.map(g => g.id === editGoal.id ? { ...g, ...form } : g));
    } else {
      save([{ ...form, id: generateId(), createdAt: new Date().toISOString() }, ...goals]);
    }
    setShowModal(false);
  };

  const deleteGoal = (id) => save(goals.filter(g => g.id !== id));
  const completeGoal = (id) => save(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));

  const toggleArchive = (id) => save(goals.map(g => g.id === id ? { ...g, archived: !g.archived } : g));
  const archived = goals.filter(g => g.archived);
  const active = goals.filter(g => !g.completed && !g.archived);
  const completed = goals.filter(g => g.completed && !g.archived);

  const getProgress = (goal) => normalizeGoal(goal).progress;

  const CATEGORIES = [translateCopy("Personal"), translateCopy("Karir"), translateCopy("Kesehatan"), translateCopy("Keuangan"), 'Edukasi', translateCopy("Hubungan")];
  const CAT_EMOJIS = { Personal: '🌟', Karir: '💼', Kesehatan: '💪', Keuangan: '💰', Edukasi: '📚', Hubungan: '❤️' };
  const CAT_ICONS = {
    personal: <Star size={14} />,
    career: <Briefcase size={14} />,
    health: <Dumbbell size={14} />,
    finance: <Wallet size={14} />,
    education: <BookOpen size={14} />,
    relationship: <Heart size={14} />,
    other: <Star size={14} />,
    Personal: <Star size={14} />,
    Karir: <Briefcase size={14} />,
    Kesehatan: <Dumbbell size={14} />,
    Keuangan: <Wallet size={14} />,
    Edukasi: <BookOpen size={14} />,
    Hubungan: <Heart size={14} />,
  };

  const getCategoryDisplay = (cat) => {
    const key = normalizeGoalCategory(cat);
    const translated = t(`goals.cat_${key}`);
    if (translated && !translated.startsWith('cat_') && translated !== `goals.cat_${key}`) {
      return translated;
    }
    const clean = cat ? String(cat).replace(/^cat_/, '') : translateCopy("Personal");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        {translateCopy("Memuat data goals...")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={32} color="var(--accent-purple)" /> {t('goals.title')}</h1>
            <p>{t('goals.desc')}</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('goals.add_goal')}</button>
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(25, 63, 48, 0.15)', color: 'var(--accent-purple)' }}><Target size={28} /></div>
          <div className="stat-info">
            <h3>{active.length}</h3>
            <p>{t('goals.active_goals')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><CheckCircle2 size={28} /></div>
          <div className="stat-info">
            <h3>{completed.length}</h3>
            <p>{t('goals.completed_goals')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><BarChart2 size={28} /></div>
          <div className="stat-info">
            <h3>{active.length + completed.length > 0 ? Math.round([...active, ...completed].reduce((s, g) => s + getProgress(g), 0) / (active.length + completed.length)) : 0}%</h3>
            <p>{t('goals.avg_progress')}</p>
          </div>
        </div>
      </div>

      {/* Active Goals */}
      {active.length > 0 && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame size={20} color="var(--accent-red)" /> {t('goals.active_goals')}</h2>
          <div className="grid-auto">
            {active.map(goal => {
              const progress = getProgress(goal);
              return (
                <div key={goal.id} className="card card-padding" style={{ cursor: 'pointer' }} onClick={() => openEdit(goal)}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {CAT_ICONS[normalizeGoalCategory(goal.category)] || <Target size={14} />} {getCategoryDisplay(goal.category)}
                    </span>
                    <div className="flex gap-1">
                      <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); toggleArchive(goal.id); }}>{translateCopy("Arsipkan")}</button>
                      <button className="btn btn-success btn-icon sm" onClick={(e) => { e.stopPropagation(); completeGoal(goal.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} /></button>
                      <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1" style={{ fontSize: '16px' }}>{goal.title}</h3>
                  {goal.description && <p className="text-sm text-secondary mb-2">{goal.description}</p>}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">{t('goals.progress')}</span>
                    <span className="text-xs font-semibold">{progress}%</span>
                  </div>
                  <div className="progress-bar mb-2">
                    <div className="progress-fill green" style={{ width: `${progress}%` }} />
                  </div>
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="text-xs text-muted">
                      {goal.milestones.filter(m => m.done).length}/{goal.milestones.length} {t('goals.milestones_count')}
                    </div>
                  )}
                  {goal.targetDate && (
                    <div className="text-xs text-muted mt-1" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={12} /> {t('goals.target')} {formatDate(goal.targetDate, uiLanguage)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={20} color="var(--accent-green)" /> {t('goals.completed_text')}</h2>
          <div className="grid-auto">
            {completed.map(goal => (
              <div key={goal.id} className="card card-padding" style={{ opacity: 0.7 }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> {t('goals.completed')}</span>
                  <button className="btn btn-danger btn-icon sm" onClick={() => deleteGoal(goal.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                </div>
                <h3 className="font-semibold" style={{ textDecoration: 'line-through', fontSize: '16px' }}>{goal.title}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {archived.length > 0 && <section className="card card-padding mb-3"><h2>{translateCopy("Arsip tujuan")}</h2>{archived.map(goal => <div className="summary-row" key={goal.id}><span>{goal.title}</span><button className="btn btn-secondary btn-sm" onClick={() => toggleArchive(goal.id)}>{translateCopy("Pulihkan")}</button></div>)}</section>}

      {goals.length === 0 && (
        <div className="card card-padding">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Target size={48} color="var(--accent-purple)" /></div>
            <h3>{t('goals.no_goals_yet')}</h3>
            <p>{t('goals.start_journey')}</p>
            <button className="btn btn-primary mt-2" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('goals.add_goal')}</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editGoal ? t('goals.edit_goal') : t('goals.new_goal')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('goals.goal_title')}</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('goals.goal_title_placeholder')} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('goals.description')}</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder={t('goals.description_placeholder')} style={{ minHeight: '80px' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('goals.category')}</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('goals.target_date')}</label>
                    <input type="date" className="form-input" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('goals.milestones')}</label>
                  {form.milestones.map((ms, i) => (
                    <div key={ms.id} className="flex items-center gap-1 mb-1">
                      <div className={`checkbox ${ms.done ? 'checked' : ''}`}
                        onClick={() => {
                          const updated = [...form.milestones];
                          updated[i] = { ...updated[i], done: !updated[i].done };
                          setForm({...form, milestones: updated});
                        }}>
                        {ms.done ? <Check size={12} strokeWidth={3} /> : ''}
                      </div>
                      <span className="text-sm flex-1" style={{ textDecoration: ms.done ? 'line-through' : 'none' }}>{ms.text}</span>
                      <button type="button" className="btn btn-danger btn-icon sm"
                        onClick={() => setForm({...form, milestones: form.milestones.filter((_, j) => j !== i)})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                    </div>
                  ))}
                  <div className="form-inline mt-1">
                    <input className="form-input" value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                      placeholder={t('goals.add_milestone')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); }}} />
                    <button type="button" className="btn btn-secondary" onClick={addMilestone} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('goals.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editGoal ? t('goals.save') : t('goals.create_goal')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
