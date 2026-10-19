import { DestinationHub } from '../../components/DestinationHub';
import { useLanguage } from '../../context/languageContext';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';

export default function PlanScreen() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);

  return <DestinationHub title={t('destinations.plan')} subtitle={t('destinations.plan_desc')} items={[
    { href: '/(app)/tasks', icon: 'checklist', label: t('sidebar.tasks'), description: t('destinations.tasks_desc'), color: c.purple },
    { href: '/(app)/habits', icon: 'local-fire-department', label: t('sidebar.habits'), description: t('destinations.habits_desc'), color: c.red },
    { href: '/(app)/pomodoro', icon: 'timer', label: t('sidebar.pomodoro'), description: t('destinations.pomodoro_desc'), color: c.orange },
    { href: '/(app)/goals', icon: 'track-changes', label: t('sidebar.goals'), description: t('destinations.goals_desc'), color: c.blue },
    { href: '/(app)/calendar', icon: 'calendar-today', label: t('sidebar.calendar'), description: t('destinations.calendar_desc'), color: c.green },
  ]} />;
}
