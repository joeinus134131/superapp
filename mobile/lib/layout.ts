import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const MOBILE_SPACING = {
  screen: 20,
  gap: 14,
  cardRadius: 16,
  cardPadding: 18,
}

export function useMobileLayout() {
  const insets = useSafeAreaInsets()
  const tabBarPaddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 12)
  const tabBarHeight = 60 + tabBarPaddingBottom

  return {
    insets,
    screenPadding: MOBILE_SPACING.screen,
    topPadding: Math.max(insets.top + 10, 24),
    bottomPadding: tabBarHeight + 32,
    contentBottomPadding: Math.max(insets.bottom + 32, 40),
    tabBarHeight,
    tabBarPaddingBottom,
  }
}

export function getTwoColumnCardWidth(screenWidth: number, horizontalPadding = MOBILE_SPACING.screen, gap = MOBILE_SPACING.gap) {
  return (screenWidth - horizontalPadding * 2 - gap) / 2
}
