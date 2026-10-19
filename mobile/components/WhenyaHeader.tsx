import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { BrandLogo } from './BrandLogo';
import { useLanguage } from "../context/languageContext";


export interface WhenyaHeaderTab {
  key: string;
  label: string;
  count?: number;
}

export interface WhenyaHeaderAction {
  icon?: keyof typeof Ionicons.glyphMap;
  materialIcon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel?: string;
}

export interface WhenyaHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showBrandLogo?: boolean;
  rightAction?: WhenyaHeaderAction;
  rightSlot?: ReactNode;
  tabs?: (string | WhenyaHeaderTab)[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  style?: ViewStyle;
  borderBottom?: boolean;
  backgroundColor?: string;
}

export function WhenyaHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  showBrandLogo = false,
  rightAction,
  rightSlot,
  tabs,
  activeTab,
  onTabChange,
  style,
  borderBottom = true,
  backgroundColor,
}: WhenyaHeaderProps) {
  const { tx: translateCopy } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const c = useColors(isDark);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const headerBg = backgroundColor || c.bgPrimary;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E8ECE1';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top > 0 ? insets.top + 4 : 14,
          backgroundColor: headerBg,
          borderBottomWidth: borderBottom ? 1 : 0,
          borderBottomColor: borderColor,
        },
        style,
      ]}
    >
      {/* Navigation Main Row */}
      <View style={styles.navRow}>
        <View style={styles.leftGroup}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={[
                styles.backButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECEFE6' },
              ]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={translateCopy("Kembali")}
            >
              <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
            </TouchableOpacity>
          )}

          {showBrandLogo && (
            <View style={styles.brandWrapper}>
              <BrandLogo size={26} variant="horizontal" />
            </View>
          )}

          {title ? (
            <View style={styles.titleWrapper}>
              <Text
                style={[
                  styles.titleText,
                  { color: c.textPrimary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitleText, { color: c.textSecondary }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Right Group */}
        <View style={styles.rightGroup}>
          {rightSlot ? (
            rightSlot
          ) : rightAction ? (
            <TouchableOpacity
              onPress={rightAction.onPress}
              style={[
                styles.actionButton,
                rightAction.variant === 'ghost'
                  ? { backgroundColor: 'transparent' }
                  : rightAction.variant === 'secondary'
                    ? { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECEFE6' }
                    : { backgroundColor: isDark ? '#3D6850' : '#193F30' },
              ]}
              activeOpacity={0.8}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={rightAction.accessibilityLabel || rightAction.label || 'Aksi'}
            >
              {rightAction.materialIcon ? (
                <MaterialIcons
                  name={rightAction.materialIcon}
                  size={20}
                  color={
                    rightAction.variant === 'secondary' || rightAction.variant === 'ghost'
                      ? c.textPrimary
                      : '#FFFFFF'
                  }
                />
              ) : rightAction.icon ? (
                <Ionicons
                  name={rightAction.icon}
                  size={19}
                  color={
                    rightAction.variant === 'secondary' || rightAction.variant === 'ghost'
                      ? c.textPrimary
                      : '#FFFFFF'
                  }
                />
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs Row (Segmented Filter Pills) */}
      {tabs && tabs.length > 0 && (
        <View style={styles.tabsRow}>
          {tabs.map((tabItem) => {
            const key = typeof tabItem === 'string' ? tabItem : tabItem.key;
            const label = typeof tabItem === 'string' ? tabItem : tabItem.label;
            const count = typeof tabItem === 'object' ? tabItem.count : undefined;
            const isActive = activeTab === key || activeTab === label;

            return (
              <TouchableOpacity
                key={key}
                onPress={() => onTabChange?.(key)}
                style={[
                  styles.tabPill,
                  isActive
                    ? {
                        backgroundColor: isDark ? '#3D6850' : '#193F30',
                      }
                    : {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E8ECE1',
                      },
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? '#FFFFFF' : isDark ? c.textSecondary : '#5B6956',
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
                {count !== undefined && count > 0 ? (
                  <View
                    style={[
                      styles.tabCount,
                      {
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.22)'
                          : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        { color: isActive ? '#FFFFFF' : c.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  navRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandWrapper: {
    marginRight: 2,
    flexShrink: 0,
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#193F30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 2,
    gap: 8,
    flexWrap: 'wrap',
  },
  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
  },
  tabCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
