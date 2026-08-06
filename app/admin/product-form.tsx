import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { StructuredField } from '@/src/components/structured-field';
import { useStore } from '@/src/context/store-context';
import { loadAdminProductPromotion, saveProductPromotion } from '@/src/features/marketing/service';
import { CampaignBadgeTone } from '@/src/features/marketing/types';
import { colors, radii, spacing } from '@/src/theme';
import { Availability, CategorySlug, PhotoQuality, ProductDraft } from '@/src/types';
import {
  formatBrlInput,
  isValidBrazilDate,
  isValidQuantity,
  maceioDateTimeToIso,
  normalizePlainText,
  parseBrlCents,
  validatePlainText,
  isoToMaceioFields,
} from '@/src/utils/fields';
import { formatCurrency } from '@/src/utils/format';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, categories, saveProduct, uploadProductImage, refreshStore } = useStore();
  const existing = products.find((product) => product.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [price, setPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState('');
  const [colorsText, setColorsText] = useState('');
  const [availability, setAvailability] = useState<Availability>('ready');
  const [stock, setStock] = useState('1');
  const [featured, setFeatured] = useState(false);
  const [photoQuality, setPhotoQuality] = useState<PhotoQuality>('acceptable');
  const [photoProvisional, setPhotoProvisional] = useState(false);
  const [promotionEnabled, setPromotionEnabled] = useState(false);
  const [promotionalPrice, setPromotionalPrice] = useState('');
  const [promotionStartDate, setPromotionStartDate] = useState('');
  const [promotionEndDate, setPromotionEndDate] = useState('');
  const [promotionShowBadge, setPromotionShowBadge] = useState(true);
  const [promotionBadgeLabel, setPromotionBadgeLabel] = useState('Promoção');
  const [promotionBadgeTone, setPromotionBadgeTone] = useState<CampaignBadgeTone>('wine');
  const [promotionVersion, setPromotionVersion] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savingRef = useRef(false);
  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const promotionalPriceRef = useRef<TextInput>(null);
  const promotionStartDateRef = useRef<TextInput>(null);
  const promotionEndDateRef = useRef<TextInput>(null);
  const promotionBadgeRef = useRef<TextInput>(null);
  const stockRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description);
    setCategory(existing.category);
    const basePrice = existing.originalPrice ?? existing.price;
    setPrice(formatBrlInput(Math.round(basePrice * 100)));
    setImages(existing.imageUrls);
    setSizes(existing.sizes.join(', '));
    setColorsText(existing.colors.join(', '));
    setAvailability(existing.availability);
    setStock(String(existing.stock));
    setFeatured(existing.featured);
    setPhotoQuality(existing.photoQuality);
    setPhotoProvisional(existing.photoProvisional);
  }, [existing]);

  useEffect(() => {
    if (!existing) return;
    let active = true;
    void loadAdminProductPromotion(existing.id)
      .then((promotion) => {
        if (!active || !promotion) return;
        setPromotionEnabled(promotion.enabled);
        setPromotionalPrice(formatBrlInput(promotion.promotionalPriceCents));
        setPromotionStartDate(isoToMaceioFields(promotion.startAt).date);
        setPromotionEndDate(isoToMaceioFields(promotion.endAt).date);
        setPromotionShowBadge(promotion.showBadge);
        setPromotionBadgeLabel(promotion.badgeLabel);
        setPromotionBadgeTone(promotion.badgeTone);
        setPromotionVersion(promotion.version);
      })
      .catch((error) => Alert.alert(
        'Não foi possível carregar a promoção',
        error instanceof Error ? error.message : 'Tente novamente.',
      ));
    return () => { active = false; };
  }, [existing]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Autorize o acesso às fotos para cadastrar imagens dos produtos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const shortestSide = Math.min(asset.width ?? 0, asset.height ?? 0);
      const detectedQuality: PhotoQuality =
        shortestSide >= 1200 ? 'recommended' : shortestSide >= 700 ? 'acceptable' : 'reduced';
      const imageUrl = await uploadProductImage(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      setImages((current) => [...current, imageUrl]);
      setPhotoQuality((current) =>
        current === 'reduced' || detectedQuality === 'reduced'
          ? 'reduced'
          : current === 'acceptable' || detectedQuality === 'acceptable'
            ? 'acceptable'
            : 'recommended',
      );
      if (detectedQuality === 'reduced') {
        Alert.alert(
          'Foto com resolução reduzida',
          'Ela foi adicionada e pode ser usada normalmente. Recomendamos substituir por uma foto melhor quando o produto chegar.',
          [{ text: 'Usar mesmo assim' }],
        );
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar a foto',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    // Bloqueio síncrono: impede dois ou mais cadastros quando o botão é tocado
    // repetidamente antes de o React atualizar o estado `saving`.
    if (savingRef.current) return;

    const priceCents = parseBrlCents(price);
    const promotionalPriceCents = parseBrlCents(promotionalPrice);
    const nextErrors: Record<string, string> = {};
    const nameError = validatePlainText(name, { minimum: 3, maximum: 120 });
    const descriptionError = validatePlainText(description, { maximum: 2000, multiline: true });
    if (nameError) nextErrors.name = nameError;
    if (descriptionError) nextErrors.description = descriptionError;
    if (priceCents === null || priceCents <= 0) nextErrors.price = 'Informe um preço maior que zero.';
    if (!category) {
      nextErrors.category = 'Escolha em qual categoria o produto deve aparecer.';
    }
    if (availability === 'ready' && !isValidQuantity(stock, 0, 999999)) {
      nextErrors.stock = 'Informe uma quantidade inteira entre 0 e 999999.';
    }
    if (promotionEnabled) {
      if (promotionalPriceCents === null || promotionalPriceCents <= 0) {
        nextErrors.promotionalPrice = 'Informe um preço promocional maior que zero.';
      } else if (priceCents !== null && promotionalPriceCents >= priceCents) {
        nextErrors.promotionalPrice = 'O preço promocional deve ser menor que o preço normal.';
      }
      if (promotionStartDate && !isValidBrazilDate(promotionStartDate)) {
        nextErrors.promotionStartDate = 'Informe uma data válida no formato dia/mês/ano.';
      }
      if (promotionEndDate && !isValidBrazilDate(promotionEndDate)) {
        nextErrors.promotionEndDate = 'Informe uma data válida no formato dia/mês/ano.';
      }
      const badgeError = validatePlainText(promotionBadgeLabel, { minimum: 1, maximum: 24 });
      if (promotionShowBadge && badgeError) nextErrors.promotionBadgeLabel = badgeError;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.price) priceRef.current?.focus();
      else if (nextErrors.promotionalPrice) promotionalPriceRef.current?.focus();
      else if (nextErrors.promotionStartDate) promotionStartDateRef.current?.focus();
      else if (nextErrors.promotionEndDate) promotionEndDateRef.current?.focus();
      else if (nextErrors.promotionBadgeLabel) promotionBadgeRef.current?.focus();
      else if (nextErrors.stock) stockRef.current?.focus();
      return;
    }
    if (!category || priceCents === null) return;

    const parsedStock = Number.parseInt(stock || '0', 10);
    const promotionStartAt = promotionStartDate
      ? maceioDateTimeToIso(promotionStartDate, '00:00', 'start')
      : null;
    const promotionEndAt = promotionEndDate
      ? maceioDateTimeToIso(promotionEndDate, '23:59', 'end')
      : null;
    if (promotionStartAt && promotionEndAt && Date.parse(promotionEndAt) <= Date.parse(promotionStartAt)) {
      setErrors((current) => ({ ...current, promotionEndDate: 'A data final deve ser posterior à data inicial.' }));
      return;
    }

    const splitValues = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const draft: ProductDraft = {
      id: existing?.id,
      name: normalizePlainText(name),
      description: normalizePlainText(description, true),
      category,
      price: priceCents / 100,
      imageUrls: images,
      sizes: splitValues(sizes),
      colors: splitValues(colorsText),
      availability,
      stock: availability === 'ready' ? parsedStock : 0,
      featured,
      active: true,
      photoQuality,
      photoProvisional,
    };

    savingRef.current = true;
    setSaving(true);
    let savedSuccessfully = false;

    try {
      const savedProduct = await saveProduct(draft);
      if (promotionEnabled || promotionVersion !== null) {
        await saveProductPromotion(savedProduct.id, promotionVersion, {
          enabled: promotionEnabled,
          promotionalPriceCents: promotionalPriceCents ?? Math.max(1, Math.round((priceCents ?? 1) * 0.9)),
          startAt: promotionStartAt,
          endAt: promotionEndAt,
          showBadge: promotionShowBadge,
          badgeLabel: normalizePlainText(promotionBadgeLabel) || 'Promoção',
          badgeTone: promotionBadgeTone,
          badgePosition: 'top-left',
  badgeSize: 'medium',
  badgeShape: 'pill',
        });
      }
      await refreshStore();
      savedSuccessfully = true;

      // Sai da tela imediatamente depois do primeiro salvamento concluído.
      // O bloqueio permanece ativo até a tela ser desmontada.
      router.replace('/admin/products');
      const categoryName = categories.find((item) => item.slug === category)?.name;
      Alert.alert(
        'Produto salvo',
        `O produto foi salvo em ${categoryName ?? 'sua categoria'}.`,
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      if (!savedSuccessfully) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  return (
    <AdminGuard>
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <AppHeader
          compact
          title={existing ? 'Editar produto' : 'Cadastrar produto'}
          showBack
          showStoreHome
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <Text style={styles.categoryHint}>
              Adicione quantas fotos precisar. A primeira será a capa e as demais aparecerão na galeria do produto.
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.images}
              showsHorizontalScrollIndicator>
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.imageWrap}>
                  <ProductImage uri={uri} style={styles.image} />
                  <Pressable
                    accessibilityLabel="Remover foto"
                    onPress={() =>
                      setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    style={styles.removeImage}>
                    <Ionicons name="close" size={17} color={colors.white} />
                  </Pressable>
                  {index === 0 ? (
                    <View style={styles.cover}>
                      <Text style={styles.coverText}>Capa</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              <Pressable disabled={uploading} onPress={pickImage} style={styles.addImage}>
                {uploading ? (
                  <Text style={styles.addImageText}>Enviando...</Text>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                    <Text style={styles.addImageText}>Adicionar foto</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>

            <View style={styles.photoNotice}>
              <Ionicons name="information-circle-outline" size={21} color={colors.info} />
              <Text style={styles.photoNoticeText}>
                Fotos de fornecedor são permitidas. O aviso de qualidade orienta, mas nunca impede o cadastro.
              </Text>
            </View>
            <Text style={styles.categoryHint}>Qualidade atual das fotos</Text>
            <View style={styles.chips}>
              <ChoiceChip active={photoQuality === 'recommended'} label="Recomendada" onPress={() => setPhotoQuality('recommended')} />
              <ChoiceChip active={photoQuality === 'acceptable'} label="Aceitável" onPress={() => setPhotoQuality('acceptable')} />
              <ChoiceChip active={photoQuality === 'reduced'} label="Reduzida" onPress={() => setPhotoQuality('reduced')} />
            </View>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Foto provisória do fornecedor</Text>
                  <Text style={styles.switchDescription}>Lembrar de substituir quando houver uma foto própria</Text>
                </View>
                <Switch
                  value={photoProvisional}
                  onValueChange={setPhotoProvisional}
                  trackColor={{ false: colors.border, true: colors.warningSoft }}
                  thumbColor={photoProvisional ? colors.warning : colors.white}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Informações</Text>
            <View style={styles.card}>
              <Field
                ref={nameRef}
                label="Nome do produto"
                value={name}
                onChangeText={setName}
                placeholder="Ex.: Conjunto Fitness"
                maxLength={120}
                error={errors.name}
              />
              <Field
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes, tecido e características"
                multiline
                maxLength={2000}
                error={errors.description}
              />
            </View>

            <Text style={styles.sectionTitle}>Preço e promoção</Text>
            <View style={styles.card}>
              <StructuredField
                ref={priceRef}
                kind="currency"
                label="Preço normal"
                value={price}
                onChangeText={(value) => { setPrice(value); setErrors((current) => ({ ...current, price: '' })); }}
                onBlur={() => {
                  const cents = parseBrlCents(price);
                  if (cents !== null) setPrice(formatBrlInput(cents));
                }}
                placeholder="R$ 0,00"
                error={errors.price}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Produto em promoção</Text>
                  <Text style={styles.switchDescription}>Funciona sem campanha e sem banner</Text>
                </View>
                <Switch
                  value={promotionEnabled}
                  onValueChange={setPromotionEnabled}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={promotionEnabled ? colors.primary : colors.white}
                />
              </View>
              {promotionEnabled ? (
                <>
                  <StructuredField
                    ref={promotionalPriceRef}
                    kind="currency"
                    label="Preço promocional"
                    value={promotionalPrice}
                    onChangeText={(value) => { setPromotionalPrice(value); setErrors((current) => ({ ...current, promotionalPrice: '' })); }}
                    onBlur={() => {
                      const cents = parseBrlCents(promotionalPrice);
                      if (cents !== null) setPromotionalPrice(formatBrlInput(cents));
                    }}
                    placeholder="R$ 0,00"
                    error={errors.promotionalPrice}
                  />
                  <View style={styles.dateFields}>
                    <StructuredField
                      ref={promotionStartDateRef}
                      kind="date"
                      label="Data de início (opcional)"
                      value={promotionStartDate}
                      onChangeText={setPromotionStartDate}
                      placeholder="DD/MM/AAAA"
                      error={errors.promotionStartDate}
                      style={styles.dateField}
                    />
                    <StructuredField
                      ref={promotionEndDateRef}
                      kind="date"
                      label="Data de término (opcional)"
                      value={promotionEndDate}
                      onChangeText={setPromotionEndDate}
                      placeholder="DD/MM/AAAA"
                      error={errors.promotionEndDate}
                      style={styles.dateField}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <View style={styles.switchText}>
                      <Text style={styles.switchTitle}>Exibir selo promocional</Text>
                      <Text style={styles.switchDescription}>A disponibilidade continua aparecendo separadamente</Text>
                    </View>
                    <Switch
                      value={promotionShowBadge}
                      onValueChange={setPromotionShowBadge}
                      trackColor={{ false: colors.border, true: colors.primarySoft }}
                      thumbColor={promotionShowBadge ? colors.primary : colors.white}
                    />
                  </View>
                  {promotionShowBadge ? (
                    <>
                      <Field
                        ref={promotionBadgeRef}
                        label="Texto curto do selo"
                        value={promotionBadgeLabel}
                        onChangeText={setPromotionBadgeLabel}
                        maxLength={24}
                        error={errors.promotionBadgeLabel}
                      />
                      <Text style={styles.counter}>{promotionBadgeLabel.length}/24</Text>
                      <View style={styles.chips}>
                        {promotionTones.map((tone) => (
                          <ChoiceChip
                            key={tone.value}
                            active={promotionBadgeTone === tone.value}
                            label={tone.label}
                            onPress={() => setPromotionBadgeTone(tone.value)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                  {parseBrlCents(price) && parseBrlCents(promotionalPrice) ? (
                    <View style={styles.pricePreview}>
                      <Text style={styles.previewLabel}>Prévia do preço</Text>
                      <Text style={styles.previewOriginal}>{formatCurrency((parseBrlCents(price) ?? 0) / 100)}</Text>
                      <Text style={styles.previewPromotional}>{formatCurrency((parseBrlCents(promotionalPrice) ?? 0) / 100)}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Categoria</Text>
            <Text style={styles.categoryHint}>
              Escolha uma categoria antes de salvar. O produto aparecerá somente nela e, se for destaque, também na página inicial.
            </Text>
            {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : null}
            <View style={styles.chips}>
              {categories.map((item) => (
                <ChoiceChip
                  key={item.slug}
                  active={category === item.slug}
                  label={item.name}
                  onPress={() => setCategory(item.slug)}
                />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Disponibilidade</Text>
            <View style={styles.chips}>
              <ChoiceChip
                active={availability === 'ready'}
                label="Pronta entrega"
                onPress={() => setAvailability('ready')}
              />
              <ChoiceChip
                active={availability === 'custom'}
                label="Por encomenda"
                onPress={() => setAvailability('custom')}
              />
            </View>

            <View style={styles.card}>
              {availability === 'ready' ? (
                <StructuredField
                  ref={stockRef}
                  kind="integer"
                  label="Quantidade em estoque"
                  value={stock}
                  onChangeText={setStock}
                  placeholder="0"
                  error={errors.stock}
                />
              ) : (
                <View style={styles.customInfo}>
                  <Ionicons name="time-outline" size={21} color={colors.warning} />
                  <Text style={styles.customInfoText}>
                    O produto aparecerá como encomenda e não exigirá quantidade em estoque.
                  </Text>
                </View>
              )}
              <Field
                label="Tamanhos, separados por vírgula"
                value={sizes}
                onChangeText={setSizes}
                placeholder="P, M, G, GG"
                autoCapitalize="characters"
                maxLength={300}
              />
              <Field
                label="Cores, separadas por vírgula"
                value={colorsText}
                onChangeText={setColorsText}
                placeholder="Preto, Marrom, Rosa"
                autoCapitalize="words"
                maxLength={300}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Produto em destaque</Text>
                  <Text style={styles.switchDescription}>
                    Mostrar este produto na tela inicial
                  </Text>
                </View>
                <Switch
                  value={featured}
                  onValueChange={setFeatured}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={featured ? colors.primary : colors.white}
                />
              </View>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Button loading={saving} onPress={handleSave}>
              Salvar produto
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </AdminGuard>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  categoryHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldError: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  counter: { marginTop: -spacing.md, color: colors.textMuted, fontSize: 10, textAlign: 'right' },
  dateFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dateField: { minWidth: 220, flex: 1 },
  pricePreview: { padding: spacing.md, borderRadius: radii.small, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceWarm },
  previewLabel: { width: '100%', color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  previewOriginal: { color: colors.textMuted, fontSize: 14, textDecorationLine: 'line-through' },
  previewPromotional: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  photoNotice: {
    padding: spacing.md,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
  },
  photoNoticeText: { flex: 1, color: colors.info, fontSize: 11, lineHeight: 17 },
  images: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  imageWrap: {
    width: 126,
    height: 156,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radii.medium,
  },
  removeImage: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  cover: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  coverText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
  addImage: {
    width: 126,
    height: 156,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primarySoft,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceWarm,
  },
  addImageText: {
    maxWidth: 90,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: colors.white,
  },
  customInfo: {
    padding: spacing.md,
    borderRadius: radii.small,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
  },
  customInfoText: {
    flex: 1,
    color: colors.warning,
    fontSize: 11,
    lineHeight: 16,
  },
  switchRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 3,
  },
  switchTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  switchDescription: {
    color: colors.textMuted,
    fontSize: 11,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

const promotionTones: { value: CampaignBadgeTone; label: string }[] = [
  { value: 'wine', label: 'Vinho' },
  { value: 'caramel', label: 'Caramelo' },
  { value: 'dark', label: 'Escuro' },
  { value: 'success', label: 'Verde' },
  { value: 'attention', label: 'Atenção' },
];
