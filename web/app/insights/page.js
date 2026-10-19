'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CheckSquare, Flame, Target, Wallet } from 'lucide-react';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { summarizeLife } from '@superapp/shared/insights';
import { formatCurrency } from '@superapp/shared/helpers';
import { useLanguage } from "@superapp/shared/language";


export default function InsightsPage() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    Promise.all(['TASKS', 'HABITS', 'GOALS', 'TRANSACTIONS'].map(key => getData(STORAGE_KEYS[key])))
      .then(([tasks, habits, goals, transactions]) => { if (active) setData({ tasks: tasks || [], habits: habits || [], goals: goals || [], transactions: transactions || [] }); })
      .catch(() => { if (active) setError(translateCopy("Ringkasan belum dapat dimuat. Silakan coba lagi.")); });
    return () => { active = false; };
  }, [attempt, translateCopy]);
  const summary = data ? summarizeLife(data, new Date(), days) : null;
  return <div className="today-page">
    <header className="today-header"><div><p className="eyebrow">{translateCopy("Kenali perjalananmu")}</p><h1>{translateCopy("Insight pribadi")}</h1><p>{translateCopy("Langkah kecil yang tercatat, gambaran hidup yang lebih jelas.")}</p></div>
      <div className="whenya-segment" aria-label={translateCopy("Periode kebiasaan")}>{[7, 30].map(value => <button key={value} className={`btn ${days === value ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={days === value} onClick={() => setDays(value)}>{value === 7 ? translateCopy("7 hari") : translateCopy("30 hari")}</button>)}</div>
    </header>
    {error ? <div className="card card-padding" role="alert"><p>{translateCopy(error)}</p><button className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>{translateCopy("Coba lagi")}</button></div> : !summary ? <p role="status">{translateCopy("Memuat perjalananmu…")}</p> : <>
      <div className="whenya-stat-grid">
        {[{ Icon: CheckSquare, label: translateCopy("Tugas selesai"), value: `${summary.taskRate}%`, href: '/tasks' }, { Icon: Flame, label: translateCopy("Konsistensi kebiasaan"), value: `${summary.habitRate}%`, href: '/habits' }, { Icon: Target, label: translateCopy("Progres tujuan"), value: `${summary.goalRate}%`, href: '/goals' }, { Icon: Wallet, label: translateCopy("Pengeluaran bulan ini"), value: formatCurrency(summary.expense, uiLanguage), href: '/finance' }].map(({Icon, label, value, href}) => <Link key={href} href={href} className="whenya-stat"><span className="whenya-stat-icon"><Icon size={21}/></span><div><strong>{value}</strong><small>{label}</small></div></Link>)}
      </div>
      <div className="today-grid">
        <section className="card card-padding"><div className="section-heading"><div><p className="eyebrow">{translateCopy("Konsistensi")}</p><h2>{translateCopy("Kebiasaan")} {days} {translateCopy("hari terakhir")}</h2></div><BarChart3 size={22}/></div>
          {data.habits.length ? <><div className="whenya-bars" role="img" aria-label={summary.habitTrend.map(day => translateCopy("{0}: {1} dari {2}", [day.date, day.completed, day.total])).join('; ')}>{summary.habitTrend.map(day => <div className="whenya-bar-column" key={day.date} title={`${day.date}: ${day.rate}%`}><div className="whenya-bar-track"><span style={{ height: `${day.rate}%` }}/></div><small>{Number(day.date.slice(-2))}</small></div>)}</div><p className="text-sm text-secondary">{translateCopy("Check-in tercatat dibanding kebiasaan yang sudah dibuat pada setiap tanggal. Tugas dihitung dari seluruh tugas tersimpan.")}</p></> : <div className="calm-empty"><Flame size={24}/><div><strong>{translateCopy("Mulai dari satu kebiasaan.")}</strong><p>{translateCopy("Check-in harian akan membentuk grafik perjalananmu.")}</p><Link href="/habits">{translateCopy("Buat kebiasaan →")}</Link></div></div>}
        </section>
        <section className="card card-padding"><div className="section-heading"><h2>{translateCopy("Tujuan hidup")}</h2><Link href="/goals">{translateCopy("Lihat semua")}</Link></div>
          {summary.goalProgress.length ? summary.goalProgress.map(goal => <Link href="/goals" key={goal.id} className="whenya-goal-row"><strong>{goal.title}</strong><span>{goal.progress}%</span><progress max="100" value={goal.progress} aria-label={translateCopy("Progres {0}", [goal.title])}/></Link>) : <div className="calm-empty"><Target size={24}/><div><strong>{translateCopy("Apa yang ingin kamu capai?")}</strong><p>{translateCopy("Tambahkan tujuan dan milestone untuk melihat progres.")}</p><Link href="/goals">{translateCopy("Tambah tujuan →")}</Link></div></div>}
        </section>
      </div>
      <section className="card card-padding"><div className="section-heading"><h2>{translateCopy("Keuangan bulan ini")}</h2><Link href="/finance">{translateCopy("Lihat transaksi →")}</Link></div><div className="progress-strip"><div className="progress-item"><span>{translateCopy("Pemasukan")}</span><strong>{formatCurrency(summary.income, uiLanguage)}</strong></div><div className="progress-item"><span>{translateCopy("Pengeluaran")}</span><strong>{formatCurrency(summary.expense, uiLanguage)}</strong></div><div className="progress-item"><span>{translateCopy("Selisih bulan ini")}</span><strong>{formatCurrency(summary.income - summary.expense, uiLanguage)}</strong></div></div><p className="text-sm text-secondary">{translateCopy("Berdasarkan tanggal transaksi pada bulan berjalan di perangkat ini.")}</p></section>
    </>}
  </div>;
}
