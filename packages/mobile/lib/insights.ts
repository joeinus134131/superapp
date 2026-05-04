import { STORAGE_KEYS, getData } from './storage';
import { getToday } from './helpers';

export interface Insight {
  id: string;
  type: 'productivity' | 'wellness' | 'finance' | 'motivation';
  titleKey: string;
  messageKey: string;
  messageArgs?: Record<string, string | number>;
  icon: string;
  color: string;
  actionRoute?: string;
}

export const generateSmartInsights = async (): Promise<Insight[]> => {
  const [tasks, habits, pomodoro, health, finance] = await Promise.all([
    getData(STORAGE_KEYS.TASKS),
    getData(STORAGE_KEYS.HABITS),
    getData(STORAGE_KEYS.POMODORO),
    getData(STORAGE_KEYS.HEALTH),
    getData(STORAGE_KEYS.TRANSACTIONS),
  ]);

  const insights: Insight[] = [];
  const today = getToday();

  // 1. Task Insights
  const pendingTasks = (tasks || []).filter((t: any) => t.status !== 'done');
  if (pendingTasks.length > 5) {
    insights.push({
      id: 'task_overload',
      type: 'productivity',
      titleKey: 'insights.task_overload_title',
      messageKey: 'insights.task_overload_msg',
      messageArgs: { count: pendingTasks.length },
      icon: 'assignment-late',
      color: '#8b5cf6',
      actionRoute: '/tasks'
    });
  }

  // 2. Habit Insights
  const h = habits || [];
  const todayHabits = h.filter((x: any) => x.completedDates?.includes(today));
  if (h.length > 0 && todayHabits.length === 0) {
    insights.push({
      id: 'habit_reminder',
      type: 'motivation',
      titleKey: 'insights.habit_reminder_title',
      messageKey: 'insights.habit_reminder_msg',
      icon: 'bolt',
      color: '#f59e0b',
      actionRoute: '/habits'
    });
  }

  // 3. Focus Insights
  const p = pomodoro || { sessions: [] };
  const todaySessions = p.sessions?.filter((s: any) => s.date === today).length || 0;
  if (todaySessions >= 4) {
    insights.push({
      id: 'focus_pro',
      type: 'productivity',
      titleKey: 'insights.focus_pro_title',
      messageKey: 'insights.focus_pro_msg',
      icon: 'auto-awesome',
      color: '#06b6d4',
      actionRoute: '/pomodoro'
    });
  }

  // 4. Health Insights
  const hl = health || { steps: 0, water: 0 };
  if (hl.water < 1500) {
    insights.push({
      id: 'hydrate_me',
      type: 'wellness',
      titleKey: 'insights.hydrate_me_title',
      messageKey: 'insights.hydrate_me_msg',
      icon: 'local-drink',
      color: '#3b82f6',
      actionRoute: '/health'
    });
  }

  // 5. Finance Insights
  const tx = finance || [];
  const todayExpense = tx.filter((t: any) => t.date === today && t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  if (todayExpense > 500000) {
    insights.push({
      id: 'finance_warning',
      type: 'finance',
      titleKey: 'insights.finance_warning_title',
      messageKey: 'insights.finance_warning_msg',
      icon: 'warning',
      color: '#ef4444',
      actionRoute: '/finance'
    });
  }

  // Default motivation if empty
  if (insights.length === 0) {
    insights.push({
      id: 'keep_it_up',
      type: 'motivation',
      titleKey: 'insights.keep_it_up_title',
      messageKey: 'insights.keep_it_up_msg',
      icon: 'rocket-launch',
      color: '#8b5cf6',
    });
  }

  return insights;
};
