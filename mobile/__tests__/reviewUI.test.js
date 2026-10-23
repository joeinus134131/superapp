jest.mock('react-native', () => {
  const React = require('react');
  return {
    SectionList: 'SectionList', FlatList: 'FlatList', View: 'View', Text: 'Text', TextInput: 'TextInput', TouchableOpacity: 'TouchableOpacity', Image: 'Image', ActivityIndicator: 'ActivityIndicator', RefreshControl: 'RefreshControl', KeyboardAvoidingView: 'KeyboardAvoidingView',
    ScrollView: React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ scrollTo: () => {} })); return React.createElement('ScrollView', props); }),
    Modal: ({ visible, children, ...props }) => visible ? React.createElement('Modal', props, children) : null,
    StyleSheet: { create: value => value, absoluteFill: {}, flatten: styles => Object.assign({}, ...[styles].flat(10).filter(Boolean)) },
    Platform: { OS: 'android' }, Dimensions: { get: () => ({ width: 360, height: 800 }) }, useWindowDimensions: jest.fn(() => ({ width: 360, height: 800, fontScale: 1 })),
    Alert: { alert: jest.fn() }, DeviceEventEmitter: { addListener: () => ({ remove: () => {} }), emit: jest.fn() }, AppState: { addEventListener: () => ({ remove: () => {} }) }, Keyboard: { dismiss: jest.fn() },
  };
});
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon', Ionicons: 'Icon' }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Polygon: 'Polygon', Line: 'Line', Circle: 'Circle', G: 'G', Text: 'SvgText', Defs: 'Defs', RadialGradient: 'RadialGradient', Stop: 'Stop', LinearGradient: 'LinearGradient', Filter: 'Filter', FeGaussianBlur: 'FeGaussianBlur', FeComposite: 'FeComposite' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn(), useFocusEffect: callback => require('react').useEffect(callback, [callback]) }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => {}), ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' } }));
jest.mock('../context/themeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../context/languageContext', () => ({ useLanguage: jest.fn() }));
jest.mock('../context/settingsContext', () => ({ useSettings: jest.fn() }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user', name: 'Test Friend' } }) }));
jest.mock('../hooks/useTasks', () => ({ useTasks: jest.fn() }));
jest.mock('../hooks/useHabits', () => ({ useHabits: jest.fn() }));
jest.mock('../hooks/useFinance', () => ({ useFinance: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: 'DateTimePicker' }));
jest.mock('../lib/exportFinanceReport', () => ({ exportFinanceReport: jest.fn(async () => {}) }));
jest.mock('../hooks/useJournal', () => ({ useJournal: jest.fn() }));
jest.mock('../hooks/useNotificationHistory', () => ({ useNotificationHistory: jest.fn() }));
jest.mock('../lib/dashboardSources', () => ({ readDashboardSources: jest.fn() }));
jest.mock('../lib/journalRepository', () => ({ readJournalEntries: jest.fn() }));
jest.mock('../lib/gamification', () => ({ checkDailyLogin: jest.fn(async () => {}) }));
jest.mock('../lib/notifications', () => ({ registerForPushNotificationsAsync: jest.fn(async () => {}) }));
jest.mock('../lib/storage', () => ({ getData: jest.fn(async () => null), setData: jest.fn(async () => {}) }));
jest.mock('../lib/ai', () => ({ processJournalAI: jest.fn(), analyzeJournalEntry: jest.fn() }));
jest.mock('../components/CrossModuleInsights', () => ({ CrossModuleInsights: () => null }));
jest.mock('../components/BrandLogo', () => ({ BrandLogo: () => null }));
jest.mock('../components/SyncStatusNotice', () => ({ SyncStatusNotice: () => null }));
jest.mock('../components/LevelUpModal', () => ({ LevelUpModal: () => null }));
import React from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/languageContext';
import { useSettings } from '../context/settingsContext';
import { useTasks } from '../hooks/useTasks';
import { useHabits } from '../hooks/useHabits';
import { useJournal } from '../hooks/useJournal';
import { useNotificationHistory } from '../hooks/useNotificationHistory';
import { readDashboardSources } from '../lib/dashboardSources';
import { readJournalEntries } from '../lib/journalRepository';
import { processJournalAI } from '../lib/ai';
import Finance from '../app/(app)/finance';
import { FinanceOverview } from '../components/finance/FinanceOverview';
import { financeReport } from '../lib/financeReports';
import { useFinance } from '../hooks/useFinance';
import Dashboard from '../app/(app)/index';
import Journal from '../app/(app)/journal';
import Tasks from '../app/(app)/tasks';
import { DashboardSearch } from '../components/DashboardSearch';
import { LifeDnaSheet } from '../components/LifeDnaSheet';
import { RadarChart } from '../components/RadarChart';
import { WhenyaHeader } from '../components/WhenyaHeader';
import { Button } from '../components/ui/Button';
import { lifeDnaMetrics } from '../lib/lifeDna';
const { create, act } = require('./helpers/renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let tree, journal, history, router;
const noop = async () => {};
const plainText = value => value == null ? '' : typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(plainText).join(' ') : plainText(value.children || value.props?.children);
const text = () => tree.root.findAllByType('Text').map(plainText).join(' ');
async function mount(component) { await act(async () => { tree = create(component); }); }
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 22, 12)); jest.clearAllMocks();
  const reportError = console.error; jest.spyOn(console, 'error').mockImplementation((message, ...args) => { if (!String(message).startsWith('react-test-renderer is deprecated')) reportError(message, ...args); });
  router = { push: jest.fn(), setParams: jest.fn(), canGoBack: () => false }; useRouter.mockReturnValue(router); useLocalSearchParams.mockReturnValue({});
  useTheme.mockReturnValue({ isDark: false }); useLanguage.mockReturnValue({ language: 'en', t: key => key, tx: value => value }); useSettings.mockReturnValue({ settings: { hideFinanceBalance: false }, updateSetting: jest.fn() });
  useWindowDimensions.mockReturnValue({ width: 360, height: 800, fontScale: 1 });
  useTasks.mockReturnValue({ tasks: [], loading: false, error: false, moveTask: jest.fn(noop), refreshTasks: noop, levelUpData: null, setLevelUpData: jest.fn(), addTask: jest.fn(noop), updateTask: jest.fn(noop), deleteTask: jest.fn(noop), setXpToast: jest.fn() });
  useHabits.mockReturnValue({ habits: [], loading: false, error: false, pendingId: null, rewardError: null, retryHabitReward: noop, toggleHabit: jest.fn(noop), refreshHabits: noop, levelUpData: null, setLevelUpData: jest.fn() });
  history = { items: [], unread: 0, loading: false, error: false, refresh: noop, markRead: jest.fn(noop) }; useNotificationHistory.mockReturnValue(history);
  journal = { entries: [], loading: false, error: false, rewardError: null, xpToast: null, addEntry: jest.fn(noop), updateEntry: jest.fn(noop), deleteEntry: jest.fn(noop), refreshJournal: noop, retryJournalReward: noop }; useJournal.mockReturnValue(journal);
  readDashboardSources.mockResolvedValue({ values: { goals: [], profile: null, transactions: [], journal: [], pomodoro: { sessions: [] }, health: { workouts: [] } }, errors: [] }); readJournalEntries.mockResolvedValue([]); processJournalAI.mockResolvedValue({ mood: 'neutral', reflection: '', available: false });
});
afterEach(async () => { if (tree) { await act(async () => tree.unmount()); tree = null; } jest.useRealTimers(); jest.restoreAllMocks(); });
test('F02: dashboard month total excludes previous-month expenses in the actual component', async () => {
  readDashboardSources.mockResolvedValue({ values: { transactions: [{ id: 'current', date: '2026-10-21', type: 'expense', amount: 1000 }, { id: 'old', date: '2026-09-21', type: 'expense', amount: 9000 }] }, errors: [] });
  await mount(React.createElement(Dashboard)); expect(text()).toContain('1,000'); expect(text()).not.toContain('10,000'); expect(text()).not.toContain('9,000');
});
test('notification sheet shows a genuine empty state instead of hardcoded entries or unread badge', async () => {
  await mount(React.createElement(Dashboard));
  const button = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === 'Notifications');
  await act(async () => button.props.onPress()); expect(text()).toContain('No notifications yet.'); expect(text()).not.toContain('2 baru'); expect(text()).not.toContain('12 hari');
});
test('F01: search uses journal repository and opens the matching journal detail', async () => {
  readJournalEntries.mockResolvedValue([{ id: 'journal-id', title: 'Private reflection', content: 'needle phrase' }]);
  await mount(React.createElement(DashboardSearch, { visible: true, onClose: jest.fn(), tasks: [], goals: [] }));
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('needle'));
  expect(text()).toContain('Private reflection');
  const result = tree.root.findAllByType('TouchableOpacity').find(item => plainText(item.props.children).includes('Private reflection'));
  await act(async () => result.props.onPress()); expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/journal', params: { item: 'journal-id' } });
});
test('failed search read shows retry instead of falsely claiming no matches', async () => {
  readJournalEntries.mockRejectedValue(new Error('keystore'));
  await mount(React.createElement(DashboardSearch, { visible: true, onClose: jest.fn(), tasks: [], goals: [] }));
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('needle'));
  expect(text()).toContain('Journal could not load. Retry'); expect(text()).not.toContain('No results. Try another keyword.');
});
test('Life DNA empty state does not mount a radar or show fabricated percentages', async () => {
  const data = lifeDnaMetrics({ tasks: [], habits: [], goals: [], today: '2026-10-22', journalCount: 0, focusSessions: 0, workouts: 0, monthlyIncome: 0, monthlyExpense: 0 });
  await mount(React.createElement(LifeDnaSheet, { visible: true, onClose: noop, data, unavailable: false, loading: false, onRetry: noop }));
  expect(text()).toContain('No activity recorded yet'); expect(tree.root.findAllByType(RadarChart)).toHaveLength(0); expect(text()).not.toContain('20%'); expect(text()).not.toContain('50%');
});
test('radar plots actual zero values at the center rather than a fifteen-percent floor', async () => {
  await mount(React.createElement(RadarChart, { data: [{ label: 'A', value: 0 }, { label: 'B', value: 0 }, { label: 'C', value: 0 }], size: 200 }));
  expect(tree.root.findAllByType('Polygon')[0].props.points).toBe('100,100 100,100 100,100');
});
test('header exposes full title/description and uses flexible height and 48dp tab targets', async () => {
  const title = 'A very long header with the complete information';
  await mount(React.createElement(WhenyaHeader, { title, subtitle: 'Full description', tabs: [{ key: 'one', label: 'Tab one' }], activeTab: 'one' }));
  await act(async () => tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === title).props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith(title, 'Full description');
  const tab = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityState?.selected);
  expect(tab.props.style[0].minHeight).toBe(48);
});
test('F06: journal save rejection clears saving, preserves content, and allows retry', async () => {
  useLocalSearchParams.mockReturnValue({ create: 'new' }); journal.addEntry.mockRejectedValueOnce(new Error('quota'));
  await mount(React.createElement(Journal));
  const content = () => tree.root.findAllByType('TextInput').find(item => item.props.multiline);
  await act(async () => content().props.onChangeText('Preserve this draft'));
  const save = () => tree.root.findAllByType(Button).find(item => item.props.label === 'journal.write_btn');
  await act(async () => save().props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith('Journal was not saved', expect.any(String)); expect(content().props.value).toBe('Preserve this draft'); expect(save().props.disabled).toBe(false);
  await act(async () => save().props.onPress()); expect(journal.addEntry).toHaveBeenCalledTimes(2);
});
test('optional AI that never responds cannot keep the journal form saving indefinitely', async () => {
  useLocalSearchParams.mockReturnValue({ create: 'new' }); processJournalAI.mockImplementation(() => new Promise(() => {}));
  await mount(React.createElement(Journal));
  await act(async () => tree.root.findAllByType('TextInput').find(item => item.props.multiline).props.onChangeText('Offline draft'));
  let pending; await act(async () => { pending = tree.root.findAllByType(Button).find(item => item.props.label === 'journal.write_btn').props.onPress(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(10000); await pending; });
  expect(journal.addEntry).toHaveBeenCalledWith(expect.objectContaining({ content: 'Offline draft', mood: 'good' }));
});
test('a large-font small-screen configuration renders all five shortcuts in a wrapping layout', async () => {
  useWindowDimensions.mockReturnValue({ width: 320, height: 640, fontScale: 1.8 }); useTheme.mockReturnValue({ isDark: true });
  await mount(React.createElement(Dashboard));
  const routes = ['habits', 'journal', 'goals', 'calendar', 'pomodoro'];
  for (const route of routes) expect(text()).toContain(route === 'pomodoro' ? 'Focus' : route === 'habits' ? 'Habits' : route === 'journal' ? 'Journal' : route === 'goals' ? 'Goals' : 'Calendar');
  expect(tree.root.findAllByType('View').some(item => Array.isArray(item.props.style) && item.props.style.some(style => style?.flexWrap === 'wrap'))).toBe(true);
});
test('dashboard shortcuts can be customized via long-press, reordered to leftmost/rightmost, and replaced with other menus', async () => {
  const updateSetting = jest.fn();
  useSettings.mockReturnValue({ settings: { hideFinanceBalance: false, dashboardShortcuts: ['habits', 'journal', 'goals', 'calendar', 'pomodoro'] }, updateSetting });
  await mount(React.createElement(Dashboard));
  // Long-press Habits (slot #1) to open properties automatically
  const habitsSlot = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === 'Habits');
  expect(habitsSlot).toBeDefined();
  await act(async () => habitsSlot.props.onLongPress());
  // Select Goals (slot #3) to swap with Habits (slot #1)
  const goalsSlot = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === 'Goals (Slot 3)');
  await act(async () => goalsSlot.props.onPress());
  expect(updateSetting).toHaveBeenCalledWith('dashboardShortcuts', ['goals', 'journal', 'habits', 'calendar', 'pomodoro']);
});
test('goal focus creation passes an explicit goal and next step instead of guessing task matches', async () => {
  readDashboardSources.mockResolvedValue({ values: { goals: [{ id: 'goal-one', title: 'Learn sensors', progress: 0, journey: [{ text: 'Sketch circuit', completed: false }] }] }, errors: [] });
  await mount(React.createElement(Dashboard));
  const button = tree.root.findAllByType('TouchableOpacity').find(item => plainText(item.props.children).includes('Create a task for this goal'));
  await act(async () => button.props.onPress());
  expect(router.push).toHaveBeenCalledWith({ pathname: '/(app)/tasks', params: expect.objectContaining({ goalId: 'goal-one', goalTitle: 'Learn sensors', nextStep: 'Sketch circuit', create: expect.any(String) }) });
});

test('task form confirms and persists the explicit goal context and next-step draft', async () => {
  useLocalSearchParams.mockReturnValue({ goalId: 'goal-one', goalTitle: 'Learn sensors', nextStep: 'Sketch circuit', create: 'new' });
  await mount(React.createElement(Tasks));
  const title = tree.root.findAllByType('TextInput').find(item => item.props.value === 'Sketch circuit'); expect(title).toBeDefined();
  const save = tree.root.findAllByType(Button).find(item => item.props.label === 'tasks.save');
  await act(async () => save.props.onPress());
  expect(useTasks().addTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sketch circuit', goalId: 'goal-one', goalTitle: 'Learn sensors' }));
});
test('goal-scoped task list excludes unrelated tasks and offers a clear way back to all tasks', async () => {
  useLocalSearchParams.mockReturnValue({ goalId: 'goal-one', goalTitle: 'Learn sensors' });
  useTasks.mockReturnValue({ ...useTasks(), tasks: [{ id: 'linked', title: 'Sketch', status: 'todo', goalId: 'goal-one' }, { id: 'other', title: 'Unrelated', status: 'todo' }] });
  await mount(React.createElement(Tasks));
  const sections = tree.root.findByType('SectionList').props.sections;
  expect(sections.flatMap(section => section.data.map(item => item.id))).toEqual(['linked']);
  expect(text()).toContain('Show all tasks');
});

const financeFixture = () => ({ transactions: [
  { id: 'income', date: '2026-10-20', type: 'income', amount: 500000, category: 'Gaji', description: 'Payday' },
  { id: 'expense', date: '2026-10-21', type: 'expense', amount: 25000, category: 'Makanan', description: 'Lunch' },
], customCategories: [], loading: false, error: false, refreshFinance: noop, addTransaction: jest.fn(noop), deleteTransaction: jest.fn(noop), addCustomCategory: jest.fn(noop), deleteCustomCategory: jest.fn(noop) });
const pressFinance = async label => {
  const button = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === label || plainText(item).trim() === label);
  expect(button).toBeDefined(); await act(async () => button.props.onPress());
};
test('finance overview keeps daily essentials while the report retains advanced metrics and export', async () => {
  useFinance.mockReturnValue(financeFixture()); await mount(React.createElement(Finance));
  expect(text()).toContain('Recent transactions'); expect(text()).not.toContain('Cash flow trend'); expect(text()).not.toContain('Average daily spending');
  await act(async () => tree.root.findByType(WhenyaHeader).props.onTabChange('reports'));
  expect(text()).toContain('Cash flow trend'); expect(text()).toContain('Average daily spending'); expect(text()).toContain('Previous period comparison'); expect(text()).toContain('Export period transactions');
});
test('finance FAB opens a minimal form, allows switching to income, preserves optional fields, and saves the intended type', async () => {
  const api = financeFixture(); useFinance.mockReturnValue(api); await mount(React.createElement(Finance));
  await pressFinance('finance.add_transaction');
  await pressFinance('finance.income');
  expect(tree.root.findAllByType('TextInput')).toHaveLength(1);
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('50000'));
  await pressFinance('Note and date'); expect(tree.root.findAllByType('TextInput')).toHaveLength(2);
  await act(async () => tree.root.findAllByType('TextInput')[1].props.onChangeText('Test note'));
  await pressFinance('finance.save'); expect(api.addTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', category: 'Gaji', amount: 50000, description: 'Test note', date: '2026-10-22' }));
});
test('finance period options keep annual reports available without an always-visible control row', async () => {
  useFinance.mockReturnValue(financeFixture()); await mount(React.createElement(Finance));
  expect(text()).not.toContain('Yearly'); await pressFinance('Choose month or year');
  const year = tree.root.findAllByType('TouchableOpacity').find(item => plainText(item).trim() === 'Yearly');
  await act(async () => year.props.onPress()); expect(text()).not.toContain('Show by');
  await act(async () => tree.root.findByType(WhenyaHeader).props.onTabChange('reports'));
  const overview = tree.root.findByType(FinanceOverview); expect(overview.props.report.trend).toHaveLength(12); expect(overview.props.report.rows).toHaveLength(2);
});
test('finance advanced tools remain reachable without cluttering the initial view', async () => {
  useFinance.mockReturnValue(financeFixture()); await mount(React.createElement(Finance));
  expect(text()).not.toContain('Manage categories');
  const more = tree.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityState?.expanded === false && plainText(item).includes('More tools'));
  await act(async () => more.props.onPress()); expect(text()).toContain('Manage categories');
  await pressFinance('Open finance books'); expect(router.push).toHaveBeenCalledWith('/finance-repository');
});
test('finance simplified overview and reports respect hidden amounts and disable export', async () => {
  useSettings.mockReturnValue({ settings: { hideFinanceBalance: true }, updateSetting: jest.fn() }); useFinance.mockReturnValue(financeFixture());
  await mount(React.createElement(Finance)); expect(text()).not.toContain('500,000'); expect(text()).not.toContain('25,000');
  await act(async () => tree.root.findByType(WhenyaHeader).props.onTabChange('reports'));
  expect(text()).toContain('Chart hidden by your privacy setting.');
  const exportButton = tree.root.findAllByType('TouchableOpacity').find(item => plainText(item).includes('Export period transactions'));
  expect(exportButton.props.disabled).toBe(true);
});
test('finance failed save keeps the simplified form and amount for retry', async () => {
  const api = financeFixture(); api.addTransaction.mockRejectedValueOnce(new Error('disk')); useFinance.mockReturnValue(api);
  await mount(React.createElement(Finance)); await pressFinance('finance.add_transaction');
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('25000'));
  await pressFinance('finance.save'); expect(tree.root.findByType('TextInput').props.value).toBe('25.000'); expect(Alert.alert).toHaveBeenCalled();
  await pressFinance('finance.save'); expect(api.addTransaction).toHaveBeenCalledTimes(2);
});

test('finance category choices stay inside the entry form and retain custom categories', async () => {
  const api = financeFixture(); api.customCategories = [{ id: 'custom', label: 'Pets', type: 'expense', emoji: 'P', color: '#123456' }];
  useFinance.mockReturnValue(api); await mount(React.createElement(Finance)); await pressFinance('finance.add_transaction');
  await pressFinance('Choose category'); expect(tree.root.findAllByType('Modal')).toHaveLength(1); expect(text()).toContain('Pets');
  await pressFinance('Pets'); expect(text()).not.toContain('Choose a category for this entry.');
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('25000'));
  await pressFinance('finance.save'); expect(api.addTransaction).toHaveBeenCalledWith(expect.objectContaining({ category: 'Pets', type: 'expense' }));
});
