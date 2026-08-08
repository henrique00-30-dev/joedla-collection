import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { AdminClubCustomerDetail, loadAdminClubCustomerDetail, registerClubPayment } from '@/src/services/club';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

type Notice = { type: 'success' | 'error'; text: string } | null;

export default function AdminCustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminClubCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'cash'>('pix');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) void load(false);
    }, [id]),
  );

  async function load(showError = true) {
    if (!id) return;
    setLoading(true);
    try {
      setDetail(await loadAdminClubCustomerDetail(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar a ficha.';
      setNotice({ type: 'error', text: message });
      if (showError) Alert.alert('Não foi possível carregar', message);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const orders = detail?.orders ?? [];
    return {
      purchases: orders.reduce((sum, item) => sum + Number(item.total || 0), 0),
      paid: orders.reduce((sum, item) => sum + Number(item.paid || 0), 0),
      open: orders.reduce((sum, item) => sum + Number(item.remaining || 0), 0),
    };
  }, [detail]);

  function showError(title: string, text: string) {
    setNotice({ type: 'error', text });
    Alert.alert(title, text);
  }

  async function savePayment() {
    setNotice(null);
    const order = detail?.orders.find((item) => item.id === selectedOrderId);
    const value = Number(amount.replace(',', '.'));
    if (!order) {
      showError('Selecione o pedido', 'Escolha um pedido concluído com saldo em aberto.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      showError('Valor inválido', 'Informe o valor recebido em Pix ou dinheiro.');
      return;
    }
    if (value > Number(order.remaining) + 0.009) {
      showError('Valor maior que o saldo', `O pedido possui ${formatCurrency(Number(order.remaining))} em aberto.`);
      return;
    }

    setSaving(true);
    try {
      const result = await registerClubPayment({ orderId: order.id, amount: value, method, note });
      setAmount('');
      setNote('');
      setSelectedOrderId('');
      await load(false);
      const text = `${formatCurrency(value)} recebido. ${result.pointsAdded} pontos liberados. Saldo restante: ${formatCurrency(Number(result.remaining))}.`;
      setNotice({ type: 'success', text });
      Alert.alert('Pagamento registrado', text);
    } catch (error) {
      showError('Não foi possível registrar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail) {
    return <AdminGuard><AdminPage eyebrow="Clientes" title="Ficha do cliente" description="Carregando informações..." /></AdminGuard>;
  }

  if (!detail) {
    return <AdminGuard><AdminPage eyebrow="Clientes" title="Ficha do cliente" description="Cliente não encontrado." /></AdminGuard>;
  }

  const openOrders = detail.orders.filter((item) => Number(item.remaining) > 0);

  return (
    <AdminGuard>
      <AdminPage eyebrow="Clientes" title={detail.customer.name} description={detail.customer.whatsapp}>
        {notice ? (
          <View accessibilityLiveRegion="polite" style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
            <Text style={[styles.noticeText, notice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError]}>{notice.text}</Text>
          </View>
        ) : null}

        <View style={styles.metrics}>
          <AdminStatCard compact icon="star-outline" label="Pontos disponíveis" value={Number(detail.points).toLocaleString('pt-BR')} tone="warning" />
          <AdminStatCard compact icon="alert-circle-outline" label="Total em aberto" value={formatCurrency(totals.open)} tone={totals.open > 0 ? 'warning' : 'success'} />
          <AdminStatCard compact icon="checkmark-circle-outline" label="Total pago" value={formatCurrency(totals.paid)} tone="success" />
          <AdminStatCard compact icon="bag-check-outline" label="Compras concluídas" value={formatCurrency(totals.purchases)} />
        </View>

        {openOrders.length ? (
          <AdminSection title="Registrar pagamento" description="Registre apenas valores realmente recebidos. Dívida e pontos são atualizados automaticamente.">
            <AdminCard>
              <Text style={styles.label}>Pedido concluído com saldo em aberto</Text>
              <View style={styles.orderChoices}>
                {openOrders.map((order) => (
                  <Pressable key={order.id} onPress={() => { setSelectedOrderId(order.id); setNotice(null); }} style={[styles.choice, selectedOrderId === order.id && styles.choiceActive]}>
                    <View style={styles.choiceCopy}>
                      <Text style={styles.choiceTitle}>{order.publicCode}</Text>
                      <Text style={styles.choiceDescription}>Restante {formatCurrency(Number(order.remaining))}</Text>
                    </View>
                    <Text style={selectedOrderId === order.id ? styles.radioActive : styles.radio}>●</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.formGrid}>
                <View style={styles.field}>
                  <Text style={styles.label}>Valor recebido</Text>
                  <TextInput value={amount} onChangeText={(value) => { setAmount(value); setNotice(null); }} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#A8998C" style={styles.input} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Forma de pagamento</Text>
                  <View style={styles.methodRow}>
                    <Pressable onPress={() => { setMethod('pix'); setNotice(null); }} style={[styles.method, method === 'pix' && styles.methodActive]}><Text style={method === 'pix' ? styles.methodTextActive : styles.methodText}>Pix</Text></Pressable>
                    <Pressable onPress={() => { setMethod('cash'); setNotice(null); }} style={[styles.method, method === 'cash' && styles.methodActive]}><Text style={method === 'cash' ? styles.methodTextActive : styles.methodText}>Dinheiro</Text></Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Observação (opcional)</Text>
                <TextInput value={note} onChangeText={(value) => { setNote(value); setNotice(null); }} placeholder="Ex.: parcela referente ao mês de agosto" placeholderTextColor="#A8998C" style={styles.input} />
              </View>

              <Pressable disabled={saving} onPress={() => void savePayment()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabled]}>
                <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Registrar pagamento'}</Text>
              </Pressable>
            </AdminCard>
          </AdminSection>
        ) : null}

        <AdminSection title="Pedidos concluídos" description="Somente compras efetivamente concluídas entram na ficha.">
          <View style={styles.list}>
            {detail.orders.length ? detail.orders.map((order) => (
              <AdminCard key={order.id} compact title={order.publicCode} description={`${formatDate(order.createdAt)} • Total ${formatCurrency(Number(order.total))}`}>
                <View style={styles.moneySummary}>
                  <Text style={styles.paidText}>Pago {formatCurrency(Number(order.paid))}</Text>
                  <Text style={Number(order.remaining) > 0 ? styles.openText : styles.paidText}>Restante {formatCurrency(Number(order.remaining))}</Text>
                </View>
              </AdminCard>
            )) : <Text style={styles.empty}>Este cliente ainda não possui pedido concluído.</Text>}
          </View>
        </AdminSection>

        <AdminSection title="Extrato de pagamentos">
          <View style={styles.list}>
            {detail.payments.length ? detail.payments.map((payment) => (
              <AdminCard key={payment.id} compact title={formatCurrency(Number(payment.amount))} description={`${payment.method === 'pix' ? 'Pix' : 'Dinheiro'} • ${formatDate(payment.paidAt)}${payment.note ? ` • ${payment.note}` : ''}`} />
            )) : <Text style={styles.empty}>Nenhum pagamento registrado manualmente.</Text>}
          </View>
        </AdminSection>

        <AdminSection title="Extrato de pontos">
          <View style={styles.list}>
            {detail.ledger.length ? detail.ledger.map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <Text style={entry.points > 0 ? styles.pointsPositive : styles.pointsNegative}>{entry.points > 0 ? '+' : ''}{entry.points}</Text>
                <View style={styles.ledgerCopy}><Text style={styles.ledgerDescription}>{entry.description}</Text><Text style={styles.ledgerDate}>{formatDate(entry.createdAt)}</Text></View>
              </View>
            )) : <Text style={styles.empty}>Ainda não há movimentação de pontos.</Text>}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  notice: { minWidth: 0, padding: spacing.md, borderWidth: 1, borderRadius: 12 },
  noticeSuccess: { borderColor: 'rgba(35,134,87,0.28)', backgroundColor: '#EEF8F2' },
  noticeError: { borderColor: 'rgba(180,61,56,0.28)', backgroundColor: '#FDEEEE' },
  noticeText: { fontSize: 10, lineHeight: 16, fontWeight: '900' },
  noticeTextSuccess: { color: '#238657' },
  noticeTextError: { color: '#B43D38' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  label: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  orderChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minWidth: 190, flex: 1, padding: spacing.md, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: '#FCF9F6' },
  choiceActive: { borderColor: '#9D5F1D', backgroundColor: '#FBF1E6' },
  choiceCopy: { minWidth: 0, flex: 1 },
  choiceTitle: { color: '#2C211A', fontSize: 11, fontWeight: '900' },
  choiceDescription: { marginTop: 2, color: '#88776B', fontSize: 9 },
  radio: { color: '#C8BBAF' },
  radioActive: { color: '#9D5F1D' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 220, flex: 1, gap: 5 },
  input: { minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, color: '#2C211A', backgroundColor: '#FCF9F6' },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  method: { minHeight: 42, flex: 1, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  methodActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  methodText: { color: '#7D6C60', fontSize: 10, fontWeight: '800' },
  methodTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  saveButton: { minHeight: 46, marginTop: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' },
  saveButtonText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  list: { gap: spacing.sm },
  moneySummary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  paidText: { color: '#238657', fontSize: 10, fontWeight: '900' },
  openText: { color: '#B43D38', fontSize: 10, fontWeight: '900' },
  ledgerRow: { padding: spacing.md, borderWidth: 1, borderColor: '#E5DBD2', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#FFFDFC' },
  pointsPositive: { minWidth: 55, color: '#238657', fontSize: 13, fontWeight: '900' },
  pointsNegative: { minWidth: 55, color: '#B43D38', fontSize: 13, fontWeight: '900' },
  ledgerCopy: { minWidth: 0, flex: 1 },
  ledgerDescription: { color: '#2C211A', fontSize: 10, fontWeight: '800' },
  ledgerDate: { marginTop: 2, color: '#88776B', fontSize: 8 },
  empty: { color: colors.textMuted, fontSize: 10 },
});