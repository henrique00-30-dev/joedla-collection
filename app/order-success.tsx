import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';
import { buildOrderMessage, openStoreWhatsApp } from '@/src/utils/whatsapp';

export default function OrderSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customerOrders, settings } = useStore();
  const order = customerOrders.find((item) => item.id === id);
  const [storeNotificationOpened, setStoreNotificationOpened] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);

  if (!order) {
    return (
      <Screen>
        <AppHeader compact title="Pedido" />
        <EmptyState
          icon="alert-circle-outline"
          title="Pedido não encontrado"
          message="Volte para a loja e tente novamente."
          actionLabel="Ir para o início"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const currentOrder = order;

  async function handleWhatsApp() {
    setOpeningWhatsApp(true);
    try {
      const opened = await openStoreWhatsApp(
        settings,
        buildOrderMessage(currentOrder, settings),
      );
      if (opened) {
        setStoreNotificationOpened(true);
        return;
      }
      Alert.alert(
        'WhatsApp não configurado',
        'O pedido foi salvo. A administradora precisa cadastrar o número da loja no painel.',
      );
    } catch {
      Alert.alert(
        'Não foi possível abrir o WhatsApp',
        'Tente novamente pelo botão para avisar a loja sobre o pedido.',
      );
    } finally {
      setOpeningWhatsApp(false);
    }
  }

  async function copyPix() {
    if (!settings.pixKey) {
      Alert.alert(
        'Chave Pix ainda não cadastrada',
        'Solicite a chave diretamente pelo WhatsApp.',
      );
      return;
    }
    await Clipboard.setStringAsync(settings.pixKey);
    Alert.alert('Chave copiada', 'A chave Pix foi copiada.');
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader compact title="Pedido realizado" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={44} color={colors.white} />
        </View>
        <Text style={styles.title}>Pedido salvo!</Text>
        <Text style={styles.subtitle}>
          Falta avisar a loja pelo WhatsApp para que o pedido seja confirmado ou cancelado.
        </Text>

        <View style={styles.notificationNotice}>
          <Ionicons
            name={storeNotificationOpened ? 'checkmark-circle' : 'warning-outline'}
            size={24}
            color={storeNotificationOpened ? colors.success : colors.warning}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.notificationNoticeText,
              storeNotificationOpened && styles.notificationNoticeTextSuccess,
            ]}>
            {storeNotificationOpened
              ? 'WhatsApp aberto. Envie a mensagem pronta para avisar a loja.'
              : 'Etapa obrigatória: abra o WhatsApp e envie a mensagem pronta para a loja.'}
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Número do pedido</Text>
          <Text style={styles.code}>{order.publicCode}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumo</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity}x {item.productName}
              </Text>
              <Text style={styles.itemValue}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total dos produtos</Text>
            <Text style={styles.total}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.paymentHeader}>
            <Ionicons
              name={
                order.paymentMethod === 'pix'
                  ? 'qr-code-outline'
                  : order.paymentMethod === 'card_link'
                    ? 'card-outline'
                    : 'chatbubbles-outline'
              }
              size={24}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>
              {order.paymentMethod === 'pix'
                ? 'Pagamento por Pix'
                : order.paymentMethod === 'card_link'
                  ? 'Pagamento por cartão'
                  : 'Pagamento a combinar'}
            </Text>
          </View>

          {order.paymentMethod === 'pix' ? (
            <>
              <Text style={styles.paymentText}>
                {settings.pixKey
                  ? 'Copie a chave abaixo. A loja confirmará o pagamento manualmente.'
                  : 'Peça a chave Pix pelo WhatsApp. A loja confirmará o pagamento manualmente.'}
              </Text>
              {settings.pixKey ? (
                <View style={styles.pixBox}>
                  <Text numberOfLines={1} style={styles.pixKey}>
                    {settings.pixKey}
                  </Text>
                  <Button variant="secondary" onPress={copyPix} style={styles.copyButton}>
                    Copiar
                  </Button>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.paymentText}>
              {order.paymentMethod === 'card_link'
                ? 'A loja enviará um link seguro de pagamento pelo WhatsApp.'
                : 'Converse com a loja para definir a forma de pagamento.'}
            </Text>
          )}
        </View>

        <Button icon="logo-whatsapp" loading={openingWhatsApp} onPress={handleWhatsApp}>
          {storeNotificationOpened
            ? 'Abrir WhatsApp novamente'
            : 'Avisar a loja no WhatsApp'}
        </Button>
        <Button
          variant="secondary"
          disabled={!storeNotificationOpened}
          onPress={() => router.replace('/')}>
          {storeNotificationOpened
            ? 'Voltar para a loja'
            : 'Avise a loja para continuar'}
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'stretch',
    gap: spacing.md,
  },
  successIcon: {
    width: 84,
    height: 84,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  notificationNotice: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
  },
  notificationNoticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  notificationNoticeTextSuccess: {
    color: colors.success,
  },
  codeCard: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  code: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemName: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
  },
  itemValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  total: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  pixBox: {
    padding: spacing.md,
    borderRadius: radii.small,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceWarm,
  },
  pixKey: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  copyButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
});
