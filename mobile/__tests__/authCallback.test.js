jest.mock('react-native', () => ({ View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', TouchableOpacity: 'TouchableOpacity' }));
jest.mock('expo-linking', () => ({ useURL: jest.fn(), getInitialURL: jest.fn(async () => null) }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../context/themeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../context/languageContext', () => ({ useLanguage: () => ({ tx: value => value }) }));
import React from 'react';
import { useURL } from 'expo-linking';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import Callback from '../app/auth/callback';
const { create, act } = require('./helpers/renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let tree;
beforeEach(() => { jest.clearAllMocks(); useURL.mockReturnValue('selfone://auth/callback?code=fixture'); });
afterEach(async () => { if (tree) { await act(async () => tree.unmount()); tree = null; } });
test.each([[false, true, '/(app)'], [false, false, '/onboarding'], [true, true, '/(auth)/reset-password']])('actual callback screen selects the correct recovery/onboarding destination', async (recovery, onboarded, destination) => {
  useAuth.mockReturnValue({ consumeAuthRedirect: async () => ({ success: true, recovery }), isOnboarded: onboarded });
  await act(async () => { tree = create(<Callback />); }); expect(router.replace).toHaveBeenCalledWith(destination);
});
test('failed verification stays on an error screen and does not navigate into the app', async () => {
  useAuth.mockReturnValue({ consumeAuthRedirect: async () => ({ success: false, error: 'Expired link' }), isOnboarded: true });
  await act(async () => { tree = create(<Callback />); }); expect(router.replace).not.toHaveBeenCalled();
  expect(tree.root.findAllByType('Text').some(item => item.props.children === 'Expired link')).toBe(true);
});
