import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProductImage } from '@/src/components/product-image';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { Product } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const { favorites, toggleFavorite } = useStore();
  const favorite = favorites.includes(product.id);
  const outOfStock = product.availability === 'ready' && product.stock <= 0;
  const availabilityLabel = outOfStock
    ? 'Em falta'
    : product.availability === 'ready'
      ? 'Pronta entrega'
      : 'Encomenda';

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/product/[id]', params: { id: product.id } })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View>
        <ProductImage uri={product.imageUrls[0]} style={styles.image} />
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
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatCurrency(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 150,
    maxWidth: '49%',
    overflow: 'hidden',
    borderRadius: radii.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    aspectRatio: 0.86,
  },
  heart: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 34,
    height: 34,
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
  content: {
    minHeight: 76,
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
});
