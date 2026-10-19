import { router } from 'expo-router';
import { View } from 'react-native';
import { QuickCaptureModal } from '../../components/QuickCaptureModal';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';

export default function CaptureScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const close = () => router.replace('/(app)');

  return (
    <View style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <QuickCaptureModal visible onClose={close} isDark={isDark} />
    </View>
  );
}
