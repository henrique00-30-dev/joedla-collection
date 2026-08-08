import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Kind = 'orders' | 'products';
type Row = Array<string | number>;
type ReportData = { title: string; description: string; header: string[]; rows: Row[] };
type BarItem = { label: string; value: number; display?: string };

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function makeCsv(data: ReportData) {
  return '\uFEFF' + [data.header, ...data.rows].map((row) => row.map(csvCell).join(';')).join('\n');
}

function paymentLabel(value: string) {
  if (value === 'pix') return 'Pix';
  if (value === 'card_link') return 'Cartão';
  if (value === 'whatsapp') return 'A combinar';
  return value || 'Não informado';
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Pronto',
    out_for_delivery: 'Em entrega',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  return labels[value] ?? value;
}

export default function AdminDataReportScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = rawKind === 'products' ? 'products' : 'orders';
  const { adminOrders, products, refreshAdminOrders } = useStore();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const report = useMemo<ReportData>(() => {
    if (kind === 'products') {
      return {
        title: 'Relatório de produtos e estoques',
        description: 'Visão de catálogo, disponibilidade, valor e distribuição do estoque.',
        header: ['Produto', 'Categoria', 'Preço', 'Estoque', 'Disponibilidade', 'Ativo'],
        rows: products.map((p) => [
          p.name,
          p.category,
          formatCurrency(p.price),
          p.stock,
          p.availability === 'ready' ? 'Pronta entrega' : 'Encomenda',
          p.active ? 'Sim' : 'Não',
        ]),
      };
    }

    return {
      title: 'Relatório de pedidos',
      description: 'Visão de pedidos, faturamento, status, pagamentos e produtos vendidos.',
      header: ['Código', 'Data', 'Cliente', 'WhatsApp', 'Situação', 'Pagamento', 'Subtotal', 'Desconto', 'Total', 'Benefício'],
      rows: adminOrders.map((o) => [
        o.publicCode,
        formatDate(o.createdAt),
        o.customer.name,
        o.customer.whatsapp,
        statusLabel(o.status),
        paymentLabel(o.paymentMethod),
        formatCurrency(o.subtotal),
        formatCurrency(o.discountAmount ?? 0),
        formatCurrency(o.total),
        o.benefitType ?? 'Nenhum',
      ]),
    };
  }, [kind, adminOrders, products]);

  const orderDashboard = useMemo(() => {
    const status = new Map<string, number>();
    const payments = new Map<string, number>();
    const days = new Map<string, number>();
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    let revenue = 0;
    let items = 0;

    adminOrders.forEach((order) => {
      revenue += Number(order.total || 0);
      status.set(statusLabel(order.status), (status.get(statusLabel(order.status)) ?? 0) + 1);
      payments.set(paymentLabel(order.paymentMethod), (payments.get(paymentLabel(order.paymentMethod)) ?? 0) + 1);
      const date = new Date(order.createdAt);
      const day = Number.isNaN(date.getTime())
        ? 'Sem data'
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days.set(day, (days.get(day) ?? 0) + 1);

      order.items.forEach((item) => {
        const quantity = Number(item.quantity || 0);
        items += quantity;
        const current = productSales.get(item.productName) ?? { quantity: 0, revenue: 0 };
        current.quantity += quantity;
        current.revenue += Number(item.unitPrice || 0) * quantity;
        productSales.set(item.productName, current);
      });
    });

    return {
      total: adminOrders.length,
      revenue,
      average: adminOrders.length ? revenue / adminOrders.length : 0,
      items,
      status: [...status.entries()].map(([label, value]) => ({ label, value })),
      payments: [...payments.entries()].map(([label, value]) => ({ label, value })),
      days: [...days.entries()].slice(-10).map(([label, value]) => ({ label, value })),
      topProducts: [...productSales.entries()]
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6),
    };
  }, [adminOrders]);

  const productDashboard = useMemo(() => {
    const categories = new Map<string, number>();
    let stockUnits = 0;
    let stockValue = 0;
    let outOfStock = 0;
    let lowStock = 0;

    products.forEach((product) => {
      const stock = Math.max(0, Number(product.stock || 0));
      stockUnits += stock;
      stockValue += stock * Number(product.price || 0);
      if (stock === 0) outOfStock += 1;
      if (stock > 0 && stock <= 5) lowStock += 1;
      categories.set(product.category, (categories.get(product.category) ?? 0) + stock);
    });

    return {
      products: products.length,
      stockUnits,
      stockValue,
      outOfStock,
      lowStock,
      categories: [...categories.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      highestStock: [...products]
        .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
        .slice(0, 6)
        .map((product) => ({ label: product.name, value: Math.max(0, Number(product.stock || 0)) })),
      lowProducts: [...products]
        .filter((product) => Number(product.stock || 0) <= 5)
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 8),
    };
  }, [products]);

  const load = useCallback(async () => {
    if (kind !== 'orders') return;
    setLoading(true);
    setNotice('');
    try {
      await refreshAdminOrders();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível atualizar o relatório.');
    } finally {
      setLoading(false);
    }
  }, [kind, refreshAdminOrders]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function download() {
    try {
      const runtime = globalThis as typeof globalThis & { document?: any; URL?: any };
      if (!runtime.document || !runtime.URL) {
        setNotice('Abra o painel no navegador para baixar o arquivo.');
        return;
      }
      const blob = new Blob([makeCsv(report)], { type: 'text/csv;charset=utf-8;' });
      const url = runtime.URL.createObjectURL(blob);
      const link = runtime.document.createElement('a');
      link.href = url;
      link.download = `joedla-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      runtime.document.body?.appendChild(link);
      link.click();
      runtime.document.body?.removeChild(link);
      runtime.URL.revokeObjectURL(url);
      setNotice('Relatório gerado com sucesso.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o relatório.');
    }
  }

  function printPdf() {
    const runtime = globalThis as typeof globalThis & { print?: () => void };
    if (typeof runtime.print === 'function') runtime.print();
    else setNotice('Abra no navegador para imprimir ou salvar em PDF.');
  }

  return (
    <AdminGuard>
      <AdminPage eyebrow="Relatórios" title={report.title} description={report.description}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para todos os relatórios"
          onPress={() => router.replace('/admin/reports')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={18} color="#9D5F1D" />
          <Text style={styles.backText}>Todos os relatórios</Text>
        </Pressable>

        {kind === 'orders' ? (
          <>
            <View style={styles.metrics}>
              <Metric label="Total de pedidos" value={String(orderDashboard.total)} />
              <Metric label="Faturamento" value={formatCurrency(orderDashboard.revenue)} />
              <Metric label="Ticket médio" value={formatCurrency(orderDashboard.average)} />
              <Metric label="Itens vendidos" value={String(orderDashboard.items)} />
            </View>

            <View style={styles.dashboardGrid}>
              <ChartCard title="Pedidos por dia">
                <ColumnBars items={orderDashboard.days} />
              </ChartCard>
              <ChartCard title="Pedidos por status">
                <HorizontalBars items={orderDashboard.status} />
              </ChartCard>
              <ChartCard title="Formas de pagamento">
                <HorizontalBars items={orderDashboard.payments} />
              </ChartCard>
              <ChartCard title="Produtos mais vendidos">
                <View style={styles.ranking}>
                  {orderDashboard.topProducts.map((item, index) => (
                    <View key={item.name} style={styles.rankRow}>
                      <Text style={styles.rankIndex}>{index + 1}</Text>
                      <View style={styles.rankCopy}>
                        <Text numberOfLines={1} style={styles.rankName}>{item.name}</Text>
                        <Text style={styles.rankMeta}>{item.quantity} un. • {formatCurrency(item.revenue)}</Text>
                      </View>
                    </View>
                  ))}
                  {!orderDashboard.topProducts.length ? <EmptyChart /> : null}
                </View>
              </ChartCard>
            </View>
          </>
        ) : (
          <>
            <View style={styles.metrics}>
              <Metric label="Produtos cadastrados" value={String(productDashboard.products)} />
              <Metric label="Estoque total" value={`${productDashboard.stockUnits} un.`} />
              <Metric label="Valor em estoque" value={formatCurrency(productDashboard.stockValue)} />
              <Metric label="Sem estoque" value={String(productDashboard.outOfStock)} />
            </View>

            <View style={styles.dashboardGrid}>
              <ChartCard title="Estoque por categoria">
                <HorizontalBars items={productDashboard.categories} />
              </ChartCard>
              <ChartCard title="Produtos com maior estoque">
                <HorizontalBars items={productDashboard.highestStock} />
              </ChartCard>
              <ChartCard title="Atenção de estoque">
                <View style={styles.attentionGrid}>
                  <Metric compact label="Estoque baixo" value={String(productDashboard.lowStock)} />
                  <Metric compact label="Sem estoque" value={String(productDashboard.outOfStock)} />
                </View>
                <View style={styles.lowList}>
                  {productDashboard.lowProducts.map((product) => (
                    <View key={product.id} style={styles.lowRow}>
                      <Text numberOfLines={1} style={styles.lowName}>{product.name}</Text>
                      <Text style={Number(product.stock || 0) === 0 ? styles.outValue : styles.lowValue}>
                        {Number(product.stock || 0)} un.
                      </Text>
                    </View>
                  ))}
                  {!productDashboard.lowProducts.length ? <Text style={styles.okText}>Nenhum produto com estoque baixo.</Text> : null}
                </View>
              </ChartCard>
              <ChartCard title="Distribuição do catálogo">
                <HorizontalBars
                  items={[
                    { label: 'Ativos', value: products.filter((p) => p.active).length },
                    { label: 'Inativos', value: products.filter((p) => !p.active).length },
                    { label: 'Pronta entrega', value: products.filter((p) => p.availability === 'ready').length },
                    { label: 'Encomenda', value: products.filter((p) => p.availability === 'custom').length },
                  ]}
                />
              </ChartCard>
            </View>
          </>
        )}

        <AdminSection title="Exportar" description="Baixe os dados em CSV ou salve o painel como PDF.">
          <AdminCard>
            <View style={styles.actions}>
              <Pressable disabled={loading} onPress={download} style={({ pressed }) => [styles.primary, pressed && styles.pressed, loading && styles.disabled]}>
                <Ionicons name="download-outline" size={17} color="#FFF" />
                <Text style={styles.primaryText}>Baixar Excel (CSV)</Text>
              </Pressable>
              <Pressable disabled={loading} onPress={printPdf} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, loading && styles.disabled]}>
                <Ionicons name="print-outline" size={17} color="#9D5F1D" />
                <Text style={styles.secondaryText}>PDF / Imprimir</Text>
              </Pressable>
            </View>
            {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          </AdminCard>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <View style={[styles.metric, compact && styles.metricCompact]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
    </View>
  );
}

function HorizontalBars({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) return <EmptyChart />;
  return (
    <View style={styles.barList}>
      {items.map((item) => (
        <View key={item.label} style={styles.barRow}>
          <View style={styles.barTop}>
            <Text numberOfLines={1} style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barValue}>{item.display ?? item.value}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(3, (item.value / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ColumnBars({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) return <EmptyChart />;
  return (
    <View style={styles.columnChart}>
      {items.map((item) => (
        <View key={item.label} style={styles.columnItem}>
          <Text style={styles.columnValue}>{item.value}</Text>
          <View style={styles.columnTrack}>
            <View style={[styles.columnFill, { height: `${Math.max(5, (item.value / max) * 100)}%` }]} />
          </View>
          <Text numberOfLines={1} style={styles.columnLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyChart() {
  return <Text style={styles.empty}>Sem dados suficientes para o período.</Text>;
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  backText: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    minWidth: 150,
    flexBasis: 190,
    flexGrow: 1,
    minHeight: 92,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  metricCompact: { minWidth: 120, minHeight: 76, flexBasis: 130 },
  metricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  metricValue: { marginTop: 8, color: colors.text, fontSize: 20, fontWeight: '900' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chartCard: {
    minWidth: 270,
    flexBasis: 420,
    flexGrow: 1,
    minHeight: 250,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
  },
  chartTitle: { marginBottom: spacing.md, color: colors.text, fontSize: 12, fontWeight: '900' },
  barList: { gap: 12 },
  barRow: { gap: 5 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  barLabel: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  barValue: { color: colors.text, fontSize: 9, fontWeight: '900' },
  barTrack: { height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: '#EEE5DC' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: '#A66A27' },
  columnChart: { minHeight: 170, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  columnItem: { minWidth: 30, flex: 1, alignItems: 'center', gap: 5 },
  columnValue: { color: colors.text, fontSize: 8, fontWeight: '900' },
  columnTrack: { width: '72%', height: 125, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7, backgroundColor: '#F3ECE5' },
  columnFill: { width: '100%', minHeight: 4, borderRadius: 7, backgroundColor: '#A66A27' },
  columnLabel: { width: '100%', color: colors.textMuted, textAlign: 'center', fontSize: 7, fontWeight: '700' },
  ranking: { gap: 8 },
  rankRow: { minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 9 },
  rankIndex: { width: 25, color: '#9D5F1D', fontSize: 12, fontWeight: '900' },
  rankCopy: { minWidth: 0, flex: 1 },
  rankName: { color: colors.text, fontSize: 10, fontWeight: '900' },
  rankMeta: { marginTop: 2, color: colors.textMuted, fontSize: 8 },
  attentionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lowList: { marginTop: spacing.md, gap: 8 },
  lowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  lowName: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  lowValue: { color: '#B47A33', fontSize: 9, fontWeight: '900' },
  outValue: { color: '#B43D38', fontSize: 9, fontWeight: '900' },
  okText: { color: '#238657', fontSize: 9, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primary: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#9D5F1D',
  },
  primaryText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  secondary: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#9D5F1D',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FFFDFC',
  },
  secondaryText: { color: '#9D5F1D', fontSize: 10, fontWeight: '900' },
  notice: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  empty: { paddingVertical: spacing.xl, color: colors.textMuted, textAlign: 'center', fontSize: 9 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
