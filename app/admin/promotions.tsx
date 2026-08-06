import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import { loadAdminProductPromotions } from '@/src/features/marketing/service';
import type { ProductPromotion } from '@/src/features/marketing/types';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

type PromotionSituation = 'active' | 'scheduled' | 'ended' | 'inactive';

type PromotionListItem = {
  promotion: ProductPromotion;
  product: ReturnType<typeof useStore>['products'][number] | null;
  situation: PromotionSituation;
};

const situationLabels: Record<PromotionSituation, string> = {
  active: 'Ativa',
  scheduled: 'Agendada',
  ended: 'Encerrada',
  inactive: 'Inativa',
};

export default function PromotionsScreen() {
  const { products } = useStore();
  const [promotions, setPromotions] = useState<ProductPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPromotions = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setErrorMessage('');

    try {
      setPromotions(await loadAdminProductPromotions());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as promoções.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const items = useMemo<PromotionListItem[]>(() => {
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    return promotions.map((promotion) => ({
      promotion,
      product: productById.get(promotion.productId) ?? null,
      situation: getPromotionSituation(promotion),
    }));
  }, [products, promotions]);

  const counts = useMemo(
    () => ({
      active: items.filter((item) => item.situation === 'active').length,
      scheduled: items.filter((item) => item.situation === 'scheduled').length,
      ended: items.filter((item) => item.situation === 'ended').length,
      inactive: items.filter((item) => item.situation === 'inactive').length,
    }),
    [items],
  );

  function openNewPromotion() {
    router.push('/admin/promotion/new' as Href);
  }

  function openPromotion(productId: string) {
    router.push({
      pathname: '/admin/promotion/[id]',
      params: { id: productId },
    });
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Promoções" showBack showStoreHome />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPromotions(true)}
              tintColor={colors.primary}
            />
          }>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text style={styles.pageTitle}>Promoções de produtos</Text>
              <Text style={styles.pageSubtitle}>
                Crie descontos independentes de campanhas, com preço,
                período, selo e pré-visualização.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={openNewPromotion}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}>
              <Ionicons name="add-outline" size={21} color={colors.white} />
              <Text style={styles.primaryButtonText}>Nova promoção</Text>
            </Pressable>
          </View>

          <View style={styles.metrics}>
            <MetricCard icon="pricetag-outline" value={counts.active} label="Ativas" />
            <MetricCard icon="calendar-outline" value={counts.scheduled} label="Agendadas" />
            <MetricCard icon="time-outline" value={counts.ended} label="Encerradas" />
            <MetricCard icon="pause-circle-outline" value={counts.inactive} label="Inativas" />
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
              <View style={styles.errorCopy}>
                <Text style={styles.errorTitle}>Não foi possível carregar</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadPromotions()}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : loading ? (
            <EmptyState
              icon="hourglass-outline"
              title="Carregando promoções"
              message="Aguarde enquanto consultamos os dados salvos."
            />
          ) : items.length ? (
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Promoções cadastradas</Text>
                <Text style={styles.listSubtitle}>
                  {items.length} {items.length === 1 ? 'promoção cadastrada' : 'promoções cadastradas'}
                </Text>
              </View>

              {items.map((item) => (
                <PromotionRow
                  key={item.promotion.id}
                  item={item}
                  onPress={() => openPromotion(item.promotion.productId)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="pricetag-outline"
              title="Nenhuma promoção cadastrada"
              message="Crie uma promoção para reduzir o preço de um produto sem precisar criar banner ou campanha visual."
              actionLabel="Criar primeira promoção"
              onAction={openNewPromotion}
            />
          )}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

function MetricCard({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function PromotionRow({ item, onPress }: {
  item: PromotionListItem;
  onPress: () => void;
}) {
  const { promotion, product, situation } = item;
  const normalPrice = product?.originalPrice ?? product?.price ?? 0;
  const promotionalPrice = promotion.promotionalPriceCents / 100;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.promotionRow, pressed && styles.rowPressed]}>
      <View style={styles.productImageWrap}>
        {product?.imageUrls[0] ? (
          <ProductImage
            uri={product.imageUrls[0]}
            contentFit="cover"
            style={styles.productImage}
          />
        ) : (
          <Ionicons name="bag-handle-outline" size={23} color={colors.primary} />
        )}
      </View>

      <View style={styles.promotionCopy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.productName}>
            {product?.name ?? 'Produto não encontrado'}
          </Text>
          <SituationBadge situation={situation} />
        </View>

        <View style={styles.priceRow}>
          {normalPrice > promotionalPrice ? (
            <Text style={styles.normalPrice}>{formatCurrency(normalPrice)}</Text>
          ) : null}
          <Text style={styles.promotionalPrice}>{formatCurrency(promotionalPrice)}</Text>
        </View>

        <Text numberOfLines={2} style={styles.promotionMeta}>
          {formatPeriod(promotion.startAt, promotion.endAt)} · Selo:{' '}
          {promotion.showBadge ? promotion.badgeLabel : 'Desativado'}
        </Text>
      </View>

      <View style={styles.rowAction}>
        <Ionicons name="create-outline" size={19} color={colors.primary} />
        <Ionicons name="chevron-forward-outline" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function SituationBadge({ situation }: { situation: PromotionSituation }) {
  return (
    <View style={[
      styles.situationBadge,
      situation === 'active' && styles.situationBadgeActive,
      situation === 'scheduled' && styles.situationBadgeScheduled,
      situation === 'ended' && styles.situationBadgeEnded,
      situation === 'inactive' && styles.situationBadgeInactive,
    ]}>
      <Text style={[
        styles.situationText,
        situation === 'active' && styles.situationTextActive,
        situation === 'scheduled' && styles.situationTextScheduled,
        situation === 'ended' && styles.situationTextEnded,
        situation === 'inactive' && styles.situationTextInactive,
      ]}>
        {situationLabels[situation]}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={38} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getPromotionSituation(promotion: ProductPromotion): PromotionSituation {
  if (!promotion.enabled) return 'inactive';
  const now = Date.now();
  const start = promotion.startAt ? Date.parse(promotion.startAt) : null;
  const end = promotion.endAt ? Date.parse(promotion.endAt) : null;
  if (start !== null && start > now) return 'scheduled';
  if (end !== null && end < now) return 'ended';
  return 'active';
}

function formatPeriod(startAt: string | null, endAt: string | null) {
  if (!startAt && !endAt) return 'Sem período definido';
  if (startAt && endAt) return `${formatDate(startAt)} até ${formatDate(endAt)}`;
  if (startAt) return `A partir de ${formatDate(startAt)}`;
  return `Até ${formatDate(endAt as string)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Maceio',
  }).format(date);
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1180,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  pageHeaderCopy: { minWidth: 260, flex: 1 },
  pageTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700',
  },
  pageSubtitle: {
    marginTop: spacing.xs,
    maxWidth: 700,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricCard: {
    minWidth: 210,
    minHeight: 82,
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    ...shadow,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '900' },
  metricLabel: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
  listCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    ...shadow,
  },
  listHeader: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  listTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  listSubtitle: { marginTop: 3, color: colors.textMuted, fontSize: 11 },
  promotionRow: {
    minHeight: 112,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceWarm },
  productImageWrap: {
    width: 58,
    height: 58,
    overflow: 'hidden',
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  productImage: { width: '100%', height: '100%' },
  promotionCopy: { minWidth: 0, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  productName: { maxWidth: '72%', color: colors.text, fontSize: 14, fontWeight: '900' },
  priceRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  normalPrice: { color: colors.textMuted, fontSize: 11, textDecorationLine: 'line-through' },
  promotionalPrice: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  promotionMeta: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  rowAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  situationBadge: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill },
  situationBadgeActive: { backgroundColor: colors.successSoft },
  situationBadgeScheduled: { backgroundColor: colors.warningSoft },
  situationBadgeEnded: { backgroundColor: colors.surfaceWarm },
  situationBadgeInactive: { backgroundColor: colors.dangerSoft },
  situationText: { fontSize: 9, fontWeight: '900' },
  situationTextActive: { color: colors.success },
  situationTextScheduled: { color: colors.warning },
  situationTextEnded: { color: colors.textMuted },
  situationTextInactive: { color: colors.danger },
  emptyCard: {
    minHeight: 285,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  emptyTitle: { marginTop: spacing.lg, color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  emptyText: { maxWidth: 520, marginTop: spacing.sm, color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyButton: { minHeight: 44, marginTop: spacing.lg, paddingHorizontal: spacing.xl, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  emptyButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  errorCard: { minHeight: 90, padding: spacing.lg, borderWidth: 1, borderColor: colors.danger, borderRadius: radii.medium, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, backgroundColor: colors.dangerSoft },
  errorCopy: { minWidth: 220, flex: 1 },
  errorTitle: { color: colors.danger, fontSize: 13, fontWeight: '900' },
  errorText: { marginTop: 3, color: colors.textMuted, fontSize: 11 },
  retryButton: { minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  retryButtonText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});