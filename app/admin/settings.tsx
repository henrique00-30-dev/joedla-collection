import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View
} from 'react-native';

import {
  AdminCard,
  AdminField,
  AdminFormActions,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminToolbarButton,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { StructuredField } from '@/src/components/structured-field';
import { useStore } from '@/src/context/store-context';
import { spacing } from '@/src/theme';
import type { StoreSettings } from '@/src/types';
import {
  isValidBrazilPhone,
  normalizeBrazilPhone,
  normalizePlainText,
  validatePlainText,
} from '@/src/utils/fields';

export default function AdminSettingsScreen() {
  const { settings, updateSettings } = useStore();

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const configuredChannels = useMemo(
    () =>
      [
        form.whatsappNumber,
        form.pixKey,
        form.instagram,
      ].filter(Boolean).length,
    [
      form.instagram,
      form.pixKey,
      form.whatsappNumber,
    ],
  );

  function update(
    field: Exclude<
      keyof StoreSettings,
      'tickerMessages'
    >,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSave() {
    const nextErrors: Record<
      string,
      string
    > = {};

    const storeNameError =
      validatePlainText(form.storeName, {
        minimum: 2,
        maximum: 120,
      });

    const cityError =
      validatePlainText(form.city, {
        minimum: 2,
        maximum: 80,
      });

    const deliveryError =
      validatePlainText(
        form.deliveryMessage,
        {
          maximum: 240,
        },
      );

    const pickupError =
      validatePlainText(
        form.pickupAddress,
        {
          maximum: 240,
          multiline: true,
        },
      );

    if (storeNameError) {
      nextErrors.storeName =
        storeNameError;
    }

    if (cityError) {
      nextErrors.city = cityError;
    }

    if (deliveryError) {
      nextErrors.deliveryMessage =
        deliveryError;
    }

    if (pickupError) {
      nextErrors.pickupAddress =
        pickupError;
    }

    if (
      form.whatsappNumber &&
      !isValidBrazilPhone(
        form.whatsappNumber,
        true,
      )
    ) {
      nextErrors.whatsappNumber =
        'Informe um celular com DDD e 11 números.';
    }

    setErrors(nextErrors);

    if (
      Object.keys(nextErrors).length
    ) {
      Alert.alert(
        'Revise os campos',
        'Corrija os campos destacados antes de salvar.',
      );
      return;
    }

    setSaving(true);

    try {
      await updateSettings({
        ...form,
        storeName:
          normalizePlainText(
            form.storeName,
          ),
        city:
          normalizePlainText(
            form.city,
          ),
        deliveryMessage:
          normalizePlainText(
            form.deliveryMessage,
          ),
        whatsappNumber:
          normalizeBrazilPhone(
            form.whatsappNumber,
          ),
        pixKey:
          normalizePlainText(
            form.pixKey,
          ),
        instagram:
          normalizePlainText(
            form.instagram,
          ),
        pickupAddress:
          normalizePlainText(
            form.pickupAddress,
            true,
          ),
      });

      Alert.alert(
        'Configurações salvas',
        'Os dados da loja foram atualizados.',
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.flex}>
        <AdminPage
          eyebrow="Configurações"
          title="Dados da loja"
          description="Atualize as informações de atendimento, entrega, pagamento e retirada."
          actions={
            <AdminToolbarButton
              label={
                saving
                  ? 'Salvando...'
                  : 'Salvar configurações'
              }
              icon="save-outline"
              variant="primary"
              disabled={saving}
              onPress={() =>
                void handleSave()
              }
            />
          }>
          <View style={styles.metrics}>
            <AdminStatCard
              compact
              icon="business-outline"
              label="Loja"
              value={
                form.storeName
                  ? 'Configurada'
                  : 'Pendente'
              }
              helper="Nome e cidade principal"
              tone={
                form.storeName &&
                form.city
                  ? 'success'
                  : 'warning'
              }
            />

            <AdminStatCard
              compact
              icon="chatbubble-ellipses-outline"
              label="Canais configurados"
              value={String(
                configuredChannels,
              )}
              helper="WhatsApp, Pix e Instagram"
              tone="info"
            />

            <AdminStatCard
              compact
              icon="location-outline"
              label="Retirada"
              value={
                form.pickupAddress
                  ? 'Definida'
                  : 'Pendente'
              }
              helper="Orientação para o cliente"
              tone={
                form.pickupAddress
                  ? 'success'
                  : 'warning'
              }
            />
          </View>

          <AdminCard
            compact
            icon="information-circle-outline"
            title="Visibilidade dos dados"
            description="WhatsApp e chave Pix aparecem para o cliente somente depois de serem cadastrados aqui."
          />

          <AdminSection
            title="Dados principais"
            description="Informações básicas exibidas na loja e nos pedidos.">
            <AdminCard>
              <AdminField
                label="Nome da loja"
                value={form.storeName}
                onChangeText={(value) =>
                  update(
                    'storeName',
                    value,
                  )
                }
                maxLength={120}
                error={
                  errors.storeName
                }
                required
                fullWidth
              />

              <AdminField
                label="Cidade principal"
                value={form.city}
                onChangeText={(value) =>
                  update('city', value)
                }
                maxLength={80}
                error={errors.city}
                required
                fullWidth
              />

              <AdminField
                label="Mensagem de entrega"
                value={
                  form.deliveryMessage
                }
                onChangeText={(value) =>
                  update(
                    'deliveryMessage',
                    value,
                  )
                }
                placeholder="Entrega grátis em Rosário do Catete"
                maxLength={240}
                error={
                  errors.deliveryMessage
                }
                fullWidth
              />
            </AdminCard>
          </AdminSection>

          <AdminSection
            title="Atendimento e pagamento"
            description="Dados usados para contato e finalização do pedido.">
            <AdminCard>
              <View style={styles.fieldGrid}>
                <View
                  style={styles.fieldHalf}>
                  <StructuredField
                    kind="phone"
                    label="WhatsApp da loja com DDD"
                    value={
                      form.whatsappNumber
                    }
                    onChangeText={(value) =>
                      update(
                        'whatsappNumber',
                        value,
                      )
                    }
                    placeholder="(79) 99999-9999"
                    error={
                      errors.whatsappNumber
                    }
                  />
                </View>

                <View
                  style={styles.fieldHalf}>
                  <AdminField
                    label="Chave Pix"
                    value={form.pixKey}
                    onChangeText={(value) =>
                      update(
                        'pixKey',
                        value,
                      )
                    }
                    placeholder="CPF, telefone, e-mail ou chave aleatória"
                    autoCapitalize="none"
                    maxLength={160}
                    fullWidth
                  />
                </View>
              </View>

              <AdminField
                label="Instagram (opcional)"
                value={form.instagram}
                onChangeText={(value) =>
                  update(
                    'instagram',
                    value,
                  )
                }
                placeholder="@joedlacollection"
                autoCapitalize="none"
                maxLength={80}
                fullWidth
              />
            </AdminCard>
          </AdminSection>

          <AdminSection
            title="Retirada"
            description="Endereço ou instrução informada ao cliente quando ele escolher retirar o pedido.">
            <AdminCard>
              <AdminField
                label="Endereço ou orientação para retirada"
                value={
                  form.pickupAddress
                }
                onChangeText={(value) =>
                  update(
                    'pickupAddress',
                    value,
                  )
                }
                placeholder="Endereço de retirada a combinar"
                multiline
                maxLength={240}
                error={
                  errors.pickupAddress
                }
                fullWidth
              />

              <AdminFormActions>
                <AdminToolbarButton
                  label={
                    saving
                      ? 'Salvando...'
                      : 'Salvar configurações'
                  }
                  icon="save-outline"
                  variant="primary"
                  disabled={saving}
                  onPress={() =>
                    void handleSave()
                  }
                />
              </AdminFormActions>
            </AdminCard>
          </AdminSection>
        </AdminPage>
      </KeyboardAvoidingView>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  fieldHalf: {
    minWidth: 240,
    flex: 1,
  },
});