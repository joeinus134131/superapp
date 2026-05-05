import { ReactNode } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useMobileLayout, MOBILE_SPACING } from '../lib/layout'

interface PageHeaderProps {
  title: string
  subtitle?: string
  textColor: string
  subtextColor: string
  borderColor?: string
  backgroundColor?: string
  actionIcon?: keyof typeof MaterialIcons.glyphMap
  actionColor?: string
  onActionPress?: () => void
  rightSlot?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  textColor,
  subtextColor,
  borderColor,
  backgroundColor = 'transparent',
  actionIcon = 'add',
  actionColor = '#8b5cf6',
  onActionPress,
  rightSlot,
}: PageHeaderProps) {
  const layout = useMobileLayout()

  return (
    <View
      style={{
        paddingTop: layout.topPadding,
        paddingHorizontal: MOBILE_SPACING.screen,
        paddingBottom: 16,
        borderBottomWidth: borderColor ? 1 : 0,
        borderBottomColor: borderColor,
        backgroundColor,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: textColor,
            fontSize: 28,
            fontWeight: '900',
            lineHeight: 34,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: subtextColor,
              fontSize: 15,
              lineHeight: 22,
              marginTop: 6,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightSlot ? rightSlot : onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.8}
          hitSlop={10}
          style={{
            width: 50,
            height: 50,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: actionColor,
          }}
        >
          <MaterialIcons name={actionIcon} size={24} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}
