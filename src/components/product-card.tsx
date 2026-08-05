import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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

export function ProductCard({ product, cardWidth, imageAspectRatio }: ProductCardProps) {
  const { favorites, toggleFavorite } = useStore();
  const favorite = favorites.includes(product.id);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lift = useRef(new Animated.Value(0)).current;
  const outOfStock = product.availability === 'ready' && product.stock <= 0;
  const availabilityLabel = outOfStock
    ? 'Em falta'
    : product.availability === 'ready'
      ? 'Pronta entrega'
      : 'Encomenda';

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    Animated.timing(lift, {
      toValue: hovered || focused ? 1 : 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: false,
    }).start();
  }, [focused, hovered, lift, reduceMotion]);

  const animatedStyle = Platform.OS === 'web' ? {
    transform: [
      { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
      { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
    ],
    shadowOpacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] }),
    shadowRadius: lift.interpolate({ inputRange: [0, 1], outputRange: [8, 18] }),
    elevation: lift.interpolate({ inputRange: [0, 1], outputRange: [2, 8] }),
  } : undefined;

  return (
    <Animated.View style={[{ width: cardWidth, maxWidth: cardWidth }, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatCurrency(product.price)}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={() =>
          router.push({ pathname: '/product/[id]', params: { id: product.id } })
        }
        style={({ pressed }) => [
          styles.card,
          { width: cardWidth, maxWidth: cardWidth },
          focused && styles.focused,
          pressed && styles.pressed,
        ]}>
      <View>
        <ProductImage
          uri={hovered && product.imageUrls[1] ? product.imageUrls[1] : product.imageUrls[0]}
          contentFit='cover'
          style={[styles.image, { aspectRatio: imageAspectRatio }]}
        />
        <Pressable
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            toggleFavorite(product.id);
          }}
          style={styles.heart}>
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={21}
            color={favorite ? colors.danger : colors.text}
          />
        </Pressable>
        <View
          style={[
            styles.availability,
            product.availability === 'custom' && styles.availabilityCustom,
            outOfStock && styles.availabilityOutOfStock,
          ]}>
          <Text
            style={[
              styles.availabilityText,
              outOfStock && styles.availabilityTextOutOfStock,
            ]}>
            {availabilityLabel}
          </Text>
        </View>
        {product.marketingBadge ? (
          <View style={[styles.marketingBadge, badgeToneStyles[product.marketingBadge.tone]]}>
            <Text style={styles.marketingBadgeText} numberOfLines={1}>
              {product.marketingBadge.label}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          {product.originalPrice && product.originalPrice > product.price ? (
            <Text style={styles.originalPrice}>{formatCurrency(product.originalPrice)}</Text>
          ) : null}
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
}

const badgeToneStyles = StyleSheet.create({
  wine: { backgroundColor: '#6F243A' },
  caramel: { backgroundColor: '#A66A3F' },
  dark: { backgroundColor: '#2C2522' },
  success: { backgroundColor: '#2D6A4F' },
  attention: { backgroundColor: '#A44A1F' },
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow,
  },
  focused: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
  },
  heart: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  availability: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
  },
  availabilityCustom: {
    backgroundColor: colors.warningSoft,
  },
  availabilityOutOfStock: {
    backgroundColor: colors.dangerSoft,
  },
  availabilityText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  availabilityTextOutOfStock: {
    color: colors.danger,
  },
  marketingBadge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    maxWidth: '62%',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  marketingBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    minHeight: 82,
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    minHeight: 36,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  price: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  priceRow: {
    minHeight: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  originalPrice: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
});
