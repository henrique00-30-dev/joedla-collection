import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import {
  type PromotionBadgePosition,
  type PromotionBadgeShape,
  type PromotionBadgeSize,
  type PromotionPreviewMode,
} from '@/src/components/admin/promotion-preview';
import { PromotionBadgeSection } from '@/src/components/admin/promotion/promotion-badge-section';
import { PromotionEditorActions } from '@/src/components/admin/promotion/promotion-editor-actions';
import { PromotionEditorHeader } from '@/src/components/admin/promotion/promotion-editor-header';
import { PromotionPeriodSection } from '@/src/components/admin/promotion/promotion-period-section';
import { PromotionPreviewPanel } from '@/src/components/admin/promotion/promotion-preview-panel';
import { PromotionPriceSection } from '@/src/components/admin/promotion/promotion-price-section';
import { PromotionProductSection } from '@/src/components/admin/promotion/promotion-product-section';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import {
  loadAdminProductPromotion,
  saveProductPromotion,
} from '@/src/features/marketing/service';
import { CampaignBadgeTone } from '@/src/features/marketing/types';
import { usePromotionCalculations } from '@/src/features/promotions/editor/hooks/use-promotion-calculations';
import { spacing } from '@/src/theme';
import {
  formatBrlInput,
  isoToMaceioFields,
  isValidBrazilDate,
  maceioDateTimeToIso,
  normalizePlainText,
  parseBrlCents,
  validatePlainText,
} from '@/src/utils/fields';

const BADGE_TONES: {
  value: CampaignBadgeTone;
  label: string;
  color: string;
}[] = [
  { value: 'wine', label: 'Vinho', color: '#6F243A' },
  { value: 'caramel', label: 'Caramelo', color: '#A66A3F' },
  { value: 'dark', label: 'Escuro', color: '#2C2522' },
  { value: 'success', label: 'Verde', color: '#2D6A4F' },
  { value: 'attention', label: 'Atenção', color: '#A44A1F' },
];

type EditorSection = 'product' | 'price' | 'period' | 'badge';

export default function PromotionEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, refreshStore } = useStore();

  const isNew = !id || id === 'new';

  const [selectedProductId, setSelectedProductId] = useState(
    isNew ? '' : id,
  );
  const [enabled, setEnabled] = useState(true);
  const [promotionalPrice, setPromotionalPrice] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showBadge, setShowBadge] = useState(true);
  const [badgeLabel, setBadgeLabel] = useState('Promoção');
  const [badgeTone, setBadgeTone] =
    useState<CampaignBadgeTone>('wine');
  const [badgePosition, setBadgePosition] =
    useState<PromotionBadgePosition>('top-left');
  const [badgeSize, setBadgeSize] =
    useState<PromotionBadgeSize>('medium');
  const [badgeShape, setBadgeShape] =
    useState<PromotionBadgeShape>('pill');
  const [version, setVersion] = useState<number | null>(null);
  const [loadingPromotion, setLoadingPromotion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewMode, setPreviewMode] =
    useState<PromotionPreviewMode>('home');
  const [openSections, setOpenSections] = useState<
    Record<EditorSection, boolean>
  >({
    product: isNew,
    price: true,
    period: false,
    badge: false,
  });

  const savingRef = useRef(false);
  const priceRef = useRef<TextInput>(null);
  const startDateRef = useRef<TextInput>(null);
  const endDateRef = useRef<TextInput>(null);
  const badgeLabelRef = useRef<TextInput>(null);

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => product.id === selectedProductId,
      ),
    [products, selectedProductId],
  );

  const originalPrice =
    selectedProduct?.originalPrice ?? selectedProduct?.price ?? 0;

  const {
    promotionalPriceCents,
    previewPrice,
    discountPercentage,
    calculateDiscountFromPrice,
    calculatePriceFromDiscount,
  } = usePromotionCalculations({
    originalPrice,
    promotionalPrice,
  });

  const selectedTone =
    BADGE_TONES.find((tone) => tone.value === badgeTone) ??
    BADGE_TONES[0];

  useEffect(() => {
    if (isNew || !selectedProductId) return;

    let active = true;
    setLoadingPromotion(true);

    void loadAdminProductPromotion(selectedProductId)
      .then((promotion) => {
        if (!active || !promotion) return;

        setEnabled(promotion.enabled);
        setPromotionalPrice(
          formatBrlInput(promotion.promotionalPriceCents),
        );

        const product = products.find(
          (candidate) => candidate.id === selectedProductId,
        );
        const productOriginalPrice =
          product?.originalPrice ?? product?.price ?? 0;

        setDiscountInput(
          productOriginalPrice > 0 &&
          promotion.promotionalPriceCents <
            Math.round(productOriginalPrice * 100)
            ? String(
                Math.round(
                  ((productOriginalPrice * 100 -
                    promotion.promotionalPriceCents) /
                    (productOriginalPrice * 100)) *
                    100,
                ),
              )
            : '',
        );

        setStartDate(isoToMaceioFields(promotion.startAt).date);
        setEndDate(isoToMaceioFields(promotion.endAt).date);
        setShowBadge(promotion.showBadge);
        setBadgeLabel(promotion.badgeLabel);
        setBadgeTone(promotion.badgeTone);
        setVersion(promotion.version);
      })
      .catch((error) => {
        Alert.alert(
          'Não foi possível carregar a promoção',
          error instanceof Error
            ? error.message
            : 'Tente novamente.',
        );
      })
      .finally(() => {
        if (active) setLoadingPromotion(false);
      });

    return () => {
      active = false;
    };
  }, [isNew, products, selectedProductId]);

  function toggleSection(section: EditorSection) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setErrors((current) => ({
      ...current,
      product: '',
    }));

    if (productId !== id) {
      setVersion(null);
      setEnabled(true);
      setPromotionalPrice('');
      setDiscountInput('');
      setStartDate('');
      setEndDate('');
      setShowBadge(true);
      setBadgeLabel('Promoção');
      setBadgeTone('wine');
      setBadgePosition('top-left');
      setBadgeSize('medium');
      setBadgeShape('pill');
    }
  }

  function handlePromotionalPriceChange(value: string) {
    setPromotionalPrice(value);
    setDiscountInput(calculateDiscountFromPrice(value));

    if (errors.promotionalPrice) {
      setErrors((current) => ({
        ...current,
        promotionalPrice: '',
      }));
    }
  }

  function handleDiscountChange(value: string) {
    const calculated = calculatePriceFromDiscount(value);

    setDiscountInput(calculated.discountInput);

    if (calculated.promotionalPrice) {
      setPromotionalPrice(calculated.promotionalPrice);
    }

    if (errors.promotionalPrice) {
      setErrors((current) => ({
        ...current,
        promotionalPrice: '',
      }));
    }
  }

  async function handleSave() {
    if (savingRef.current) return;

    const nextErrors: Record<string, string> = {};
    const priceCents = parseBrlCents(promotionalPrice);

    if (!selectedProduct) {
      nextErrors.product = 'Escolha um produto.';
    }

    if (priceCents === null || priceCents <= 0) {
      nextErrors.promotionalPrice =
        'Informe um preço promocional maior que zero.';
    } else if (
      selectedProduct &&
      priceCents >= Math.round(originalPrice * 100)
    ) {
      nextErrors.promotionalPrice =
        'O preço promocional deve ser menor que o preço normal.';
    }

    if (startDate && !isValidBrazilDate(startDate)) {
      nextErrors.startDate =
        'Informe uma data válida no formato dia/mês/ano.';
    }

    if (endDate && !isValidBrazilDate(endDate)) {
      nextErrors.endDate =
        'Informe uma data válida no formato dia/mês/ano.';
    }

    const badgeError = validatePlainText(badgeLabel, {
      minimum: 1,
      maximum: 24,
    });

    if (showBadge && badgeError) {
      nextErrors.badgeLabel = badgeError;
    }

    const startAt = startDate
      ? maceioDateTimeToIso(startDate, '00:00', 'start')
      : null;

    const endAt = endDate
      ? maceioDateTimeToIso(endDate, '23:59', 'end')
      : null;

    if (
      startAt &&
      endAt &&
      Date.parse(endAt) <= Date.parse(startAt)
    ) {
      nextErrors.endDate =
        'A data final deve ser posterior à data inicial.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      if (nextErrors.product) {
        setOpenSections((current) => ({
          ...current,
          product: true,
        }));
      } else if (nextErrors.promotionalPrice) {
        setOpenSections((current) => ({
          ...current,
          price: true,
        }));
        requestAnimationFrame(() => priceRef.current?.focus());
      } else if (nextErrors.startDate) {
        setOpenSections((current) => ({
          ...current,
          period: true,
        }));
        requestAnimationFrame(() => startDateRef.current?.focus());
      } else if (nextErrors.endDate) {
        setOpenSections((current) => ({
          ...current,
          period: true,
        }));
        requestAnimationFrame(() => endDateRef.current?.focus());
      } else if (nextErrors.badgeLabel) {
        setOpenSections((current) => ({
          ...current,
          badge: true,
        }));
        requestAnimationFrame(() => badgeLabelRef.current?.focus());
      }

      return;
    }

    if (!selectedProduct || priceCents === null) return;

    savingRef.current = true;
    setSaving(true);

    try {
      await saveProductPromotion(selectedProduct.id, version, {
        enabled,
        promotionalPriceCents: priceCents,
        startAt,
        endAt,
        showBadge,
        badgeLabel:
          normalizePlainText(badgeLabel) || 'Promoção',
        badgeTone,
        badgePosition,
badgeSize,
badgeShape,
      });

      await refreshStore();

      Alert.alert(
        'Promoção salva',
        'A promoção foi atualizada e já pode aparecer na loja.',
      );

      router.replace('/admin/promotions' as never);
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );

      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader
          compact
          title={isNew ? 'Nova promoção' : 'Editar promoção'}
          showBack
          showStoreHome
        />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <PromotionEditorHeader
            isNew={isNew}
            enabled={enabled}
            onEnabledChange={setEnabled}
          />

          <View style={styles.editorLayout}>
            <View style={styles.formColumn}>
              <PromotionProductSection
                open={openSections.product}
                onToggle={() => toggleSection('product')}
                isNew={isNew}
                products={products}
                selectedProduct={selectedProduct}
                selectedProductId={selectedProductId}
                originalPrice={originalPrice}
                error={errors.product}
                onSelectProduct={selectProduct}
              />

              <PromotionPriceSection
                open={openSections.price}
                onToggle={() => toggleSection('price')}
                hasSelectedProduct={Boolean(selectedProduct)}
                originalPrice={originalPrice}
                promotionalPrice={promotionalPrice}
                discountInput={discountInput}
                discountPercentage={discountPercentage}
                error={errors.promotionalPrice}
                priceRef={priceRef}
                onPromotionalPriceChange={
                  handlePromotionalPriceChange
                }
                onDiscountChange={handleDiscountChange}
              />

              <PromotionPeriodSection
                open={openSections.period}
                onToggle={() => toggleSection('period')}
                startDate={startDate}
                endDate={endDate}
                startDateError={errors.startDate}
                endDateError={errors.endDate}
                startDateRef={startDateRef}
                endDateRef={endDateRef}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />

              <PromotionBadgeSection
                open={openSections.badge}
                onToggle={() => toggleSection('badge')}
                showBadge={showBadge}
                badgeLabel={badgeLabel}
                badgeTone={badgeTone}
                badgePosition={badgePosition}
                badgeSize={badgeSize}
                badgeShape={badgeShape}
                error={errors.badgeLabel}
                badgeLabelRef={badgeLabelRef}
                onShowBadgeChange={setShowBadge}
                onBadgeLabelChange={setBadgeLabel}
                onBadgeToneChange={setBadgeTone}
                onBadgePositionChange={setBadgePosition}
                onBadgeSizeChange={setBadgeSize}
                onBadgeShapeChange={setBadgeShape}
              />
            </View>

            <PromotionPreviewPanel
              mode={previewMode}
              onChangeMode={setPreviewMode}
              enabled={enabled}
              productName={
                selectedProduct?.name ?? 'Selecione um produto'
              }
              imageUri={selectedProduct?.imageUrls[0] ?? ''}
              originalPrice={originalPrice}
              promotionalPrice={previewPrice}
              discountPercentage={discountPercentage}
              showBadge={showBadge}
              badgeLabel={badgeLabel}
              badgeColor={selectedTone.color}
              badgePosition={badgePosition}
              badgeSize={badgeSize}
              badgeShape={badgeShape}
            />
          </View>

          <PromotionEditorActions
            saving={saving}
            loading={loadingPromotion}
            onCancel={() =>
              router.replace('/admin/promotions' as never)
            }
            onSave={() => void handleSave()}
          />
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 100,
    gap: spacing.xl,
  },

  editorLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },

  formColumn: {
    minWidth: 320,
    flex: 1.45,
    gap: spacing.lg,
  },

});