import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import {
  addFinancialEntry,
  AdminFinancialOverview,
  FinancialEntryCategory,
  FinancialEntryKind,
  loadAdminFinancialOverview,
} from '@/src/services/admin-finance';
import { colors, radii, spacing } from '@/src/theme';
import { formatBrlInput, parseBrlCents } from '@/src/utils/fields';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Notice = { type: 'success' | 'error'; text: string } | null;

type ManualCategory = Exclude<FinancialEntryCategory, 'sale_payment' | 'refund'>;

const CATEGORIES: Array<{ value: ManualCategory; label: string; kind: FinancialEntryKind }> = [
  { value: 'merchandise', label: 'Mercadoria', kind: 'expense' },
  { value: 'packaging', label: 'Embalagens', kind: 'expense' },
  { value: 'gift', label: 'Brindes', kind: 'expense' },
  { value: 'marketing', label: 'Marketing', kind: 'expense' },
  { value: 'operating', label: 'Operacional', kind: 'expense' },
  { value: 'other', label: 'Outra despesa', kind: 'expense' },
  { value: 'other_income', label: 'Outra entrada', kind: 'income' },
];

const CATEGORY_LABELS: Record<string, string> = {
  sale_payment: 'Venda / pagamento',
  refund: 'Estorno',
  merchandise: 'Mercadoria',
  packaging: 'Embalagens',
  gift: 'Brindes',
  marketing: 'Marketing',
  operating: 'Operacional',
  other_income: 'Outra entrada',
  other: 'Outra despesa',
};

function currentMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: now,
  };
}

function last30DaysRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function moneyMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits ? formatBrlInput(Number(digits)) : '';
}

export default function AdminFinanceScreen() {
  const [rangeMode, setRangeMode] = useState<'month' | '30d'>('month');
  const [overview, setOverview] = useState<AdminFinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [category, setCategory] = useState<ManualCategory>('merchandise');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const range = useMemo(() => rangeMode === 'month' ? currentMonthRange() : last30DaysRange(), [rangeMode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await loadAdminFinancialOverview(range.start, range.end));
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível carregar o financeiro.',
      });
    } finally {
      setLoading(false);
    }
  }, [range.start.getTime(), range.end.getTime()]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function saveEntry() {
    if (saving) return;
    setNotice(null);
    const cents = parseBrlCents(amount);
    if (cents === null || cents <= 0) {
      setNotice({ type: 'error', text: 'Informe um valor maior que zero.' });
      return;
    }
    if (description.trim().length < 3) {
      setNotice({ type: 'error', text: 'Informe uma descrição para o lançamento.' });
      return;
    }

    const selected = CATEGORIES.find((item) => item.value === category)!;
    setSaving(true);
    try {
      await addFinancialEntry({
        kind: selected.kind,
        category,
        amount: cents / 100,
        description,
      });
      setAmount('');
      setDescription('');
      setNotice({ type: 'success', text: 'Lançamento financeiro salvo com sucesso.' });
      await load();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível salvar o lançamento.',
      });
    } finally {
      setSaving(false);
    }
  }

  const summary = overview?.summary;
  const chartMax = Math.max(
    1,
    ...(overview?.daily ?? []).flatMap((point) => [Number(point.income), Number(point.expense)]),
  );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Financeiro"
        title="Visão financeira"
        description="Entradas, saídas, valores em aberto, custos e margem sem misturar o cadastro do Clube Joedla.">
        <View style={styles.filterRow}>
          <FilterButton active={rangeMode === 'month'} label="Este mês" onPress={() => setRangeMode('month')} />
          <FilterButton active={rangeMode === '30d'} label="Últimos 30 dias" onPress={() => setRangeMode('30d')} />
          <Text style={styles.periodText}>{formatDate(range.start.toISOString())} até {formatDate(range.end.toISOString())}</Text>
        </View>

        {notice ? (
          <View accessibilityLiveRegion="polite" style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={[styles.noticeText, notice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError]}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.metrics}>
          <AdminStatCard compact icon="arrow-down-circle-outline" label="Entradas" value={formatCurrency(Number(summary?.income ?? 0))} tone="success" helper="Valores efetivamente recebidos" />
          <AdminStatCard compact icon="arrow-up-circle-outline" label="Saídas" value={formatCurrency(Number(summary?.expenses ?? 0))} tone="warning" helper="Despesas e estornos" />
          <AdminStatCard compact icon="wallet-outline" label="Saldo do período" value={formatCurrency(Number(summary?.balance ?? 0))} tone={Number(summary?.balance ?? 0) >= 0 ? 'success' : 'warning'} />
          <AdminStatCard compact icon="time-outline" label="Em aberto" value={formatCurrency(Number(summary?.pending ?? 0))} tone={Number(summary?.pending ?? 0) > 0 ? 'warning' : 'success'} helper="Ainda não recebido" />
          <AdminStatCard compact icon="cube-outline" label="Custo das mercadorias" value={formatCurrency(Number(summary?.costOfGoodsSold ?? 0))} />
          <AdminStatCard compact icon="trending-up-outline" label="Margem bruta" value={formatCurrency(Number(summary?.grossMargin ?? 0))} tone={Number(summary?.grossMargin ?? 0) >= 0 ? 'success' : 'warning'} />
        </View>

        <AdminSection title="Fluxo de caixa" description="Verde representa entradas e vermelho representa saídas. O gráfico se ajusta à largura da tela.">
          <AdminCard>
            {loading ? <Text style={styles.muted}>Carregando gráfico...</Text> : (overview?.daily.length ?? 0) ? (
              <View style={styles.chart}>
                {overview!.daily.map((point) => (
                  <View key={point.date} style={styles.chartColumn}>
                    <View style={styles.chartBars}>
                      <View style={[styles.barIncome, { height: Math.max(4, 92 * Number(point.income) / chartMax) }]} />
                      <View style={[styles.barExpense, { height: Math.max(4, 92 * Number(point.expense) / chartMax) }]} />
                    </View>
                    <Text numberOfLines={1} style={styles.chartLabel}>{point.date.slice(8, 10)}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.muted}>Ainda não há movimentação no período selecionado.</Text>}
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={styles.legendIncome} /><Text style={styles.legendText}>Entradas</Text></View>
              <View style={styles.legendItem}><View style={styles.legendExpense} /><Text style={styles.legendText}>Saídas</Text></View>
            </View>
          </AdminCard>
        </AdminSection>

        <AdminSection title="Registrar lançamento" description="Use somente para valores que não vieram automaticamente de pedidos, pagamentos ou estornos.">
          <AdminCard>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item.value}
                  disabled={saving}
                  onPress={() => { setCategory(item.value); setNotice(null); }}
                  style={[styles.chip, category === item.value && styles.chipActive]}>
                  <Text style={category === item.value ? styles.chipTextActive : styles.chipText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formGrid}>
              <View style={styles.field}>
                <Text style={styles.label}>Valor</Text>
                <TextInput
                  value={amount}
                  onChangeText={(value) => { setAmount(moneyMask(value)); setNotice(null); }}
                  keyboardType="number-pad"
                  placeholder="R$ 0,00"
                  placeholderTextColor="#A8998C"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldWide}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  value={description}
                  onChangeText={(value) => { setDescription(value.slice(0, 180)); setNotice(null); }}
                  placeholder="Ex.: compra de embalagens"
                  placeholderTextColor="#A8998C"
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable disabled={saving} onPress={() => void saveEntry()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
              <Text style={styles.primaryText}>{saving ? 'Salvando...' : 'Salvar lançamento'}</Text>
            </Pressable>
          </AdminCard>
        </AdminSection>

        <AdminSection title="Últimas movimentações" description="Registros automáticos de pedidos e lançamentos manuais aparecem juntos.">
          <View style={styles.entries}>
            {(overview?.entries ?? []).slice(0, 20).map((entry) => (
              <AdminCard
                key={entry.id}
                compact
                title={CATEGORY_LABELS[entry.category] ?? entry.category}
                description={`${formatDate(entry.occurredAt)} • ${entry.description}`}>
                <Text style={entry.kind === 'income' ? styles.entryIncome : styles.entryExpense}>
                  {entry.kind === 'income' ? '+' : '-'} {formatCurrency(Number(entry.amount))}
                </Text>
              </AdminCard>
            ))}
            {!loading && !(overview?.entries.length ?? 0) ? <Text style={styles.muted}>Nenhuma movimentação registrada.</Text> : null}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function FilterButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterButton, active && styles.filterButtonActive]}>
      <Text style={active ? styles.filterTextActive : styles.filterText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  filterButton: { minHeight: 38, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  filterButtonActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  periodText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  notice: { minWidth: 0, padding: spacing.md, borderWidth: 1, borderRadius: radii.medium },
  noticeSuccess: { borderColor: 'rgba(35,134,87,0.28)', backgroundColor: '#EEF8F2' },
  noticeError: { borderColor: 'rgba(180,61,56,0.28)', backgroundColor: '#FDEEEE' },
  noticeText: { fontSize: 10, lineHeight: 16, fontWeight: '900' },
  noticeTextSuccess: { color: '#238657' },
  noticeTextError: { color: '#B43D38' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chart: { minHeight: 118, flexDirection: 'row', alignItems: 'flex-end', gap: 4, overflow: 'hidden' },
  chartColumn: { minWidth: 12, flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBars: { height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barIncome: { width: 5, minHeight: 4, borderRadius: 3, backgroundColor: '#238657' },
  barExpense: { width: 5, minHeight: 4, borderRadius: 3, backgroundColor: '#B43D38' },
  chartLabel: { color: colors.textMuted, fontSize: 7 },
  legend: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendIncome: { width: 9, height: 9, borderRadius: 3, backgroundColor: '#238657' },
  legendExpense: { width: 9, height: 9, borderRadius: 3, backgroundColor: '#B43D38' },
  legendText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  label: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 38, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  chipActive: { borderColor: '#9D5F1D', backgroundColor: '#FBF1E6' },
  chipText: { color: '#7D6C60', fontSize: 9, fontWeight: '800' },
  chipTextActive: { color: '#9D5F1D', fontSize: 9, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 170, flex: 1, gap: 5 },
  fieldWide: { minWidth: 230, flex: 2, gap: 5 },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, color: '#2C211A', backgroundColor: '#FCF9F6' },
  primaryButton: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' },
  primaryText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  entries: { gap: spacing.sm },
  entryIncome: { color: '#238657', fontSize: 12, fontWeight: '900' },
  entryExpense: { color: '#B43D38', fontSize: 12, fontWeight: '900' },
  muted: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
