import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { StructuredField } from '@/src/components/structured-field';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { StoreSettings } from '@/src/types';
import { isValidBrazilPhone, normalizeBrazilPhone, normalizePlainText, validatePlainText } from '@/src/utils/fields';

export default function AdminSettingsScreen() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(
    field: Exclude<keyof StoreSettings, 'tickerMessages'>,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    const nextErrors: Record<string, string> = {};
    const storeNameError = validatePlainText(form.storeName, { minimum: 2, maximum: 120 });
    const cityError = validatePlainText(form.city, { minimum: 2, maximum: 80 });
    const deliveryError = validatePlainText(form.deliveryMessage, { maximum: 240 });
    const pickupError = validatePlainText(form.pickupAddress, { maximum: 240, multiline: true });
    if (storeNameError) nextErrors.storeName = storeNameError;
    if (cityError) nextErrors.city = cityError;
    if (deliveryError) nextErrors.deliveryMessage = deliveryError;
    if (pickupError) nextErrors.pickupAddress = pickupError;
    if (form.whatsappNumber && !isValidBrazilPhone(form.whatsappNumber, true)) {
      nextErrors.whatsappNumber = 'Informe um celular com DDD e 11 números.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      Alert.alert('Revise os campos', 'Corrija os campos destacados antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        storeName: normalizePlainText(form.storeName),
        city: normalizePlainText(form.city),
        deliveryMessage: normalizePlainText(form.deliveryMessage),
        whatsappNumber: normalizeBrazilPhone(form.whatsappNumber),
        pixKey: normalizePlainText(form.pixKey),
        instagram: normalizePlainText(form.instagram),
        pickupAddress: normalizePlainText(form.pickupAddress, true),
      });
      Alert.alert('Configurações salvas', 'Os dados da loja foram atualizados.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title="Configurações da loja" showBack showStoreHome />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator>
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={22} color={colors.info} />
              <Text style={styles.noticeText}>
                WhatsApp e chave Pix aparecem para o cliente somente depois de serem cadastrados aqui.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Dados principais</Text>
            <View style={styles.card}>
              <Field
                label="Nome da loja"
                value={form.storeName}
                onChangeText={(value) => update('storeName', value)}
                maxLength={120}
                error={errors.storeName}
              />
              <Field
                label="Cidade principal"
                value={form.city}
                onChangeText={(value) => update('city', value)}
                maxLength={80}
                error={errors.city}
              />
              <Field
                label="Mensagem de entrega"
                value={form.deliveryMessage}
                onChangeText={(value) => update('deliveryMessage', value)}
                placeholder="Entrega grátis em Rosário do Catete"
                maxLength={240}
                error={errors.deliveryMessage}
              />
            </View>

            <Text style={styles.sectionTitle}>Atendimento e pagamento</Text>
            <View style={styles.card}>
              <StructuredField
                kind="phone"
                label="WhatsApp da loja com DDD"
                value={form.whatsappNumber}
                onChangeText={(value) => update('whatsappNumber', value)}
                placeholder="(79) 99999-9999"
                error={errors.whatsappNumber}
              />
              <Field
                label="Chave Pix"
                value={form.pixKey}
                onChangeText={(value) => update('pixKey', value)}
                placeholder="CPF, telefone, e-mail ou chave aleatória"
                autoCapitalize="none"
                maxLength={160}
              />
              <Field
                label="Instagram (opcional)"
                value={form.instagram}
                onChangeText={(value) => update('instagram', value)}
                placeholder="@joedlacollection"
                autoCapitalize="none"
                maxLength={80}
              />
            </View>

            <Text style={styles.sectionTitle}>Retirada</Text>
            <View style={styles.card}>
              <Field
                label="Endereço ou orientação para retirada"
                value={form.pickupAddress}
                onChangeText={(value) => update('pickupAddress', value)}
                placeholder="Endereço de retirada a combinar"
                multiline
                maxLength={240}
                error={errors.pickupAddress}
              />
            </View>

            <Button loading={saving} onPress={handleSave}>
              Salvar configurações
            </Button>

          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignSelf: 'center',
    gap: spacing.md,
  },
  notice: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.infoSoft,
  },
  noticeText: {
    flex: 1,
    color: colors.info,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 16,
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
});
