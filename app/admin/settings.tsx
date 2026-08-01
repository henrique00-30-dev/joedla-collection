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
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { StoreSettings } from '@/src/types';

export default function AdminSettingsScreen() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  function update(field: keyof StoreSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!form.storeName.trim() || !form.city.trim()) {
      Alert.alert('Dados obrigatórios', 'Informe o nome e a cidade da loja.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(form);
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
        <AppHeader compact title="Configurações da loja" showBack />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
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
              />
              <Field
                label="Cidade principal"
                value={form.city}
                onChangeText={(value) => update('city', value)}
              />
              <Field
                label="Mensagem de entrega"
                value={form.deliveryMessage}
                onChangeText={(value) => update('deliveryMessage', value)}
                placeholder="Entrega grátis em Rosário do Catete"
              />
            </View>

            <Text style={styles.sectionTitle}>Atendimento e pagamento</Text>
            <View style={styles.card}>
              <Field
                label="WhatsApp da loja com DDD"
                value={form.whatsappNumber}
                onChangeText={(value) => update('whatsappNumber', value)}
                placeholder="(79) 99999-9999"
                keyboardType="phone-pad"
              />
              <Field
                label="Chave Pix"
                value={form.pixKey}
                onChangeText={(value) => update('pixKey', value)}
                placeholder="CPF, telefone, e-mail ou chave aleatória"
                autoCapitalize="none"
              />
              <Field
                label="Instagram (opcional)"
                value={form.instagram}
                onChangeText={(value) => update('instagram', value)}
                placeholder="@joedlacollection"
                autoCapitalize="none"
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
