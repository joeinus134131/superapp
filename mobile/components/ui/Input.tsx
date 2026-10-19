import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  TextInputProps 
} from 'react-native';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  containerStyle, 
  inputStyle, 
  labelStyle,
  leftIcon,
  ...props 
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: c.textSecondary }, labelStyle]}>
          {label}
        </Text>
      )}
      <View style={[styles.inputShell, { backgroundColor: c.bgInput, borderColor: error ? c.red : c.border }]}>
        {leftIcon ? <MaterialIcons name={leftIcon} size={20} color={c.textMuted} style={styles.leftIcon} /> : null}
        <TextInput style={[styles.input, { color: c.textPrimary }, inputStyle]} placeholderTextColor={c.textMuted} accessibilityLabel={props.accessibilityLabel || label} accessibilityState={{ disabled: props.editable === false }} {...props} />
      </View>
      {error && (
        <Text style={[styles.error, { color: c.red }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputShell: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  leftIcon: { marginRight: 10 },
  error: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  }
});
