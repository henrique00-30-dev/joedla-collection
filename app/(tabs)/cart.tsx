import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, QuantityStepper } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function CartScreen() {
  const {
    cart,
    cartSubtotal,
    updateCartQuantity,
    removeFromCart,
    refreshStore,
  } = useStore();

  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const refreshStoreRef = useRef(refreshStore);
  refreshStoreRef.current = refreshStore;

  useFocusEffect(
    useCallback(() => {
      void refreshStoreRef.current().catch(() => undefined);
    }, []),
  );

  if (!cart.length) {
    return (
      <Screen>
        <AppHeader compact title="Carrinho" showBack showStoreHome />

        <EmptyState
          icon="bag-handle-outline"
          title="Seu carrinho está vazio"
          message="Adicione roupas e bolsas para montar seu pedido."
          actionLabel="Ver produtos"
          onAction={() => router.push('/(tabs)/categories')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader
        compact
        title="Carrinho"
        showBack
        showStoreHome
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          desktop && styles.contentDesktop,
        ]}
        showsVerticalScrollIndicator>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.eyebrow}>
              SEU PEDIDO
            </Text>

            <Text style={styles.title}>
              Revise os produtos
            </Text>

            <Text style={styles.subtitle}>
              Confirme quantidades e variações antes de seguir
              para o checkout.
            </Text>
          </View>

          <View style={styles.itemsCount}>
            <Ionicons
              name="bag-handle-outline"
              size={18}
              color={colors.primary}
            />

            <Text style={styles.itemsCountText}>
              {cart.length}{' '}
              {cart.length === 1 ? 'item' : 'itens'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.layout,
            desktop && styles.layoutDesktop,
          ]}>
          <View style={styles.itemsColumn}>
            <View style={styles.delivery}>
              <View style={styles.deliveryIcon}>
                <Ionicons
                  name="car-outline"
                  size={22}
                  color={colors.success}
                />
              </View>

              <View style={styles.deliveryText}>
                <Text style={styles.deliveryTitle}>
                  Entrega grátis em Rosário do Catete
                </Text>

                <Text style={styles.deliverySubtitle}>
                  Para outras cidades, combine pelo WhatsApp.
                </Text>
              </View>
            </View>

            <View style={styles.itemsList}>
              {cart.map((item) => (
                <View key={item.key} style={styles.item}>
                  <View style={styles.imageWrap}>
                    <ProductImage
                      uri={item.imageUrl}
                      contentFit="cover"
                      style={styles.itemImage}
                    />

                    <View
                      style={[
                        styles.availabilityBadge,
                        item.availability === 'custom' &&
                          styles.availabilityBadgeCustom,
                      ]}>
                      <Text
                        style={[
                          styles.availabilityBadgeText,
                          item.availability === 'custom' &&
                            styles.availabilityBadgeTextCustom,
                        ]}>
                        {item.availability === 'ready'
                          ? 'Pronta entrega'
                          : 'Encomenda'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemTop}>
                      <View style={styles.itemCopy}>
                        <Text
                          numberOfLines={2}
                          style={styles.itemName}>
                          {item.productName}
                        </Text>

                        <Text style={styles.variants}>
                          {[
                            item.selectedSize
                              ? `Tam. ${item.selectedSize}`
                              : '',
                            item.selectedColor ?? '',
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'Sem variação'}
                        </Text>
                      </View>

                      <Pressable
                        accessibilityLabel="Remover produto"
                        hitSlop={10}
                        onPress={() =>
                          removeFromCart(item.key)
                        }
                        style={({ pressed }) => [
                          styles.remove,
                          pressed && styles.removePressed,
                        ]}>
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={colors.danger}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.itemBottom}>
                      <View style={styles.itemPrices}>
                        {item.originalUnitPrice &&
                        item.originalUnitPrice >
                          item.unitPrice ? (
                          <Text style={styles.originalPrice}>
                            {formatCurrency(
                              item.originalUnitPrice,
                            )}
                          </Text>
                        ) : null}

                        <Text style={styles.price}>
                          {formatCurrency(item.unitPrice)}
                        </Text>
                      </View>

                      <QuantityStepper
                        value={item.quantity}
                        maximum={
                          item.availability === 'ready'
                            ? item.stock
                            : 99
                        }
                        onChange={(value) =>
                          updateCartQuantity(item.key, value)
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.summary,
              desktop && styles.summaryDesktop,
            ]}>
            <Text style={styles.summaryTitle}>
              Resumo do pedido
            </Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal
              </Text>

              <Text style={styles.summaryValue}>
                {formatCurrency(cartSubtotal)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Entrega em Rosário
              </Text>

              <Text style={styles.free}>Grátis</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>
                  Total
                </Text>

                <Text style={styles.totalHint}>
                  Valor final do pedido
                </Text>
              </View>

              <Text style={styles.total}>
                {formatCurrency(cartSubtotal)}
              </Text>
            </View>

            <Button
              icon="arrow-forward-outline"
              onPress={() => router.push('/checkout')}
              style={styles.checkoutButton}>
              Continuar para o checkout
            </Button>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push('/(tabs)/categories')
              }
              style={({ pressed }) => [
                styles.continueShopping,
                pressed && styles.continueShoppingPressed,
              ]}>
              <Ionicons
                name="arrow-back-outline"
                size={16}
                color={colors.primary}
              />

              <Text style={styles.continueShoppingText}>
                Continuar comprando
              </Text>
            </Pressable>

            <View style={styles.secureNote}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.success}
              />

              <Text style={styles.secureNoteText}>
                Compra segura e atendimento personalizado.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  contentDesktop: {
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  title: {
    marginTop: spacing.xs,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },

  subtitle: {
    maxWidth: 560,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  itemsCount: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },

  itemsCountText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  layout: {
    gap: spacing.xl,
  },

  layoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxl,
  },

  itemsColumn: {
    minWidth: 0,
    flex: 1,
    gap: spacing.lg,
  },

  delivery: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,106,79,0.16)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F4FAF6',
  },

  deliveryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },

  deliveryText: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },

  deliveryTitle: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },

  deliverySubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  itemsList: {
    gap: spacing.md,
  },

  item: {
    minHeight: 154,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  imageWrap: {
    position: 'relative',
    width: 108,
    height: 136,
    overflow: 'hidden',
    borderRadius: radii.medium,
    backgroundColor: colors.surfaceWarm,
  },

  itemImage: {
    width: '100%',
    height: '100%',
  },

  availabilityBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(242,247,240,0.94)',
  },

  availabilityBadgeCustom: {
    backgroundColor: 'rgba(255,247,226,0.95)',
  },

  availabilityBadgeText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '900',
  },

  availabilityBadgeTextCustom: {
    color: colors.warning,
  },

  itemContent: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'space-between',
  },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  itemCopy: {
    minWidth: 0,
    flex: 1,
  },

  itemName: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },

  variants: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  remove: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  removePressed: {
    opacity: 0.68,
    transform: [{ scale: 0.95 }],
  },

  itemBottom: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  itemPrices: {
    alignItems: 'flex-start',
    gap: 2,
  },

  originalPrice: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },

  price: {
    color: '#8B451C',
    fontSize: 18,
    fontWeight: '900',
  },

  summary: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    gap: spacing.lg,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  summaryDesktop: {
    position: 'sticky' as never,
    top: spacing.xl,
    width: 360,
  },

  summaryTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },

  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  free: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  totalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  totalHint: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 10,
  },

  total: {
    color: '#8B451C',
    fontSize: 25,
    fontWeight: '900',
  },

  checkoutButton: {
    width: '100%',
    minHeight: 52,
  },

  continueShopping: {
    minHeight: 42,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  continueShoppingPressed: {
    opacity: 0.68,
  },

  continueShoppingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  secureNote: {
    padding: spacing.md,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
  },

  secureNoteText: {
    minWidth: 0,
    flex: 1,
    color: colors.success,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
});