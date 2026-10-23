import React, { ReactNode, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Alert, ScrollView } from 'react-native';
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
  const { tx: translateCopy, language } = useLanguage();
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
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityHint={language === 'id' ? 'Ketuk untuk membaca judul dan keterangan lengkap' : 'Tap to read the full title and description'} onPress={() => Alert.alert(title, subtitle)} style={styles.titleWrapper}>
              <Text
                style={[
                  styles.titleText,
                  { color: c.textPrimary },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitleText, { color: c.textSecondary }]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              ) : null}
            </TouchableOpacity>
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

      {/* Tabs Row (Segmented Filter Pills - Horizontal Scrollable) */}
      {tabs && tabs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map((tabItem) => {
            const key = typeof tabItem === 'string' ? tabItem : tabItem.key;
            const label = typeof tabItem === 'string' ? tabItem : tabItem.label;
            const count = typeof tabItem === 'object' ? tabItem.count : undefined;
            const isActive = activeTab === key || activeTab === label;

            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
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
        </ScrollView>
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
    minHeight: 64,
    paddingVertical: 8,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandWrapper: {
    marginRight: 2,
    flexShrink: 0,
  },
  titleWrapper: {
    minHeight: 48,
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
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  tabPill: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    flexShrink: 1,
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
