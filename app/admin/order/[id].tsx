import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import {
  loadOrderFinancialDetail,
  OrderFinancialDetail,
  PaymentMethod,
  registerOrderPayment,
  registerOrderRefund,
} from '@/src/services/admin-finance';
import { colors, radii, spacing } from '@/src/theme';
import { OrderStatus } from '@/src/types';
import { formatBrlInput, parseBrlCents } from '@/src/utils/fields';
import {
  formatCurrency,
  formatDate,
  normalizeWhatsApp,
  orderStatusLabel,
} from '@/src/utils/format';

const statusOptions: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
];

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'card_link', label: 'Cartão por link' },
  { value: 'other', label: 'Outro' },
];

type Notice = { type: 'success' | 'error'; text: string } | null;

type FinancialMode = 'payment' | 'refund';

function moneyMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits ? formatBrlInput(Number(digits)) : '';
}

function methodLabel(method: PaymentMethod) {
  return paymentMethods.find((item) => item.value === method)?.label ?? method;
}

export default function AdminOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { adminOrders, changeOrderStatus } = useStore();
  const order = adminOrders.find((item) => item.id === id);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [financial, setFinancial] = useState<OrderFinancialDetail | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialMode, setFinancialMode] = useState<FinancialMode>('payment');
  const [financialAmount, setFinancialAmount] = useState('');
  const [financialMethod, setFinancialMethod] = useState<PaymentMethod>('pix');
  const [financialNote, setFinancialNote] = useState('');
  const [financialSaving, setFinancialSaving] = useState(false);
  const financialSavingRef = useRef(false);

  const loadFinancial = useCallback(async () => {
    if (!id) return;
    setFinancialLoading(true);
    try {
      setFinancial(await loadOrderFinancialDetail(id));
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível carregar o financeiro do pedido.',
      });
    } finally {
      setFinancialLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadFinancial();
    }, [loadFinancial]),
  );

  if (!order) {
    return (
      <AdminGuard>
        <Screen>
          <AppHeader compact title="Pedido" showBack showStoreHome />
          <EmptyState
            icon="alert-circle-outline"
            title="Pedido não encontrado"
            message="Atualize a lista de pedidos e tente novamente."
            actionLabel="Voltar para pedidos"
            onAction={() => router.replace('/admin/orders')}
          />
        </Screen>
      </AdminGuard>
    );
  }

  const currentOrder = order;
  const orderKind = currentOrder.publicCode.startsWith('ENC-') ? 'Encomenda' : 'Compra';

  async function updateStatus(status: OrderStatus) {
    if (status === currentOrder.status || updating) return;
    setNotice(null);
    setUpdating(true);
    try {
      await changeOrderStatus(currentOrder.id, status);
      const text = `${orderKind} ${currentOrder.publicCode} atualizada para “${orderStatusLabel[status]}”.`;
      setNotice({ type: 'success', text });
      Alert.alert('Situação atualizada', text);
      await loadFinancial();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Tente novamente.';
      setNotice({ type: 'error', text });
      Alert.alert('Não foi possível atualizar', text);
    } finally {
      setUpdating(false);
    }
  }

  async function contactCustomer() {
    setNotice(null);
    const number = normalizeWhatsApp(currentOrder.customer.whatsapp);
    if (!number) {
      const text = 'O cliente não informou um WhatsApp válido.';
      setNotice({ type: 'error', text });
      Alert.alert('Número inválido', text);
      return;
    }
    const message = encodeURIComponent(
      `Olá, ${currentOrder.customer.name}! Aqui é da Joedla Collection. Estou falando sobre a ${orderKind.toLowerCase()} ${currentOrder.publicCode}.`,
    );
    try {
      await Linking.openURL(`https://wa.me/${number}?text=${message}`);
    } catch {
      const text = 'Não foi possível abrir o WhatsApp. Confira a conexão e tente novamente.';
      setNotice({ type: 'error', text });
      Alert.alert('WhatsApp indisponível', text);
    }
  }

  async function saveFinancialMovement() {
    if (financialSavingRef.current) return;
    setNotice(null);

    const cents = parseBrlCents(financialAmount);
    if (cents === null || cents <= 0) {
      setNotice({ type: 'error', text: 'Informe um valor maior que zero.' });
      return;
    }

    const amount = cents / 100;
    const remaining = Number(financial?.summary.remaining ?? currentOrder.total);
    const paid = Number(financial?.summary.paid ?? 0);

    if (financialMode === 'payment' && amount > remaining + 0.009) {
      setNotice({ type: 'error', text: `O valor não pode ser maior que o saldo em aberto de ${formatCurrency(remaining)}.` });
      return;
    }
    if (financialMode === 'refund') {
      if (amount > paid + 0.009) {
        setNotice({ type: 'error', text: `O estorno não pode ser maior que o valor líquido recebido de ${formatCurrency(paid)}.` });
        return;
      }
      if (financialNote.trim().length < 3) {
        setNotice({ type: 'error', text: 'Informe o motivo do estorno.' });
        return;
      }
    }

    financialSavingRef.current = true;
    setFinancialSaving(true);
    try {
      if (financialMode === 'payment') {
        const result = await registerOrderPayment({
          orderId: currentOrder.id,
          amount,
          method: financialMethod,
          note: financialNote,
        });
        const pointsText = result.pointsAdjusted !== 0
          ? ` Pontos do Clube ajustados: ${result.pointsAdjusted > 0 ? '+' : ''}${result.pointsAdjusted}.`
          : '';
        setNotice({
          type: 'success',
          text: `Pagamento de ${formatCurrency(amount)} registrado. Saldo em aberto: ${formatCurrency(Number(result.remaining))}.${pointsText}`,
        });
      } else {
        const result = await registerOrderRefund({
          orderId: currentOrder.id,
          amount,
          method: financialMethod,
          reason: financialNote,
        });
        const pointsText = result.pointsAdjusted !== 0
          ? ` Pontos do Clube ajustados: ${result.pointsAdjusted > 0 ? '+' : ''}${result.pointsAdjusted}.`
          : '';
        setNotice({
          type: 'success',
          text: `Estorno de ${formatCurrency(amount)} registrado com sucesso.${pointsText}`,
        });
      }
      setFinancialAmount('');
      setFinancialNote('');
      await loadFinancial();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível salvar a movimentação.',
      });
    } finally {
      financialSavingRef.current = false;
      setFinancialSaving(false);
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title={order.publicCode} showBack showStoreHome />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {notice ? (
            <View accessibilityLiveRegion="polite" style={[styles.notice, notice.type === 'success' ? styles.noticeSuccess : styles.noticeError]}>
              <Ionicons
                name={notice.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={20}
                color={notice.type === 'success' ? colors.success : colors.danger}
              />
              <Text style={[styles.noticeText, notice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError]}>{notice.text}</Text>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            <View style={styles.statusCopy}>
              <Text style={styles.kindLabel}>{orderKind.toUpperCase()}</Text>
              <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
              <Text style={styles.total}>{formatCurrency(order.total)}</Text>
            </View>
            <StatusBadge status={order.status} />
          </View>

          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nome" value={order.customer.name} />
            <InfoRow icon="logo-whatsapp" label="WhatsApp" value={order.customer.whatsapp} />
            <InfoRow icon="location-outline" label="Cidade" value={order.customer.city} />
            {order.deliveryMethod === 'delivery' ? (
              <>
                <InfoRow icon="map-outline" label="Endereço" value={`${order.customer.address}, ${order.customer.neighborhood}`} />
                {order.customer.reference ? (
                  <InfoRow icon="navigate-outline" label="Referência" value={order.customer.reference} />
                ) : null}
              </>
            ) : null}
            <Button icon="logo-whatsapp" onPress={contactCustomer}>
              Falar com o cliente
            </Button>
          </View>

          <Text style={styles.sectionTitle}>Produtos</Text>
          <View style={styles.card}>
            {order.items.map((item, index) => (
              <View key={item.id}>
                <View style={styles.item}>
                  <ProductImage uri={item.imageUrl} style={styles.itemImage} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.quantity}x {item.productName}</Text>
                    <Text style={styles.itemVariants}>
                      {[
                        item.selectedSize ? `Tam. ${item.selectedSize}` : '',
                        item.selectedColor ?? '',
                        item.availability === 'custom' ? 'Encomenda' : '',
                      ].filter(Boolean).join(' • ') || 'Pronta entrega'}
                    </Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                </View>
                {index < order.items.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Entrega e pagamento informado</Text>
          <View style={styles.card}>
            <InfoRow
              icon="bicycle-outline"
              label="Entrega"
              value={
                order.deliveryMethod === 'delivery'
                  ? 'Entrega grátis em Rosário do Catete'
                  : order.deliveryMethod === 'pickup'
                    ? 'Retirada'
                    : 'Outra cidade — combinar'
              }
            />
            <InfoRow
              icon="wallet-outline"
              label="Forma escolhida"
              value={
                order.paymentMethod === 'pix'
                  ? 'Pix'
                  : order.paymentMethod === 'card_link'
                    ? 'Cartão por link'
                    : 'A combinar'
              }
            />
            {order.customer.notes ? (
              <InfoRow icon="chatbox-ellipses-outline" label="Observações" value={order.customer.notes} />
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Financeiro do pedido</Text>
          <View style={styles.card}>
            <View style={styles.moneyGrid}>
              <MoneyBox label="Total" value={formatCurrency(Number(financial?.summary.total ?? order.total))} />
              <MoneyBox label="Recebido" value={formatCurrency(Number(financial?.summary.paid ?? 0))} tone="success" />
              <MoneyBox label="Estornado" value={formatCurrency(Number(financial?.summary.refunded ?? 0))} tone="danger" />
              <MoneyBox label="Em aberto" value={formatCurrency(Number(financial?.summary.remaining ?? order.total))} tone="warning" />
            </View>

            <View style={styles.modeRow}>
              <Pressable
                disabled={financialSaving}
                onPress={() => { setFinancialMode('payment'); setFinancialNote(''); setNotice(null); }}
                style={[styles.modeButton, financialMode === 'payment' && styles.modeButtonPayment]}>
                <Text style={financialMode === 'payment' ? styles.modeTextActive : styles.modeText}>Registrar pagamento</Text>
              </Pressable>
              <Pressable
                disabled={financialSaving || Number(financial?.summary.paid ?? 0) <= 0}
                onPress={() => { setFinancialMode('refund'); setFinancialNote(''); setNotice(null); }}
                style={[styles.modeButton, financialMode === 'refund' && styles.modeButtonRefund, (financialSaving || Number(financial?.summary.paid ?? 0) <= 0) && styles.disabled]}>
                <Text style={financialMode === 'refund' ? styles.modeTextActive : styles.modeText}>Registrar estorno</Text>
              </Pressable>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Valor</Text>
                <TextInput
                  value={financialAmount}
                  onChangeText={(value) => { setFinancialAmount(moneyMask(value)); setNotice(null); }}
                  editable={!financialSaving}
                  keyboardType="number-pad"
                  placeholder="R$ 0,00"
                  placeholderTextColor="#A8998C"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldWide}>
                <Text style={styles.fieldLabel}>{financialMode === 'refund' ? 'Motivo do estorno' : 'Observação (opcional)'}</Text>
                <TextInput
                  value={financialNote}
                  onChangeText={(value) => { setFinancialNote(value.slice(0, 180)); setNotice(null); }}
                  editable={!financialSaving}
                  placeholder={financialMode === 'refund' ? 'Ex.: devolução ao cliente' : 'Ex.: pagamento recebido em mãos'}
                  placeholderTextColor="#A8998C"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Forma do movimento</Text>
            <View style={styles.methodRow}>
              {paymentMethods.map((method) => (
                <Pressable
                  key={method.value}
                  disabled={financialSaving}
                  onPress={() => { setFinancialMethod(method.value); setNotice(null); }}
                  style={[styles.method, financialMethod === method.value && styles.methodActive]}>
                  <Text style={financialMethod === method.value ? styles.methodTextActive : styles.methodText}>{method.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              disabled={financialSaving || financialLoading}
              onPress={() => void saveFinancialMovement()}
              style={({ pressed }) => [
                financialMode === 'payment' ? styles.savePayment : styles.saveRefund,
                pressed && styles.pressed,
                (financialSaving || financialLoading) && styles.disabled,
              ]}>
              <Text style={styles.saveText}>
                {financialSaving ? 'Processando...' : financialMode === 'payment' ? 'Confirmar pagamento' : 'Confirmar estorno'}
              </Text>
            </Pressable>

            <View style={styles.transactions}>
              {(financial?.transactions ?? []).map((transaction) => (
                <View key={transaction.id} style={styles.transactionRow}>
                  <View style={styles.transactionCopy}>
                    <Text style={styles.transactionTitle}>{transaction.type === 'payment' ? 'Pagamento' : 'Estorno'} • {methodLabel(transaction.method)}</Text>
                    <Text style={styles.transactionMeta}>{formatDate(transaction.occurredAt)}{transaction.note ? ` • ${transaction.note}` : ''}</Text>
                  </View>
                  <Text style={transaction.type === 'payment' ? styles.transactionIncome : styles.transactionRefund}>
                    {transaction.type === 'payment' ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
                  </Text>
                </View>
              ))}
              {!financialLoading && !(financial?.transactions.length ?? 0) ? (
                <Text style={styles.emptyFinancial}>Nenhum pagamento ou estorno registrado.</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Atualizar situação</Text>
          <View style={styles.statusOptions}>
            {statusOptions.map((status) => (
              <Pressable
                key={status}
                disabled={updating}
                onPress={() => void updateStatus(status)}
                style={[styles.statusOption, order.status === status && styles.statusOptionActive, updating && styles.disabled]}>
                <Ionicons
                  name={order.status === status ? 'checkmark-circle' : 'ellipse-outline'}
                  size={19}
                  color={order.status === status ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.statusOptionText, order.status === status && styles.statusOptionTextActive]}>
                  {orderStatusLabel[status]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function MoneyBox({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' | 'warning' }) {
  return (
    <View style={styles.moneyBox}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text style={tone === 'success' ? styles.moneySuccess : tone === 'danger' ? styles.moneyDanger : tone === 'warning' ? styles.moneyWarning : styles.moneyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  notice: {
    minWidth: 0,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  noticeSuccess: { borderColor: 'rgba(35,134,87,0.28)', backgroundColor: colors.successSoft },
  noticeError: { borderColor: 'rgba(180,61,56,0.28)', backgroundColor: '#FDEEEE' },
  noticeText: { minWidth: 0, flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '800' },
  noticeTextSuccess: { color: colors.success },
  noticeTextError: { color: colors.danger },
  statusCard: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceWarm,
  },
  statusCopy: { minWidth: 160, flex: 1 },
  kindLabel: { marginBottom: 4, color: '#9D5F1D', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  date: { color: colors.textMuted, fontSize: 11 },
  total: { marginTop: 4, color: colors.primary, fontSize: 22, fontWeight: '900' },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.text, fontSize: 17, fontWeight: '900' },
  card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, gap: spacing.lg, backgroundColor: colors.surface },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoText: { minWidth: 0, flex: 1, gap: 2 },
  infoLabel: { color: colors.textMuted, fontSize: 10 },
  infoValue: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemImage: { width: 64, height: 76, borderRadius: radii.small },
  itemInfo: { minWidth: 0, flex: 1, gap: 4 },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  itemVariants: { color: colors.textMuted, fontSize: 10 },
  itemPrice: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  divider: { height: 1, marginVertical: spacing.lg, backgroundColor: colors.border },
  moneyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moneyBox: { minWidth: 130, flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FCF9F6' },
  moneyLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  moneyValue: { marginTop: 4, color: colors.text, fontSize: 13, fontWeight: '900' },
  moneySuccess: { marginTop: 4, color: '#238657', fontSize: 13, fontWeight: '900' },
  moneyDanger: { marginTop: 4, color: '#B43D38', fontSize: 13, fontWeight: '900' },
  moneyWarning: { marginTop: 4, color: '#B06A1D', fontSize: 13, fontWeight: '900' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modeButton: { minHeight: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  modeButtonPayment: { borderColor: '#238657', backgroundColor: '#EEF8F2' },
  modeButtonRefund: { borderColor: '#B43D38', backgroundColor: '#FDEEEE' },
  modeText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  modeTextActive: { color: colors.text, fontSize: 9, fontWeight: '900' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 160, flex: 1, gap: 5 },
  fieldWide: { minWidth: 230, flex: 2, gap: 5 },
  fieldLabel: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, color: '#2C211A', backgroundColor: '#FCF9F6' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  method: { minHeight: 38, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  methodActive: { borderColor: '#9D5F1D', backgroundColor: '#FBF1E6' },
  methodText: { color: '#7D6C60', fontSize: 9, fontWeight: '800' },
  methodTextActive: { color: '#9D5F1D', fontSize: 9, fontWeight: '900' },
  savePayment: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#238657' },
  saveRefund: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B43D38' },
  saveText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  transactions: { gap: spacing.sm },
  transactionRow: { minWidth: 0, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  transactionCopy: { minWidth: 180, flex: 1 },
  transactionTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },
  transactionMeta: { marginTop: 2, color: colors.textMuted, fontSize: 8 },
  transactionIncome: { color: '#238657', fontSize: 10, fontWeight: '900' },
  transactionRefund: { color: '#B43D38', fontSize: 10, fontWeight: '900' },
  emptyFinancial: { color: colors.textMuted, fontSize: 9 },
  statusOptions: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: colors.surface },
  statusOption: { minHeight: 50, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusOptionActive: { backgroundColor: colors.surfaceWarm },
  statusOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  statusOptionTextActive: { color: colors.primary, fontWeight: '900' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
