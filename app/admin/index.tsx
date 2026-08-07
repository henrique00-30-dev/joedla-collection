import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

export default function AdminDashboardScreen() {
  const {
    products,
    adminOrders,
    cloudEnabled,
    refreshAdminOrders,
  } = useStore();

  const { width } = useWindowDimensions();
  const compact = width < 760;

  useEffect(() => {
    void refreshAdminOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.active);

    const stock = activeProducts
      .filter((product) => product.availability === 'ready')
      .reduce((sum, product) => sum + product.stock, 0);

    const pending = adminOrders.filter(
      (order) => order.status === 'pending',
    ).length;

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

  return (
    <AdminGuard>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
        ]}
        showsVerticalScrollIndicator>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.pageTitle}>Painel da loja</Text>
            <Text style={styles.pageSubtitle}>
              Visão geral da Joedla Collection
            </Text>
          </View>

          <View style={styles.topbarActions}>
            <View
              style={[
                styles.connection,
                cloudEnabled
                  ? styles.connectionOnline
                  : styles.connectionOffline,
              ]}>
              <Ionicons
                name={
                  cloudEnabled
                    ? 'cloud-done-outline'
                    : 'cloud-offline-outline'
                }
                size={14}
                color={
                  cloudEnabled ? colors.success : colors.danger
                }
              />

              <Text
                style={[
                  styles.connectionText,
                  {
                    color: cloudEnabled
                      ? colors.success
                      : colors.danger,
                  },
                ]}>
                {cloudEnabled ? 'ONLINE' : 'SEM CONEXÃO'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [
                styles.storeButton,
                pressed && styles.pressed,
              ]}>
              <Ionicons
                name="storefront-outline"
                size={15}
                color="#8B541B"
              />
              <Text style={styles.storeButtonText}>Loja</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricCard
            icon="pricetags-outline"
            label="Produtos"
            value={String(metrics.activeProducts)}
          />
          <MetricCard
            icon="cube-outline"
            label="Em estoque"
            value={String(metrics.stock)}
          />
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
            icon="sparkles-outline"
            title="Campanhas e promoções"
            description="Banners, selos e preços promocionais"
            onPress={() => router.push('/admin/campaigns' as Href)}
          />
          <ActionCard
            icon="color-palette-outline"
            title="Destaques e banner"
            description="Imagem e conteúdo principal da loja"
            onPress={() => router.push('/admin/appearance' as Href)}
          />
          <ActionCard
            icon="shirt-outline"
            title="Produtos e estoque"
            description="Cadastro, edição e quantidades"
            onPress={() => router.push('/admin/products')}
          />
          <ActionCard
            icon="grid-outline"
            title="Categorias"
            description="Organização das abas do catálogo"
            onPress={() => router.push('/admin/categories' as Href)}
          />
          <ActionCard
            icon="analytics-outline"
            title="Desempenho"
            description="Acessos e produtos mais vistos"
            onPress={() => router.push('/admin/analytics' as Href)}
          />
          <ActionCard
            icon="megaphone-outline"
            title="Barra de informações"
            description="Comunicados exibidos no início"
            onPress={() => router.push('/admin/notices' as Href)}
          />
          <ActionCard
            icon="receipt-outline"
            title="Pedidos"
            description="Pagamento e andamento"
            badge={metrics.pending}
            onPress={() => router.push('/admin/orders')}
          />
          <ActionCard
            icon="time-outline"
            title="Encomendas"
            description="Itens produzidos sob demanda"
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
            description="WhatsApp, Pix e dados da loja"
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
            <Ionicons
              name="receipt-outline"
              size={26}
              color="#B47A33"
            />
            <Text style={styles.noOrdersText}>
              Nenhum pedido recebido ainda.
            </Text>
          </View>
        ) : (
          adminOrders.slice(0, 4).map((order) => (
            <Pressable
              key={order.id}
              onPress={() =>
                router.push({
                  pathname: '/admin/order/[id]',
                  params: { id: order.id },
                })
              }
              style={({ pressed }) => [
                styles.orderCard,
                pressed && styles.pressed,
              ]}>
              <View>
                <Text style={styles.orderCode}>
                  {order.publicCode}
                </Text>
                <Text style={styles.customer}>
                  {order.customer.name}
                </Text>
              </View>

              <View style={styles.orderRight}>
                <Text style={styles.orderTotal}>
                  {formatCurrency(order.total)}
                </Text>
                <StatusBadge status={order.status} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
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
      <View
        style={[
          styles.metricIcon,
          warning && styles.metricIconWarning,
        ]}>
        <Ionicons
          name={icon}
          size={18}
          color={warning ? colors.warning : '#9D5F1D'}
        />
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color="#9D5F1D" />
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
        <Ionicons
          name="chevron-forward"
          size={17}
          color="#95867B"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0EA',
  },

  content: {
    width: '100%',
    maxWidth: 1320,
    padding: 16,
    paddingBottom: 32,
    alignSelf: 'center',
  },

  contentCompact: {
    padding: 12,
  },

  topbar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },

  pageTitle: {
    color: '#2C211A',
    fontSize: 20,
    fontWeight: '900',
  },

  pageSubtitle: {
    marginTop: 2,
    color: '#88776B',
    fontSize: 10,
  },

  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  connection: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  connectionOnline: {
    backgroundColor: colors.successSoft,
  },

  connectionOffline: {
    backgroundColor: colors.dangerSoft,
  },

  connectionText: {
    fontSize: 9,
    fontWeight: '900',
  },

  storeButton: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#D7C8B8',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDFC',
  },

  storeButtonText: {
    color: '#47372C',
    fontSize: 10,
    fontWeight: '800',
  },

  metrics: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  metricCard: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 120,
    minHeight: 100,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 13,
    backgroundColor: '#FFFDFC',
    ...shadow,
  },

  metricWide: {
    flexBasis: '100%',
  },

  metricIcon: {
    width: 30,
    height: 30,
    marginBottom: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  metricIconWarning: {
    backgroundColor: colors.warningSoft,
  },

  metricValue: {
    color: '#2C211A',
    fontSize: 17,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 2,
    color: '#88776B',
    fontSize: 9,
  },

  sectionTitle: {
    marginTop: 17,
    color: '#2C211A',
    fontSize: 16,
    fontWeight: '900',
  },

  actions: {
    marginTop: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  actionCard: {
    minWidth: 240,
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 64,
    padding: 9,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFDFC',
  },

  pressed: {
    opacity: 0.72,
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  actionText: {
    flex: 1,
    gap: 2,
  },

  actionTitle: {
    color: '#2C211A',
    fontSize: 12,
    fontWeight: '800',
  },

  actionDescription: {
    color: '#88776B',
    fontSize: 9,
    lineHeight: 13,
  },

  actionBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A66A27',
  },

  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  recentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  link: {
    color: '#9D5F1D',
    fontSize: 10,
    fontWeight: '800',
  },

  noOrders: {
    minHeight: 96,
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFDFC',
  },

  noOrdersText: {
    color: '#88776B',
    fontSize: 10,
  },

  orderCard: {
    minHeight: 60,
    marginTop: 7,
    padding: 9,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    backgroundColor: '#FFFDFC',
  },

  orderCode: {
    color: '#2C211A',
    fontSize: 11,
    fontWeight: '900',
  },

  customer: {
    marginTop: 2,
    color: '#88776B',
    fontSize: 9,
  },

  orderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },

  orderTotal: {
    color: '#9D5F1D',
    fontSize: 11,
    fontWeight: '900',
  },
});