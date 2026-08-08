import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { useStore } from '@/src/context/store-context';
import { loadStoreAnalytics } from '@/src/services/analytics';
import { loadAdminStoreCustomers } from '@/src/services/admin-finance';
import { loadAdminClubCustomers } from '@/src/services/club';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Kind = 'orders' | 'customers' | 'club' | 'analytics' | 'products';
type Row = Array<string | number>;

type ReportData = { title: string; description: string; header: string[]; rows: Row[] };

function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function makeCsv(data: ReportData) { return '\uFEFF' + [data.header, ...data.rows].map((row) => row.map(csvCell).join(';')).join('\n'); }

export default function AdminDataReportScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind?: string }>();
  const kind = (rawKind || 'orders') as Kind;
  const { adminOrders, products, refreshAdminOrders } = useStore();
  const [remote, setRemote] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const local = useMemo<ReportData | null>(() => {
    if (kind === 'orders') return {
      title: 'Relatório de pedidos', description: 'Pedidos registrados, clientes, situação, valores e benefícios.',
      header: ['Código', 'Data', 'Cliente', 'WhatsApp', 'Situação', 'Subtotal', 'Desconto', 'Total', 'Benefício'],
      rows: adminOrders.map((o) => [o.publicCode, formatDate(o.createdAt), o.customer.name, o.customer.whatsapp, o.status, formatCurrency(o.subtotal), formatCurrency(o.discountAmount ?? 0), formatCurrency(o.total), o.benefitType ?? 'Nenhum']),
    };
    if (kind === 'products') return {
      title: 'Relatório de produtos e estoque', description: 'Catálogo, preços, disponibilidade e estoque atual.',
      header: ['Produto', 'Categoria', 'Preço', 'Estoque', 'Disponibilidade', 'Ativo'],
      rows: products.map((p) => [p.name, p.category, formatCurrency(p.price), p.stock, p.availability === 'ready' ? 'Pronta entrega' : 'Encomenda', p.active ? 'Sim' : 'Não']),
    };
    return null;
  }, [kind, adminOrders, products]);

  const load = useCallback(async () => {
    setLoading(true); setNotice('');
    try {
      if (kind === 'orders') await refreshAdminOrders();
      else if (kind === 'customers') {
        const rows = await loadAdminStoreCustomers('');
        setRemote({ title: 'Relatório de clientes', description: 'Clientes compradores, compras, valores recebidos e pendentes.', header: ['Cliente', 'WhatsApp', 'Compras', 'Total comprado', 'Total recebido', 'Em aberto', 'Clube', 'Primeira compra', 'Última compra'], rows: rows.map((c) => [c.name, c.whatsapp, c.total_orders, formatCurrency(Number(c.total_ordered)), formatCurrency(Number(c.total_paid)), formatCurrency(Number(c.total_open)), c.club_member ? 'Sim' : 'Não', formatDate(c.first_order_at), formatDate(c.last_order_at)]) });
      } else if (kind === 'club') {
        const rows = await loadAdminClubCustomers();
        setRemote({ title: 'Relatório Clube Joedla', description: 'Pessoas cadastradas, pontuação, compras e valores em aberto.', header: ['Cliente', 'WhatsApp', 'Pontos', 'Total comprado', 'Em aberto'], rows: rows.map((c) => [c.name, c.whatsapp, c.points, formatCurrency(Number(c.total_purchases)), formatCurrency(Number(c.total_open))]) });
      } else if (kind === 'analytics') {
        const a = await loadStoreAnalytics(30);
        const rows: Row[] = [
          ['Visitantes únicos', a.uniqueVisitors], ['Acessos', a.totalVisits], ['Visualizações de produtos', a.productViews], ['Pedidos', a.orders],
          ...a.topViewed.map((p) => [`Mais visto: ${p.name}`, p.count]),
          ...a.topPurchased.map((p) => [`Mais comprado: ${p.name}`, p.count]),
        ];
        setRemote({ title: 'Relatório de desempenho', description: 'Métricas dos últimos 30 dias e ranking de produtos.', header: ['Indicador', 'Quantidade'], rows });
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível carregar o relatório.'); }
    finally { setLoading(false); }
  }, [kind, refreshAdminOrders]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const report = local ?? remote;

  function download() {
    if (!report) return;
    try {
      const runtime = globalThis as typeof globalThis & { document?: any; URL?: any };
      if (!runtime.document || !runtime.URL) { setNotice('Abra o painel no navegador para baixar o arquivo.'); return; }
      const blob = new Blob([makeCsv(report)], { type: 'text/csv;charset=utf-8;' });
      const url = runtime.URL.createObjectURL(blob); const link = runtime.document.createElement('a');
      link.href = url; link.download = `joedla-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      runtime.document.body?.appendChild(link); link.click(); runtime.document.body?.removeChild(link); runtime.URL.revokeObjectURL(url);
      setNotice('Relatório gerado com sucesso.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível gerar o relatório.'); }
  }
  function printPdf() { const runtime = globalThis as typeof globalThis & { print?: () => void }; if (typeof runtime.print === 'function') runtime.print(); else setNotice('Abra no navegador para imprimir ou salvar em PDF.'); }

  return <AdminGuard><AdminPage eyebrow="Relatórios" title={report?.title ?? 'Relatório'} description={report?.description ?? 'Carregando informações...'}>
    <AdminSection title="Exportar" description="Baixe os dados ou salve a visualização como PDF."><AdminCard>
      <View style={styles.actions}><Pressable disabled={!report || loading} onPress={download} style={styles.primary}><Text style={styles.primaryText}>Baixar Excel (CSV)</Text></Pressable><Pressable disabled={!report || loading} onPress={printPdf} style={styles.secondary}><Text style={styles.secondaryText}>PDF / Imprimir</Text></Pressable></View>
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    </AdminCard></AdminSection>
    <AdminSection title="Dados do relatório" description={`${report?.rows.length ?? 0} registros`}><AdminCard><View style={styles.preview}>{(report?.rows ?? []).slice(0, 12).map((row, i) => <Text key={i} style={styles.row}>{row.join(' • ')}</Text>)}{report && report.rows.length > 12 ? <Text style={styles.more}>+ {report.rows.length - 12} registros no arquivo</Text> : null}{!loading && report?.rows.length === 0 ? <Text style={styles.row}>Nenhum registro encontrado.</Text> : null}</View></AdminCard></AdminSection>
  </AdminPage></AdminGuard>;
}

const styles = StyleSheet.create({ actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}, primary:{minHeight:44,paddingHorizontal:spacing.lg,borderRadius:radii.pill,alignItems:'center',justifyContent:'center',backgroundColor:'#9D5F1D'},primaryText:{color:'#FFF',fontSize:10,fontWeight:'900'},secondary:{minHeight:44,paddingHorizontal:spacing.lg,borderWidth:1,borderColor:'#9D5F1D',borderRadius:radii.pill,alignItems:'center',justifyContent:'center'},secondaryText:{color:'#9D5F1D',fontSize:10,fontWeight:'900'},notice:{marginTop:spacing.sm,color:colors.textMuted,fontSize:10,fontWeight:'800'},preview:{gap:spacing.xs},row:{color:colors.textMuted,fontSize:10,lineHeight:16},more:{color:'#9D5F1D',fontSize:10,fontWeight:'900',marginTop:spacing.sm} });