import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, QuantityStepper } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function CartScreen() {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
  } = useStore();

  return (
    <Screen>
      <AppHeader compact title="Carrinho" />
      {!cart.length ? (
        <EmptyState
          icon="bag-handle-outline"
          title="Seu carrinho está vazio"
          message="Adicione roupas e bolsas para montar seu pedido."
          actionLabel="Ver produtos"
          onAction={() => router.push('/(tabs)/categories')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <View style={styles.delivery}>
              <Ionicons name="gift-outline" size={21} color={colors.success} />
              <View style={styles.deliveryText}>
                <Text style={styles.deliveryTitle}>Entrega grátis em Rosário do Catete</Text>
                <Text style={styles.deliverySubtitle}>
                  Para outras cidades, combine pelo WhatsApp.
                </Text>
              </View>
            </View>

            {cart.map((item) => (
              <View key={item.key} style={styles.item}>
                <ProductImage uri={item.imageUrl} style={styles.itemImage} />
                <View style={styles.itemContent}>
                  <Text numberOfLines={2} style={styles.itemName}>
                    {item.productName}
                  </Text>
                  <Text style={styles.variants}>
                    {[
                      item.selectedSize ? `Tam. ${item.selectedSize}` : '',
                      item.selectedColor ?? '',
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'Sem variação'}
                  </Text>
                  <Text style={styles.availability}>
                    {item.availability === 'ready' ? 'Pronta entrega' : 'Por encomenda'}
                  </Text>
                  <View style={styles.itemBottom}>
                    <Text style={styles.price}>{formatCurrency(item.unitPrice)}</Text>
                    <QuantityStepper
                      value={item.quantity}
                      maximum={item.availability === 'ready' ? item.stock : 99}
                      onChange={(value) => updateCartQuantity(item.key, value)}
                    />
                  </View>
                </View>
                <Pressable
                  accessibilityLabel="Remover produto"
                  hitSlop={10}
                  onPress={() => removeFromCart(item.key)}
                  style={styles.remove}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(cartSubtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Entrega em Rosário</Text>
                <Text style={styles.free}>Grátis</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.total}>{formatCurrency(cartSubtotal)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Total do pedido</Text>
              <Text style={styles.footerTotal}>{formatCurrency(cartSubtotal)}</Text>
            </View>
            <Button onPress={() => router.push('/checkout')} style={styles.checkoutButton}>
              Continuar
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  delivery: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
  },
  deliveryText: {
    flex: 1,
    gap: 2,
  },
  deliveryTitle: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  deliverySubtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
  item: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    ...shadow,
  },
  itemImage: {
    width: 92,
    height: 116,
    borderRadius: radii.small,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    paddingRight: 28,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  variants: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
  },
  availability: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  itemBottom: {
    flex: 1,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  price: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  remove: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  summary: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  free: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
  },
  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  total: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  footer: {
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footerTotal: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  checkoutButton: {
    minWidth: 154,
  },
});
