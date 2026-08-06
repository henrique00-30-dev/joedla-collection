import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
import type { Product } from '@/src/types';

type MarketingBadgeProps = {
  badge: NonNullable<Product['marketingBadge']>;
};

export function MarketingBadge({
  badge,
}: MarketingBadgeProps) {
  const positionStyle =
    badge.position === 'top-right'
      ? styles.topRight
      : badge.position === 'bottom-left'
        ? styles.bottomLeft
        : badge.position === 'bottom-right'
          ? styles.bottomRight
          : styles.topLeft;

  const sizeStyle =
    badge.size === 'small'
      ? styles.small
      : badge.size === 'large'
        ? styles.large
        : styles.medium;

  const shapeStyle =
    badge.shape === 'square'
      ? styles.square
      : badge.shape === 'rounded'
        ? styles.rounded
        : styles.pill;

  return (
    <View
      style={[
        styles.base,
        positionStyle,
        sizeStyle,
        shapeStyle,
        badgeToneStyles[badge.tone],
      ]}>
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          badge.size === 'small' && styles.textSmall,
          badge.size === 'large' && styles.textLarge,
        ]}>
        {badge.label}
      </Text>
    </View>
  );
}

const badgeToneStyles = StyleSheet.create({
  wine: {
    backgroundColor: '#6F243A',
  },
  caramel: {
    backgroundColor: '#A66A3F',
  },
  dark: {
    backgroundColor: '#2C2522',
  },
  success: {
    backgroundColor: '#2D6A4F',
  },
  attention: {
    backgroundColor: '#A44A1F',
  },
});

const styles = StyleSheet.create({
  base: {
    zIndex: 4,
    maxWidth: '62%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topLeft: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
  },

  topRight: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },

  bottomLeft: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
  },

  bottomRight: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
  },

  small: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  medium: {
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  large: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  pill: {
    borderRadius: radii.pill,
  },

  rounded: {
    borderRadius: radii.small,
  },

  square: {
    borderRadius: 0,
  },

  text: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },

  textSmall: {
    fontSize: 8,
  },

  textLarge: {
    fontSize: 12,
  },
});