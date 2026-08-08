import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AdminCard,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import {
  AdminFinancialReport,
  AdminFinancialReportRow,
  loadAdminFinancialReport,
} from '@/src/services/club';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

function csvCell(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function toCsv(report: AdminFinancialReport) {
  const header = [
    'Cliente',
    'WhatsApp',
    'Pedido',
    'Data da compra',
    'Valor da compra',
    'Valor pago',
    'Valor pendente',
    'Último pagamento',
    'Histórico de pagamentos',
  ];

  const rows = report.rows.map((row) => [
    row.customerName,
    row.whatsapp,
    row.publicCode,
    formatDate(row.purchaseDate),
    row.total.toFixed(2).replace('.', ','),
    row.paid.toFixed(2).replace('.', ','),
    row.remaining.toFixed(2).replace('.', ','),
    row.lastPaymentAt ? formatDate(row.lastPaymentAt) : '',
    row.payments
      .map((payment) => `${formatDate(payment.paidAt)} - ${payment.method === 'pix' ? 'Pix' : 'Dinheiro'} - R$ ${Number(payment.amount).toFixed(2).replace('.', ',')}`)
      .join(' | '),
  ]);

  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
}

export default function AdminReportsScreen() {
  const [report, setReport] = useState<AdminFinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      setReport(await loadAdminFinancialReport());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar o relatório.';
      setError(message);
      Alert.alert('Não foi possível carregar', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function downloadCsv() {
    if (!report) {
      setNotice('O relatório ainda não está disponível para download.');
      return;
    }

    try {
      const runtime = globalThis as typeof globalThis & {
        document?: { createElement: (tag: string) => any; body?: { appendChild: (node: any) => void; removeChild: (node: any) => void } };
        URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
      };

      if (!runtime.document || !runtime.URL) {
        setNotice('O download do relatório está disponível pelo site no navegador.');
        Alert.alert('Download indisponível', 'Abra o painel pelo navegador para baixar o relatório em CSV/Excel.');
        return;
      }

      const blob = new Blob([toCsv(report)], { type: 'text/csv;charset=utf-8;' });
      const url = runtime.URL.createObjectURL(blob);
      const link = runtime.document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `joedla-relatorio-financeiro-${date}.csv`;
      runtime.document.body?.appendChild(link);
      link.click();
      runtime.document.body?.removeChild(link);
      runtime.URL.revokeObjectURL(url);
      setNotice('Relatório gerado com sucesso. O arquivo CSV pode ser aberto no Excel.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o arquivo.';
      setNotice(message);
      Alert.alert('Falha ao baixar', message);
    }
  }

  const summary = report?.summary;
  const columns = useMemo<AdminTableColumn<AdminFinancialReportRow>[]>(() => [
    {
      key: 'customer',
      label: 'Cliente',
      minWidth: 180,
      flex: 1,
      render: (row) => (
        <View style={styles.cell}>
          <AdminTableText bold>{row.customerName}</AdminTableText>
          <AdminTableText muted>{row.whatsapp}</AdminTableText>
        </View>
      ),
    },
    {
      key: 'order',
      label: 'Pedido',
      minWidth: 130,
      render: (row) => (
        <View style={styles.cell}>
          <AdminTableText bold>{row.publicCode}</AdminTableText>
          <AdminTableText muted>{formatDate(row.purchaseDate)}</AdminTableText>
        </View>
      ),
    },
    {
      key: 'total',
      label: 'Comprou',
      width: 115,
      align: 'right',
      render: (row) => <Text style={styles.total}>{formatCurrency(Number(row.total))}</Text>,
    },
    {
      key: 'paid',
      label: 'Pagou',
      width: 115,
      align: 'right',
      render: (row) => <Text style={styles.paid}>{formatCurrency(Number(row.paid))}</Text>,
    },
    {
      key: 'open',
      label: 'Deve',
      width: 115,
      align: 'right',
      render: (row) => <Text style={Number(row.remaining) > 0 ? styles.open : styles.paid}>{formatCurrency(Number(row.remaining))}</Text>,
    },
    {
      key: 'payment',
      label: 'Último pagamento',
      minWidth: 145,
      render: (row) => row.lastPaymentAt
        ? <AdminTableText>{formatDate(row.lastPaymentAt)}</AdminTableText>
        : <AdminTableBadge label="Sem pagamento" tone="warning" />,
    },
  ], []);

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Relatório financeiro"
        description="Compras concluídas, pagamentos recebidos e valores ainda pendentes por cliente e pedido.">
        <View style={styles.metrics}>
          <AdminStatCard compact icon="people-outline" label="Clientes" value={String(summary?.customers ?? 0)} helper="Com compras concluídas" />
          <AdminStatCard compact icon="bag-check-outline" label="Vendas concluídas" value={formatCurrency(Number(summary?.totalSales ?? 0))} />
          <AdminStatCard compact icon="cash-outline" label="Total recebido" value={formatCurrency(Number(summary?.totalReceived ?? 0))} tone="success" />
          <AdminStatCard compact icon="alert-circle-outline" label="Total pendente" value={formatCurrency(Number(summary?.totalPending ?? 0))} tone={Number(summary?.totalPending ?? 0) > 0 ? 'warning' : 'success'} />
        </View>

        <AdminSection title="Exportar" description="O arquivo CSV abre normalmente no Excel e mantém os dados detalhados de pagamentos.">
          <AdminCard>
            <View style={styles.actionRow}>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Relatório detalhado</Text>
                <Text style={styles.actionDescription}>Inclui cliente, WhatsApp, pedido, data da compra, quanto comprou, quanto pagou, quanto deve e histórico dos pagamentos.</Text>
              </View>
              <Pressable disabled={loading || !report} onPress={downloadCsv} style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed, (loading || !report) && styles.disabled]}>
                <Text style={styles.downloadText}>{loading ? 'Carregando...' : 'Baixar CSV / Excel'}</Text>
              </Pressable>
            </View>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </AdminCard>
        </AdminSection>

        <AdminSection
          title="Detalhamento por pedido"
          description={`${report?.rows.length ?? 0} ${(report?.rows.length ?? 0) === 1 ? 'pedido concluído' : 'pedidos concluídos'}`}>
          <AdminTable
            columns={columns}
            data={report?.rows ?? []}
            keyExtractor={(row) => row.orderId}
            loading={loading}
            emptyIcon="document-text-outline"
            emptyTitle="Nenhuma compra concluída"
            emptyDescription="Os dados aparecerão aqui conforme os pedidos forem concluídos."
          />
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionRow: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  actionCopy: { minWidth: 220, flex: 1 },
  actionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  actionDescription: { marginTop: 4, color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  downloadButton: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' },
  downloadText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  notice: { marginTop: spacing.sm, color: '#238657', fontSize: 10, lineHeight: 15, fontWeight: '800' },
  error: { marginTop: spacing.sm, color: colors.danger, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  cell: { minWidth: 0, gap: 2 },
  total: { color: '#9D5F1D', fontSize: 11, fontWeight: '900' },
  paid: { color: '#238657', fontSize: 11, fontWeight: '900' },
  open: { color: '#B43D38', fontSize: 11, fontWeight: '900' },
});