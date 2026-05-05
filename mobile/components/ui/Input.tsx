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

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  containerStyle, 
  inputStyle, 
  labelStyle,
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
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: c.bgInput, 
            color: c.textPrimary, 
            borderColor: error ? c.red : c.border 
          },
          inputStyle
        ]}
        placeholderTextColor={c.textMuted}
        {...props}
      />
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
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    fontWeight: '700',
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  }
});
