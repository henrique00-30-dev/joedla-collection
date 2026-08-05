import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { StructuredField } from '@/src/components/structured-field';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';
import { Banner, StoreSettings } from '@/src/types';
import {
  brazilDateToIsoDate,
  isValidBrazilDate,
  isoDateToBrazilDate,
  normalizePlainText,
  validatePlainText,
} from '@/src/utils/fields';

export default function AdminAppearanceScreen() {
  const { settings, updateSettings, uploadProductImage } = useStore();
  const [form, setForm] = useState(() => ({
    ...settings,
    bannerStartAt: settings.bannerStartAt ? isoDateToBrazilDate(settings.bannerStartAt) : '',
    bannerEndAt: settings.bannerEndAt ? isoDateToBrazilDate(settings.bannerEndAt) : '',
    banners: settings.banners.map((banner) => ({
      ...banner,
      startAt: banner.startAt ? isoDateToBrazilDate(banner.startAt) : '',
      endAt: banner.endAt ? isoDateToBrazilDate(banner.endAt) : '',
    })),
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof StoreSettings>(
  field: K,
  value: StoreSettings[K],
) {
  setForm((current) => ({
    ...current,
    [field]: value,
  }));
}
function createEmptyBanner(): Banner {
  return {
    id: Crypto.randomUUID(),
    title: '',
    subtitle: '',
    imageUrl: '',
    buttonLabel: '',
    link: '',
    startAt: '',
    endAt: '',
    order: form.banners.length,
    active: true,
  };
}
function addBanner() {
  if (form.banners.length >= 4) {
    Alert.alert(
      'Limite de banners',
      'Você pode manter no máximo 4 banners no carrossel.',
    );
    return;
  }

  update('banners', [
    ...form.banners,
    createEmptyBanner(),
  ]);
}
function removeBanner(bannerId: string) {
  const remove = () => {
    update(
      'banners',
      form.banners
        .filter((banner) => banner.id !== bannerId)
        .map((banner, index) => ({
          ...banner,
          order: index,
        })),
    );
  };

  if (Platform.OS === 'web') {
    if (window.confirm('Tem certeza que deseja remover este banner?')) {
      remove();
    }
    return;
  }

  Alert.alert(
    'Remover banner',
    'Tem certeza de que deseja remover este banner?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: remove,
      },
    ],
  );
}


function updateBanner(
  bannerId: string,
  changes: Partial<Banner>,
) {
  setForm((current) => ({
    ...current,
    banners: current.banners.map((banner) =>
      banner.id === bannerId
        ? { ...banner, ...changes }
        : banner,
    ),
  }));
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
async function chooseBannerImage(bannerId: string) {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Permissão necessária',
      'Autorize o acesso às fotos para escolher o banner.',
    );
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.88,
  });

  if (result.canceled) return;

  setUploading(true);

  try {
    const asset = result.assets[0];

    const url = await uploadProductImage(
      asset.uri,
      asset.mimeType ?? 'image/jpeg',
    );

    updateBanner(bannerId, {
      imageUrl: url,
    });
  } catch (error) {
    Alert.alert(
      'Não foi possível enviar',
      error instanceof Error
        ? error.message
        : 'Tente novamente.',
    );
  } finally {
    setUploading(false);
  }
}

  async function save() {
    if (!form.bannerTitle.trim() || !form.bannerButtonLabel.trim() || !form.bannerImageUrl.trim()) {
      Alert.alert('Banner incompleto', 'Informe título, texto do botão e imagem.');
      return;
    }
    const dates = [
      ...(form.bannerStartAt ? [form.bannerStartAt] : []),
      ...(form.bannerEndAt ? [form.bannerEndAt] : []),
      ...form.banners.flatMap((banner) => [banner.startAt, banner.endAt].filter(Boolean)),
    ];
    if (dates.some((date) => !isValidBrazilDate(date))) {
      Alert.alert('Data inválida', 'Informe as datas no formato dia/mês/ano.');
      return;
    }
    const textValues = [
      [form.bannerTitle, 120], [form.bannerSubtitle, 240], [form.bannerButtonLabel, 40],
      ...form.banners.flatMap((banner) => [[banner.title, 120], [banner.subtitle, 240], [banner.buttonLabel, 40]] as [string, number][]),
    ] as [string, number][];
    if (textValues.some(([value, maximum]) => validatePlainText(value, { maximum }))) {
      Alert.alert('Texto inválido', 'Revise os textos e os limites dos banners.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        bannerTitle: normalizePlainText(form.bannerTitle),
        bannerSubtitle: normalizePlainText(form.bannerSubtitle),
        bannerButtonLabel: normalizePlainText(form.bannerButtonLabel),
        bannerStartAt: form.bannerStartAt ? brazilDateToIsoDate(form.bannerStartAt) ?? '' : '',
        bannerEndAt: form.bannerEndAt ? brazilDateToIsoDate(form.bannerEndAt) ?? '' : '',
        banners: form.banners.map((banner) => ({
          ...banner,
          title: normalizePlainText(banner.title),
          subtitle: normalizePlainText(banner.subtitle),
          buttonLabel: normalizePlainText(banner.buttonLabel),
          startAt: banner.startAt ? brazilDateToIsoDate(banner.startAt) ?? '' : '',
          endAt: banner.endAt ? brazilDateToIsoDate(banner.endAt) ?? '' : '',
        })),
      });
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
            <Button
  icon="add-outline"
  onPress={addBanner}
  disabled={form.banners.length >= 4}>
  Adicionar banner
</Button>

<Text style={{ marginTop: 8 }}>
  {form.banners.length} de 4 banners cadastrados
</Text>
{form.banners.map((banner, index) => (
  <View
    key={banner.id}
    style={{
      marginTop: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.medium,
      backgroundColor: colors.surface,
      gap: 12,
    }}>

    <Text style={{ fontWeight: '800', fontSize: 16 }}>
      Banner {index + 1}
    </Text>

    <Field
      label="Título"
      value={banner.title}
      onChangeText={(value) =>
        updateBanner(banner.id, { title: value })
      }
      maxLength={120}
    />

    <Field
      label="Subtítulo"
      value={banner.subtitle}
      onChangeText={(value) =>
        updateBanner(banner.id, { subtitle: value })
      }
      maxLength={240}
    />

    <Field
      label="Texto do botão"
      value={banner.buttonLabel}
      onChangeText={(value) =>
        updateBanner(banner.id, { buttonLabel: value })
      }
      maxLength={40}
    />

    <Field
      label="Destino do botão"
      value={banner.link}
      onChangeText={(value) =>
        updateBanner(banner.id, { link: value })
      }
      maxLength={500}
    />

    <StructuredField
      kind="date"
      label="Data de início (opcional)"
      value={banner.startAt}
      onChangeText={(value) =>
        updateBanner(banner.id, { startAt: value })
      }
    />

    <StructuredField
      kind="date"
      label="Data de término (opcional)"
      value={banner.endAt}
      onChangeText={(value) =>
        updateBanner(banner.id, { endAt: value })
      }
    />

    <Button
      variant="secondary"
      icon="image-outline"
      onPress={() => chooseBannerImage(banner.id)}
      disabled={uploading}>
      Trocar imagem
    </Button>

    <Button
      variant="secondary"
      icon="trash-outline"
      onPress={() => removeBanner(banner.id)}>
      Remover banner
    </Button>
  </View>
))}
            <View style={styles.card}>
              <Field label="Título" value={form.bannerTitle} onChangeText={(value) => update('bannerTitle', value)} placeholder="Elegância para todos os momentos" maxLength={120} />
              <Field label="Subtítulo curto" value={form.bannerSubtitle} onChangeText={(value) => update('bannerSubtitle', value)} multiline maxLength={240} />
              <Field label="Texto do botão" value={form.bannerButtonLabel} onChangeText={(value) => update('bannerButtonLabel', value)} maxLength={40} />
              <Field label="Destino do botão" value={form.bannerLink} onChangeText={(value) => update('bannerLink', value)} placeholder="/(tabs)/categories" autoCapitalize="none" maxLength={500} />
              <Button variant="secondary" icon="image-outline" loading={uploading} onPress={chooseBanner}>Trocar imagem do banner</Button>
            </View>

            <Text style={styles.sectionTitle}>Agendamento opcional</Text>
            <View style={styles.card}>
              <StructuredField kind="date" label="Data de início (opcional)" value={form.bannerStartAt} onChangeText={(value) => update('bannerStartAt', value)} placeholder="DD/MM/AAAA" />
              <StructuredField kind="date" label="Data de término (opcional)" value={form.bannerEndAt} onChangeText={(value) => update('bannerEndAt', value)} placeholder="DD/MM/AAAA" />
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
