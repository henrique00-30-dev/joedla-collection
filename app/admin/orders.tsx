import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { OrderStatus } from '@/src/types';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Filter = 'all' | 'custom' | OrderStatus;

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'custom', label: 'Encomendas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Prontos' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function AdminOrdersScreen() {
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const { adminOrders, adminLoading, refreshAdminOrders } = useStore();
  const [filter, setFilter] = useState<Filter>(
    initialFilter === 'custom' ? 'custom' : 'all',
  );

  const filtered = useMemo(
    () => {
      if (filter === 'all') return adminOrders;
      if (filter === 'custom') {
        return adminOrders.filter((order) =>
          order.items.some((item) => item.availability === 'custom'),
        );
      }
      return adminOrders.filter((order) => order.status === filter);
    },
    [adminOrders, filter],
  );

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Pedidos" showBack showStoreHome />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={adminLoading}
              onRefresh={refreshAdminOrders}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator>
          <ScrollView
            horizontal
            contentContainerStyle={styles.filters}
            showsHorizontalScrollIndicator>
            {filters.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setFilter(item.value)}
                style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text
                  style={[
                    styles.filterText,
                    filter === item.value && styles.filterTextActive,
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.countRow}>
            <Text style={styles.count}>{filtered.length} pedido(s)</Text>
          </View>

          {filtered.map((order) => {
            const hasCustomItem = order.items.some(
              (item) => item.availability === 'custom',
            );

            return (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({ pathname: '/admin/order/[id]', params: { id: order.id } })
                }
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.topRow}>
                  <View>
                    <Text style={styles.code}>{order.publicCode}</Text>
                    <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <StatusBadge status={order.status} />
                </View>
                <View style={styles.divider} />
                {hasCustomItem ? (
                  <View style={styles.customTag}>
                    <Text style={styles.customTagText}>ENCOMENDA</Text>
                  </View>
                ) : null}
                <Text style={styles.customer}>{order.customer.name}</Text>
                <Text style={styles.phone}>{order.customer.whatsapp}</Text>
                <Text style={styles.items} numberOfLines={2}>
                  {order.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}
                </Text>
                {order.customer.notes ? (
                  <Text style={styles.notes} numberOfLines={3}>
                    Observação: {order.customer.notes}
                  </Text>
                ) : null}
                <View style={styles.bottomRow}>
                  <Text style={styles.method}>
                    {order.deliveryMethod === 'delivery'
                      ? 'Entrega'
                      : order.deliveryMethod === 'pickup'
                        ? 'Retirada'
                        : 'Outra cidade'}
                  </Text>
                  <Text style={styles.total}>{formatCurrency(order.total)}</Text>
                </View>
              </Pressable>
            );
          })}

          {!filtered.length ? (
            <Text style={styles.empty}>Nenhum pedido nesta situação.</Text>
          ) : null}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  filters: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filter: {
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  filterActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  filterTextActive: {
    color: colors.white,
  },
  countRow: {
    paddingVertical: spacing.sm,
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.78,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  code: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  date: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
  customer: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  phone: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  customTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.warningSoft,
  },
  customTagText: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  items: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  notes: {
    padding: spacing.sm,
    borderRadius: radii.small,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: colors.surfaceWarm,
  },
  bottomRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  method: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  total: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  empty: {
    paddingVertical: 90,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
