import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import {
  AdminStoreCustomerDetail,
  loadAdminStoreCustomerDetail,
} from '@/src/services/admin-finance';
import { colors, radii, spacing } from '@/src/theme';
import { maskBrazilPhone } from '@/src/utils/fields';
import { formatCurrency, formatDate, orderStatusLabel } from '@/src/utils/format';

export default function AdminCustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminStoreCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setDetail(await loadAdminStoreCustomerDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a ficha do cliente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totals = useMemo(() => {
    const orders = (detail?.orders ?? []).filter((order) => order.status !== 'cancelled');
    return {
      ordered: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      paid: orders.reduce((sum, order) => sum + Number(order.financial?.paid || 0), 0),
      open: orders.reduce((sum, order) => sum + Number(order.financial?.remaining || 0), 0),
    };
  }, [detail]);

  if (loading && !detail) {
    return (
      <AdminGuard>
        <AdminPage eyebrow="Clientes" title="Ficha do cliente" description="Carregando informações..." />
      </AdminGuard>
    );
  }

  if (!detail) {
    return (
      <AdminGuard>
        <AdminPage eyebrow="Clientes" title="Ficha do cliente" description={error || 'Cliente não encontrado.'}>
          {error ? <AdminCard compact title="Não foi possível carregar" description={error} icon="alert-circle-outline" /> : null}
        </AdminPage>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Clientes"
        title={detail.customer.name}
        description={`${maskBrazilPhone(detail.customer.whatsapp)} • Cliente desde ${formatDate(detail.customer.firstOrderAt)}`}>
        <View style={styles.metrics}>
          <AdminStatCard compact icon="bag-check-outline" label="Total em compras" value={formatCurrency(totals.ordered)} />
          <AdminStatCard compact icon="cash-outline" label="Total recebido" value={formatCurrency(totals.paid)} tone="success" />
          <AdminStatCard compact icon="alert-circle-outline" label="Em aberto" value={formatCurrency(totals.open)} tone={totals.open > 0 ? 'warning' : 'success'} />
          <AdminStatCard
            compact
            icon="star-outline"
            label="Clube Joedla"
            value={detail.club.member ? 'Cadastrado' : 'Não cadastrado'}
            helper={detail.club.member ? `${Number(detail.club.points).toLocaleString('pt-BR')} pontos` : 'Cadastro do Clube é separado'}
            tone={detail.club.member ? 'warning' : undefined}
          />
        </View>

        <AdminSection
          title="Histórico de compras"
          description="Pedidos cancelados permanecem no histórico, mas não entram em nenhum total financeiro.">
          <View style={styles.list}>
            {detail.orders.length ? detail.orders.map((order) => (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/admin/order/[id]', params: { id: order.id } })}
                style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderCopy}>
                    <Text style={styles.orderCode}>{order.publicCode}</Text>
                    <Text style={styles.orderMeta}>{formatDate(order.createdAt)} • {orderStatusLabel[order.status as keyof typeof orderStatusLabel] ?? order.status}</Text>
                  </View>
                  <Text style={styles.orderTotal}>{formatCurrency(Number(order.total))}</Text>
                </View>

                <View style={styles.orderMoney}>
                  <Text style={styles.paid}>Recebido {formatCurrency(Number(order.financial?.paid ?? 0))}</Text>
                  {Number(order.financial?.refunds ?? 0) > 0 ? (
                    <Text style={styles.refund}>Estornado {formatCurrency(Number(order.financial.refunds))}</Text>
                  ) : null}
                  <Text style={Number(order.financial?.remaining ?? 0) > 0 ? styles.open : styles.paid}>
                    Em aberto {formatCurrency(Number(order.financial?.remaining ?? 0))}
                  </Text>
                </View>
              </Pressable>
            )) : <Text style={styles.empty}>Este cliente ainda não possui compra registrada.</Text>}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.sm },
  orderCard: {
    minWidth: 0,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  orderHeader: { minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  orderCopy: { minWidth: 170, flex: 1 },
  orderCode: { color: colors.text, fontSize: 12, fontWeight: '900' },
  orderMeta: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  orderTotal: { color: '#9D5F1D', fontSize: 12, fontWeight: '900' },
  orderMoney: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  paid: { color: '#238657', fontSize: 9, fontWeight: '900' },
  refund: { color: '#B43D38', fontSize: 9, fontWeight: '900' },
  open: { color: '#B06A1D', fontSize: 9, fontWeight: '900' },
  empty: { color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: 0.72 },
});
