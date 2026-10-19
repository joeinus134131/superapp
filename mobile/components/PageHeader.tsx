import React, { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from './WhenyaHeader';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  textColor?: string;
  subtextColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  actionIcon?: keyof typeof MaterialIcons.glyphMap;
  actionColor?: string;
  onActionPress?: () => void;
  rightSlot?: ReactNode;
  showBack?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actionIcon,
  onActionPress,
  rightSlot,
  backgroundColor,
  showBack,
}: PageHeaderProps) {
  return (
    <WhenyaHeader
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      backgroundColor={backgroundColor}
      rightAction={
        onActionPress
          ? {
              materialIcon: actionIcon || 'add',
              onPress: onActionPress,
            }
          : undefined
      }
      rightSlot={rightSlot}
    />
  );
}

export { WhenyaHeader };
