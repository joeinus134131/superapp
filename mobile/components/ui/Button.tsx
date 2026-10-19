import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator 
} from 'react-native';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityHint
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);

  const handlePress = () => {
    if (!loading && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: c.purple, borderColor: c.purple };
      case 'secondary':
        return { backgroundColor: c.bgInput, borderColor: c.border };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: c.purple, borderWidth: 1.5 };
      case 'danger':
        return { backgroundColor: c.red + '15', borderColor: c.red, borderWidth: 1 };
      default:
        return { backgroundColor: c.purple, borderColor: c.purple };
    }
  };

  const getTextColor = () => {
    if (disabled) return c.textMuted;
    switch (variant) {
      case 'primary': return '#fff';
      case 'secondary': return c.textPrimary;
      case 'outline': return c.purple;
      case 'danger': return c.red;
      default: return '#fff';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        getVariantStyles(),
        disabled && { opacity: 0.5 },
        style
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[
            styles.text, 
            styles[`text_${size}`], 
            { color: getTextColor() },
            textStyle
          ]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  small: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 16 },
  medium: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 20 },
  large: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 24 },
  text: { fontWeight: '700', textAlign: 'center' },
  text_small: { fontSize: 13 },
  text_medium: { fontSize: 15 },
  text_large: { fontSize: 17 },
});
