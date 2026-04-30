import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const MOBILE_SPACING = {
  screen: 20,
  gap: 14,
  cardRadius: 20,
  cardPadding: 18,
}

export function useMobileLayout() {
  const insets = useSafeAreaInsets()

  return {
    insets,
    screenPadding: MOBILE_SPACING.screen,
    topPadding: Math.max(insets.top + 10, 24),
    bottomPadding: Math.max(insets.bottom + 96, 112),
    contentBottomPadding: Math.max(insets.bottom + 32, 40),
    tabBarHeight: 62 + insets.bottom,
    tabBarPaddingBottom: Math.max(insets.bottom, 10),
  }
}

export function getTwoColumnCardWidth(screenWidth: number, horizontalPadding = MOBILE_SPACING.screen, gap = MOBILE_SPACING.gap) {
  return (screenWidth - horizontalPadding * 2 - gap) / 2
}
