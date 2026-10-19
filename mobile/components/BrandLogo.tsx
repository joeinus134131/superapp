import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
  textSize?: number;
  textColor?: string;
  variant?: 'icon' | 'horizontal' | 'vertical';
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  size = 38, 
  showText = true, 
  showTagline = false,
  textSize = 22,
  textColor,
  variant,
  style
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const color = textColor || c.textPrimary;

  if (variant === 'horizontal' || (showText && showTagline)) {
    const width = Math.round(size * 2.8);
    const height = Math.round((width * 119) / 392);
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('../assets/whenya-logo.png')}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (variant === 'vertical') {
    const width = Math.round(size * 1.8);
    const height = Math.round((width * 360) / 485);
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('../assets/whenya-vertical.png')}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const iconHeight = size;
  const iconWidth = Math.round((iconHeight * 290) / 195);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/whenya-icon.png')}
        style={{ width: iconWidth, height: iconHeight }}
        resizeMode="contain"
      />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { fontSize: textSize, color: color }]}>whenya</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  brandText: {
    fontWeight: '900',
    letterSpacing: -0.6,
  },
});

