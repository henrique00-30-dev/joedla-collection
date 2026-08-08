import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { OrderReviewSection } from '@/src/components/orders/order-review-section';
import { Screen } from '@/src/components/screen';
import { EmptyState, StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { syncOrderStatuses } from '@/src/services/order-status';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { Order } from '@/src/types';
import { formatCurrency, formatDate } from '@/src/utils/format';

export default function OrdersScreen() {
  const { customerOrders } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [orders, setOrders] = useState<Order[]>(customerOrders);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    setOrders(customerOrders);
  }, [customerOrders]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSyncError('');

      void syncOrderStatuses(customerOrders)
        .then((fresh) => {
          if (active) setOrders(fresh);
        })
        .catch((error) => {
          if (!active) return;
          setSyncError(error instanceof Error ? error.message : 'Não foi possível atualizar seus pedidos agora.');
        });

      return () => {
        active = false;
      };
    }, [customerOrders]),
  );

  return (
    <Screen>
      <AppHeader compact title="Meus pedidos" showBack showStoreHome />

      {!orders.length ? (
        <EmptyState
          icon="receipt-outline"
          title="Nenhum pedido ainda"
          message="Seus pedidos aparecerão aqui depois da finalização."
          actionLabel="Começar a comprar"
          onAction={() => router.push('/')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}
          showsVerticalScrollIndicator>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text style={styles.eyebrow}>ACOMPANHAMENTO</Text>
              <Text style={styles.pageTitle}>Seus pedidos em um só lugar</Text>
              <Text style={styles.pageSubtitle}>
                Consulte status, itens, forma de entrega e total de cada compra realizada.
              </Text>
            </View>

            <View style={styles.counter}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.counterValue}>{orders.length}</Text>
                <Text style={styles.counterLabel}>
                  {orders.length === 1 ? 'pedido' : 'pedidos'}
                </Text>
              </View>
            </View>
          </View>

          {syncError ? (
            <View accessibilityLiveRegion="polite" style={styles.syncError}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.syncErrorText}>{syncError}</Text>
            </View>
          ) : null}

          <View style={styles.info}>
            <View style={styles.infoIcon}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.info} />
            </View>
            <Text style={styles.infoText}>
              A confirmação final e os detalhes da entrega são enviados pelo WhatsApp. Depois que o pedido for concluído, você poderá avaliar os produtos comprados.
            </Text>
          </View>

          <View style={styles.ordersList}>
            {orders.map((order) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeBlock}>
                    <Text style={styles.code}>{order.publicCode}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <StatusBadge status={order.status} />
                </View>

                <View style={styles.divider} />

                <View style={styles.itemsBlock}>
                  <Text style={styles.itemsLabel}>Itens do pedido</Text>
                  <Text style={styles.items}>
                    {order.items
                      .map((item) => `${item.quantity}x ${item.productName}`)
                      .join(', ')}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.deliveryBlock}>
                    <View style={styles.deliveryIcon}>
                      <Ionicons
                        name={
                          order.deliveryMethod === 'delivery'
                            ? 'car-outline'
                            : order.deliveryMethod === 'pickup'
                              ? 'storefront-outline'
                              : 'chatbubbles-outline'
                        }
                        size={17}
                        color={colors.success}
                      />
                    </View>
                    <View>
                      <Text style={styles.deliveryLabel}>Entrega</Text>
                      <Text style={styles.delivery}>
                        {order.deliveryMethod === 'delivery'
                          ? 'Entrega grátis'
                          : order.deliveryMethod === 'pickup'
                            ? 'Retirada'
                            : 'Entrega a combinar'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.totalBlock}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.total}>{formatCurrency(order.total)}</Text>
                  </View>
                </View>

                {order.status === 'completed' ? (
                  <OrderReviewSection order={order} />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    minWidth: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  contentDesktop: {
    maxWidth: 980,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignSelf: 'center',
  },
  pageHeader: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  pageHeaderCopy: { minWidth: 240, flex: 1 },
  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  pageTitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  pageSubtitle: {
    maxWidth: 620,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  counter: {
    minWidth: 150,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },
  counterValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  counterLabel: { color: colors.textMuted, fontSize: 10 },
  syncError: {
    minWidth: 0,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(180,61,56,0.22)',
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FDEEEE',
  },
  syncErrorText: {
    minWidth: 0,
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '800',
  },
  info: {
    minWidth: 0,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(77,113,169,0.16)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.infoSoft,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  infoText: {
    minWidth: 0,
    flex: 1,
    color: colors.info,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  ordersList: { minWidth: 0, gap: spacing.md },
  card: {
    minWidth: 0,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 20,
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },
  cardHeader: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  codeBlock: { minWidth: 0 },
  code: { color: colors.text, fontSize: 16, fontWeight: '900' },
  date: { marginTop: 3, color: colors.textMuted, fontSize: 10 },
  divider: { height: 1, backgroundColor: colors.border },
  itemsBlock: { minWidth: 0, gap: spacing.xs },
  itemsLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  items: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  cardFooter: {
    minWidth: 0,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  deliveryBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deliveryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
  },
  deliveryLabel: {
    color: colors.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  delivery: { marginTop: 2, color: colors.success, fontSize: 12, fontWeight: '800' },
  totalBlock: { alignItems: 'flex-end' },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  total: { marginTop: 2, color: '#8B451C', fontSize: 20, fontWeight: '900' },
});