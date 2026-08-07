import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Platform,
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

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendentes',
  confirmed: 'Confirmados',
  preparing: 'Preparando',
  ready: 'Prontos',
  completed: 'Concluídos',
  cancelled: 'Cancelados',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#D89A3A',
  confirmed: '#6B7FD7',
  preparing: '#A16AC8',
  ready: '#4E9E72',
  completed: '#2F7D57',
  cancelled: '#B95B5B',
};

export default function AdminDashboardScreen() {
  const {
    products,
    categories,
    adminOrders,
    cloudEnabled,
    refreshAdminOrders,
  } = useStore();

  const { width } = useWindowDimensions();
  const compact = width < 760;
  const chartsCompact = width < 1050;

  useEffect(() => {
    void refreshAdminOrders();
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
    const completedOrders = adminOrders.filter((order) => order.status === 'completed');
    const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);

    return {
      activeProducts: activeProducts.length,
      stock,
      pending,
      customOrders,
      revenue,
      completed: completedOrders.length,
      totalOrders: adminOrders.length,
    };
  }, [adminOrders, products]);

  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - offset));
      return {
        key: toDateKey(date),
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
          .format(date)
          .replace('.', ''),
        value: 0,
      };
    });

    const lookup = new Map(days.map((day) => [day.key, day]));

    adminOrders
      .filter((order) => order.status === 'completed')
      .forEach((order) => {
        const entry = lookup.get(toDateKey(new Date(order.createdAt)));
        if (entry) entry.value += order.total;
      });

    return days;
  }, [adminOrders]);

  const orderStatus = useMemo(() => {
    const counts = new Map<string, number>();
    adminOrders.forEach((order) => {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    });

    return Object.entries(STATUS_LABELS)
      .map(([status, label]) => ({
        status,
        label,
        value: counts.get(status) ?? 0,
        color: STATUS_COLORS[status] ?? '#8A776B',
      }))
      .filter((item) => item.value > 0);
  }, [adminOrders]);

  const productsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    products
      .filter((product) => product.active)
      .forEach((product) => {
        counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
      });

    return Array.from(counts.entries())
      .map(([slug, value]) => ({
        label: categories.find((category) => category.slug === slug)?.name ?? slug,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [categories, products]);

  return (
    <AdminGuard>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        showsVerticalScrollIndicator>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.pageTitle}>Painel da loja</Text>
            <Text style={styles.pageSubtitle}>Visão geral da Joedla Collection</Text>
          </View>

          <View style={styles.topbarActions}>
            <View
              style={[
                styles.connection,
                cloudEnabled ? styles.connectionOnline : styles.connectionOffline,
              ]}>
              <Ionicons
                name={cloudEnabled ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={14}
                color={cloudEnabled ? colors.success : colors.danger}
              />
              <Text
                style={[
                  styles.connectionText,
                  { color: cloudEnabled ? colors.success : colors.danger },
                ]}>
                {cloudEnabled ? 'ONLINE' : 'SEM CONEXÃO'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }) => [styles.storeButton, pressed && styles.pressed]}>
              <Ionicons name="storefront-outline" size={15} color="#8B541B" />
              <Text style={styles.storeButtonText}>Loja</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricCard icon="pricetags-outline" label="Produtos" helper="Ativos no catálogo" value={String(metrics.activeProducts)} />
          <MetricCard icon="cube-outline" label="Em estoque" helper="Unidades disponíveis" value={String(metrics.stock)} />
          <MetricCard icon="time-outline" label="Pendentes" helper="Precisam de atenção" value={String(metrics.pending)} warning={metrics.pending > 0} />
          <MetricCard icon="cash-outline" label="Vendas concluídas" helper={`${metrics.completed} pedido(s) concluído(s)`} value={formatCurrency(metrics.revenue)} />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Desempenho rápido</Text>
            <Text style={styles.sectionDescription}>Indicadores visuais usando os dados atuais da loja.</Text>
          </View>
          <Pressable onPress={() => router.push('/admin/analytics' as Href)}>
            <Text style={styles.link}>Ver relatório completo</Text>
          </Pressable>
        </View>

        <View style={[styles.chartsGrid, chartsCompact && styles.chartsGridCompact]}>
          <View style={styles.chartCard}>
            <ChartHeader icon="bar-chart-outline" title="Vendas — últimos 7 dias" subtitle="Receita de pedidos concluídos" />
            <ColumnChart data={salesByDay} />
          </View>

          <View style={styles.chartCard}>
            <ChartHeader icon="pie-chart-outline" title="Pedidos por status" subtitle={`${metrics.totalOrders} pedido(s) no total`} />
            <DonutChart data={orderStatus} />
          </View>

          <View style={styles.chartCard}>
            <ChartHeader icon="apps-outline" title="Produtos por categoria" subtitle="Distribuição do catálogo ativo" />
            <HorizontalBars data={productsByCategory} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gerenciar</Text>
        <View style={styles.actions}>
          <ActionCard icon="images-outline" title="Banners e campanhas" description="Carrossel, campanhas e conteúdo visual" onPress={() => router.push('/admin/appearance' as Href)} />
          <ActionCard icon="shirt-outline" title="Produtos e estoque" description="Cadastro, edição e quantidades" onPress={() => router.push('/admin/products')} />
          <ActionCard icon="grid-outline" title="Categorias" description="Organização das abas do catálogo" onPress={() => router.push('/admin/categories' as Href)} />
          <ActionCard icon="analytics-outline" title="Desempenho" description="Acessos e produtos mais vistos" onPress={() => router.push('/admin/analytics' as Href)} />
          <ActionCard icon="megaphone-outline" title="Barra de informações" description="Comunicados exibidos no início" onPress={() => router.push('/admin/notices' as Href)} />
          <ActionCard icon="receipt-outline" title="Pedidos" description="Pagamento e andamento" badge={metrics.pending} onPress={() => router.push('/admin/orders')} />
          <ActionCard icon="time-outline" title="Encomendas" description="Itens produzidos sob demanda" badge={metrics.customOrders} onPress={() => router.push({ pathname: '/admin/orders', params: { filter: 'custom' } })} />
          <ActionCard icon="settings-outline" title="Configurações" description="WhatsApp, Pix e dados da loja" onPress={() => router.push('/admin/settings')} />
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Pedidos recentes</Text>
          <Pressable onPress={() => router.push('/admin/orders')}>
            <Text style={styles.link}>Ver todos</Text>
          </Pressable>
        </View>

        {!adminOrders.length ? (
          <View style={styles.noOrders}>
            <Ionicons name="receipt-outline" size={26} color="#B47A33" />
            <Text style={styles.noOrdersText}>Nenhum pedido recebido ainda.</Text>
          </View>
        ) : (
          adminOrders.slice(0, 4).map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: order.id } })}
              style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}>
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
    </AdminGuard>
  );
}

function MetricCard({ icon, label, helper, value, warning = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, warning && styles.metricIconWarning]}>
        <Ionicons name={icon} size={19} color={warning ? colors.warning : '#9D5F1D'} />
      </View>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </View>
  );
}

function ChartHeader({ icon, title, subtitle }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.chartHeader}>
      <View style={styles.chartHeaderIcon}><Ionicons name={icon} size={18} color="#9D5F1D" /></View>
      <View style={styles.chartHeaderCopy}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  const highest = Math.max(1, ...data.map((item) => item.value));
  return (
    <View style={styles.columnChart}>
      <View style={styles.columns}>
        {data.map((item) => {
          const ratio = item.value / highest;
          const height = item.value > 0 ? Math.max(12, ratio * 128) : 4;
          return (
            <View key={item.label} style={styles.columnItem}>
              <View style={styles.columnValueArea}>
                {item.value > 0 ? <Text numberOfLines={1} style={styles.columnValue}>{formatCurrency(item.value)}</Text> : null}
                <View style={[styles.columnBar, { height }]} />
              </View>
              <Text style={styles.columnLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = total > 0 ? makeConicGradient(data, total) : 'conic-gradient(#E8DED5 0deg 360deg)';

  return (
    <View style={styles.donutContent}>
      <View style={styles.donutArea}>
        <View style={[styles.donut, Platform.OS === 'web' ? ({ backgroundImage: gradient } as never) : styles.donutFallback]}>
          <View style={styles.donutHole}>
            <Text style={styles.donutTotal}>{total}</Text>
            <Text style={styles.donutTotalLabel}>pedidos</Text>
          </View>
        </View>
      </View>
      <View style={styles.legend}>
        {data.length ? data.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text numberOfLines={1} style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        )) : <Text style={styles.emptyChartText}>Ainda não há pedidos.</Text>}
      </View>
    </View>
  );
}

function HorizontalBars({ data }: { data: { label: string; value: number }[] }) {
  const highest = Math.max(1, ...data.map((item) => item.value));
  return (
    <View style={styles.horizontalBars}>
      {data.length ? data.map((item) => (
        <View key={item.label} style={styles.horizontalItem}>
          <View style={styles.horizontalTextRow}>
            <Text numberOfLines={1} style={styles.horizontalLabel}>{item.label}</Text>
            <Text style={styles.horizontalValue}>{item.value}</Text>
          </View>
          <View style={styles.horizontalTrack}>
            <View style={[styles.horizontalFill, { width: `${Math.max(6, (item.value / highest) * 100)}%` }]} />
          </View>
        </View>
      )) : <Text style={styles.emptyChartText}>Nenhum produto ativo.</Text>}
    </View>
  );
}

function ActionCard({ icon, title, description, badge = 0, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={20} color="#9D5F1D" /></View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      {badge > 0 ? (
        <View style={styles.actionBadge}><Text style={styles.actionBadgeText}>{badge}</Text></View>
      ) : (
        <Ionicons name="chevron-forward" size={17} color="#95867B" />
      )}
    </Pressable>
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeConicGradient(data: { value: number; color: string }[], total: number) {
  let start = 0;
  const stops = data.map((item) => {
    const end = start + (item.value / total) * 360;
    const result = `${item.color} ${start}deg ${end}deg`;
    start = end;
    return result;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F0EA' },
  content: { width: '100%', maxWidth: 1320, padding: 20, paddingBottom: 42, alignSelf: 'center' },
  contentCompact: { padding: 14 },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  pageTitle: { color: '#2C211A', fontSize: 23, fontWeight: '900' },
  pageSubtitle: { marginTop: 3, color: '#88776B', fontSize: 11 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connection: { minHeight: 32, paddingHorizontal: 11, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectionOnline: { backgroundColor: colors.successSoft },
  connectionOffline: { backgroundColor: colors.dangerSoft },
  connectionText: { fontSize: 9, fontWeight: '900' },
  storeButton: { minHeight: 34, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D7C8B8', borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFDFC' },
  storeButtonText: { color: '#47372C', fontSize: 10, fontWeight: '800' },
  metrics: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { minWidth: 160, minHeight: 118, flexBasis: '22%', flexGrow: 1, padding: 14, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 14, backgroundColor: '#FFFDFC', ...shadow },
  metricIcon: { width: 34, height: 34, marginBottom: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECE0' },
  metricIconWarning: { backgroundColor: colors.warningSoft },
  metricValue: { color: '#2C211A', fontSize: 20, fontWeight: '900' },
  metricLabel: { marginTop: 2, color: '#4D3E34', fontSize: 10, fontWeight: '800' },
  metricHelper: { marginTop: 3, color: '#9A897D', fontSize: 9 },
  sectionHeader: { marginTop: 28, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  sectionTitle: { marginTop: 26, color: '#2C211A', fontSize: 18, fontWeight: '900' },
  sectionDescription: { marginTop: 3, color: '#88776B', fontSize: 10 },
  chartsGrid: { marginTop: 12, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  chartsGridCompact: { flexWrap: 'wrap' },
  chartCard: { minWidth: 280, minHeight: 270, flex: 1, padding: 16, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 16, backgroundColor: '#FFFDFC', ...shadow },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartHeaderIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECE0' },
  chartHeaderCopy: { minWidth: 0, flex: 1 },
  chartTitle: { color: '#2C211A', fontSize: 13, fontWeight: '900' },
  chartSubtitle: { marginTop: 2, color: '#968478', fontSize: 9 },
  columnChart: { flex: 1, marginTop: 18, justifyContent: 'flex-end' },
  columns: { minHeight: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  columnItem: { minWidth: 0, flex: 1, alignItems: 'center' },
  columnValueArea: { height: 150, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  columnValue: { width: '100%', marginBottom: 5, color: '#79695D', fontSize: 7, fontWeight: '700', textAlign: 'center' },
  columnBar: { width: '68%', maxWidth: 34, minHeight: 4, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: '#B8782B' },
  columnLabel: { marginTop: 7, color: '#88776B', fontSize: 8, fontWeight: '800', textTransform: 'capitalize' },
  donutContent: { minHeight: 190, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  donut: { width: 142, height: 142, borderRadius: 71, alignItems: 'center', justifyContent: 'center' },
  donutFallback: { backgroundColor: '#D9A160' },
  donutHole: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDFC' },
  donutTotal: { color: '#2C211A', fontSize: 22, fontWeight: '900' },
  donutTotalLabel: { marginTop: 1, color: '#968478', fontSize: 8 },
  legend: { minWidth: 130, flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { minWidth: 0, flex: 1, color: '#5A493E', fontSize: 9, fontWeight: '700' },
  legendValue: { color: '#2C211A', fontSize: 9, fontWeight: '900' },
  horizontalBars: { marginTop: 18, gap: 12 },
  horizontalItem: { gap: 5 },
  horizontalTextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  horizontalLabel: { minWidth: 0, flex: 1, color: '#5A493E', fontSize: 9, fontWeight: '800' },
  horizontalValue: { color: '#8B541B', fontSize: 9, fontWeight: '900' },
  horizontalTrack: { height: 8, overflow: 'hidden', borderRadius: radii.pill, backgroundColor: '#F0E6DC' },
  horizontalFill: { height: '100%', borderRadius: radii.pill, backgroundColor: '#B8782B' },
  emptyChartText: { color: '#968478', fontSize: 10, textAlign: 'center' },
  actions: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { minWidth: 240, minHeight: 72, flexBasis: '31%', flexGrow: 1, padding: 12, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#FFFDFC' },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECE0' },
  actionText: { minWidth: 0, flex: 1 },
  actionTitle: { color: '#2C211A', fontSize: 11, fontWeight: '900' },
  actionDescription: { marginTop: 2, color: '#88776B', fontSize: 9, lineHeight: 13 },
  actionBadge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#A66A27' },
  actionBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  recentHeader: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  link: { color: '#9D5F1D', fontSize: 10, fontWeight: '900' },
  noOrders: { minHeight: 96, marginTop: 12, padding: 16, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFDFC' },
  noOrdersText: { color: '#88776B', fontSize: 10 },
  orderCard: { minHeight: 66, marginTop: 9, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#FFFDFC' },
  orderCode: { color: '#2C211A', fontSize: 11, fontWeight: '900' },
  customer: { marginTop: 3, color: '#88776B', fontSize: 9 },
  orderRight: { alignItems: 'flex-end', gap: 5 },
  orderTotal: { color: '#8B541B', fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.995 }] },
});
