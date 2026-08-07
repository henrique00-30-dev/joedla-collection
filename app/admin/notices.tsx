import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
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
import { AnnouncementTicker } from '@/src/components/announcement-ticker';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import {
  normalizePlainText,
  validatePlainText,
} from '@/src/utils/fields';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 220;

function parseMessages(value: string) {
  return value
    .split('!')
    .map((message) => message.trim())
    .filter(Boolean);
}

export default function AdminNoticesScreen() {
  const { settings, updateSettings } = useStore();

  const [value, setValue] = useState(
    (settings.tickerMessages ?? []).join(' ! '),
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(
      (settings.tickerMessages ?? []).join(' ! '),
    );
  }, [settings.tickerMessages]);

  const previewMessages = useMemo(
    () => parseMessages(value),
    [value],
  );

  const highlightedMessages = useMemo(
    () =>
      previewMessages.filter(
        (message) =>
          message.startsWith('(') &&
          message.endsWith(')'),
      ).length,
    [previewMessages],
  );

  const remainingMessages =
    MAX_MESSAGES - previewMessages.length;

  async function handleSave() {
    const messages = parseMessages(value);

    if (messages.length > MAX_MESSAGES) {
      Alert.alert(
        'Muitas mensagens',
        `Cadastre no máximo ${MAX_MESSAGES} mensagens.`,
      );
      return;
    }

    if (
      messages.some(
        (message) =>
          message.length > MAX_MESSAGE_LENGTH,
      )
    ) {
      Alert.alert(
        'Mensagem muito grande',
        `Cada mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
      return;
    }

    const invalidMessage = messages.find(
      (message) =>
        validatePlainText(message, {
          minimum: 1,
          maximum: MAX_MESSAGE_LENGTH,
        }),
    );

    if (invalidMessage) {
      Alert.alert(
        'Mensagem inválida',
        validatePlainText(invalidMessage, {
          minimum: 1,
          maximum: MAX_MESSAGE_LENGTH,
        }) ?? 'Revise a mensagem.',
      );
      return;
    }

    setSaving(true);

    try {
      await updateSettings({
        ...settings,
        tickerMessages: messages.map(
          (message) =>
            normalizePlainText(message),
        ),
      });

      Alert.alert(
        'Faixa atualizada',
        'As mensagens já aparecem no início da loja.',
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
          eyebrow="Comunicação"
          title="Barra de informações"
          description="Edite os comunicados exibidos no início da loja, junto com as informações automáticas de clima."
          actions={
            <AdminToolbarButton
              label={
                saving
                  ? 'Salvando...'
                  : 'Salvar alterações'
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
              icon="chatbubble-ellipses-outline"
              label="Mensagens"
              value={String(
                previewMessages.length,
              )}
              helper={`Limite de ${MAX_MESSAGES}`}
            />

            <AdminStatCard
              compact
              icon="sparkles-outline"
              label="Destaques"
              value={String(
                highlightedMessages,
              )}
              helper="Mensagens entre parênteses"
              tone="warning"
            />

            <AdminStatCard
              compact
              icon="add-circle-outline"
              label="Espaços disponíveis"
              value={String(
                Math.max(
                  remainingMessages,
                  0,
                ),
              )}
              helper="Mensagens que ainda podem ser adicionadas"
              tone={
                remainingMessages > 0
                  ? 'success'
                  : 'danger'
              }
            />
          </View>

          <AdminCard
            compact
            icon="information-circle-outline"
            title="Informações automáticas"
            description="O clima de Rosário do Catete, Aracaju, Santo Amaro, Maruim e Carmópolis entra automaticamente entre os comunicados. Sem mensagens cadastradas, a faixa mostra somente o clima."
          />

          <AdminSection
            title="Mensagens da faixa"
            description="Separe cada mensagem usando o caractere !. Para dar mais destaque, coloque a mensagem inteira entre parênteses.">
            <AdminCard>
              <AdminField
                label="Conteúdo"
                value={value}
                onChangeText={setValue}
                placeholder="Promoção de bolsas até sábado ! (Último dia da promoção)"
                multiline
                fullWidth
                maxLength={
                  MAX_MESSAGES *
                  (MAX_MESSAGE_LENGTH + 3)
                }
                helper={`${previewMessages.length}/${MAX_MESSAGES} mensagens cadastradas. Máximo de ${MAX_MESSAGE_LENGTH} caracteres por mensagem.`}
                containerStyle={
                  styles.messageField
                }
              />

              <AdminFormActions>
                <AdminToolbarButton
                  label={
                    saving
                      ? 'Salvando...'
                      : 'Salvar e publicar'
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

          <AdminSection
            title="Prévia da faixa"
            description="A visualização abaixo mostra como os comunicados aparecerão para os clientes.">
            <View style={styles.previewFrame}>
              <View style={styles.previewHeader}>
                <Ionicons
                  name="eye-outline"
                  size={16}
                  color="#9D5F1D"
                />

                <Text
                  style={
                    styles.previewHeaderText
                  }>
                  Prévia ao vivo
                </Text>
              </View>

              <View style={styles.preview}>
                <AnnouncementTicker
                  messages={
                    previewMessages
                  }
                />
              </View>
            </View>
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

  messageField: {
    flexBasis: '100%',
  },

  previewFrame: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: radii.medium,
    backgroundColor: '#FFFDFC',
  },

  previewHeader: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E9DFD5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F6ECE0',
  },

  previewHeaderText: {
    color: '#493A30',
    fontSize: 10,
    fontWeight: '900',
  },

  preview: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});