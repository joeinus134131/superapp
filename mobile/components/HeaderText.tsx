import { Alert, Text, TextProps } from 'react-native';
import { useLanguage } from "../context/languageContext";


/** Truncated headers expose their full text through long press and accessibility. */
export function HeaderText({ children, style, ...props }: TextProps) {
  const { tx: translateCopy } = useLanguage();
  const label = typeof children === 'string' ? children : undefined;
  return <Text {...props} numberOfLines={1} ellipsizeMode="tail"
    accessibilityLabel={label} accessibilityHint={translateCopy("Tekan lama untuk membaca teks lengkap")}
    onLongPress={() => { if (label) Alert.alert(label); }}
    style={[{ flexShrink: 1, minWidth: 0 }, style]}>{children}</Text>;
}
