import { useFocusEffect } from 'expo-router';
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
  if (mode === 'month') {
    start.setDate(1);
  } else {
    start.setDate(start.getDate() - 29);
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      setNotice('Para gerar PDF, abra este relatório no navegador e use a opção Imprimir / Salvar como PDF.');
      return;
    }
    runtime.print();
  }

  const summary = report?.summary;

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Relatório financeiro"
        description="Relatório consolidado com exportação para Excel e opção de impressão em PDF.">
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
        </View>

        <AdminSection title="Exportar" description="Nenhum serviço pago é necessário para essas opções.">
          <AdminCard>
            <View style={styles.actions}>
              <Pressable disabled={loading || !report} onPress={downloadExcel} style={({ pressed }) => [styles.primary, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Text style={styles.primaryText}>Baixar Excel (CSV)</Text>
              </Pressable>
              <Pressable disabled={loading || !report} onPress={printPdf} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Text style={styles.secondaryText}>PDF / Imprimir</Text>
              </Pressable>
            </View>
            {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          </AdminCard>
        </AdminSection>

        <AdminSection title="Movimentações" description={`${report?.entries.length ?? 0} registros no período`}>
          <View style={styles.list}>
            {(report?.entries ?? []).map((entry) => (
              <AdminCard key={entry.id} compact title={entry.description} description={`${formatDate(entry.occurredAt)} • ${entry.category}`}>
                <Text style={entry.kind === 'income' ? styles.income : styles.expense}>
                  {entry.kind === 'income' ? '+' : '-'} {formatCurrency(Number(entry.amount))}
                </Text>
              </AdminCard>
            ))}
            {!loading && !(report?.entries.length ?? 0) ? <Text style={styles.empty}>Nenhuma movimentação encontrada.</Text> : null}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  filter: { minHeight: 38, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  filterActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  period: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primary: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' },
  primaryText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  secondary: { minHeight: 44, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#9D5F1D', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDFC' },
  secondaryText: { color: '#9D5F1D', fontSize: 10, fontWeight: '900' },
  notice: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  list: { gap: spacing.sm },
  income: { color: '#238657', fontSize: 11, fontWeight: '900' },
  expense: { color: '#B43D38', fontSize: 11, fontWeight: '900' },
  empty: { color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
