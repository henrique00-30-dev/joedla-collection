import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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
import { AnnouncementTicker } from '@/src/components/announcement-ticker';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';

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
  const [value, setValue] = useState((settings.tickerMessages ?? []).join(' ! '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue((settings.tickerMessages ?? []).join(' ! '));
  }, [settings.tickerMessages]);

  const previewMessages = useMemo(() => parseMessages(value), [value]);

  async function handleSave() {
    const messages = parseMessages(value);
    if (messages.length > MAX_MESSAGES) {
      Alert.alert('Muitas mensagens', `Cadastre no máximo ${MAX_MESSAGES} mensagens.`);
      return;
    }
    if (messages.some((message) => message.length > MAX_MESSAGE_LENGTH)) {
      Alert.alert(
        'Mensagem muito grande',
        `Cada mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
      return;
    }

    setSaving(true);
    try {
      await updateSettings({ ...settings, tickerMessages: messages });
      Alert.alert('Faixa atualizada', 'As mensagens já aparecem no início da loja.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title="Promoções e comunicados" showBack showStoreHome />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator>
            <View style={styles.infoCard}>
              <Ionicons name="partly-sunny-outline" size={24} color={colors.info} />
              <Text style={styles.infoText}>
                O clima de Rosário do Catete, Aracaju, Santo Amaro, Maruim e Carmópolis entra automaticamente entre os comunicados. Sem mensagens, a faixa mostra somente o clima.
              </Text>
            </View>

            <View style={styles.card}>
              <Field
                label="Mensagens da faixa"
                value={value}
                onChangeText={setValue}
                placeholder="Promoção de bolsas até sábado ! (Último dia da promoção)"
                multiline
                style={styles.messageField}
              />
              <Text style={styles.helper}>
                Separe cada mensagem usando !. Para dar destaque maior, coloque toda a mensagem entre parênteses: (Mensagem importante). Os parênteses não aparecerão na faixa. {previewMessages.length}/{MAX_MESSAGES} cadastradas.
              </Text>
            </View>

            <Text style={styles.previewTitle}>Prévia da faixa</Text>
            <View style={styles.preview}>
              <AnnouncementTicker messages={previewMessages} />
            </View>

            <Button icon="save-outline" loading={saving} onPress={handleSave}>
              Salvar e mostrar no início
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
    gap: spacing.lg,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.infoSoft,
  },
  infoText: {
    flex: 1,
    color: colors.info,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  messageField: {
    minHeight: 180,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  preview: {
    overflow: 'hidden',
    borderRadius: radii.small,
  },
});
