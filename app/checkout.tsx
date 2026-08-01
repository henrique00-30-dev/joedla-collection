import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import {
  CustomerDetails,
  DeliveryMethod,
  Order,
  PaymentMethod,
} from '@/src/types';
import { formatCurrency, onlyDigits } from '@/src/utils/format';
import { buildOrderMessage, openStoreWhatsApp } from '@/src/utils/whatsapp';

const initialCustomer: CustomerDetails = {
  name: '',
  whatsapp: '',
  city: 'Rosário do Catete',
  neighborhood: '',
  address: '',
  reference: '',
  notes: '',
};

function formatWhatsApp(value: string) {
  let digits = onlyDigits(value);

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 5) return `(${ddd}) ${number}`;

  return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export default function CheckoutScreen() {
  const { cart, cartSubtotal, createOrder, settings } = useStore();
  const [customer, setCustomer] = useState(initialCustomer);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [storeNotificationOpened, setStoreNotificationOpened] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function selectDelivery(method: DeliveryMethod) {
    setDeliveryMethod(method);
    if (method === 'delivery' || method === 'pickup') {
      updateCustomer('city', 'Rosário do Catete');
    } else {
      updateCustomer('city', '');
    }
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (customer.name.trim().length < 3) nextErrors.name = 'Informe seu nome completo.';
    if (onlyDigits(customer.whatsapp).length !== 11) {
      nextErrors.whatsapp = 'Informe um celular com DDD e 11 números.';
    }
    if (!customer.city.trim()) nextErrors.city = 'Informe sua cidade.';
    if (deliveryMethod === 'delivery') {
      if (!customer.neighborhood.trim()) nextErrors.neighborhood = 'Informe o bairro.';
      if (!customer.address.trim()) nextErrors.address = 'Informe rua e número.';
    }
    setErrors(nextErrors);
    return !Object.keys(nextErrors).length;
  }

  async function handleSubmit() {
    if (!cart.length) {
      Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.');
      router.replace('/(tabs)/cart');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const order = await createOrder({ customer, deliveryMethod, paymentMethod });
      setCompletedOrder(order);
    } catch (error) {
      Alert.alert(
        'Não foi possível criar o pedido',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWhatsApp(order: Order) {
    setOpeningWhatsApp(true);
    try {
      const opened = await openStoreWhatsApp(
        settings,
        buildOrderMessage(order, settings),
      );
      if (opened) {
        setStoreNotificationOpened(true);
        return;
      }
      Alert.alert(
        'WhatsApp não configurado',
        'O pedido foi salvo, mas o número da loja precisa ser cadastrado no painel.',
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

  if (completedOrder) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title="Pedido realizado" />
        <ScrollView
          contentContainerStyle={styles.successContent}
          showsVerticalScrollIndicator>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={44} color={colors.white} />
          </View>
          <Text style={styles.successTitle}>Pedido salvo!</Text>
          <Text style={styles.successSubtitle}>
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
            <Text style={styles.code}>{completedOrder.publicCode}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.orderCardTitle}>Resumo</Text>
            {completedOrder.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.quantity}x {item.productName}
                </Text>
                <Text style={styles.itemValue}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.orderTotalRow}>
              <Text style={styles.orderTotalLabel}>Total dos produtos</Text>
              <Text style={styles.orderTotalValue}>
                {formatCurrency(completedOrder.total)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.paymentHeader}>
              <Ionicons
                name={
                  completedOrder.paymentMethod === 'pix'
                    ? 'qr-code-outline'
                    : completedOrder.paymentMethod === 'card_link'
                      ? 'card-outline'
                      : 'chatbubbles-outline'
                }
                size={24}
                color={colors.primary}
              />
              <Text style={styles.orderCardTitle}>
                {completedOrder.paymentMethod === 'pix'
                  ? 'Pagamento por Pix'
                  : completedOrder.paymentMethod === 'card_link'
                    ? 'Pagamento por cartão'
                    : 'Pagamento a combinar'}
              </Text>
            </View>

            {completedOrder.paymentMethod === 'pix' ? (
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
                    <Button
                      variant="secondary"
                      onPress={copyPix}
                      style={styles.copyButton}>
                      Copiar
                    </Button>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.paymentText}>
                {completedOrder.paymentMethod === 'card_link'
                  ? 'A loja enviará um link seguro de pagamento pelo WhatsApp.'
                  : 'Converse com a loja para definir a forma de pagamento.'}
              </Text>
            )}
          </View>

          <View style={styles.successActions}>
            <Button
              icon="logo-whatsapp"
              loading={openingWhatsApp}
              onPress={() => handleWhatsApp(completedOrder)}>
              {storeNotificationOpened
                ? 'Abrir WhatsApp novamente'
                : 'Avisar a loja no WhatsApp'}
            </Button>
            <Button
              variant="secondary"
              disabled={!storeNotificationOpened}
              onPress={() => {
                setCompletedOrder(null);
                router.replace('/');
              }}>
              {storeNotificationOpened
                ? 'Voltar para a loja'
                : 'Avise a loja para continuar'}
            </Button>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader compact title="Finalizar pedido" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          <SectionTitle number="1" title="Seus dados" />
          <View style={styles.card}>
            <Field
              label="Nome completo"
              value={customer.name}
              onChangeText={(value) => updateCustomer('name', value)}
              placeholder="Digite seu nome"
              autoCapitalize="words"
              error={errors.name}
            />
            <Field
              label="WhatsApp"
              value={customer.whatsapp}
              onChangeText={(value) =>
                updateCustomer('whatsapp', formatWhatsApp(value))
              }
              placeholder="(79) 99999-9999"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={15}
              error={errors.whatsapp}
            />
          </View>

          <SectionTitle number="2" title="Entrega ou retirada" />
          <View style={styles.optionsColumn}>
            <SelectionCard
              active={deliveryMethod === 'delivery'}
              icon="bicycle-outline"
              title="Entrega em Rosário do Catete"
              description="Entrega grátis no endereço informado"
              onPress={() => selectDelivery('delivery')}
            />
            <SelectionCard
              active={deliveryMethod === 'pickup'}
              icon="storefront-outline"
              title="Retirada"
              description="Local e horário combinados com a loja"
              onPress={() => selectDelivery('pickup')}
            />
            <SelectionCard
              active={deliveryMethod === 'whatsapp'}
              icon="logo-whatsapp"
              title="Outra cidade"
              description="Entrega e valor combinados pelo WhatsApp"
              onPress={() => selectDelivery('whatsapp')}
            />
          </View>

          <View style={styles.card}>
            <Field
              label="Cidade"
              value={customer.city}
              onChangeText={(value) => updateCustomer('city', value)}
              editable={deliveryMethod === 'whatsapp'}
              placeholder="Informe sua cidade"
              autoCapitalize="words"
              error={errors.city}
            />
            {deliveryMethod === 'delivery' ? (
              <>
                <Field
                  label="Bairro"
                  value={customer.neighborhood}
                  onChangeText={(value) => updateCustomer('neighborhood', value)}
                  placeholder="Seu bairro"
                  autoCapitalize="words"
                  error={errors.neighborhood}
                />
                <Field
                  label="Rua e número"
                  value={customer.address}
                  onChangeText={(value) => updateCustomer('address', value)}
                  placeholder="Rua, número e complemento"
                  autoCapitalize="sentences"
                  error={errors.address}
                />
                <Field
                  label="Ponto de referência (opcional)"
                  value={customer.reference}
                  onChangeText={(value) => updateCustomer('reference', value)}
                  placeholder="Próximo a..."
                  autoCapitalize="sentences"
                />
              </>
            ) : null}
          </View>

          <SectionTitle number="3" title="Forma de pagamento" />
          <View style={styles.optionsColumn}>
            <SelectionCard
              active={paymentMethod === 'pix'}
              icon="qr-code-outline"
              title="Pix"
              description="A loja informa a chave e confirma o pagamento"
              onPress={() => setPaymentMethod('pix')}
            />
            <SelectionCard
              active={paymentMethod === 'card_link'}
              icon="card-outline"
              title="Cartão por link"
              description="O link seguro será enviado pelo WhatsApp"
              onPress={() => setPaymentMethod('card_link')}
            />
            <SelectionCard
              active={paymentMethod === 'whatsapp'}
              icon="chatbubbles-outline"
              title="Combinar pelo WhatsApp"
              description="Converse com a loja antes de pagar"
              onPress={() => setPaymentMethod('whatsapp')}
            />
          </View>

          <SectionTitle number="4" title="Observações" />
          <View style={styles.card}>
            <Field
              label="Observação do pedido ou encomenda (opcional)"
              value={customer.notes}
              onChangeText={(value) => updateCustomer('notes', value)}
              placeholder="Ex.: tamanho, cor, prazo ou melhor horário"
              multiline
            />
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Produtos</Text>
              <Text style={styles.summaryValue}>{formatCurrency(cartSubtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Entrega</Text>
              <Text style={styles.free}>
                {deliveryMethod === 'delivery' ? 'Grátis' : 'A combinar'}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total dos produtos</Text>
              <Text style={styles.totalValue}>{formatCurrency(cartSubtotal)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerValue}>{formatCurrency(cartSubtotal)}</Text>
          </View>
          <Button loading={submitting} onPress={handleSubmit} style={styles.finishButton}>
            Fazer pedido
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function SelectionCard({
  active,
  icon,
  title,
  description,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectionCard, active && styles.selectionCardActive]}>
      <View style={[styles.selectionIcon, active && styles.selectionIconActive]}>
        <Ionicons name={icon} size={22} color={active ? colors.white : colors.primary} />
      </View>
      <View style={styles.selectionText}>
        <Text style={styles.selectionTitle}>{title}</Text>
        <Text style={styles.selectionDescription}>{description}</Text>
      </View>
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={active ? colors.primary : colors.border}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  successContent: {
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
  successTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  successSubtitle: {
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
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
  orderCardTitle: {
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
  orderTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTotalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  orderTotalValue: {
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
    minWidth: 90,
  },
  successActions: {
    gap: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  number: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  numberText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitleText: {
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
  optionsColumn: {
    gap: spacing.sm,
  },
  selectionCard: {
    minHeight: 76,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  selectionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceWarm,
  },
  selectionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  selectionIconActive: {
    backgroundColor: colors.primary,
  },
  selectionText: {
    flex: 1,
    gap: 3,
  },
  selectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  selectionDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  summary: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.medium,
    gap: spacing.md,
    backgroundColor: colors.surfaceWarm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  free: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primarySoft,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  footer: {
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footerValue: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  finishButton: {
    minWidth: 180,
  },
});
