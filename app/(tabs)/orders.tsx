import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { EmptyState, StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

export default function OrdersScreen() {
  const { customerOrders } = useStore();

  return (
    <Screen>
      <AppHeader compact title="Meus pedidos" />
      {!customerOrders.length ? (
        <EmptyState
          icon="receipt-outline"
          title="Nenhum pedido ainda"
          message="Seus pedidos aparecerão aqui depois da finalização."
          actionLabel="Começar a comprar"
          onAction={() => router.push('/(tabs)/index')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.info}>
            <Text style={styles.infoText}>
              A confirmação final e os detalhes da entrega são enviados pelo WhatsApp.
            </Text>
          </View>
          {customerOrders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.code}>{order.publicCode}</Text>
                  <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
                </View>
                <StatusBadge status={order.status} />
              </View>
              <View style={styles.divider} />
              <Text style={styles.items}>
                {order.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}
              </Text>
              <View style={styles.row}>
                <Text style={styles.delivery}>
                  {order.deliveryMethod === 'delivery'
                    ? 'Entrega grátis'
                    : order.deliveryMethod === 'pickup'
                      ? 'Retirada'
                      : 'Entrega a combinar'}
                </Text>
                <Text style={styles.total}>{formatCurrency(order.total)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  info: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    backgroundColor: colors.infoSoft,
  },
  infoText: {
    color: colors.info,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.md,
    backgroundColor: colors.surface,
    ...shadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  code: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  date: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  items: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  delivery: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  total: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
});
