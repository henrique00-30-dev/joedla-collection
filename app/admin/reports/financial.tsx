import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import {
  AdminFinancialOverview,
  loadAdminFinancialOverview,
} from '@/src/services/admin-finance';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function toCsv(report: AdminFinancialOverview) {
  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'];
  const rows = report.entries.map((entry) => [
    formatDate(entry.occurredAt),
    entry.kind === 'income' ? 'Entrada' : 'Saída',
    entry.category,
    entry.description,
    Number(entry.amount).toFixed(2).replace('.', ','),
  ]);
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
}

function rangeFor(mode: 'month' | '30d') {
  const end = new Date();
  const start = new Date(end);
  if (mode === 'month') start.setDate(1);
  else start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    sale_payment: 'Vendas',
    refund: 'Estornos',
    merchandise: 'Mercadorias',
    packaging: 'Embalagens',
    gift: 'Brindes',
    marketing: 'Marketing',
    operating: 'Operacional',
    other_income: 'Outras entradas',
    other: 'Outros',
  };
  return labels[category] ?? category;
}

export default function AdminFinancialReportScreen() {
  const [mode, setMode] = useState<'month' | '30d'>('month');
  const [report, setReport] = useState<AdminFinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const range = useMemo(() => rangeFor(mode), [mode]);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice('');
    try {
      setReport(await loadAdminFinancialOverview(range.start, range.end));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar o relatório.';
      setNotice(message);
      Alert.alert('Não foi possível carregar', message);
    } finally {
      setLoading(false);
    }
  }, [range.start.getTime(), range.end.getTime()]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function downloadExcel() {
    if (!report) return;
    try {
      const runtime = globalThis as typeof globalThis & {
        document?: { createElement: (tag: string) => any; body?: { appendChild: (node: any) => void; removeChild: (node: any) => void } };
        URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
      };
      if (!runtime.document || !runtime.URL) {
        setNotice('A exportação para Excel está disponível pelo painel aberto no navegador.');
        return;
      }
      const blob = new Blob([toCsv(report)], { type: 'text/csv;charset=utf-8;' });
      const url = runtime.URL.createObjectURL(blob);
      const link = runtime.document.createElement('a');
      link.href = url;
      link.download = `joedla-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
      runtime.document.body?.appendChild(link);
      link.click();
      runtime.document.body?.removeChild(link);
      runtime.URL.revokeObjectURL(url);
      setNotice('Arquivo gerado com sucesso. O CSV abre normalmente no Excel.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o arquivo.');
    }
  }

  function printPdf() {
    const runtime = globalThis as typeof globalThis & { print?: () => void };
    if (typeof runtime.print !== 'function') {
      setNotice('Para gerar PDF, abra este relatório no navegador e use Imprimir / Salvar como PDF.');
      return;
    }
    runtime.print();
  }

  const summary = report?.summary;
  const daily = report?.daily ?? [];
  const expenseCategories = report?.expenseCategories ?? [];
  const maxDaily = Math.max(1, ...daily.map((point) => Math.max(Number(point.income || 0), Number(point.expense || 0))));
  const maxExpense = Math.max(1, ...expenseCategories.map((item) => Number(item.amount || 0)));

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Relatório financeiro"
        description="Painel consolidado de entradas, saídas, saldo, margem e movimentações financeiras.">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para todos os relatórios"
          onPress={() => router.replace('/admin/reports')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={18} color="#9D5F1D" />
          <Text style={styles.backText}>Todos os relatórios</Text>
        </Pressable>

        <View style={styles.filters}>
          <Pressable onPress={() => setMode('month')} style={[styles.filter, mode === 'month' && styles.filterActive]}>
            <Text style={mode === 'month' ? styles.filterTextActive : styles.filterText}>Este mês</Text>
          </Pressable>
          <Pressable onPress={() => setMode('30d')} style={[styles.filter, mode === '30d' && styles.filterActive]}>
            <Text style={mode === '30d' ? styles.filterTextActive : styles.filterText}>Últimos 30 dias</Text>
          </Pressable>
          <Text style={styles.period}>{formatDate(range.start.toISOString())} até {formatDate(range.end.toISOString())}</Text>
        </View>

        <View style={styles.metrics}>
          <AdminStatCard compact icon="arrow-down-circle-outline" label="Entradas" value={formatCurrency(Number(summary?.income ?? 0))} tone="success" />
          <AdminStatCard compact icon="arrow-up-circle-outline" label="Saídas" value={formatCurrency(Number(summary?.expenses ?? 0))} tone="warning" />
          <AdminStatCard compact icon="wallet-outline" label="Saldo" value={formatCurrency(Number(summary?.balance ?? 0))} tone={Number(summary?.balance ?? 0) >= 0 ? 'success' : 'warning'} />
          <AdminStatCard compact icon="time-outline" label="Em aberto" value={formatCurrency(Number(summary?.pending ?? 0))} tone={Number(summary?.pending ?? 0) > 0 ? 'warning' : 'success'} />
          <AdminStatCard compact icon="cart-outline" label="Vendas brutas" value={formatCurrency(Number(summary?.grossSales ?? 0))} tone="neutral" />
          <AdminStatCard compact icon="trending-up-outline" label="Margem bruta" value={formatCurrency(Number(summary?.grossMargin ?? 0))} tone={Number(summary?.grossMargin ?? 0) >= 0 ? 'success' : 'warning'} />
        </View>

        <View style={styles.dashboardGrid}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Entradas x saídas por dia</Text>
            {daily.length ? (
              <View style={styles.dailyChart}>
                {daily.slice(-12).map((point) => (
                  <View key={point.date} style={styles.dayColumn}>
                    <View style={styles.dayBars}>
                      <View style={[styles.incomeBar, { height: `${Math.max(3, (Number(point.income || 0) / maxDaily) * 100)}%` }]} />
                      <View style={[styles.expenseBar, { height: `${Math.max(3, (Number(point.expense || 0) / maxDaily) * 100)}%` }]} />
                    </View>
                    <Text numberOfLines={1} style={styles.dayLabel}>{new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.empty}>Sem movimentações no período.</Text>}
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#238657' }]} /><Text style={styles.legendText}>Entradas</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#C77A2B' }]} /><Text style={styles.legendText}>Saídas</Text></View>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Distribuição das despesas</Text>
            {expenseCategories.length ? (
              <View style={styles.expenseList}>
                {expenseCategories.map((item) => (
                  <View key={item.category} style={styles.expenseRow}>
                    <View style={styles.expenseTop}>
                      <Text numberOfLines={1} style={styles.expenseLabel}>{categoryLabel(item.category)}</Text>
                      <Text style={styles.expenseValue}>{formatCurrency(Number(item.amount || 0))}</Text>
                    </View>
                    <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, (Number(item.amount || 0) / maxExpense) * 100)}%` }]} /></View>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.empty}>Nenhuma despesa registrada no período.</Text>}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Resumo financeiro</Text>
            <View style={styles.summaryList}>
              <SummaryRow label="Entradas" value={formatCurrency(Number(summary?.income ?? 0))} />
              <SummaryRow label="Saídas" value={formatCurrency(Number(summary?.expenses ?? 0))} />
              <SummaryRow label="Saldo" value={formatCurrency(Number(summary?.balance ?? 0))} />
              <SummaryRow label="Em aberto" value={formatCurrency(Number(summary?.pending ?? 0))} />
              <SummaryRow label="Custo das mercadorias" value={formatCurrency(Number(summary?.costOfGoodsSold ?? 0))} />
              <SummaryRow label="Margem bruta" value={formatCurrency(Number(summary?.grossMargin ?? 0))} strong />
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Últimas movimentações</Text>
            <View style={styles.movements}>
              {(report?.entries ?? []).slice(0, 7).map((entry) => (
                <View key={entry.id} style={styles.movementRow}>
                  <View style={styles.movementCopy}>
                    <Text numberOfLines={1} style={styles.movementTitle}>{entry.description}</Text>
                    <Text style={styles.movementMeta}>{formatDate(entry.occurredAt)} • {categoryLabel(entry.category)}</Text>
                  </View>
                  <Text style={entry.kind === 'income' ? styles.income : styles.expense}>
                    {entry.kind === 'income' ? '+' : '-'} {formatCurrency(Number(entry.amount))}
                  </Text>
                </View>
              ))}
              {!report?.entries.length ? <Text style={styles.empty}>Nenhuma movimentação encontrada.</Text> : null}
            </View>
          </View>
        </View>

        <AdminSection title="Exportar" description="Baixe os dados ou salve o painel como PDF.">
          <AdminCard>
            <View style={styles.actions}>
              <Pressable disabled={loading || !report} onPress={downloadExcel} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Ionicons name="download-outline" size={17} color="#FFF" />
                <Text style={styles.primaryText}>Baixar Excel (CSV)</Text>
              </Pressable>
              <Pressable disabled={loading || !report} onPress={printPdf} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
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

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backText: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  filter: { minHeight: 38, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  filterActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  period: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chartCard: { minWidth: 270, flexBasis: 420, flexGrow: 1, minHeight: 260, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, backgroundColor: colors.surface },
  chartTitle: { marginBottom: spacing.md, color: colors.text, fontSize: 12, fontWeight: '900' },
  dailyChart: { minHeight: 165, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  dayColumn: { minWidth: 27, flex: 1, alignItems: 'center', gap: 5 },
  dayBars: { width: '86%', height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  incomeBar: { width: '42%', minHeight: 3, borderRadius: 5, backgroundColor: '#238657' },
  expenseBar: { width: '42%', minHeight: 3, borderRadius: 5, backgroundColor: '#C77A2B' },
  dayLabel: { width: '100%', color: colors.textMuted, textAlign: 'center', fontSize: 7, fontWeight: '700' },
  legend: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 8, fontWeight: '700' },
  expenseList: { gap: 12 },
  expenseRow: { gap: 5 },
  expenseTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  expenseLabel: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  expenseValue: { color: colors.text, fontSize: 9, fontWeight: '900' },
  track: { height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: '#EEE5DC' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#C77A2B' },
  summaryList: { gap: 3 },
  summaryRow: { minHeight: 34, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9 },
  summaryValue: { color: colors.text, fontSize: 10, fontWeight: '800' },
  summaryStrong: { color: '#238657', fontSize: 12, fontWeight: '900' },
  movements: { gap: 5 },
  movementRow: { minHeight: 41, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  movementCopy: { minWidth: 0, flex: 1 },
  movementTitle: { color: colors.text, fontSize: 9, fontWeight: '900' },
  movementMeta: { marginTop: 2, color: colors.textMuted, fontSize: 7 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primary: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#9D5F1D' },
  primaryText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  secondary: { minHeight: 44, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#9D5F1D', borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#FFFDFC' },
  secondaryText: { color: '#9D5F1D', fontSize: 10, fontWeight: '900' },
  notice: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  income: { color: '#238657', fontSize: 9, fontWeight: '900' },
  expense: { color: '#B43D38', fontSize: 9, fontWeight: '900' },
  empty: { paddingVertical: spacing.xl, color: colors.textMuted, textAlign: 'center', fontSize: 9 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
