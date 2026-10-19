'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CheckSquare, Flame, Plus, Target, Wallet, Eye, EyeOff, CalendarDays, NotebookPen, BarChart3, MoreHorizontal, Leaf, Sparkles } from 'lucide-react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { summarizeLife, habitStreak } from '@superapp/shared/insights';
import { formatCurrency, getToday, ensureArray } from '@superapp/shared/helpers';
import { useUser } from '@superapp/shared/auth';
import { Scene, ProgressRing, FinanceBars, WeekBars } from '@/components/WhenyaVisuals';
import { useLanguage } from "@superapp/shared/language";





export default function Dashboard() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();
const SHORTCUTS = [{ href: '/tasks', Icon: CheckSquare, label: translateCopy("Tugas") }, { href: '/habits', Icon: BarChart3, label: translateCopy("Kebiasaan") }, { href: '/finance', Icon: Wallet, label: translateCopy("Keuangan") }, { href: '/journal', Icon: NotebookPen, label: translateCopy("Jurnal") }, { href: '/goals', Icon: Target, label: translateCopy("Tujuan") }];
const STARTERS = [{ category: 'health', title: translateCopy("Kesehatan"), text: translateCopy("Lebih sehat dan bugar") }, { category: 'career', title: translateCopy("Karier"), text: translateCopy("Bertumbuh dalam karya") }, { category: 'finance', title: translateCopy("Keuangan"), text: translateCopy("Bangun masa depan") }, { category: 'hobby', title: translateCopy("Hobi"), text: translateCopy("Ruang untuk hal yang kamu suka") }];

  const { user } = useUser();
  const today = getToday();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hideBalance, setHideBalance] = useState(false);
  const [data, setView] = useState({ tasks: [], habits: [], transactions: [], goals: [], journal: [] });
  const load = useCallback(async () => {
    try {
      const [tasks, habits, transactions, goals, journal] = await Promise.all(['TASKS', 'HABITS', 'TRANSACTIONS', 'GOALS', 'JOURNAL'].map(key => getData(STORAGE_KEYS[key])));
      setView({
        tasks: ensureArray(tasks),
        habits: ensureArray(habits),
        transactions: ensureArray(transactions),
        goals: ensureArray(goals),
        journal: ensureArray(journal),
      });
      setError('');
    } catch { setError(translateCopy("Ringkasan belum dapat dimuat. Silakan coba lagi.")); }
    finally { setLoading(false); }
  }, [translateCopy]);
  useEffect(() => {
    load();
    setHideBalance(localStorage.getItem('privacy_hide_balance') === 'true');
    window.addEventListener('storage_update', load);
    window.addEventListener('focus', load);
    return () => { window.removeEventListener('storage_update', load); window.removeEventListener('focus', load); };
  }, [load]);
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
    <nav className="wy-mobile-shortcuts" aria-label={translateCopy("Menu cepat")}>{SHORTCUTS.map(({href, Icon, label}) => <Link href={href} key={href}><span><Icon size={21}/></span>{label}</Link>)}</nav>
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
      <section className="wy-panel wy-goals-section"><div className="wy-panel-heading"><div><h2>{translateCopy("Tujuan hidup")}</h2><p>{translateCopy("Selangkah lebih dekat dengan impianmu.")}</p></div><Link href="/goals">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div><div className="wy-goal-strip">{(goals.length ? goals : STARTERS).map((goal, i) => <Link href="/goals" key={goal.id || goal.category} className="wy-goal-mini"><Scene category={goal.category}/><div><div className="wy-goal-mini-title"><strong>{goal.title}</strong><MoreHorizontal size={14}/></div><small>{goal.description || goal.text || translateCopy("Tumbuh setiap hari")}</small>{'progress' in goal ? <><div className="wy-progress-track"><i style={{width:`${goal.progress}%`}}/></div><b>{goal.progress}%</b></> : <span className="wy-goal-start">{translateCopy("Mulai perjalanan")} <Plus size={11}/></span>}</div></Link>)}</div></section>
      <section className="wy-panel wy-habits-section"><div className="wy-panel-heading"><h2>{translateCopy("Kebiasaan hari ini")}</h2><Link href="/habits">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div>{data.habits.length ? data.habits.slice(0, 4).map(habit => <button className="wy-habit-row" key={habit.id} onClick={() => toggleHabit(habit)} aria-pressed={habit.completedDates?.includes(today)}><span className={`wy-round-check ${habit.completedDates?.includes(today) ? 'checked' : ''}`}>{habit.completedDates?.includes(today) && <Check size={12}/>}</span><span>{habit.name || habit.title}</span><small>{habitStreak(habit.completedDates)} {translateCopy("hari")}</small></button>) : <div className="wy-habit-empty"><Leaf size={27}/><p>{translateCopy("Satu kebiasaan baik.")}<br/>{translateCopy("Banyak perubahan kecil.")}</p><Link href="/habits" className="btn btn-secondary btn-sm">{translateCopy("Bangun kebiasaan")} <Plus size={13}/></Link></div>}</section>
      <section className="wy-panel wy-journal-section"><div className="wy-panel-heading"><h2>{translateCopy("Jurnal terbaru")}</h2><Link href="/journal">{translateCopy("Lihat semua")} <ArrowRight size={14}/></Link></div><Link className="wy-journal-preview" href="/journal"><div><span className="wy-overline"><Sparkles size={12}/>{translateCopy("MOMEN UNTUK DIRIMU")}</span><h3>{data.journal[0]?.title || translateCopy("Apa yang kamu syukuri hari ini?")}</h3><p>{data.journal[0]?.content?.slice(0, 95) || translateCopy("Luangkan sejenak untuk mencatat cerita, pikiran, dan hal kecil yang berarti.")}</p><small>{data.journal[0]?.date?.slice(0, 10) || translateCopy("Tulis ceritamu")} <ArrowRight size={13}/></small></div><Scene landscape/></Link></section>
    </div>
    <div className="wy-bottom-note"><Leaf size={13}/> {translateCopy("Tidak perlu sempurna. Cukup terus bertumbuh.")}</div>
  </div>;
}
