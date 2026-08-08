import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState, StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { OrderStatus } from '@/src/types';
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

type Notice = { type: 'success' | 'error'; text: string } | null;

export default function AdminOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { adminOrders, changeOrderStatus, refreshAdminOrders } = useStore();
  const order = adminOrders.find((item) => item.id === id);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshAdminOrders().catch((error) => {
        setNotice({
          type: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.',
        });
      });
    }, [refreshAdminOrders]),
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

  async function updateStatus(status: OrderStatus) {
    if (status === currentOrder.status || updating) return;
    setNotice(null);
    setUpdating(true);
    try {
      await changeOrderStatus(currentOrder.id, status);
      const text = `Pedido ${currentOrder.publicCode} atualizado para “${orderStatusLabel[status]}”.`;
      setNotice({ type: 'success', text });
      Alert.alert('Status atualizado', text);
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
      `Olá, ${currentOrder.customer.name}! Aqui é da Joedla Collection. Estou falando sobre o pedido ${currentOrder.publicCode}.`,
    );
    try {
      await Linking.openURL(`https://wa.me/${number}?text=${message}`);
    } catch {
      const text = 'Não foi possível abrir o WhatsApp. Confira a conexão e tente novamente.';
      setNotice({ type: 'error', text });
      Alert.alert('WhatsApp indisponível', text);
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title={order.publicCode} showBack showStoreHome />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
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
            <View>
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

          <Text style={styles.sectionTitle}>Entrega e pagamento</Text>
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
              label="Pagamento"
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

          <Text style={styles.sectionTitle}>Atualizar situação</Text>
          <View style={styles.statusOptions}>
            {statusOptions.map((status) => (
              <Pressable
                key={status}
                disabled={updating}
                onPress={() => updateStatus(status)}
                style={[styles.statusOption, order.status === status && styles.statusOptionActive]}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceWarm,
  },
  date: { color: colors.textMuted, fontSize: 11 },
  total: { marginTop: 4, color: colors.primary, fontSize: 22, fontWeight: '900' },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
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
  statusOptions: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },
  statusOption: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusOptionActive: { backgroundColor: colors.surfaceWarm },
  statusOptionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  statusOptionTextActive: { color: colors.primary, fontWeight: '900' },
});