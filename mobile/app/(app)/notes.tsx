import { DestinationHub } from '../../components/DestinationHub';
import { useLanguage } from '../../context/languageContext';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';

export default function NotesScreen() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);

  return <DestinationHub title={t('destinations.notes')} subtitle={t('destinations.notes_desc')} items={[
    { href: '/(app)/finance', icon: 'account-balance-wallet', label: t('sidebar.finance'), description: t('destinations.finance_desc'), color: c.green },
    { href: '/(app)/health', icon: 'favorite-outline', label: t('sidebar.health'), description: t('destinations.health_desc'), color: c.red },
    { href: '/(app)/journal', icon: 'edit-note', label: t('sidebar.journal'), description: t('destinations.journal_desc'), color: c.purple },
    { href: '/(app)/reading', icon: 'menu-book', label: t('sidebar.reading'), description: t('destinations.reading_desc'), color: c.blue },
  ]} />;
}
