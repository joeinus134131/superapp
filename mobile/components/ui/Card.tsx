import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, bordered = true }) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);

  const containerStyle = [
    styles.card,
    { 
      backgroundColor: c.bgCard, 
      borderColor: bordered ? c.border : 'transparent',
      borderWidth: bordered ? 1 : 0
    },
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  }
});
