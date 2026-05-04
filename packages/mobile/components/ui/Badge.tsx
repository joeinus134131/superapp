import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'subtle' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  color, 
  variant = 'subtle',
  style,
  textStyle
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const baseColor = color || c.purple;

  const getVariantStyles = () => {
    switch (variant) {
      case 'solid':
        return { backgroundColor: baseColor };
      case 'subtle':
        return { backgroundColor: baseColor + '15' };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: baseColor, borderWidth: 1 };
      default:
        return { backgroundColor: baseColor + '15' };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'solid': return '#fff';
      case 'subtle': return baseColor;
      case 'outline': return baseColor;
      default: return baseColor;
    }
  };

  return (
    <View style={[styles.badge, getVariantStyles(), style]}>
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  }
});
