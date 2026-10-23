jest.mock('react-native', () => ({ View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', Image: 'Image', StyleSheet: { create: value => value }, AppState: { addEventListener: () => ({ remove: () => {} }) } }));
jest.mock('expo-router', () => { const React = require('react'); const Stack = ({ children }) => React.createElement('Stack', null, children); Stack.Protected = ({ guard, children }) => guard ? children : null; Stack.Screen = ({ name }) => React.createElement('Screen', { name }); return { Stack }; });
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('../assets/fonts/SpaceMono-Regular.ttf', () => 1);
jest.mock('../context/themeContext', () => ({ ThemeProvider: ({ children }) => children, useTheme: () => ({ isDark: false, isChangingTheme: false }) }));
jest.mock('../context/premiumContext', () => ({ PremiumProvider: ({ children }) => children }));
jest.mock('../context/settingsContext', () => ({ SettingsProvider: ({ children }) => children }));
jest.mock('../context/languageContext', () => ({ LanguageProvider: ({ children }) => children, useLanguage: () => ({ t: value => value, tx: value => value }) }));
jest.mock('../context/securityContext', () => ({ SecurityProvider: ({ children }) => children, useSecurity: jest.fn() }));
jest.mock('../hooks/useAuth', () => ({ AuthProvider: ({ children }) => children, useAuth: jest.fn() }));
jest.mock('../components/LockScreen', () => ({ LockScreen: () => require('react').createElement('LockScreen') }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../lib/theme', () => ({ useColors: () => ({}) }));
jest.mock('../lib/runtimeConfig', () => ({ getMobileSupabaseConfig: () => ({}) }));
jest.mock('../lib/storageAdapter', () => ({ initMobileStorage: jest.fn() }));
jest.mock('../lib/databaseSync', () => ({ scheduleDatabaseSync: jest.fn() }));
jest.mock('../lib/syncService', () => ({ initAutoSyncListener: () => () => {} }));
jest.mock('@superapp/shared', () => ({ configureSupabaseRuntime: jest.fn() }));
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSecurity } from '../context/securityContext';
import Root from '../app/_layout';
const { create, act } = require('./helpers/renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let tree;
afterEach(async () => { if (tree) { await act(async () => tree.unmount()); tree = null; } });
test.each([
  [null, true, false, '(auth)'],
  [{ id: 'one' }, true, false, '(app)'],
  [{ id: 'one' }, false, false, 'onboarding'],
  [{ id: 'one' }, true, true, '(auth)'],
])('root navigator protects app/auth/onboarding routes and leaves the canonical callback available', async (user, isOnboarded, needsPasswordReset, expected) => {
  useAuth.mockReturnValue({ user, isOnboarded, needsPasswordReset, loading: false }); useSecurity.mockReturnValue({ isLocked: false });
  await act(async () => { tree = create(<Root />); });
  expect(tree.root.findAllByType('Screen').map(item => item.props.name)).toEqual([expected, 'auth/callback']);
});
test('a locked session still renders the lock screen instead of exposing application routes', async () => {
  useAuth.mockReturnValue({ user: { id: 'one' }, isOnboarded: true, loading: false }); useSecurity.mockReturnValue({ isLocked: true });
  await act(async () => { tree = create(<Root />); }); expect(tree.root.findAllByType('Screen')).toHaveLength(0); expect(tree.root.findAllByType('LockScreen')).toHaveLength(1);
});
