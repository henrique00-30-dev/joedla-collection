import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Kind = 'orders' | 'products';
type Row = Array<string | number>;
type ReportData = { title: string; description: string; header: string[]; rows: Row[] };
type BarItem = { label: string; value: number; display?: string };

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function makeCsv(data: ReportData) { return '\uFEFF' + [data.header, ...data.rows].map((row) => row.map(csvCell).join(';')).join('\n'); }
function paymentLabel(value: string) { if (value === 'pix') return 'Pix'; if (value === 'card_link') return 'Cartão'; if (value === 'whatsapp') return 'A combinar'; return value || 'Não informado'; }
function statusLabel(value: string) {
  const labels: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando', ready: 'Pronto', out_for_delivery: 'Em entrega', completed: 'Concluído', cancelled: 'Cancelado' };
  return labels[value] ?? value;
}

export default function AdminDataReportScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const tablet = width >= 600 && width < 1024;
  const { kind: rawKind } = useLocalSearchParams<{ kind?: string }>();
  const kind: Kind = rawKind === 'products' ? 'products' : 'orders';
  const { adminOrders, products, refreshAdminOrders } = useStore();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const report = useMemo<ReportData>(() => kind === 'products' ? {
    title: 'Relatório de produtos e estoques', description: 'Visão de catálogo, disponibilidade, valor e distribuição do estoque.',
    header: ['Produto', 'Categoria', 'Preço', 'Estoque', 'Disponibilidade', 'Ativo'],
    rows: products.map((p) => [p.name, p.category, formatCurrency(p.price), p.stock, p.availability === 'ready' ? 'Pronta entrega' : 'Encomenda', p.active ? 'Sim' : 'Não']),
  } : {
    title: 'Relatório de pedidos', description: 'Visão de pedidos, faturamento, status, pagamentos e produtos vendidos.',
    header: ['Código', 'Data', 'Cliente', 'WhatsApp', 'Situação', 'Pagamento', 'Subtotal', 'Desconto', 'Total', 'Benefício'],
    rows: adminOrders.map((o) => [o.publicCode, formatDate(o.createdAt), o.customer.name, o.customer.whatsapp, statusLabel(o.status), paymentLabel(o.paymentMethod), formatCurrency(o.subtotal), formatCurrency(o.discountAmount ?? 0), formatCurrency(o.total), o.benefitType ?? 'Nenhum']),
  }, [kind, adminOrders, products]);

  const orderDashboard = useMemo(() => {
    const status = new Map<string, number>(); const payments = new Map<string, number>(); const days = new Map<string, number>(); const sales = new Map<string, { quantity: number; revenue: number }>();
    let revenue = 0; let items = 0;
    adminOrders.forEach((order) => {
      revenue += Number(order.total || 0);
      status.set(statusLabel(order.status), (status.get(statusLabel(order.status)) ?? 0) + 1);
      payments.set(paymentLabel(order.paymentMethod), (payments.get(paymentLabel(order.paymentMethod)) ?? 0) + 1);
      const d = new Date(order.createdAt); const day = Number.isNaN(d.getTime()) ? 'Sem data' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days.set(day, (days.get(day) ?? 0) + 1);
      order.items.forEach((item) => { const q = Number(item.quantity || 0); items += q; const current = sales.get(item.productName) ?? { quantity: 0, revenue: 0 }; current.quantity += q; current.revenue += Number(item.unitPrice || 0) * q; sales.set(item.productName, current); });
    });
    return { total: adminOrders.length, revenue, average: adminOrders.length ? revenue / adminOrders.length : 0, items,
      status: [...status.entries()].map(([label, value]) => ({ label, value })), payments: [...payments.entries()].map(([label, value]) => ({ label, value })),
      days: [...days.entries()].slice(phone ? -7 : -10).map(([label, value]) => ({ label, value })), topProducts: [...sales.entries()].map(([name, data]) => ({ name, ...data })).sort((a, b) => b.quantity - a.quantity).slice(0, 6) };
  }, [adminOrders, phone]);

  const productDashboard = useMemo(() => {
    const categories = new Map<string, number>(); let stockUnits = 0; let stockValue = 0; let outOfStock = 0; let lowStock = 0;
    products.forEach((p) => { const stock = Math.max(0, Number(p.stock || 0)); stockUnits += stock; stockValue += stock * Number(p.price || 0); if (stock === 0) outOfStock += 1; if (stock > 0 && stock <= 5) lowStock += 1; categories.set(p.category, (categories.get(p.category) ?? 0) + stock); });
    return { products: products.length, stockUnits, stockValue, outOfStock, lowStock,
      categories: [...categories.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      highestStock: [...products].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0)).slice(0, 6).map((p) => ({ label: p.name, value: Math.max(0, Number(p.stock || 0)) })),
      lowProducts: [...products].filter((p) => Number(p.stock || 0) <= 5).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0)).slice(0, 8) };
  }, [products]);

  const load = useCallback(async () => { if (kind !== 'orders') return; setLoading(true); setNotice(''); try { await refreshAdminOrders(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível atualizar o relatório.'); } finally { setLoading(false); } }, [kind, refreshAdminOrders]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function download() {
    try { const runtime = globalThis as typeof globalThis & { document?: any; URL?: any }; if (!runtime.document || !runtime.URL) { setNotice('Abra o painel no navegador para baixar o arquivo.'); return; }
      const blob = new Blob([makeCsv(report)], { type: 'text/csv;charset=utf-8;' }); const url = runtime.URL.createObjectURL(blob); const link = runtime.document.createElement('a'); link.href = url; link.download = `joedla-${kind}-${new Date().toISOString().slice(0, 10)}.csv`; runtime.document.body?.appendChild(link); link.click(); runtime.document.body?.removeChild(link); runtime.URL.revokeObjectURL(url); setNotice('Relatório gerado com sucesso.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o relatório.'); }
  }
  function printPdf() { const runtime = globalThis as typeof globalThis & { print?: () => void }; if (typeof runtime.print === 'function') runtime.print(); else setNotice('Abra no navegador para imprimir ou salvar em PDF.'); }

  const stack = phone || tablet;
  return <AdminGuard><AdminPage eyebrow="Relatórios" title={report.title} description={report.description}>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/admin/reports')} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={18} color="#9D5F1D" /><Text style={styles.backText}>Todos os relatórios</Text></Pressable>

    {kind === 'orders' ? <>
      <View style={styles.metrics}><Metric phone={phone} label="Total de pedidos" value={String(orderDashboard.total)} /><Metric phone={phone} label="Faturamento" value={formatCurrency(orderDashboard.revenue)} /><Metric phone={phone} label="Ticket médio" value={formatCurrency(orderDashboard.average)} /><Metric phone={phone} label="Itens vendidos" value={String(orderDashboard.items)} /></View>
      <View style={[styles.dashboardGrid, stack && styles.dashboardStack]}>
        <ChartCard stack={stack} title="Pedidos por dia"><ColumnBars items={orderDashboard.days} /></ChartCard>
        <ChartCard stack={stack} title="Pedidos por status"><HorizontalBars items={orderDashboard.status} /></ChartCard>
        <ChartCard stack={stack} title="Formas de pagamento"><HorizontalBars items={orderDashboard.payments} /></ChartCard>
        <ChartCard stack={stack} title="Produtos mais vendidos"><View style={styles.ranking}>{orderDashboard.topProducts.map((item, index) => <View key={item.name} style={styles.rankRow}><Text style={styles.rankIndex}>{index + 1}</Text><View style={styles.rankCopy}><Text numberOfLines={1} style={styles.rankName}>{item.name}</Text><Text style={styles.rankMeta}>{item.quantity} un. • {formatCurrency(item.revenue)}</Text></View></View>)}{!orderDashboard.topProducts.length ? <EmptyChart /> : null}</View></ChartCard>
      </View>
    </> : <>
      <View style={styles.metrics}><Metric phone={phone} label="Produtos cadastrados" value={String(productDashboard.products)} /><Metric phone={phone} label="Estoque total" value={`${productDashboard.stockUnits} un.`} /><Metric phone={phone} label="Valor em estoque" value={formatCurrency(productDashboard.stockValue)} /><Metric phone={phone} label="Sem estoque" value={String(productDashboard.outOfStock)} /></View>
      <View style={[styles.dashboardGrid, stack && styles.dashboardStack]}>
        <ChartCard stack={stack} title="Estoque por categoria"><HorizontalBars items={productDashboard.categories} /></ChartCard>
        <ChartCard stack={stack} title="Produtos com maior estoque"><HorizontalBars items={productDashboard.highestStock} /></ChartCard>
        <ChartCard stack={stack} title="Atenção de estoque"><View style={styles.attentionGrid}><Metric phone={phone} compact label="Estoque baixo" value={String(productDashboard.lowStock)} /><Metric phone={phone} compact label="Sem estoque" value={String(productDashboard.outOfStock)} /></View><View style={styles.lowList}>{productDashboard.lowProducts.map((p) => <View key={p.id} style={styles.lowRow}><Text numberOfLines={1} style={styles.lowName}>{p.name}</Text><Text style={Number(p.stock || 0) === 0 ? styles.outValue : styles.lowValue}>{Number(p.stock || 0)} un.</Text></View>)}{!productDashboard.lowProducts.length ? <Text style={styles.okText}>Nenhum produto com estoque baixo.</Text> : null}</View></ChartCard>
        <ChartCard stack={stack} title="Distribuição do catálogo"><HorizontalBars items={[{ label: 'Ativos', value: products.filter((p) => p.active).length }, { label: 'Inativos', value: products.filter((p) => !p.active).length }, { label: 'Pronta entrega', value: products.filter((p) => p.availability === 'ready').length }, { label: 'Encomenda', value: products.filter((p) => p.availability === 'custom').length }]} /></ChartCard>
      </View>
    </>}

    <AdminSection title="Exportar" description="Baixe os dados em CSV ou salve o painel como PDF."><AdminCard><View style={[styles.actions, phone && styles.actionsPhone]}><Pressable disabled={loading} onPress={download} style={({ pressed }) => [styles.primary, phone && styles.actionPhone, pressed && styles.pressed, loading && styles.disabled]}><Ionicons name="download-outline" size={17} color="#FFF" /><Text style={styles.primaryText}>Baixar Excel (CSV)</Text></Pressable><Pressable disabled={loading} onPress={printPdf} style={({ pressed }) => [styles.secondary, phone && styles.actionPhone, pressed && styles.pressed, loading && styles.disabled]}><Ionicons name="print-outline" size={17} color="#9D5F1D" /><Text style={styles.secondaryText}>PDF / Imprimir</Text></Pressable></View>{notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}</AdminCard></AdminSection>
  </AdminPage></AdminGuard>;
}

function Metric({ label, value, compact = false, phone = false }: { label: string; value: string; compact?: boolean; phone?: boolean }) { return <View style={[styles.metric, compact && styles.metricCompact, phone && styles.metricPhone]}><Text style={styles.metricLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text></View>; }
function ChartCard({ title, children, stack }: { title: string; children: React.ReactNode; stack: boolean }) { return <View style={[styles.chartCard, stack && styles.chartCardStack]}><Text style={styles.chartTitle}>{title}</Text>{children}</View>; }
function HorizontalBars({ items }: { items: BarItem[] }) { const max = Math.max(1, ...items.map((i) => i.value)); if (!items.length) return <EmptyChart />; return <View style={styles.barList}>{items.map((i) => <View key={i.label} style={styles.barRow}><View style={styles.barTop}><Text numberOfLines={1} style={styles.barLabel}>{i.label}</Text><Text style={styles.barValue}>{i.display ?? i.value}</Text></View><View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max(3, (i.value / max) * 100)}%` }]} /></View></View>)}</View>; }
function ColumnBars({ items }: { items: BarItem[] }) { const max = Math.max(1, ...items.map((i) => i.value)); if (!items.length) return <EmptyChart />; return <View style={styles.columnChart}>{items.map((i) => <View key={i.label} style={styles.columnItem}><Text style={styles.columnValue}>{i.value}</Text><View style={styles.columnTrack}><View style={[styles.columnFill, { height: `${Math.max(5, (i.value / max) * 100)}%` }]} /></View><Text numberOfLines={1} style={styles.columnLabel}>{i.label}</Text></View>)}</View>; }
function EmptyChart() { return <Text style={styles.empty}>Sem dados suficientes para o período.</Text>; }

const styles = StyleSheet.create({
  back:{alignSelf:'flex-start',minHeight:42,paddingHorizontal:spacing.sm,borderRadius:radii.pill,flexDirection:'row',alignItems:'center',gap:7},backText:{color:'#9D5F1D',fontSize:11,fontWeight:'900'},
  metrics:{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},metric:{minWidth:0,flexBasis:190,flexGrow:1,minHeight:92,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.medium,justifyContent:'center',backgroundColor:colors.surface},metricPhone:{flexBasis:'47%'},metricCompact:{minHeight:76,flexBasis:130},metricLabel:{color:colors.textMuted,fontSize:9,fontWeight:'800'},metricValue:{marginTop:8,color:colors.text,fontSize:20,fontWeight:'900'},
  dashboardGrid:{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',gap:spacing.md},dashboardStack:{flexDirection:'column',flexWrap:'nowrap'},chartCard:{minWidth:0,maxWidth:'100%',flexBasis:420,flexGrow:1,minHeight:250,padding:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radii.large,backgroundColor:colors.surface,overflow:'hidden'},chartCardStack:{width:'100%',flexBasis:'auto',flexGrow:0},chartTitle:{marginBottom:spacing.md,color:colors.text,fontSize:12,fontWeight:'900'},
  barList:{width:'100%',minWidth:0,gap:12},barRow:{width:'100%',minWidth:0,gap:5},barTop:{width:'100%',minWidth:0,flexDirection:'row',justifyContent:'space-between',gap:10},barLabel:{minWidth:0,flex:1,color:colors.textMuted,fontSize:9,fontWeight:'700'},barValue:{maxWidth:'35%',flexShrink:1,color:colors.text,textAlign:'right',fontSize:9,fontWeight:'900'},barTrack:{width:'100%',height:9,overflow:'hidden',borderRadius:999,backgroundColor:'#EEE5DC'},barFill:{height:'100%',borderRadius:999,backgroundColor:'#A66A27'},
  columnChart:{width:'100%',minWidth:0,minHeight:170,flexDirection:'row',alignItems:'flex-end',gap:4},columnItem:{minWidth:0,flex:1,alignItems:'center',gap:5},columnValue:{color:colors.text,fontSize:8,fontWeight:'900'},columnTrack:{width:'72%',height:125,justifyContent:'flex-end',overflow:'hidden',borderRadius:7,backgroundColor:'#F3ECE5'},columnFill:{width:'100%',minHeight:4,borderRadius:7,backgroundColor:'#A66A27'},columnLabel:{width:'100%',color:colors.textMuted,textAlign:'center',fontSize:7,fontWeight:'700'},
  ranking:{width:'100%',gap:8},rankRow:{width:'100%',minWidth:0,minHeight:37,flexDirection:'row',alignItems:'center',gap:9},rankIndex:{width:25,color:'#9D5F1D',fontSize:12,fontWeight:'900'},rankCopy:{minWidth:0,flex:1},rankName:{color:colors.text,fontSize:10,fontWeight:'900'},rankMeta:{marginTop:2,color:colors.textMuted,fontSize:8},attentionGrid:{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},lowList:{marginTop:spacing.md,gap:8},lowRow:{width:'100%',minWidth:0,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},lowName:{minWidth:0,flex:1,color:colors.textMuted,fontSize:9,fontWeight:'700'},lowValue:{color:'#B47A33',fontSize:9,fontWeight:'900'},outValue:{color:'#B43D38',fontSize:9,fontWeight:'900'},okText:{color:'#238657',fontSize:9,fontWeight:'800'},
  actions:{width:'100%',minWidth:0,flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},actionsPhone:{flexDirection:'column'},primary:{minHeight:44,paddingHorizontal:spacing.lg,borderRadius:radii.pill,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#9D5F1D'},secondary:{minHeight:44,paddingHorizontal:spacing.lg,borderWidth:1,borderColor:'#9D5F1D',borderRadius:radii.pill,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,backgroundColor:'#FFFDFC'},actionPhone:{width:'100%'},primaryText:{color:'#FFF',fontSize:10,fontWeight:'900'},secondaryText:{color:'#9D5F1D',fontSize:10,fontWeight:'900'},notice:{marginTop:spacing.sm,color:colors.textMuted,fontSize:10,fontWeight:'800'},empty:{paddingVertical:spacing.xl,color:colors.textMuted,textAlign:'center',fontSize:9},pressed:{opacity:.72},disabled:{opacity:.5}
});
