import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, G, Text as SvgText, Defs, RadialGradient, Stop, LinearGradient, Filter, FeGaussianBlur, FeComposite } from 'react-native-svg';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';

interface RadarChartProps {
  data: {
    label: string;
    value: number; // 0 to 100
  }[];
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 200 }) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);

  const center = size / 2;
  const radius = (size / 2) * 0.65; // Reduced radius to give more space for labels
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const val = Math.max(d.value, 15);
    const x = center + (radius * (val / 100)) * Math.cos(angle);
    const y = center + (radius * (val / 100)) * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={c.purple} stopOpacity="1" />
            <Stop offset="100%" stopColor={c.cyan} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="polyFill" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={c.purple} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={c.cyan} stopOpacity="0.2" />
          </RadialGradient>
          {/* Outer Glow */}
          <Filter id="glow">
            <FeGaussianBlur stdDeviation="2" result="blur" />
            <FeComposite in="SourceGraphic" in2="blur" operator="over" />
          </Filter>
        </Defs>
        <G>
          {/* Grid Circles */}
          {gridLevels.map((level, i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={radius * level}
              fill="none"
              stroke={c.border}
              strokeWidth="1"
              opacity={0.4}
            />
          ))}

          {/* Axis Lines */}
          {data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <Line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={c.border}
                strokeWidth="1"
                opacity={0.4}
              />
            );
          })}

          {/* Polygon Fill */}
          <Polygon
            points={points}
            fill="url(#polyFill)"
          />

          {/* Polygon Stroke */}
          <Polygon
            points={points}
            fill="none"
            stroke="url(#polyGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Labels */}
          {data.map((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const labelRadius = radius + 18; // Balanced distance
            const x = center + labelRadius * Math.cos(angle);
            const y = center + labelRadius * Math.sin(angle);
            
            let anchor: any = "middle";
            if (Math.cos(angle) > 0.2) anchor = "start";
            else if (Math.cos(angle) < -0.2) anchor = "end";

            return (
              <SvgText
                key={i}
                x={x}
                y={y}
                fill={c.textPrimary}
                fontSize="8"
                fontWeight="900"
                textAnchor={anchor}
                alignmentBaseline="middle"
                opacity={0.6}
              >
                {d.label}
              </SvgText>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};
