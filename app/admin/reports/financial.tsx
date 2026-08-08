import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { AdminFinancialOverview, loadAdminFinancialOverview } from '@/src/services/admin-finance';
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
    categoryLabel(entry.category),
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
    sale_payment: 'Vendas', refund: 'Estornos', merchandise: 'Mercadorias', packaging: 'Embalagens',
    gift: 'Brindes', marketing: 'Marketing', operating: 'Operacional', other_income: 'Outras entradas', other: 'Outros',
  };
  return labels[category] ?? category;
}

export default function AdminFinancialReportScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const tablet = width >= 600 && width < 1024;
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
      const runtime = globalThis as typeof globalThis & { document?: any; URL?: any };
      if (!runtime.document || !runtime.URL) {
        setNotice('A exportação está disponível pelo painel aberto no navegador.');
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
      setNotice('Arquivo gerado com sucesso.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o arquivo.');
    }
  }

  function printPdf() {
    const runtime = globalThis as typeof globalThis & { print?: () => void };
    if (typeof runtime.print === 'function') runtime.print();
    else setNotice('Abra no navegador para imprimir ou salvar em PDF.');
  }

  const summary = report?.summary;
  const daily = report?.daily ?? [];
  const expenseCategories = report?.expenseCategories ?? [];
  const maxDaily = Math.max(1, ...daily.map((point) => Math.max(Number(point.income || 0), Number(point.expense || 0))));
  const maxExpense = Math.max(1, ...expenseCategories.map((item) => Number(item.amount || 0)));

  return (
    <AdminGuard>
      <AdminPage eyebrow="Relatórios" title="Relatório financeiro" description="Painel consolidado de entradas, saídas, saldo, margem e movimentações financeiras.">
        <Pressable accessibilityRole="button" onPress={() => router.replace('/admin/reports')} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={18} color="#9D5F1D" />
          <Text style={styles.backText}>Todos os relatórios</Text>
        </Pressable>

        <View style={[styles.filters, phone && styles.filtersPhone]}>
          <Pressable onPress={() => setMode('month')} style={[styles.filter, phone && styles.filterPhone, mode === 'month' && styles.filterActive]}>
            <Text style={mode === 'month' ? styles.filterTextActive : styles.filterText}>Este mês</Text>
          </Pressable>
          <Pressable onPress={() => setMode('30d')} style={[styles.filter, phone && styles.filterPhone, mode === '30d' && styles.filterActive]}>
            <Text style={mode === '30d' ? styles.filterTextActive : styles.filterText}>Últimos 30 dias</Text>
          </Pressable>
          <Text style={[styles.period, phone && styles.periodPhone]}>{formatDate(range.start.toISOString())} até {formatDate(range.end.toISOString())}</Text>
        </View>

        <View style={styles.metrics}>
          <AdminStatCard compact icon="arrow-down-circle-outline" label="Entradas" value={formatCurrency(Number(summary?.income ?? 0))} tone="success" style={[styles.stat, phone && styles.statPhone]} />
          <AdminStatCard compact icon="arrow-up-circle-outline" label="Saídas" value={formatCurrency(Number(summary?.expenses ?? 0))} tone="warning" style={[styles.stat, phone && styles.statPhone]} />
          <AdminStatCard compact icon="wallet-outline" label="Saldo" value={formatCurrency(Number(summary?.balance ?? 0))} tone={Number(summary?.balance ?? 0) >= 0 ? 'success' : 'warning'} style={[styles.stat, phone && styles.statPhone]} />
          <AdminStatCard compact icon="time-outline" label="Em aberto" value={formatCurrency(Number(summary?.pending ?? 0))} tone={Number(summary?.pending ?? 0) > 0 ? 'warning' : 'success'} style={[styles.stat, phone && styles.statPhone]} />
        </View>

        <View style={[styles.dashboardGrid, (phone || tablet) && styles.dashboardStack]}>
          <View style={[styles.chartCard, (phone || tablet) && styles.chartCardStack]}>
            <Text style={styles.chartTitle}>Entradas x saídas por dia</Text>
            {daily.length ? (
              <View style={styles.dailyChart}>
                {daily.slice(phone ? -7 : -12).map((point) => (
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
              <Legend color="#238657" label="Entradas" />
              <Legend color="#C77A2B" label="Saídas" />
            </View>
          </View>

          <View style={[styles.chartCard, (phone || tablet) && styles.chartCardStack]}>
            <Text style={styles.chartTitle}>Distribuição das despesas</Text>
            {expenseCategories.length ? expenseCategories.map((item) => (
              <View key={item.category} style={styles.expenseRow}>
                <View style={styles.expenseTop}>
                  <Text numberOfLines={1} style={styles.expenseLabel}>{categoryLabel(item.category)}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.expenseValue}>{formatCurrency(Number(item.amount || 0))}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, (Number(item.amount || 0) / maxExpense) * 100)}%` }]} /></View>
              </View>
            )) : <Text style={styles.empty}>Nenhuma despesa registrada no período.</Text>}
          </View>

          <View style={[styles.chartCard, (phone || tablet) && styles.chartCardStack]}>
            <Text style={styles.chartTitle}>Resumo financeiro</Text>
            <SummaryRow label="Entradas" value={formatCurrency(Number(summary?.income ?? 0))} />
            <SummaryRow label="Saídas" value={formatCurrency(Number(summary?.expenses ?? 0))} />
            <SummaryRow label="Saldo" value={formatCurrency(Number(summary?.balance ?? 0))} />
            <SummaryRow label="Em aberto" value={formatCurrency(Number(summary?.pending ?? 0))} />
            <SummaryRow label="Custo das mercadorias" value={formatCurrency(Number(summary?.costOfGoodsSold ?? 0))} />
            <SummaryRow label="Margem bruta" value={formatCurrency(Number(summary?.grossMargin ?? 0))} strong />
          </View>

          <View style={[styles.chartCard, (phone || tablet) && styles.chartCardStack]}>
            <Text style={styles.chartTitle}>Últimas movimentações</Text>
            {(report?.entries ?? []).slice(0, 7).map((entry) => (
              <View key={entry.id} style={styles.movementRow}>
                <View style={styles.movementCopy}>
                  <Text numberOfLines={1} style={styles.movementTitle}>{entry.description}</Text>
                  <Text style={styles.movementMeta}>{formatDate(entry.occurredAt)} • {categoryLabel(entry.category)}</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={entry.kind === 'income' ? styles.income : styles.expense}>
                  {entry.kind === 'income' ? '+' : '-'} {formatCurrency(Number(entry.amount))}
                </Text>
              </View>
            ))}
            {!report?.entries.length ? <Text style={styles.empty}>Nenhuma movimentação encontrada.</Text> : null}
          </View>
        </View>

        <AdminSection title="Exportar" description="Baixe os dados ou salve o painel como PDF.">
          <AdminCard>
            <View style={[styles.actions, phone && styles.actionsPhone]}>
              <Pressable disabled={loading || !report} onPress={downloadExcel} style={({ pressed }) => [styles.primary, phone && styles.actionPhone, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Ionicons name="download-outline" size={17} color="#FFF" /><Text style={styles.primaryText}>Baixar Excel (CSV)</Text>
              </Pressable>
              <Pressable disabled={loading || !report} onPress={printPdf} style={({ pressed }) => [styles.secondary, phone && styles.actionPhone, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Ionicons name="print-outline" size={17} color="#9D5F1D" /><Text style={styles.secondaryText}>PDF / Imprimir</Text>
              </Pressable>
            </View>
            {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          </AdminCard>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: spacing.sm, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backText: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
  filters: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  filtersPhone: { alignItems: 'stretch' },
  filter: { minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  filterPhone: { flexGrow: 1, flexBasis: 130 },
  filterActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  period: { minWidth: 0, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  periodPhone: { width: '100%', lineHeight: 14 },
  metrics: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { minWidth: 150, flexBasis: 200 },
  statPhone: { minWidth: 0, flexBasis: '47%' },
  dashboardGrid: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dashboardStack: { flexDirection: 'column', flexWrap: 'nowrap' },
  chartCard: { minWidth: 0, maxWidth: '100%', flexBasis: 420, flexGrow: 1, minHeight: 250, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, backgroundColor: colors.surface, overflow: 'hidden' },
  chartCardStack: { width: '100%', flexBasis: 'auto', flexGrow: 0 },
  chartTitle: { marginBottom: spacing.md, color: colors.text, fontSize: 12, fontWeight: '900' },
  dailyChart: { width: '100%', minWidth: 0, minHeight: 165, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  dayColumn: { minWidth: 0, flex: 1, alignItems: 'center', gap: 5 },
  dayBars: { width: '86%', height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  incomeBar: { width: '43%', minHeight: 3, borderRadius: 5, backgroundColor: '#238657' },
  expenseBar: { width: '43%', minHeight: 3, borderRadius: 5, backgroundColor: '#C77A2B' },
  dayLabel: { width: '100%', color: colors.textMuted, textAlign: 'center', fontSize: 7, fontWeight: '700' },
  legend: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  expenseRow: { width: '100%', minWidth: 0, marginBottom: 12, gap: 5 },
  expenseTop: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  expenseLabel: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  expenseValue: { maxWidth: '48%', flexShrink: 1, color: colors.text, textAlign: 'right', fontSize: 9, fontWeight: '900' },
  track: { width: '100%', height: 9, overflow: 'hidden', borderRadius: 999, backgroundColor: '#EEE5DC' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#A66A27' },
  summaryRow: { width: '100%', minWidth: 0, minHeight: 42, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  summaryLabel: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 10 },
  summaryValue: { maxWidth: '48%', flexShrink: 1, color: colors.text, textAlign: 'right', fontSize: 10, fontWeight: '900' },
  summaryStrong: { color: '#238657', fontSize: 12 },
  movementRow: { width: '100%', minWidth: 0, minHeight: 44, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  movementCopy: { minWidth: 0, flex: 1 },
  movementTitle: { color: colors.text, fontSize: 9, fontWeight: '900' },
  movementMeta: { marginTop: 2, color: colors.textMuted, fontSize: 8 },
  income: { maxWidth: '42%', flexShrink: 1, color: '#238657', textAlign: 'right', fontSize: 9, fontWeight: '900' },
  expense: { maxWidth: '42%', flexShrink: 1, color: '#B43D38', textAlign: 'right', fontSize: 9, fontWeight: '900' },
  actions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionsPhone: { flexDirection: 'column' },
  primary: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#9D5F1D' },
  secondary: { minHeight: 44, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#9D5F1D', borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#FFFDFC' },
  actionPhone: { width: '100%' },
  primaryText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  secondaryText: { color: '#9D5F1D', fontSize: 10, fontWeight: '900' },
  notice: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  empty: { paddingVertical: spacing.xl, color: colors.textMuted, textAlign: 'center', fontSize: 9 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
