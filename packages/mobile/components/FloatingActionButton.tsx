import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import { useMobileLayout } from '../lib/layout';
import { triggerHaptic } from '../lib/haptics';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  color?: string;
  style?: ViewStyle;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  color,
  style,
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

  const fabColor = color || c.purple;

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: fabColor,
          bottom: Math.max(layout.insets.bottom, 20) + 16,
          right: 20,
        },
        style,
      ]}
      onPress={() => {
        triggerHaptic('medium');
        onPress();
      }}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon} size={28} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 999,
  },
});
