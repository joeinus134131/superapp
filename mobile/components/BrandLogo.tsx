import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle } from 'react-native-svg';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: number;
  textColor?: string;
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  size = 40, 
  showText = true, 
  textSize = 24,
  textColor,
  style
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const color = textColor || c.textPrimary;

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={c.purple} />
            <Stop offset="100%" stopColor={c.cyan} />
          </LinearGradient>
          <LinearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="white" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <G>
          {/* Background Aura */}
          <Circle cx="50" cy="50" r="45" fill="url(#mainGrad)" opacity="0.1" />
          
          {/* Main Icon Body */}
          <Path
            d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80 C67 80 80 67 80 50 C80 33 67 20 50 20 Z"
            fill="url(#mainGrad)"
            opacity="0.2"
          />
          
          {/* Stylized Leaf/Infinity Shape */}
          <Path
            d="M50 30 C40 30 32 38 32 50 C32 62 40 70 50 70 C60 70 68 62 68 50 C68 38 60 30 50 30 Z M50 38 C57 38 62 43 62 50 C62 57 57 62 50 62 C43 62 38 57 38 50 C38 43 43 38 50 38 Z"
            fill="url(#mainGrad)"
          />
          
          {/* Glass Overlay Element */}
          <Path
            d="M35 50 Q50 30 65 50 Q50 70 35 50"
            fill="url(#glassGrad)"
          />
          
          {/* Accent Dot */}
          <Circle cx="50" cy="50" r="4" fill="white" />
        </G>
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.selfText, { fontSize: textSize, color: color }]}>Self</Text>
          <Text style={[styles.oneText, { fontSize: textSize, color: color }]}>One</Text>
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
    flexDirection: 'row',
    marginLeft: 10,
  },
  selfText: {
    fontWeight: '900', // Bold for "Self"
  },
  oneText: {
    fontWeight: '300', // Normal/Light for "One"
  },
});
