import Image from 'next/image';
import { LANDSCAPE, goalArt, svgDataUri } from '@superapp/shared/brand-visuals';
import { useLanguage } from "@superapp/shared/language";


export function Scene({ category = 'hobby', landscape = false, className = '', alt = '' }) {
  return <Image src={svgDataUri(landscape ? LANDSCAPE : goalArt(category))} width={800} height={500} alt={alt} className={`wy-scene ${className}`} unoptimized />;
}

export function ProgressRing({ value = 0, size = 88, label = '', children = null }) {
  const { tx: translateCopy } = useLanguage();
  const safe = Math.max(0, Math.min(100, value));
  return <div className="wy-ring" style={{ width: size, height: size }} role="img" aria-label={label || translateCopy("{0}% selesai", [safe])}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="#e6ecdf" strokeWidth="8"/><circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-primary)" strokeWidth="8" strokeDasharray={`${safe * 2.639} 264`} strokeLinecap="round" transform="rotate(-90 50 50)"/></svg><span>{children || `${safe}%`}</span>
  </div>;
}

export function FinanceBars({ transactions = [], hidden = false }) {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entries = transactions.filter(tx => String(tx.date || '').startsWith(key));
    const total = type => entries.filter(tx => tx.type === type).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    return { label: date.toLocaleDateString(uiLanguage === 'id' ? 'id-ID' : 'en-US', { month: 'short' }), income: total('income'), expense: total('expense') };
  });
  const max = Math.max(1, ...months.flatMap(m => [m.income, m.expense]));
  return <div className={`wy-finance-chart ${hidden ? 'is-private' : ''}`} role="img" aria-label={hidden ? translateCopy("Grafik disembunyikan") : months.map(m => translateCopy("{0}: pemasukan {1}, pengeluaran {2}", [m.label, m.income, m.expense])).join('; ')}>
    <div className="wy-chart-lines"><i/><i/><i/></div>
    {months.map((month, i) => <div className="wy-finance-column" key={i}><div className="wy-finance-pair"><i style={{ height: `${hidden ? 0 : month.income / max * 100}%` }}/><i style={{ height: `${hidden ? 0 : month.expense / max * 100}%` }}/></div><small>{month.label}</small></div>)}
  </div>;
}

export function WeekBars({ trend = [] }) {
  const { language: uiLanguage } = useLanguage();
  return <div className="wy-week-bars" role="img" aria-label={trend.map(d => `${d.date}: ${d.rate}%`).join('; ')}>{trend.map(day => <div key={day.date}><div className="wy-week-track"><i style={{ height: `${day.rate}%` }}/></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(uiLanguage === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })}</small></div>)}</div>;
}
