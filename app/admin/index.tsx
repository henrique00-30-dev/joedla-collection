import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function AdminDashboardScreen() {
  const {
    products,
    adminOrders,
    cloudEnabled,
    refreshAdminOrders,
    logoutAdmin,
  } = useStore();

  useEffect(() => {
    void refreshAdminOrders();
    // A atualização deve ocorrer somente ao abrir o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.active);
    const stock = activeProducts
      .filter((product) => product.availability === 'ready')
      .reduce((sum, product) => sum + product.stock, 0);
    const pending = adminOrders.filter((order) => order.status === 'pending').length;
    const customOrders = adminOrders.filter(
      (order) =>
        order.status !== 'completed' &&
        order.status !== 'cancelled' &&
        order.items.some((item) => item.availability === 'custom'),
    ).length;
    const revenue = adminOrders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0);
    return {
      activeProducts: activeProducts.length,
      stock,
      pending,
      customOrders,
      revenue,
    };
  }, [adminOrders, products]);

  async function handleLogout() {
    await logoutAdmin();
    router.replace('/(tabs)/menu');
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader
          compact
          title="Painel da loja"
          rightAction={{ icon: 'log-out-outline', onPress: handleLogout }}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.welcome}>
            <View>
              <Text style={styles.eyebrow}>JOEDLA COLLECTION</Text>
              <Text style={styles.title}>Visão geral</Text>
            </View>
            <View style={[styles.mode, cloudEnabled ? styles.modeCloud : styles.modeDemo]}>
              <Ionicons
                name={cloudEnabled ? 'cloud-done-outline' : 'flask-outline'}
                size={15}
                color={cloudEnabled ? colors.success : colors.warning}
              />
              <Text style={{ color: cloudEnabled ? colors.success : colors.warning, fontSize: 10, fontWeight: '900' }}>
                {cloudEnabled ? 'ONLINE' : 'DEMO'}
              </Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <MetricCard
              icon="pricetags-outline"
              label="Produtos"
              value={String(metrics.activeProducts)}
            />
            <MetricCard icon="cube-outline" label="Em estoque" value={String(metrics.stock)} />
            <MetricCard
              icon="time-outline"
              label="Pendentes"
              value={String(metrics.pending)}
              warning={metrics.pending > 0}
            />
            <MetricCard
              icon="cash-outline"
              label="Vendas concluídas"
              value={formatCurrency(metrics.revenue)}
              wide
            />
          </View>

          <Text style={styles.sectionTitle}>Gerenciar</Text>
          <View style={styles.actions}>
            <ActionCard
              icon="shirt-outline"
              title="Produtos e estoque"
              description="Cadastrar, editar e controlar quantidades"
              onPress={() => router.push('/admin/products')}
            />
            <ActionCard
              icon="receipt-outline"
              title="Pedidos"
              description="Confirmar pagamento e atualizar andamento"
              badge={metrics.pending}
              onPress={() => router.push('/admin/orders')}
            />
            <ActionCard
              icon="time-outline"
              title="Encomendas"
              description="Ver nomes, WhatsApp e observações"
              badge={metrics.customOrders}
              onPress={() =>
                router.push({
                  pathname: '/admin/orders',
                  params: { filter: 'custom' },
                })
              }
            />
            <ActionCard
              icon="settings-outline"
              title="Configurações"
              description="WhatsApp, Pix, retirada e dados da loja"
              onPress={() => router.push('/admin/settings')}
            />
          </View>

          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Pedidos recentes</Text>
            <Pressable onPress={() => router.push('/admin/orders')}>
              <Text style={styles.link}>Ver todos</Text>
            </Pressable>
          </View>

          {!adminOrders.length ? (
            <View style={styles.noOrders}>
              <Ionicons name="receipt-outline" size={28} color={colors.primarySoft} />
              <Text style={styles.noOrdersText}>Nenhum pedido recebido ainda.</Text>
            </View>
          ) : (
            adminOrders.slice(0, 4).map((order) => (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({ pathname: '/admin/order/[id]', params: { id: order.id } })
                }
                style={styles.orderCard}>
                <View>
                  <Text style={styles.orderCode}>{order.publicCode}</Text>
                  <Text style={styles.customer}>{order.customer.name}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
                  <StatusBadge status={order.status} />
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

function MetricCard({
  icon,
  label,
  value,
  warning = false,
  wide = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  warning?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.metricCard, wide && styles.metricWide]}>
      <View style={[styles.metricIcon, warning && styles.metricIconWarning]}>
        <Ionicons name={icon} size={20} color={warning ? colors.warning : colors.primary} />
      </View>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  description,
  badge = 0,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={23} color={colors.primary} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {badge > 0 ? (
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  welcome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 27,
    fontWeight: '700',
  },
  mode: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modeCloud: {
    backgroundColor: colors.successSoft,
  },
  modeDemo: {
    backgroundColor: colors.warningSoft,
  },
  metrics: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 100,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    ...shadow,
  },
  metricWide: {
    flexBasis: '100%',
  },
  metricIcon: {
    width: 34,
    height: 34,
    marginBottom: spacing.sm,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  metricIconWarning: {
    backgroundColor: colors.warningSoft,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionCard: {
    minHeight: 78,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.76,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  actionText: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  actionBadge: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
  },
  actionBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  link: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  noOrders: {
    minHeight: 120,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  noOrdersText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  orderCard: {
    minHeight: 76,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  orderCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  customer: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  orderTotal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
