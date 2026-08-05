import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { MarketingBanners } from '@/src/components/marketing-banners';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { emptyCampaignBundle, isoToLocalInput, maceioInputToIso } from '@/src/features/marketing/admin';
import {
  changeMarketingCampaignStatus,
  loadAdminMarketingCampaign,
  loadCampaignChecklist,
  loadMarketingSettings,
  saveMarketingCampaignBundle,
  uploadMarketingCampaignImage,
} from '@/src/features/marketing/service';
import {
  CampaignBadgeTone,
  CampaignDestinationType,
  CampaignPlacementPosition,
  CampaignTargetType,
  MarketingCampaignBundle,
  MarketingCampaignAsset,
  MarketingCampaignPlacement,
  MarketingCampaignPriceRule,
} from '@/src/features/marketing/types';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

const positions: { value: CampaignPlacementPosition; label: string }[] = [
  { value: 'home_hero', label: 'Banner principal' },
  { value: 'home_secondary_1', label: 'Secundário 1' },
  { value: 'home_secondary_2', label: 'Secundário 2' },
  { value: 'home_secondary_3', label: 'Secundário 3' },
];

export default function AdminCampaignEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, categories, settings: storeSettings, refreshStore } = useStore();
  const { width } = useWindowDimensions();
  const [bundle, setBundle] = useState<MarketingCampaignBundle | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDesktop, setPreviewDesktop] = useState(width >= 900);
  const [maxImageBytes, setMaxImageBytes] = useState(5_242_880);
  const [targetScope, setTargetScope] = useState<CampaignTargetType>('store');

  useEffect(() => {
    void load();
    // O identificador da rota é a única dependência da carga inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [campaign, marketingSettings] = await Promise.all([
        loadAdminMarketingCampaign(id),
        loadMarketingSettings(),
      ]);
      if (!campaign) throw new Error('Campanha não encontrada.');
      const next = campaign.targets.length ? campaign : emptyCampaignBundle(campaign);
      setBundle(next);
      setTargetScope(next.targets[0]?.targetType ?? 'store');
      setStartInput(isoToLocalInput(next.startAt));
      setEndInput(isoToLocalInput(next.endAt));
      if (marketingSettings) setMaxImageBytes(marketingSettings.maxImageBytes);
    } catch (error) {
      Alert.alert('Não foi possível abrir', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function update(changes: Partial<MarketingCampaignBundle>) {
    setBundle((current) => current ? { ...current, ...changes } : current);
  }

  function selectTargetScope(scope: CampaignTargetType) {
    if (!bundle) return;
    setTargetScope(scope);
    update({
      targets: scope === 'store'
        ? [newTarget(bundle.id, 'store')]
        : [],
      priceRules: scope === 'product' ? bundle.priceRules : bundle.priceRules.filter((rule) => rule.ruleType === 'percentage'),
    });
  }

  function toggleCategory(slug: string) {
    if (!bundle) return;
    const exists = bundle.targets.some((target) => target.categorySlug === slug);
    update({
      targets: exists
        ? bundle.targets.filter((target) => target.categorySlug !== slug)
        : [...bundle.targets, { ...newTarget(bundle.id, 'category'), categorySlug: slug }],
    });
  }

  function toggleProduct(productId: string) {
    if (!bundle) return;
    const exists = bundle.targets.some((target) => target.productId === productId);
    update({
      targets: exists
        ? bundle.targets.filter((target) => target.productId !== productId)
        : [...bundle.targets, { ...newTarget(bundle.id, 'product'), productId }],
      priceRules: exists
        ? bundle.priceRules.filter((rule) => rule.productId !== productId)
        : bundle.priceRules[0]?.ruleType === 'manual_price'
          ? [...bundle.priceRules, newPriceRule(bundle.id, 'manual_price', productId)]
          : bundle.priceRules,
    });
  }

  function addPlacement(position: CampaignPlacementPosition) {
    if (!bundle || bundle.placements.some((placement) => placement.position === position)) return;
    update({ placements: [...bundle.placements, newPlacement(bundle.id, position)] });
  }

  function updatePlacement(placementId: string, changes: Partial<MarketingCampaignPlacement>) {
    if (!bundle) return;
    update({
      placements: bundle.placements.map((placement) =>
        placement.id === placementId ? { ...placement, ...changes } : placement,
      ),
    });
  }

  function updateAsset(assetId: string, changes: Partial<MarketingCampaignAsset>) {
    if (!bundle) return;
    update({
      assets: bundle.assets.map((asset) => asset.id === assetId ? { ...asset, ...changes } : asset),
    });
  }

  function removePlacement(placementId: string) {
    if (!bundle) return;
    const placements = bundle.placements.filter((placement) => placement.id !== placementId);
    const referenced = new Set(placements.flatMap((placement) => [placement.desktopAssetId, placement.mobileAssetId]).filter(Boolean));
    update({ placements, assets: bundle.assets.filter((asset) => referenced.has(asset.id)) });
  }

  async function chooseImage(placement: MarketingCampaignPlacement, format: 'desktop' | 'mobile') {
    if (!bundle) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher a imagem.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.86 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const selected = result.assets[0];
      const asset = await uploadMarketingCampaignImage({
        campaignId: bundle.id,
        uri: selected.uri,
        format,
        mimeType: selected.mimeType,
        width: selected.width,
        height: selected.height,
        altText: placement.title || bundle.name,
        maxBytes: maxImageBytes,
      });
      setBundle((current) => current ? {
        ...current,
        ...replacePlacementAsset(current, placement.id, format, asset),
      } : current);
    } catch (error) {
      Alert.alert('Não foi possível enviar', errorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  function setBadgeEnabled(enabled: boolean) {
    if (!bundle) return;
    update({
      badge: enabled ? {
        id: Crypto.randomUUID(),
        campaignId: bundle.id,
        label: 'Oferta especial',
        tone: 'wine',
        version: 1,
      } : null,
    });
  }

  function setPriceMode(mode: 'none' | 'percentage' | 'manual_price') {
    if (!bundle) return;
    if (mode === 'none') update({ priceRules: [] });
    else if (mode === 'percentage') update({
      priceRules: [newPriceRule(bundle.id, 'percentage', null)],
    });
    else {
      const productTargets = bundle.targets.filter((target) => target.productId);
      if (!productTargets.length) {
        Alert.alert('Selecione produtos', 'O preço manual exige público por produto.');
        return;
      }
      update({
        priceRules: productTargets.map((target) =>
          newPriceRule(bundle.id, 'manual_price', target.productId),
        ),
      });
    }
  }

  function updateRule(ruleId: string, changes: Partial<MarketingCampaignPriceRule>) {
    if (!bundle) return;
    update({ priceRules: bundle.priceRules.map((rule) => rule.id === ruleId ? { ...rule, ...changes } : rule) });
  }

  async function save(showSuccess = true) {
    if (!bundle) return null;
    setSaving(true);
    try {
      const prepared = {
        ...bundle,
        startAt: maceioInputToIso(startInput),
        endAt: maceioInputToIso(endInput),
      };
      const saved = await saveMarketingCampaignBundle(prepared);
      if (!saved) throw new Error('A campanha não foi retornada após salvar.');
      setBundle(saved);
      setStartInput(isoToLocalInput(saved.startAt));
      setEndInput(isoToLocalInput(saved.endAt));
      if (showSuccess) Alert.alert('Rascunho salvo', 'As alterações foram salvas sem publicar.');
      return saved;
    } catch (error) {
      Alert.alert('Não foi possível salvar', errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const saved = await save(false);
    if (!saved) return;
    try {
      const checklist = await loadCampaignChecklist(saved.id);
      if (checklist.errors.length) {
        Alert.alert('Corrija antes de publicar', checklist.errors.join('\n\n'));
        return;
      }
      if (!await confirmPublication(checklist)) return;
      const published = await changeMarketingCampaignStatus(saved, 'published');
      setBundle({ ...saved, ...published });
      await refreshStore();
      Alert.alert('Campanha publicada', 'Ela aparecerá automaticamente no período configurado, se o módulo estiver ligado.');
    } catch (error) {
      Alert.alert('Não foi possível publicar', errorMessage(error));
    }
  }

  async function changeStatus(next: 'paused' | 'published' | 'archived') {
    if (!bundle) return;
    if (next === 'archived' && !await confirmArchive()) return;
    try {
      const changed = await changeMarketingCampaignStatus(bundle, next);
      setBundle({ ...bundle, ...changed });
      await refreshStore();
      Alert.alert('Status atualizado', next === 'paused' ? 'A campanha foi pausada.' : next === 'archived' ? 'A campanha foi arquivada.' : 'A campanha voltou a ser publicada.');
    } catch (error) {
      Alert.alert('Não foi possível alterar', errorMessage(error));
    }
  }

  const priceMode = bundle?.priceRules[0]?.ruleType ?? 'none';
  const previewCampaign = useMemo(() => bundle ? [{ ...bundle, status: 'published' as const }] : [], [bundle]);

  if (loading || !bundle) {
    return (
      <AdminGuard><Screen><AppHeader compact title="Editar campanha" showBack />
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Carregando editor...</Text></View>
      </Screen></AdminGuard>
    );
  }

  const archived = bundle.status === 'archived';

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Editar campanha" showBack showStoreHome />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Section title="1. Identificação e período" description="Datas digitadas no horário de Sergipe (America/Maceió). O banco salva em UTC.">
              <Field label="Nome interno" value={bundle.name} editable={!archived} onChangeText={(name) => update({ name })} />
              <View style={styles.twoColumns}>
                <Field label="Início (AAAA-MM-DDTHH:MM)" placeholder="2026-08-10T09:00" value={startInput} editable={!archived} onChangeText={setStartInput} style={styles.column} />
                <Field label="Término opcional" placeholder="2026-08-17T23:59" value={endInput} editable={!archived} onChangeText={setEndInput} style={styles.column} />
              </View>
              <Field label="Prioridade (-1000 a 1000)" keyboardType="numbers-and-punctuation" value={String(bundle.priority)} editable={!archived} onChangeText={(value) => update({ priority: Number.parseInt(value || '0', 10) || 0 })} />
            </Section>

            <Section title="2. Público da campanha" description="A precedência de preço é produto, categoria e loja; em empate, vence a maior prioridade.">
              <ChoiceRow
                options={[
                  { value: 'store', label: 'Loja inteira' },
                  { value: 'category', label: 'Categorias' },
                  { value: 'product', label: 'Produtos' },
                ]}
                value={targetScope}
                disabled={archived}
                onChange={(value) => selectTargetScope(value as CampaignTargetType)}
              />
              {targetScope === 'category' ? (
                <>
                  <ChipGrid>{categories.filter((category) => category.active).map((category) => (
                    <ChoiceChip key={category.slug} label={category.name} selected={bundle.targets.some((target) => target.categorySlug === category.slug)} disabled={archived} onPress={() => toggleCategory(category.slug)} />
                  ))}</ChipGrid>
                  <Text style={styles.fieldTitle}>Novos produtos dessas categorias entram automaticamente?</Text>
                  <ChoiceRow
                    options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]}
                    value={bundle.targets.every((target) => target.includeNewProducts) ? 'yes' : 'no'}
                    disabled={archived}
                    onChange={(value) => update({ targets: bundle.targets.map((target) => ({ ...target, includeNewProducts: value === 'yes' })) })}
                  />
                </>
              ) : null}
              {targetScope === 'product' ? (
                <ChipGrid>{products.filter((product) => product.active).map((product) => (
                  <ChoiceChip key={product.id} label={product.name} selected={bundle.targets.some((target) => target.productId === product.id)} disabled={archived} onPress={() => toggleProduct(product.id)} />
                ))}</ChipGrid>
              ) : null}
            </Section>

            <Section title="3. Selo dos produtos" description="No máximo um selo é exibido em cada produto.">
              <ChoiceRow options={[{ value: 'off', label: 'Sem selo' }, { value: 'on', label: 'Usar selo' }]} value={bundle.badge ? 'on' : 'off'} disabled={archived} onChange={(value) => setBadgeEnabled(value === 'on')} />
              {bundle.badge ? <>
                <Field label="Texto do selo" maxLength={36} value={bundle.badge.label} editable={!archived} onChangeText={(label) => update({ badge: bundle.badge ? { ...bundle.badge, label } : null })} />
                <ChoiceRow options={badgeTones} value={bundle.badge.tone} disabled={archived} onChange={(tone) => update({ badge: bundle.badge ? { ...bundle.badge, tone: tone as CampaignBadgeTone } : null })} />
              </> : null}
            </Section>

            <Section title="4. Banners" description="Um principal e até três secundários. A imagem do outro formato é usada como fallback quando necessário.">
              <View style={styles.addPositions}>
                {positions.map((position) => (
                  <Button key={position.value} variant="secondary" icon="add-outline" disabled={archived || bundle.placements.some((item) => item.position === position.value)} onPress={() => addPlacement(position.value)}>{position.label}</Button>
                ))}
              </View>
              {[...bundle.placements].sort((a, b) => a.sortOrder - b.sortOrder).map((placement) => (
                <PlacementEditor
                  key={placement.id}
                  placement={placement}
                  assets={bundle.assets}
                  disabled={archived}
                  uploading={uploading}
                  products={products}
                  categories={categories}
                  onChange={(changes) => updatePlacement(placement.id, changes)}
                  onAssetChange={updateAsset}
                  onChooseImage={(format) => void chooseImage(placement, format)}
                  onRemove={() => removePlacement(placement.id)}
                />
              ))}
            </Section>

            <Section title="5. Promoção de preço" description="O desconto nunca se acumula com outra campanha e o pedido ignora qualquer preço enviado pelo navegador.">
              <ChoiceRow options={[{ value: 'none', label: 'Sem promoção' }, { value: 'percentage', label: 'Percentual' }, { value: 'manual_price', label: 'Preço por produto' }]} value={priceMode} disabled={archived} onChange={(value) => setPriceMode(value as typeof priceMode)} />
              {priceMode === 'percentage' && bundle.priceRules[0] ? (
                <Field label="Desconto (%)" keyboardType="decimal-pad" value={String((bundle.priceRules[0].percentageBasisPoints ?? 0) / 100)} editable={!archived} onChangeText={(value) => updateRule(bundle.priceRules[0].id, { percentageBasisPoints: Math.round((Number(value.replace(',', '.')) || 0) * 100) })} />
              ) : null}
              {priceMode === 'manual_price' ? bundle.priceRules.map((rule) => {
                const product = products.find((item) => item.id === rule.productId);
                return <View key={rule.id} style={styles.manualRule}>
                  <View style={styles.ruleCopy}><Text style={styles.ruleName}>{product?.name ?? 'Produto'}</Text><Text style={styles.muted}>Preço normal: {formatCurrency(product?.originalPrice ?? product?.price ?? 0)}</Text></View>
                  <Field label="Preço promocional (R$)" keyboardType="decimal-pad" value={rule.promotionalPriceCents ? String(rule.promotionalPriceCents / 100).replace('.', ',') : ''} editable={!archived} onChangeText={(value) => updateRule(rule.id, { promotionalPriceCents: Math.round((Number(value.replace(',', '.')) || 0) * 100) })} style={styles.priceField} />
                </View>;
              }) : null}
            </Section>

            <Section title="6. Prévia" description="A prévia não publica e permite comparar os dois formatos.">
              <ChoiceRow options={[{ value: 'desktop', label: 'Computador' }, { value: 'mobile', label: 'Celular' }]} value={previewDesktop ? 'desktop' : 'mobile'} onChange={(value) => setPreviewDesktop(value === 'desktop')} />
              <View style={[styles.previewFrame, !previewDesktop && styles.previewMobile]}>
                <MarketingBanners campaigns={previewCampaign} desktop={previewDesktop} whatsappNumber={storeSettings.whatsappNumber} positions={positions.map((position) => position.value)} />
              </View>
            </Section>

            <View style={styles.actions}>
              {!archived ? <Button variant="secondary" loading={saving} onPress={() => void save()}>Salvar rascunho</Button> : null}
              {bundle.status === 'draft' ? <Button icon="cloud-upload-outline" loading={saving} onPress={() => void publish()}>Salvar e publicar</Button> : null}
              {bundle.status === 'published' ? <Button variant="secondary" icon="pause-outline" onPress={() => void changeStatus('paused')}>Pausar</Button> : null}
              {bundle.status === 'paused' ? <Button icon="play-outline" onPress={() => void changeStatus('published')}>Reativar</Button> : null}
              {!archived ? <Button variant="danger" icon="archive-outline" onPress={() => void changeStatus('archived')}>Arquivar</Button> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </AdminGuard>
  );
}

function Section({ title, description, children }: React.PropsWithChildren<{ title: string; description: string }>) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDescription}>{description}</Text><View style={styles.sectionFields}>{children}</View></View>;
}

function ChoiceRow({ options, value, disabled = false, onChange }: { options: { value: string; label: string }[]; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <View style={styles.choiceRow}>{options.map((option) => <ChoiceChip key={option.value} label={option.label} selected={value === option.value} disabled={disabled} onPress={() => onChange(option.value)} />)}</View>;
}

function ChipGrid({ children }: React.PropsWithChildren) { return <View style={styles.chipGrid}>{children}</View>; }

function ChoiceChip({ label, selected, disabled = false, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected, disabled && styles.disabled]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

function PlacementEditor({ placement, assets, disabled, uploading, products, categories, onChange, onAssetChange, onChooseImage, onRemove }: {
  placement: MarketingCampaignPlacement;
  assets: MarketingCampaignAsset[];
  disabled: boolean;
  uploading: boolean;
  products: ReturnType<typeof useStore>['products'];
  categories: ReturnType<typeof useStore>['categories'];
  onChange: (changes: Partial<MarketingCampaignPlacement>) => void;
  onAssetChange: (assetId: string, changes: Partial<MarketingCampaignAsset>) => void;
  onChooseImage: (format: 'desktop' | 'mobile') => void;
  onRemove: () => void;
}) {
  const position = positions.find((item) => item.value === placement.position)?.label ?? placement.position;
  return <View style={styles.placementCard}>
    <View style={styles.placementHeader}><Text style={styles.placementTitle}>{position}</Text><Button variant="ghost" disabled={disabled} onPress={onRemove}>Remover</Button></View>
    <Field label="Título" value={placement.title} editable={!disabled} onChangeText={(title) => onChange({ title })} />
    <Field label="Subtítulo" value={placement.subtitle} editable={!disabled} onChangeText={(subtitle) => onChange({ subtitle })} />
    <Field label="Texto do botão" value={placement.buttonLabel} editable={!disabled} onChangeText={(buttonLabel) => onChange({ buttonLabel })} />
    <View style={styles.imageActions}>
      <Button variant="secondary" loading={uploading} disabled={disabled} icon={placement.desktopAssetId ? 'checkmark-circle-outline' : 'image-outline'} onPress={() => onChooseImage('desktop')}>Imagem computador</Button>
      <Button variant="secondary" loading={uploading} disabled={disabled} icon={placement.mobileAssetId ? 'checkmark-circle-outline' : 'phone-portrait-outline'} onPress={() => onChooseImage('mobile')}>Imagem celular</Button>
    </View>
    <Text style={styles.imageHint}>Recomendação: computador 1600×700; celular 900×1200. O corte nunca deforma a imagem.</Text>
    {placement.desktopAssetId ? <AssetControls label="Ajuste da imagem do computador" asset={assets.find((asset) => asset.id === placement.desktopAssetId)} disabled={disabled} onChange={onAssetChange} /> : null}
    {placement.mobileAssetId ? <AssetControls label="Ajuste da imagem do celular" asset={assets.find((asset) => asset.id === placement.mobileAssetId)} disabled={disabled} onChange={onAssetChange} /> : null}
    <Text style={styles.fieldTitle}>Destino do botão</Text>
    <ChoiceRow options={destinationOptions} value={placement.destinationType} disabled={disabled} onChange={(value) => onChange(clearDestination(value as CampaignDestinationType))} />
    {placement.destinationType === 'product' ? <ChipGrid>{products.filter((product) => product.active).map((product) => <ChoiceChip key={product.id} label={product.name} selected={placement.destinationProductId === product.id} disabled={disabled} onPress={() => onChange({ destinationProductId: product.id })} />)}</ChipGrid> : null}
    {placement.destinationType === 'category' ? <ChipGrid>{categories.filter((category) => category.active).map((category) => <ChoiceChip key={category.slug} label={category.name} selected={placement.destinationCategorySlug === category.slug} disabled={disabled} onPress={() => onChange({ destinationCategorySlug: category.slug })} />)}</ChipGrid> : null}
    {placement.destinationType === 'search' ? <Field label="Texto da busca" value={placement.destinationSearch ?? ''} editable={!disabled} onChangeText={(destinationSearch) => onChange({ destinationSearch })} /> : null}
    {placement.destinationType === 'external' ? <Field label="Link externo HTTPS" placeholder="https://..." autoCapitalize="none" value={placement.destinationUrl ?? ''} editable={!disabled} onChangeText={(destinationUrl) => onChange({ destinationUrl })} /> : null}
  </View>;
}

function AssetControls({ label, asset, disabled, onChange }: { label: string; asset?: MarketingCampaignAsset; disabled: boolean; onChange: (assetId: string, changes: Partial<MarketingCampaignAsset>) => void }) {
  if (!asset) return null;
  return <View style={styles.assetControls}>
    <Text style={styles.assetTitle}>{label}</Text>
    <Text style={styles.muted}>{asset.width}×{asset.height} · {(asset.byteSize / 1_048_576).toFixed(2)} MB</Text>
    <Field label="Texto alternativo" maxLength={160} value={asset.altText} editable={!disabled} onChangeText={(altText) => onChange(asset.id, { altText })} />
    <View style={styles.threeColumns}>
      <Field label="Foco horizontal (%)" keyboardType="number-pad" value={String(Math.round(asset.focalX * 100))} editable={!disabled} onChangeText={(value) => onChange(asset.id, { focalX: clamp(Number(value) / 100, 0, 1) })} style={styles.smallField} />
      <Field label="Foco vertical (%)" keyboardType="number-pad" value={String(Math.round(asset.focalY * 100))} editable={!disabled} onChangeText={(value) => onChange(asset.id, { focalY: clamp(Number(value) / 100, 0, 1) })} style={styles.smallField} />
      <Field label="Zoom (1 a 2)" keyboardType="decimal-pad" value={String(asset.zoom).replace('.', ',')} editable={!disabled} onChangeText={(value) => onChange(asset.id, { zoom: clamp(Number(value.replace(',', '.')), 1, 2) })} style={styles.smallField} />
    </View>
  </View>;
}

function newTarget(campaignId: string, targetType: CampaignTargetType) {
  return { id: Crypto.randomUUID(), campaignId, targetType, productId: null, categorySlug: null, includeNewProducts: targetType === 'category', version: 1 };
}

function newPlacement(campaignId: string, position: CampaignPlacementPosition): MarketingCampaignPlacement {
  return { id: Crypto.randomUUID(), campaignId, position, title: '', subtitle: '', buttonLabel: '', desktopAssetId: null, mobileAssetId: null, destinationType: 'none', destinationProductId: null, destinationCategorySlug: null, destinationSearch: null, destinationUrl: null, sortOrder: positions.findIndex((item) => item.value === position), version: 1 };
}

function newPriceRule(campaignId: string, ruleType: 'percentage' | 'manual_price', productId: string | null): MarketingCampaignPriceRule {
  return { id: Crypto.randomUUID(), campaignId, productId, ruleType, percentageBasisPoints: ruleType === 'percentage' ? 1000 : null, promotionalPriceCents: null, version: 1 };
}

function clearDestination(destinationType: CampaignDestinationType): Partial<MarketingCampaignPlacement> {
  return { destinationType, destinationProductId: null, destinationCategorySlug: null, destinationSearch: null, destinationUrl: null };
}

function replacePlacementAsset(
  bundle: MarketingCampaignBundle,
  placementId: string,
  format: 'desktop' | 'mobile',
  asset: MarketingCampaignAsset,
) {
  const field = format === 'desktop' ? 'desktopAssetId' : 'mobileAssetId';
  const placements = bundle.placements.map((placement) =>
    placement.id === placementId ? { ...placement, [field]: asset.id } : placement,
  );
  const referenced = new Set(
    placements.flatMap((placement) => [placement.desktopAssetId, placement.mobileAssetId]).filter(Boolean),
  );
  return {
    placements,
    assets: [...bundle.assets.filter((current) => referenced.has(current.id)), asset],
  };
}

async function confirmPublication(checklist: { warnings: string[]; impact: Record<string, number | string | boolean> }) {
  const impact = checklist.impact;
  const summary = [
    `Produtos afetados: ${impact.products ?? 0}`,
    `Públicos configurados: ${impact.targets ?? 0}`,
    `Banners: ${impact.placements ?? 0}`,
    `Regras de preço: ${impact.priceRules ?? 0}`,
    `Sobreposições ambíguas: ${impact.overlaps ?? 0}`,
  ].join('\n');
  const warningCopy = checklist.warnings.length
    ? `\n\nAvisos:\n${checklist.warnings.join('\n\n')}`
    : '';
  const message = `${summary}${warningCopy}\n\nConfirme que revisou a prévia e deseja publicar.`;
  if (Platform.OS === 'web') return window.confirm(message);
  return new Promise<boolean>((resolve) => Alert.alert('Resumo da publicação', message, [{ text: 'Revisar', onPress: () => resolve(false) }, { text: 'Publicar', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}

async function confirmArchive() {
  if (Platform.OS === 'web') return window.confirm('Arquivar é definitivo. Deseja continuar?');
  return new Promise<boolean>((resolve) => Alert.alert('Arquivar campanha', 'Arquivar é definitivo. Deseja continuar?', [{ text: 'Cancelar', onPress: () => resolve(false) }, { text: 'Arquivar', style: 'destructive', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Tente novamente.'; }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum)); }

const badgeTones = [{ value: 'wine', label: 'Vinho' }, { value: 'caramel', label: 'Caramelo' }, { value: 'dark', label: 'Escuro' }, { value: 'success', label: 'Verde' }, { value: 'attention', label: 'Atenção' }];
const destinationOptions = [{ value: 'none', label: 'Sem link' }, { value: 'product', label: 'Produto' }, { value: 'category', label: 'Categoria' }, { value: 'campaign_products', label: 'Itens da campanha' }, { value: 'search', label: 'Busca' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'external', label: 'Link externo' }];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: spacing.lg, paddingBottom: 100, gap: spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  muted: { color: colors.textMuted, fontSize: 12 },
  section: { padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, backgroundColor: colors.surface, ...shadow },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 23, fontWeight: '700' },
  sectionDescription: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  sectionFields: { marginTop: spacing.lg, gap: spacing.lg },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  column: { minWidth: 240, flex: 1 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipGrid: { maxHeight: 260, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  choiceTextSelected: { color: colors.white },
  disabled: { opacity: 0.48 },
  addPositions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  placementCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: radii.medium, gap: spacing.md, backgroundColor: colors.surfaceWarm },
  placementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  placementTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imageHint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  assetControls: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, gap: spacing.md, backgroundColor: colors.surface },
  assetTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  threeColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  smallField: { minWidth: 150, flex: 1 },
  fieldTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  manualRule: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg },
  ruleCopy: { minWidth: 220, flex: 1, gap: spacing.xs },
  ruleName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  priceField: { minWidth: 180 },
  previewFrame: { width: '100%', overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium },
  previewMobile: { width: 390, maxWidth: '100%', alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.md },
});
