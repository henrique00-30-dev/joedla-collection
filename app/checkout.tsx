import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { StructuredField } from '@/src/components/structured-field';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { keyValueStorage } from '@/src/lib/storage';
import { prepareCheckoutBenefit } from '@/src/services/club';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import {
  CustomerDetails,
  DeliveryMethod,
  Order,
  PaymentMethod,
} from '@/src/types';
import {
  isValidBrazilPhone,
  normalizeBrazilPhone,
  normalizePlainText,
  validatePlainText,
} from '@/src/utils/fields';
import { formatCurrency } from '@/src/utils/format';
import { buildOrderMessage, openStoreWhatsApp } from '@/src/utils/whatsapp';

const CLUB_TOKEN_KEY = 'joedla.club.session.v1';

const initialCustomer: CustomerDetails = {
  name: '',
  whatsapp: '',
  city: 'Rosário do Catete',
  neighborhood: '',
  address: '',
  reference: '',
  notes: '',
};

type BenefitMode = 'none' | 'coupon' | 'points';
type CheckoutField = 'name' | 'whatsapp' | 'city' | 'neighborhood' | 'address' | 'reference' | 'notes';

const FIELD_LABELS: Record<CheckoutField, string> = {
  name: 'nome completo',
  whatsapp: 'WhatsApp',
  city: 'cidade',
  neighborhood: 'bairro',
  address: 'rua e número',
  reference: 'ponto de referência',
  notes: 'observações',
};

export default function CheckoutScreen() {
  const { cart, cartSubtotal, createOrder, settings, refreshStore } = useStore();
  const [customer, setCustomer] = useState(initialCustomer);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [benefitMode, setBenefitMode] = useState<BenefitMode>('none');
  const [couponCode, setCouponCode] = useState('');
  const [pointsToUse, setPointsToUse] = useState('');
  const [clubToken, setClubToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [storeNotificationOpened, setStoreNotificationOpened] = useState(false);
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef(Crypto.randomUUID());
  const refreshStoreRef = useRef(refreshStore);
  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const whatsappRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const neighborhoodRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  refreshStoreRef.current = refreshStore;

  const hasPromotion = cart.some(
    (item) =>
      (item.priceSource && item.priceSource !== 'normal') ||
      (item.originalUnitPrice !== undefined && item.originalUnitPrice > item.unitPrice),
  );

  useFocusEffect(useCallback(() => {
    void refreshStoreRef.current().catch(() => undefined);
    void keyValueStorage.getItem(CLUB_TOKEN_KEY).then((token) => setClubToken(token ?? '')).catch(() => setClubToken(''));
  }, []));

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

  function selectBenefit(mode: BenefitMode) {
    if (mode !== 'none' && hasPromotion) {
      Alert.alert(
        'Pedido com promoção',
        'Produtos em promoção já possuem desconto e não aceitam cupom nem pontos.',
      );
      setBenefitMode('none');
      return;
    }
    setBenefitMode(mode);
  }

  function focusInvalidField(field: CheckoutField) {
    const y = field === 'name' || field === 'whatsapp'
      ? 0
      : field === 'city' || field === 'neighborhood' || field === 'address' || field === 'reference'
        ? 560
        : 1380;

    scrollRef.current?.scrollTo({ y, animated: true });
    setTimeout(() => {
      if (field === 'name') nameRef.current?.focus();
      else if (field === 'whatsapp') whatsappRef.current?.focus();
      else if (field === 'city') cityRef.current?.focus();
      else if (field === 'neighborhood') neighborhoodRef.current?.focus();
      else if (field === 'address') addressRef.current?.focus();
    }, 250);
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    const nameError = validatePlainText(customer.name, { minimum: 3, maximum: 120 });
    if (nameError) nextErrors.name = nameError;
    if (!isValidBrazilPhone(customer.whatsapp, true)) {
      nextErrors.whatsapp = 'Informe um celular com DDD e 11 números.';
    }
    const cityError = validatePlainText(customer.city, { minimum: 2, maximum: 80 });
    if (cityError) nextErrors.city = cityError;
    if (deliveryMethod === 'delivery') {
      const neighborhoodError = validatePlainText(customer.neighborhood, { minimum: 2, maximum: 100 });
      const addressError = validatePlainText(customer.address, { minimum: 3, maximum: 180 });
      if (neighborhoodError) nextErrors.neighborhood = neighborhoodError;
      if (addressError) nextErrors.address = addressError;
    }
    const referenceError = validatePlainText(customer.reference, { maximum: 160 });
    const notesError = validatePlainText(customer.notes, { maximum: 500, multiline: true });
    if (referenceError) nextErrors.reference = referenceError;
    if (notesError) nextErrors.notes = notesError;
    setErrors(nextErrors);

    const firstInvalid = (['name', 'whatsapp', 'city', 'neighborhood', 'address', 'reference', 'notes'] as CheckoutField[])
      .find((field) => Boolean(nextErrors[field]));

    if (firstInvalid) {
      Alert.alert(
        'Falta revisar um campo',
        `Confira ${FIELD_LABELS[firstInvalid]}. ${nextErrors[firstInvalid]}`,
      );
      focusInvalidField(firstInvalid);
      return false;
    }

    return true;
  }

  function showBenefitError(title: string, message: string) {
    Alert.alert(title, message);
    scrollRef.current?.scrollTo({ y: 1120, animated: true });
  }

  async function handleSubmit() {
    if (submittingRef.current) return;
    if (!cart.length) {
      Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.');
      router.replace('/(tabs)/cart');
      return;
    }
    if (!validate()) return;

    if (hasPromotion && benefitMode !== 'none') {
      showBenefitError('Benefício não permitido', 'Este pedido possui produto em promoção. Remova cupom ou pontos para continuar.');
      return;
    }

    const requestedPoints = Number(pointsToUse.replace(/\D/g, '')) || 0;
    if (benefitMode === 'coupon' && !couponCode.trim()) {
      showBenefitError('Informe o cupom', 'Digite o código do cupom antes de fazer o pedido.');
      return;
    }
    if (benefitMode === 'points') {
      if (!clubToken) {
        showBenefitError('Entre no Clube Joedla', 'Para usar pontos, entre no Clube Joedla com seu WhatsApp e PIN.');
        return;
      }
      if (requestedPoints <= 0) {
        showBenefitError('Informe os pontos', 'Digite quantos pontos deseja utilizar.');
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (benefitMode !== 'none') {
        await prepareCheckoutBenefit({
          requestId: idempotencyKeyRef.current,
          couponCode: benefitMode === 'coupon' ? couponCode : undefined,
          clubToken: benefitMode === 'points' ? clubToken : undefined,
          points: benefitMode === 'points' ? requestedPoints : 0,
        });
      }

      const order = await createOrder({
        customer: {
          name: normalizePlainText(customer.name),
          whatsapp: normalizeBrazilPhone(customer.whatsapp),
          city: normalizePlainText(customer.city),
          neighborhood: normalizePlainText(customer.neighborhood),
          address: normalizePlainText(customer.address),
          reference: normalizePlainText(customer.reference),
          notes: normalizePlainText(customer.notes, true),
        },
        deliveryMethod,
        paymentMethod,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setCompletedOrder(order);
    } catch (error) {
      Alert.alert(
        'Não foi possível criar o pedido',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      submittingRef.current = false;
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
        <AppHeader compact title="Pedido realizado" showStoreHome />
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
              <Text style={styles.orderTotalLabel}>Total do pedido</Text>
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
      <AppHeader compact title="Finalizar pedido" showBack showStoreHome />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
          <SectionTitle number="1" title="Seus dados" />
          <View style={styles.card}>
            <Field
              ref={nameRef}
              label="Nome completo"
              value={customer.name}
              onChangeText={(value) => updateCustomer('name', value)}
              placeholder="Digite seu nome"
              autoCapitalize="words"
              error={errors.name}
              maxLength={120}
            />
            <StructuredField
              ref={whatsappRef}
              kind="phone"
              label="WhatsApp"
              value={customer.whatsapp}
              onChangeText={(value) => updateCustomer('whatsapp', value)}
              placeholder="(79) 99999-9999"
              autoComplete="tel"
              textContentType="telephoneNumber"
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
              ref={cityRef}
              label="Cidade"
              value={customer.city}
              onChangeText={(value) => updateCustomer('city', value)}
              editable={deliveryMethod === 'whatsapp'}
              placeholder="Informe sua cidade"
              autoCapitalize="words"
              error={errors.city}
              maxLength={80}
            />
            {deliveryMethod === 'delivery' ? (
              <>
                <Field
                  ref={neighborhoodRef}
                  label="Bairro"
                  value={customer.neighborhood}
                  onChangeText={(value) => updateCustomer('neighborhood', value)}
                  placeholder="Seu bairro"
                  autoCapitalize="words"
                  error={errors.neighborhood}
                  maxLength={100}
                />
                <Field
                  ref={addressRef}
                  label="Rua e número"
                  value={customer.address}
                  onChangeText={(value) => updateCustomer('address', value)}
                  placeholder="Rua, número e complemento"
                  autoCapitalize="sentences"
                  error={errors.address}
                  maxLength={180}
                />
                <Field
                  label="Ponto de referência (opcional)"
                  value={customer.reference}
                  onChangeText={(value) => updateCustomer('reference', value)}
                  placeholder="Próximo a..."
                  autoCapitalize="sentences"
                  maxLength={160}
                  error={errors.reference}
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

          <SectionTitle number="4" title="Cupom ou pontos" />
          <View style={styles.card}>
            {hasPromotion ? (
              <View style={styles.promotionNotice}>
                <Ionicons name="pricetag-outline" size={20} color={colors.warning} />
                <Text style={styles.promotionNoticeText}>
                  Este pedido possui produto em promoção. Outros descontos não são acumulativos.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.benefitIntro}>
                  Escolha somente uma opção. Cupom e pontos não podem ser usados juntos.
                </Text>
                <View style={styles.benefitChoices}>
                  <BenefitButton label="Sem benefício" active={benefitMode === 'none'} onPress={() => selectBenefit('none')} />
                  <BenefitButton label="Cupom" active={benefitMode === 'coupon'} onPress={() => selectBenefit('coupon')} />
                  <BenefitButton label="Pontos" active={benefitMode === 'points'} onPress={() => selectBenefit('points')} />
                </View>

                {benefitMode === 'coupon' ? (
                  <Field
                    label="Código do cupom"
                    value={couponCode}
                    onChangeText={(value) => setCouponCode(value.toUpperCase())}
                    placeholder="Digite seu cupom"
                    autoCapitalize="characters"
                    maxLength={40}
                  />
                ) : null}

                {benefitMode === 'points' ? (
                  <View style={styles.pointsArea}>
                    {clubToken ? (
                      <Field
                        label="Quantos pontos deseja usar?"
                        value={pointsToUse}
                        onChangeText={(value) => setPointsToUse(value.replace(/\D/g, ''))}
                        placeholder="Ex.: 500"
                        keyboardType="number-pad"
                        maxLength={8}
                      />
                    ) : (
                      <View style={styles.clubRequired}>
                        <Text style={styles.clubRequiredText}>
                          Entre no Clube Joedla para usar seus pontos neste pedido.
                        </Text>
                        <Button variant="secondary" onPress={() => router.push('/club' as never)}>
                          Entrar no Clube Joedla
                        </Button>
                      </View>
                    )}
                  </View>
                ) : null}
              </>
            )}
          </View>

          <SectionTitle number="5" title="Observações" />
          <View style={styles.card}>
            <Field
              label="Observação do pedido ou encomenda (opcional)"
              value={customer.notes}
              onChangeText={(value) => updateCustomer('notes', value)}
              placeholder="Ex.: tamanho, cor, prazo ou melhor horário"
              multiline
              maxLength={500}
              error={errors.notes}
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
            {benefitMode !== 'none' && !hasPromotion ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Benefício</Text>
                <Text style={styles.benefitPending}>Validado ao fazer o pedido</Text>
              </View>
            ) : null}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total antes do benefício</Text>
              <Text style={styles.totalValue}>{formatCurrency(cartSubtotal)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>Produtos</Text>
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

function BenefitButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.benefitButton, active && styles.benefitButtonActive, pressed && styles.benefitButtonPressed]}>
      <Text style={[styles.benefitButtonText, active && styles.benefitButtonTextActive]}>{label}</Text>
    </Pressable>
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
    backgroundColor: '#FBF8F4',
  },

  successContent: {
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 72,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: spacing.lg,
  },

  successIcon: {
    width: 92,
    height: 92,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    borderRadius: 46,
    borderWidth: 7,
    borderColor: '#EAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    ...shadow,
  },

  notificationNotice: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(166,106,63,0.28)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8EC',
  },

  notificationNoticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
  },

  notificationNoticeTextSuccess: {
    color: colors.success,
  },

  successTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
  },

  successSubtitle: {
    maxWidth: 620,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  codeCard: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: radii.large,
    alignItems: 'center',
    backgroundColor: '#F7EFE6',
    ...shadow,
  },

  codeLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  code: {
    marginTop: spacing.sm,
    color: '#8B451C',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  orderCardTitle: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
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
    lineHeight: 18,
  },

  itemValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
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
    fontWeight: '900',
  },

  orderTotalValue: {
    color: '#8B451C',
    fontSize: 21,
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
    lineHeight: 20,
  },

  pixBox: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F7F1EA',
  },

  pixKey: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  copyButton: {
    minWidth: 96,
  },

  successActions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  content: {
    width: '100%',
    maxWidth: 860,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 120,
    alignSelf: 'center',
    gap: spacing.lg,
  },

  sectionTitle: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  number: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B451C',
    ...shadow,
  },

  numberText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },

  sectionTitleText: {
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },

  card: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    gap: spacing.lg,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  optionsColumn: {
    gap: spacing.md,
  },

  selectionCard: {
    minHeight: 86,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.14)',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  selectionCardActive: {
    borderColor: '#9D6A2F',
    backgroundColor: '#FFF7EA',
  },

  selectionIcon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  selectionIconActive: {
    backgroundColor: '#8B451C',
  },

  selectionText: {
    minWidth: 0,
    flex: 1,
    gap: 4,
  },

  selectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  selectionDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  promotionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(166,106,63,0.25)',
    borderRadius: radii.medium,
    backgroundColor: '#FFF8EC',
  },

  promotionNoticeText: {
    minWidth: 0,
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '800',
  },

  benefitIntro: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  benefitChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  benefitButton: {
    minWidth: 105,
    minHeight: 42,
    flexGrow: 1,
    flexBasis: 105,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  benefitButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  benefitButtonPressed: {
    opacity: 0.75,
  },

  benefitButtonText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  benefitButtonTextActive: {
    color: colors.white,
    fontWeight: '900',
  },

  pointsArea: {
    minWidth: 0,
  },

  clubRequired: {
    gap: spacing.sm,
  },

  clubRequiredText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  summary: {
    marginTop: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    gap: spacing.md,
    backgroundColor: '#F7EFE6',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  summaryLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 13,
  },

  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  benefitPending: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'right',
  },

  free: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },

  totalRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(157,106,47,0.2)',
  },

  totalLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  totalValue: {
    color: '#8B451C',
    fontSize: 22,
    fontWeight: '900',
  },

  footer: {
    minHeight: 92,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  footerTotal: {
    minWidth: 0,
    flexShrink: 1,
  },

  footerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  footerValue: {
    color: '#8B451C',
    fontSize: 22,
    fontWeight: '900',
  },

  finishButton: {
    minWidth: 160,
    minHeight: 52,
    flexShrink: 0,
  },
});