'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckSquare, Flame, Plus, Target, Wallet, Eye, EyeOff, CalendarDays, NotebookPen, BarChart3, MoreHorizontal, Leaf, Sparkles, Clock, HeartPulse, BookOpen, Trophy, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from 'lucide-react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { summarizeLife, habitStreak } from '@superapp/shared/insights';
import { formatCompactValue, getGoalSnapshot, NUMERIC_GOAL_TYPES } from '@superapp/shared/goals';
import { formatCurrency, getToday, ensureArray } from '@superapp/shared/helpers';
import { useUser } from '@superapp/shared/auth';
import { Scene, ProgressRing, FinanceBars, WeekBars } from '@/components/WhenyaVisuals';
import { useLanguage } from "@superapp/shared/language";





export default function Dashboard() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();
  const copy = (id, en) => uiLanguage === 'id' ? id : en;
  const ALL_WEB_SHORTCUTS = [
    { key: 'habits', href: '/habits', Icon: Flame, label: translateCopy("Kebiasaan") },
    { key: 'journal', href: '/journal', Icon: NotebookPen, label: translateCopy("Jurnal") },
    { key: 'goals', href: '/goals', Icon: Target, label: translateCopy("Tujuan") },
    { key: 'calendar', href: '/calendar', Icon: CalendarDays, label: copy("Kalender", "Calendar") },
    { key: 'pomodoro', href: '/pomodoro', Icon: Clock, label: copy("Fokus", "Focus") },
    { key: 'tasks', href: '/tasks', Icon: CheckSquare, label: translateCopy("Tugas") },
    { key: 'finance', href: '/finance', Icon: Wallet, label: translateCopy("Keuangan") },
    { key: 'health', href: '/health', Icon: HeartPulse, label: translateCopy("Kesehatan") },
    { key: 'reading', href: '/reading', Icon: BookOpen, label: copy("Bacaan", "Reading") },
    { key: 'insights', href: '/insights', Icon: Sparkles, label: copy("Insight", "Insights") },
    { key: 'achievements', href: '/achievements', Icon: Trophy, label: copy("Pencapaian", "Badges") },
    { key: 'social', href: '/squads', Icon: Users, label: copy("Komunitas", "Squads") },
  ];
  const DEFAULT_WEB_SHORTCUT_KEYS = ['habits', 'journal', 'goals', 'calendar', 'pomodoro'];
  const STARTERS = [{ category: 'health', title: translateCopy("Kesehatan"), text: translateCopy("Lebih sehat dan bugar") }, { category: 'career', title: translateCopy("Karier"), text: translateCopy("Bertumbuh dalam karya") }, { category: 'finance', title: translateCopy("Keuangan"), text: translateCopy("Bangun masa depan") }, { category: 'hobby', title: translateCopy("Hobi"), text: translateCopy("Ruang untuk hal yang kamu suka") }];

  const { user } = useUser();
  const today = getToday();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideBalance, setHideBalance] = useState(false);
  const [shortcutKeys, setShortcutKeys] = useState(DEFAULT_WEB_SHORTCUT_KEYS);
  const [editingShortcuts, setEditingShortcuts] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const longPressTimerRef = useRef(null);
  const [data, setView] = useState({ tasks: [], habits: [], transactions: [], goals: [], journal: [] });
  const load = useCallback(async () => {
    try {
      const [tasks, habits, transactions, goals, journal, settings] = await Promise.all(['TASKS', 'HABITS', 'TRANSACTIONS', 'GOALS', 'JOURNAL', 'SETTINGS'].map(key => getData(STORAGE_KEYS[key])));
      setView({
        tasks: ensureArray(tasks),
        habits: ensureArray(habits),
        transactions: ensureArray(transactions),
        goals: ensureArray(goals),
        journal: ensureArray(journal),
      });
      if (settings && Array.isArray(settings.dashboardShortcuts) && settings.dashboardShortcuts.length > 0) {
        setShortcutKeys(settings.dashboardShortcuts.slice(0, 5));
      }
      if (settings && typeof settings.hideFinanceBalance === 'boolean') {
        setHideBalance(settings.hideFinanceBalance);
      }
      setError('');
    } catch { setError(translateCopy("Ringkasan belum dapat dimuat. Silakan coba lagi.")); }
    finally { setLoading(false); }
  }, [translateCopy]);
  useEffect(() => {
    load();
    setHideBalance(localStorage.getItem('privacy_hide_balance') === 'true');
    try {
      const savedShortcuts = JSON.parse(localStorage.getItem('whenya_dashboard_shortcuts') || 'null');
      if (Array.isArray(savedShortcuts) && savedShortcuts.length === 5) {
        setShortcutKeys(savedShortcuts);
      }
    } catch {}
    window.addEventListener('storage_update', load);
    window.addEventListener('whenya:data-synced', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('storage_update', load);
      window.removeEventListener('whenya:data-synced', load);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const saveShortcutKeys = async nextKeys => {
    setShortcutKeys(nextKeys);
    try { localStorage.setItem('whenya_dashboard_shortcuts', JSON.stringify(nextKeys)); } catch {}
    try {
      const currentSettings = (await getData(STORAGE_KEYS.SETTINGS)) || {};
      await setData(STORAGE_KEYS.SETTINGS, { ...currentSettings, dashboardShortcuts: nextKeys });
    } catch {}
  };

  const moveShortcut = (fromIdx, toIdx) => {
    const clamped = Math.max(0, Math.min(shortcutKeys.length - 1, toIdx));
    if (fromIdx === clamped) return;
    const next = [...shortcutKeys];
    const [item] = next.splice(fromIdx, 1);
    next.splice(clamped, 0, item);
    saveShortcutKeys(next);
    setSelectedSlot(clamped);
  };

  const replaceOrSwapShortcut = (slotIdx, targetKey) => {
    const existingIdx = shortcutKeys.indexOf(targetKey);
    const next = [...shortcutKeys];
    if (existingIdx !== -1 && existingIdx !== slotIdx) {
      const temp = next[slotIdx];
      next[slotIdx] = next[existingIdx];
      next[existingIdx] = temp;
    } else {
      next[slotIdx] = targetKey;
    }
    saveShortcutKeys(next);
  };

  const activeShortcuts = shortcutKeys.map(k => ALL_WEB_SHORTCUTS.find(item => item.key === k) || ALL_WEB_SHORTCUTS[0]);
  const summary = useMemo(() => summarizeLife(data), [data]);
  const safeTasks = ensureArray(data.tasks);
  const safeHabits = ensureArray(data.habits);
  const dayTasks = safeTasks.filter(task => !task.deadline && !task.dueDate ? task.status !== 'done' || String(task.createdAt || '').startsWith(today) : String(task.deadline || task.dueDate).slice(0, 10) <= today && (task.status !== 'done' || String(task.deadline || task.dueDate).startsWith(today)));
  const done = dayTasks.filter(task => task.status === 'done').length;
  const taskRate = dayTasks.length ? Math.round(done / dayTasks.length * 100) : 0;
  const streak = Math.max(0, ...safeHabits.map(h => habitStreak(h.completedDates)));
  const goals = summary.goalProgress.filter(g => !g.completed).slice(0, 4);
  const dateLabel = new Date().toLocaleDateString(uiLanguage === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const toggleTask = async task => {
    const tasks = safeTasks.map(item => item.id === task.id ? { ...item, status: item.status === 'done' ? 'todo' : 'done' } : item);
    await setData(STORAGE_KEYS.TASKS, tasks);
    setView(current => ({ ...current, tasks }));
    window.dispatchEvent(new Event('storage_update'));
  };
  const toggleHabit = async habit => {
    const dates = ensureArray(habit.completedDates);
    const completedDates = dates.includes(today) ? dates.filter(date => date !== today) : [...dates, today];
    const habits = safeHabits.map(item => item.id === habit.id ? { ...item, completedDates, streak: habitStreak(completedDates), bestStreak: Math.max(item.bestStreak || 0, habitStreak(completedDates)) } : item);
    await setData(STORAGE_KEYS.HABITS, habits);
    setView(current => ({ ...current, habits }));
  };
  return <div className="wy-dashboard" aria-busy={loading}>
    <header className="wy-welcome"><div><p className="wy-overline">{translateCopy("RUANG UNTUK BERTUMBUH")}</p><h1>{translateCopy("Halo,")} {user?.name?.split(' ')[0] || translateCopy("kamu")} <span className="wy-wave">👋</span></h1><p>{translateCopy("Langkah kecil hari ini, hidup yang lebih bermakna.")}</p></div><time>{dateLabel}</time></header>
    {error && <div className="whenya-error" role="alert">{translateCopy(error)}<button className="btn btn-secondary" onClick={load}>{translateCopy("Coba lagi")}</button></div>}
    {loading && <div className="wy-loading" role="status">{translateCopy("Menyiapkan harimu…")}</div>}
    <div className="wy-shortcuts-section">
      <div className="wy-shortcuts-bar-wrap">
        <nav className="wy-mobile-shortcuts wy-shortcuts-always" aria-label={translateCopy("Menu cepat")}>
          {activeShortcuts.map(({ key, href, Icon, label }, idx) => editingShortcuts ? (
            <button
              type="button"
              key={key + idx}
              draggable
              onDragStart={() => { setDragIndex(idx); setSelectedSlot(idx); }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragIndex !== null && dragIndex !== idx) moveShortcut(dragIndex, idx); setDragIndex(null); }}
              onClick={() => {
                if (selectedSlot !== idx) {
                  replaceOrSwapShortcut(selectedSlot, key);
                  setSelectedSlot(idx);
                }
              }}
              className={`wy-shortcut-item is-editing ${selectedSlot === idx ? 'is-selected' : ''}`}
            >
              <span><Icon size={21}/><em className="wy-shortcut-slot-badge">{idx + 1}</em></span>
              {label}
            </button>
          ) : (
            <Link
              href={href}
              key={key + idx}
              draggable
              onPointerDown={() => {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = setTimeout(() => {
                  setSelectedSlot(idx);
                  setEditingShortcuts(true);
                }, 360);
              }}
              onPointerUp={() => clearTimeout(longPressTimerRef.current)}
              onPointerLeave={() => clearTimeout(longPressTimerRef.current)}
              onContextMenu={e => {
                e.preventDefault();
                clearTimeout(longPressTimerRef.current);
                setSelectedSlot(idx);
                setEditingShortcuts(true);
              }}
              onDragStart={() => { clearTimeout(longPressTimerRef.current); setDragIndex(idx); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== idx) moveShortcut(dragIndex, idx);
                setDragIndex(null);
              }}
              className="wy-shortcut-item"
            >
              <span><Icon size={21}/></span>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {editingShortcuts && (
        <div className="wy-shortcut-editor-card">
          <div className="wy-shortcut-editor-head">
            <div>
              <strong>{copy(`Atur Posisi #${selectedSlot + 1}: ${activeShortcuts[selectedSlot]?.label}`, `Customize Slot #${selectedSlot + 1}: ${activeShortcuts[selectedSlot]?.label}`)}</strong>
              <p>{copy("Drag icon langsung, klik icon lain untuk tukar posisi, atau pilih menu pengganti di bawah:", "Drag icons directly, click another slot to swap, or pick a replacement menu below:")}</p>
            </div>
            <div className="wy-shortcut-move-btns">
              <button type="button" disabled={selectedSlot === 0} onClick={() => moveShortcut(selectedSlot, 0)}>
                <ChevronsLeft size={14} /> {copy("Paling Kiri", "Far Left")}
              </button>
              <button type="button" disabled={selectedSlot === 0} onClick={() => moveShortcut(selectedSlot, selectedSlot - 1)}>
                <ChevronLeft size={14} /> {copy("Kiri", "Left")}
              </button>
              <button type="button" disabled={selectedSlot === shortcutKeys.length - 1} onClick={() => moveShortcut(selectedSlot, selectedSlot + 1)}>
                {copy("Kanan", "Right")} <ChevronRight size={14} />
              </button>
              <button type="button" disabled={selectedSlot === shortcutKeys.length - 1} onClick={() => moveShortcut(selectedSlot, shortcutKeys.length - 1)}>
                {copy("Paling Kanan", "Far Right")} <ChevronsRight size={14} />
              </button>
              <button type="button" className="is-reset" onClick={() => { saveShortcutKeys(DEFAULT_WEB_SHORTCUT_KEYS); setSelectedSlot(0); }}>
                <RotateCcw size={13} /> {copy("Reset", "Reset")}
              </button>
              <button type="button" onClick={() => setEditingShortcuts(false)} style={{ background: '#193f30', color: '#fff', borderColor: '#193f30' }}>
                <Check size={13} /> {copy("Selesai", "Done")}
              </button>
            </div>
          </div>
          <div className="wy-shortcut-catalog-grid">
            {ALL_WEB_SHORTCUTS.map(({ key, Icon, label }) => {
              const pos = shortcutKeys.indexOf(key);
              const isSelected = pos === selectedSlot;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => replaceOrSwapShortcut(selectedSlot, key)}
                  className={`wy-shortcut-catalog-item ${isSelected ? 'is-current' : pos !== -1 ? 'is-active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {pos !== -1 && <small>#{pos + 1}</small>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
    <section className="wy-overview" aria-label={translateCopy("Ringkasan hari ini")}>
      {[{ Icon: CheckSquare, value: `${done}/${dayTasks.length}`, label: translateCopy("Tugas hari ini"), href: '/tasks', tone: 'mint' }, { Icon: BarChart3, value: `${summary.habitsDone}`, label: translateCopy("Kebiasaan selesai"), href: '/habits', tone: 'sage' }, { Icon: Target, value: `${summary.goalRate}%`, label: translateCopy("Progres tujuan"), href: '/goals', tone: 'mint' }, { Icon: Flame, value: `${streak}`, label: translateCopy("Hari berturut-turut"), href: '/habits', tone: 'sand' }].map(({Icon,value,label,href,tone}) => <Link href={href} className="wy-overview-item" key={href+label}><span className={`wy-icon-tile ${tone}`}><Icon size={21}/></span><div><strong>{value}</strong><small>{label}</small></div></Link>)}
    </section>
    <section className="wy-mobile-week wy-panel"><div className="wy-panel-heading"><h2>{translateCopy("Progres minggu ini")}</h2><Link href="/insights"><ArrowRight size={17}/><span className="sr-only">{translateCopy("Lihat insight")}</span></Link></div><div className="wy-week-summary"><ProgressRing value={summary.habitRate}/><p>{translateCopy("Konsistensi tumbuh dari hal kecil.")}<br/><strong>{translateCopy("Teruskan langkah baikmu.")}</strong></p></div><WeekBars trend={summary.habitTrend}/></section>
    <div className="wy-dashboard-grid">
      <section className="wy-panel wy-schedule"><div className="wy-panel-heading"><div><h2>{translateCopy("Rencana hari ini")}</h2><p>{dateLabel}</p></div><Link href="/tasks" className="btn btn-primary btn-sm"><Plus size={14}/>{translateCopy("Tambah tugas")}</Link></div>
        <div className="wy-schedule-columns"><span>{translateCopy("PROGRES")}</span><span>{translateCopy("AKTIVITAS")}</span><span>{translateCopy("KATEGORI")}</span></div>
        {dayTasks.length ? dayTasks.slice(0, 5).map(task => <div key={task.id} className={`wy-task-row ${task.status === 'done' ? 'done' : ''}`}><button className="wy-check" aria-label={`${task.status === 'done' ? translateCopy("Batalkan") : translateCopy("Selesaikan")} ${task.title}`} aria-pressed={task.status === 'done'} onClick={() => toggleTask(task)}>{task.status === 'done' && <Check size={12}/>}</button><Link href="/tasks"><strong>{task.title}</strong><small>{task.priority === 'P1' ? translateCopy("Prioritas utama") : task.deadline ? translateCopy("Sesuai rencanamu") : translateCopy("Satu langkah kecil hari ini")}</small></Link><span className={`wy-category ${task.category === 'Kerja' ? 'lavender' : task.category === 'Belajar' ? 'peach' : ''}`}>{translateCopy(task.category) || translateCopy("Personal")}</span></div>) : <div className="wy-empty-inline"><span className="wy-icon-tile mint"><CheckSquare size={24}/></span><h3>{translateCopy("Harimu, rencanamu.")}</h3><p>{translateCopy("Mulai dengan satu hal yang ingin kamu selesaikan.")}</p><Link href="/tasks">{translateCopy("Tambahkan tugas pertama")} <ArrowRight size={14}/></Link></div>}
        <footer className="wy-schedule-footer"><span><i style={{width:`${taskRate}%`}}/></span><small>{done} {translateCopy("dari")} {dayTasks.length} {translateCopy("selesai")}</small><Link href="/tasks">{translateCopy("Lihat semua")} <ArrowRight size={13}/></Link></footer>
      </section>
      <section className="wy-panel wy-financial"><div className="wy-panel-heading"><h2>{translateCopy("Finansial bulan ini")}</h2><button className="wy-icon-button" aria-label={hideBalance ? translateCopy("Tampilkan nominal") : translateCopy("Sembunyikan nominal")} onClick={() => { setHideBalance(!hideBalance); localStorage.setItem('privacy_hide_balance', String(!hideBalance)); }}>{hideBalance ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div><p className="wy-muted-label">{translateCopy("Total pengeluaran")}</p><strong className="wy-money">{hideBalance ? '••••••' : formatCurrency(summary.expense, uiLanguage)}</strong><FinanceBars transactions={data.transactions} hidden={hideBalance}/><div className="wy-finance-legend"><span><i/>{translateCopy("Pemasukan")}</span><strong>{hideBalance ? '••••••' : formatCurrency(summary.income, uiLanguage)}</strong></div><div className="wy-finance-legend expense"><span><i/>{translateCopy("Pengeluaran")}</span><strong>{hideBalance ? '••••••' : formatCurrency(summary.expense, uiLanguage)}</strong></div><Link className="wy-panel-footlink" href="/finance">{translateCopy("Lihat ringkasan keuangan")} <ArrowRight size={14}/></Link></section>
      <section className="wy-panel wy-goals-section"><div className="wy-panel-heading"><div><h2>{translateCopy("Tujuan hidup")}</h2><p>{translateCopy("Selangkah lebih dekat dengan impianmu.")}</p></div><Link href="/goals">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div><div className="wy-goal-strip">{(goals.length ? goals : STARTERS).map((goal, i) => { const isNum = NUMERIC_GOAL_TYPES.includes(goal.type); const snap = 'progress' in goal ? getGoalSnapshot(goal, data) : null; const sub = isNum && snap ? `${formatCompactValue(snap.current, goal.unit, uiLanguage, translateCopy)} / ${formatCompactValue(snap.target, goal.unit, uiLanguage, translateCopy)}` : translateCopy(goal.why || goal.description || goal.text || "Tumbuh setiap hari"); return <Link href="/goals" key={goal.id || goal.category} className="wy-goal-mini"><Scene category={goal.category}/><div><div className="wy-goal-mini-title"><strong>{translateCopy(goal.title)}</strong><MoreHorizontal size={14}/></div><small>{sub}</small>{'progress' in goal ? <><div className="wy-progress-track"><i style={{width:`${snap ? snap.percent : goal.progress}%`}}/></div><b>{snap ? snap.percent : goal.progress}%</b></> : <span className="wy-goal-start">{translateCopy("Mulai perjalanan")} <Plus size={11}/></span>}</div></Link>; })}</div></section>
      <section className="wy-panel wy-habits-section"><div className="wy-panel-heading"><h2>{translateCopy("Kebiasaan hari ini")}</h2><Link href="/habits">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div>{data.habits.length ? data.habits.slice(0, 4).map(habit => <button className="wy-habit-row" key={habit.id} onClick={() => toggleHabit(habit)} aria-pressed={habit.completedDates?.includes(today)}><span className={`wy-round-check ${habit.completedDates?.includes(today) ? 'checked' : ''}`}>{habit.completedDates?.includes(today) && <Check size={12}/>}</span><span>{habit.name || habit.title}</span><small>{habitStreak(habit.completedDates)} {translateCopy("hari")}</small></button>) : <div className="wy-habit-empty"><Leaf size={27}/><p>{translateCopy("Satu kebiasaan baik.")}<br/>{translateCopy("Banyak perubahan kecil.")}</p><Link href="/habits" className="btn btn-secondary btn-sm">{translateCopy("Bangun kebiasaan")} <Plus size={13}/></Link></div>}</section>
      <section className="wy-panel wy-journal-section"><div className="wy-panel-heading"><h2>{translateCopy("Jurnal terbaru")}</h2><Link href="/journal">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div><Link className="wy-journal-preview" href="/journal"><div><span className="wy-overline"><Sparkles size={12}/>{translateCopy("MOMEN UNTUK DIRIMU")}</span><h3>{data.journal[0]?.title || translateCopy("Apa yang kamu syukuri hari ini?")}</h3><p>{data.journal[0]?.content?.slice(0, 95) || translateCopy("Luangkan sejenak untuk mencatat cerita, pikiran, dan hal kecil yang berarti.")}</p><small>{data.journal[0]?.date?.slice(0, 10) || translateCopy("Tulis ceritamu")} <ArrowRight size={13}/></small></div><Scene landscape/></Link></section>
    </div>
    <div className="wy-bottom-note"><Leaf size={13}/> {translateCopy("Tidak perlu sempurna. Cukup terus bertumbuh.")}</div>
  </div>;
}
