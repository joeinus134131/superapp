interface Inputs { tasks: { status: string }[]; habits: { completedDates?: string[] }[]; goals: any[]; today: string; journalCount: number; focusSessions: number; workouts: number; monthlyIncome: number; monthlyExpense: number }
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
export function lifeDnaMetrics(input: Inputs) {
  const { tasks, habits, goals, today, journalCount, focusSessions, workouts, monthlyIncome, monthlyExpense } = input;
  const eligibleTasks = tasks.filter(task => !['cancelled', 'canceled', 'archived'].includes(task.status));
  const eligibleGoals = goals.filter(goal => !goal.archived);
  const bodyParts = [...(habits.length ? [habits.filter(habit => habit.completedDates?.includes(today)).length / habits.length * 100] : []), ...(workouts > 0 ? [clamp(workouts / 3 * 100)] : [])];
  const growthParts = [...(eligibleTasks.length ? [eligibleTasks.filter(task => task.status === 'done').length / eligibleTasks.length * 100] : []), ...(eligibleGoals.length ? [eligibleGoals.reduce((sum, goal) => sum + clamp(goal.completed ? 100 : Number(goal.progress) || 0), 0) / eligibleGoals.length] : [])];
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const metrics = [
    { key: 'mind', id: 'Fokus', en: 'Focus', available: focusSessions > 0, value: clamp(focusSessions / 4 * 100), noteId: 'Sesi fokus hari ini ÷ 4 sesi.', noteEn: 'Today’s focus sessions ÷ 4 sessions.' },
    { key: 'body', id: 'Rutinitas', en: 'Routine', available: bodyParts.length > 0, value: average(bodyParts), noteId: 'Rata-rata kebiasaan selesai hari ini dan latihan 7 hari terakhir ÷ 3, jika tersedia.', noteEn: 'Average of today’s habit completion and workouts in the last 7 days ÷ 3, when available.' },
    { key: 'money', id: 'Arus kas', en: 'Cash flow', available: monthlyIncome > 0, value: clamp((monthlyIncome - monthlyExpense) / monthlyIncome * 100), noteId: 'Sisa pemasukan bulan ini ÷ pemasukan, dibatasi 0–100%. Tanpa pemasukan, rasio tidak tersedia.', noteEn: 'This month’s retained income ÷ income, bounded to 0–100%. Unavailable without income.' },
    { key: 'soul', id: 'Jurnal', en: 'Journal', available: journalCount > 0, value: clamp(journalCount / 10 * 100), noteId: 'Jumlah jurnal tersimpan ÷ 10 entri.', noteEn: 'Saved journal entries ÷ 10 entries.' },
    { key: 'growth', id: 'Penyelesaian', en: 'Completion', available: growthParts.length > 0, value: average(growthParts), noteId: 'Rata-rata penyelesaian seluruh tugas dan progres tujuan yang tersedia.', noteEn: 'Average of recorded task completion and available goal progress.' },
  ];
  return { metrics, chart: metrics.filter(item => item.available), hasActivity: metrics.some(item => item.available) || monthlyExpense > 0 };
}
