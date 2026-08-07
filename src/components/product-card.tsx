import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MarketingBadge } from '@/src/components/marketing-badge';
import { ProductImage } from '@/src/components/product-image';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { Product } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';

type ProductCardProps = {
  product: Product;
  cardWidth: number;
  imageAspectRatio: number;
};

export function ProductCard({
  product,
  cardWidth,
  imageAspectRatio,
}: ProductCardProps) {
  const { favorites, toggleFavorite } = useStore();
  const favorite = favorites.includes(product.id);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const lift = useRef(new Animated.Value(0)).current;

  const outOfStock =
    product.availability === 'ready' &&
    product.stock <= 0;

  const availabilityLabel = outOfStock
    ? 'Em falta'
    : product.availability === 'ready'
      ? 'Pronta entrega'
      : 'Encomenda';

  const hasDiscount =
    Boolean(product.originalPrice) &&
    Number(product.originalPrice) > product.price;

  const discountPercentage =
    hasDiscount && product.originalPrice
      ? Math.max(
          1,
          Math.round(
            ((product.originalPrice - product.price) /
              product.originalPrice) *
              100,
          ),
        )
      : null;

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const media = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const update = () => {
      setReduceMotion(media.matches);
    };

    update();
    media.addEventListener?.('change', update);

    return () => {
      media.removeEventListener?.('change', update);
    };
  }, []);

  useEffect(() => {
    Animated.timing(lift, {
      toValue: hovered || focused ? 1 : 0,
      duration: reduceMotion ? 0 : 190,
      useNativeDriver: false,
    }).start();
  }, [focused, hovered, lift, reduceMotion]);

  const animatedStyle =
    Platform.OS === 'web'
      ? {
          transform: [
            {
              translateY: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -5],
              }),
            },
            {
              scale: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.012],
              }),
            },
          ],
          shadowOpacity: lift.interpolate({
            inputRange: [0, 1],
            outputRange: [0.07, 0.16],
          }),
          shadowRadius: lift.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 16],
          }),
          elevation: lift.interpolate({
            inputRange: [0, 1],
            outputRange: [2, 7],
          }),
        }
      : undefined;

  return (
    <Animated.View
      style={[
        {
          width: cardWidth,
          maxWidth: cardWidth,
        },
        animatedStyle,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatCurrency(
          product.price,
        )}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={() =>
          router.push({
            pathname: '/product/[id]',
            params: { id: product.id },
          })
        }
        style={({ pressed }) => [
          styles.card,
          {
            width: cardWidth,
            maxWidth: cardWidth,
          },
          focused && styles.focused,
          pressed && styles.pressed,
        ]}>
        <View style={styles.imageWrap}>
          <ProductImage
            uri={
              hovered && product.imageUrls[1]
                ? product.imageUrls[1]
                : product.imageUrls[0]
            }
            contentFit="cover"
            style={[
              styles.image,
              { aspectRatio: imageAspectRatio },
            ]}
          />

          <View style={styles.imageOverlay} />

          <Pressable
            accessibilityLabel={
              favorite
                ? 'Remover dos favoritos'
                : 'Adicionar aos favoritos'
            }
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              toggleFavorite(product.id);
            }}
            style={({ pressed }) => [
              styles.heart,
              pressed && styles.heartPressed,
            ]}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={22}
              color={
                favorite
                  ? colors.danger
                  : colors.primaryDark
              }
            />
          </Pressable>

          {discountPercentage ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                -{discountPercentage}%
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.availability,
              product.availability === 'custom' &&
                styles.availabilityCustom,
              outOfStock &&
                styles.availabilityOutOfStock,
            ]}>
            <Text
              style={[
                styles.availabilityText,
                outOfStock &&
                  styles.availabilityTextOutOfStock,
              ]}>
              {availabilityLabel}
            </Text>
          </View>

          {product.marketingBadge ? (
            <MarketingBadge
              badge={product.marketingBadge}
            />
          ) : null}
        </View>

        <View style={styles.content}>
          <Text
            numberOfLines={2}
            style={styles.name}>
            {product.name}
          </Text>

          <View style={styles.priceBlock}>
            {hasDiscount && product.originalPrice ? (
              <Text style={styles.originalPrice}>
                {formatCurrency(product.originalPrice)}
              </Text>
            ) : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {formatCurrency(product.price)}
              </Text>

              {product.availability === 'custom' ? (
                <Text style={styles.customHint}>
                  sob encomenda
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 18,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  focused: {
    borderWidth: 2,
    borderColor: colors.primary,
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },

  imageWrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F7F1EA',
  },

  image: {
    width: '100%',
  },

  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: 'rgba(24,16,12,0.05)',
  },

  heart: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.14)',
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    ...shadow,
  },

  heartPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.94 }],
  },

  discountBadge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    minHeight: 29,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C94E39',
  },

  discountBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },

  availability: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242,247,240,0.94)',
  },

  availabilityCustom: {
    backgroundColor: 'rgba(255,247,226,0.95)',
  },

  availabilityOutOfStock: {
    backgroundColor: 'rgba(255,235,235,0.96)',
  },

  availabilityText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '800',
  },

  availabilityTextOutOfStock: {
    color: colors.danger,
  },

  content: {
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  name: {
    minHeight: 39,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },

  priceBlock: {
    marginTop: spacing.sm,
  },

  originalPrice: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },

  priceRow: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.sm,
  },

  price: {
    color: '#8B451C',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },

  customHint: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
});