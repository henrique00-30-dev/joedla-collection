import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProductImage } from '@/src/components/product-image';
import { colors, radii, spacing } from '@/src/theme';
import { Product } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';

import { PromotionSectionCard } from './promotion-section-card';

type PromotionProductSectionProps = {
  open: boolean;
  onToggle: () => void;
  isNew: boolean;
  products: Product[];
  selectedProduct: Product | undefined;
  selectedProductId: string;
  originalPrice: number;
  error?: string;
  onSelectProduct: (productId: string) => void;
};

export function PromotionProductSection({
  open,
  onToggle,
  isNew,
  products,
  selectedProduct,
  selectedProductId,
  originalPrice,
  error,
  onSelectProduct,
}: PromotionProductSectionProps) {
  const activeProducts = products.filter(
    (product) => product.active,
  );

  return (
    <PromotionSectionCard
      icon="bag-handle-outline"
      title="Produto"
      description="Escolha qual item receberá a promoção."
      open={open}
      onToggle={onToggle}>
      {isNew ? (
        activeProducts.length ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.productListScroll}
            contentContainerStyle={styles.productList}>
            {activeProducts.map((product) => {
              const selected =
                product.id === selectedProductId;

              return (
                <Pressable
                  key={product.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    onSelectProduct(product.id)
                  }
                  style={({ pressed }) => [
                    styles.productOption,
                    selected &&
                      styles.productOptionSelected,
                    pressed && styles.pressed,
                  ]}>
                  <ProductImage
                    uri={product.imageUrls[0] ?? ''}
                    contentFit="cover"
                    style={styles.productOptionImage}
                  />

                  <View style={styles.productOptionCopy}>
                    <Text
                      numberOfLines={1}
                      style={styles.productOptionName}>
                      {product.name}
                    </Text>

                    <Text
                      style={styles.productOptionPrice}>
                      {formatCurrency(
                        product.originalPrice ??
                          product.price,
                      )}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selected
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={22}
                    color={
                      selected
                        ? colors.primary
                        : colors.textMuted
                    }
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>
            Nenhum produto ativo encontrado.
          </Text>
        )
      ) : selectedProduct ? (
        <View style={styles.selectedProductCard}>
          <ProductImage
            uri={selectedProduct.imageUrls[0] ?? ''}
            contentFit="cover"
            style={styles.selectedProductImage}
          />

          <View style={styles.selectedProductCopy}>
            <Text
              numberOfLines={2}
              style={styles.selectedProductName}>
              {selectedProduct.name}
            </Text>

            <Text style={styles.selectedProductPrice}>
              Preço normal:{' '}
              {formatCurrency(originalPrice)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Produto não encontrado.
        </Text>
      )}

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </PromotionSectionCard>
  );
}

const styles = StyleSheet.create({
  productListScroll: {
    width: '100%',
    maxHeight: 360,
  },

  productList: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },

  productOption: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },

  productOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceWarm,
  },

  productOptionImage: {
    width: 58,
    height: 58,
    borderRadius: radii.small,
  },

  productOptionCopy: {
    minWidth: 0,
    flex: 1,
  },

  productOptionName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  productOptionPrice: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },

  selectedProductCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceWarm,
  },

  selectedProductImage: {
    width: 72,
    height: 72,
    borderRadius: radii.small,
  },

  selectedProductCopy: {
    minWidth: 0,
    flex: 1,
  },

  selectedProductName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  selectedProductPrice: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  errorText: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },

  pressed: {
    opacity: 0.72,
  },
});