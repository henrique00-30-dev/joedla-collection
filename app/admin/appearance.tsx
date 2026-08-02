import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { StoreSettings } from '@/src/types';

export default function AdminAppearanceScreen() {
  const { settings, updateSettings, uploadProductImage } = useStore();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update(field: keyof StoreSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function chooseBanner() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher o banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.88 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const url = await uploadProductImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      setForm((current) => ({ ...current, bannerImageUrl: url }));
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.bannerTitle.trim() || !form.bannerButtonLabel.trim() || !form.bannerImageUrl.trim()) {
      Alert.alert('Banner incompleto', 'Informe título, texto do botão e imagem.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(form);
      Alert.alert('Visual publicado', 'O novo banner já está disponível na página inicial.');
    } catch (error) {
      Alert.alert('Não foi possível publicar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader compact title="Destaques e banner" showBack showStoreHome />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.info}>
              <Ionicons name="color-palette-outline" size={22} color={colors.info} />
              <Text style={styles.infoText}>Edite somente os textos e a imagem. Cores, fontes e proporções permanecem padronizadas para proteger o layout.</Text>
            </View>

            <Text style={styles.sectionTitle}>Prévia ao vivo</Text>
            <View style={styles.preview}>
              <View style={styles.previewCopy}>
                <Text style={styles.previewEyebrow}>CURADORIA JOEDLA</Text>
                <Text numberOfLines={3} style={styles.previewTitle}>{form.bannerTitle || 'Título do banner'}</Text>
                <Text numberOfLines={2} style={styles.previewSubtitle}>{form.bannerSubtitle}</Text>
                <View style={styles.previewButton}><Text style={styles.previewButtonText}>{form.bannerButtonLabel || 'Botão'}</Text></View>
              </View>
              <Image source={{ uri: form.bannerImageUrl }} contentFit="cover" style={styles.previewImage} />
            </View>

            <Text style={styles.sectionTitle}>Conteúdo do banner</Text>
            <View style={styles.card}>
              <Field label="Título" value={form.bannerTitle} onChangeText={(value) => update('bannerTitle', value)} placeholder="Elegância para todos os momentos" />
              <Field label="Subtítulo curto" value={form.bannerSubtitle} onChangeText={(value) => update('bannerSubtitle', value)} multiline />
              <Field label="Texto do botão" value={form.bannerButtonLabel} onChangeText={(value) => update('bannerButtonLabel', value)} />
              <Field label="Destino do botão" value={form.bannerLink} onChangeText={(value) => update('bannerLink', value)} placeholder="/(tabs)/categories" autoCapitalize="none" />
              <Button variant="secondary" icon="image-outline" loading={uploading} onPress={chooseBanner}>Trocar imagem do banner</Button>
            </View>

            <Text style={styles.sectionTitle}>Agendamento opcional</Text>
            <View style={styles.card}>
              <Field label="Início (AAAA-MM-DD), opcional" value={form.bannerStartAt} onChangeText={(value) => update('bannerStartAt', value)} placeholder="2026-08-10" autoCapitalize="none" />
              <Field label="Fim (AAAA-MM-DD), opcional" value={form.bannerEndAt} onChangeText={(value) => update('bannerEndAt', value)} placeholder="2026-08-20" autoCapitalize="none" />
            </View>
            <Button loading={saving} onPress={save}>Salvar e publicar</Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 900, padding: spacing.lg, paddingBottom: spacing.xxl, alignSelf: 'center', gap: spacing.md },
  info: { padding: spacing.lg, borderRadius: radii.medium, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.infoSoft },
  infoText: { flex: 1, color: colors.info, fontSize: 12, lineHeight: 18 },
  sectionTitle: { marginTop: spacing.sm, color: colors.text, fontSize: 16, fontWeight: '900' },
  card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, gap: spacing.lg, backgroundColor: colors.surface },
  preview: { minHeight: 260, overflow: 'hidden', borderRadius: radii.large, flexDirection: 'row', backgroundColor: '#F2E4D2' },
  previewCopy: { zIndex: 2, width: '58%', padding: spacing.xl, justifyContent: 'center' },
  previewEyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  previewTitle: { marginTop: spacing.sm, fontFamily: fonts.display, color: colors.primaryDark, fontSize: 25, lineHeight: 29, fontWeight: '800' },
  previewSubtitle: { marginTop: spacing.sm, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  previewButton: { alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.primary },
  previewButtonText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  previewImage: { width: '48%', marginLeft: '-6%' },
});
