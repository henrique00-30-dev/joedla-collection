import { Href, router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbarButton,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { ProductImage } from '@/src/components/product-image';
import { useStore } from '@/src/context/store-context';
import { loadAdminProductPromotions } from '@/src/features/marketing/service';
import type { ProductPromotion } from '@/src/features/marketing/types';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

type StoreProduct =
  ReturnType<typeof useStore>['products'][number];

type PromotionSituation =
  | 'active'
  | 'scheduled'
  | 'ended'
  | 'inactive';

type PromotionListItem = {
  promotion: ProductPromotion;
  product: StoreProduct | null;
  situation: PromotionSituation;
};

const situationLabels: Record<
  PromotionSituation,
  string
> = {
  active: 'Ativa',
  scheduled: 'Agendada',
  ended: 'Encerrada',
  inactive: 'Inativa',
};

export default function PromotionsScreen() {
  const { products } = useStore();

  const [promotions, setPromotions] = useState<
    ProductPromotion[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState('');

  const loadPromotions = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      setErrorMessage('');

      try {
        const loadedPromotions =
          await loadAdminProductPromotions();

        setPromotions(loadedPromotions);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as promoções.',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPromotions();
    }, [loadPromotions]),
  );

  const items = useMemo<PromotionListItem[]>(
    () => {
      const productById = new Map(
        products.map((product) => [
          product.id,
          product,
        ]),
      );

      return promotions.map((promotion) => ({
        promotion,
        product:
          productById.get(
            promotion.productId,
          ) ?? null,
        situation:
          getPromotionSituation(promotion),
      }));
    },
    [products, promotions],
  );

  const counts = useMemo(
    () => ({
      total: items.length,

      active: items.filter(
        (item) =>
          item.situation === 'active',
      ).length,

      scheduled: items.filter(
        (item) =>
          item.situation === 'scheduled',
      ).length,

      ended: items.filter(
        (item) =>
          item.situation === 'ended',
      ).length,

      inactive: items.filter(
        (item) =>
          item.situation === 'inactive',
      ).length,
    }),
    [items],
  );

  function openNewPromotion() {
    router.push(
      '/admin/promotion/new' as Href,
    );
  }

  function openPromotion(
    item: PromotionListItem,
  ) {
    router.push({
      pathname: '/admin/promotion/[id]',
      params: {
        id: item.promotion.productId,
      },
    });
  }

  const columns = useMemo<
    AdminTableColumn<PromotionListItem>[]
  >(
    () => [
      {
        key: 'product',
        label: 'Produto',
        minWidth: 250,
        flex: 1,
        render: (item) => (
          <View style={styles.productCell}>
            <View style={styles.imageWrap}>
              {item.product?.imageUrls[0] ? (
                <ProductImage
                  uri={
                    item.product
                      .imageUrls[0]
                  }
                  contentFit="cover"
                  style={styles.productImage}
                />
              ) : (
                <Text
                  style={
                    styles.imagePlaceholder
                  }>
                  Sem foto
                </Text>
              )}
            </View>

            <View style={styles.productCopy}>
              <AdminTableText bold>
                {item.product?.name ??
                  'Produto não encontrado'}
              </AdminTableText>

              <AdminTableText muted>
                {item.promotion.showBadge
                  ? `Selo: ${item.promotion.badgeLabel}`
                  : 'Selo desativado'}
              </AdminTableText>
            </View>
          </View>
        ),
      },
      {
        key: 'price',
        label: 'Preço promocional',
        width: 155,
        align: 'right',
        render: (item) => {
          const normalPrice =
            item.product?.originalPrice ??
            item.product?.price ??
            0;

          const promotionalPrice =
            item.promotion
              .promotionalPriceCents /
            100;

          return (
            <View style={styles.priceCell}>
              {normalPrice >
              promotionalPrice ? (
                <Text
                  style={
                    styles.normalPrice
                  }>
                  {formatCurrency(
                    normalPrice,
                  )}
                </Text>
              ) : null}

              <Text
                style={
                  styles.promotionalPrice
                }>
                {formatCurrency(
                  promotionalPrice,
                )}
              </Text>
            </View>
          );
        },
      },
      {
        key: 'period',
        label: 'Período',
        minWidth: 190,
        render: (item) => (
          <AdminTableText
            numberOfLines={2}>
            {formatPeriod(
              item.promotion.startAt,
              item.promotion.endAt,
            )}
          </AdminTableText>
        ),
      },
      {
        key: 'status',
        label: 'Situação',
        width: 125,
        align: 'center',
        render: (item) => (
          <AdminTableBadge
            label={
              situationLabels[
                item.situation
              ]
            }
            tone={getSituationTone(
              item.situation,
            )}
          />
        ),
      },
    ],
    [],
  );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Gestão de loja"
        title="Promoções"
        description="Crie descontos individuais para produtos, com preço, período e selo promocional."
        actions={
          <>
            <AdminToolbarButton
              label="Atualizar"
              icon="refresh-outline"
              disabled={loading}
              onPress={() =>
                void loadPromotions()
              }
            />

            <AdminToolbarButton
              label="Nova promoção"
              icon="add"
              variant="primary"
              onPress={openNewPromotion}
            />
          </>
        }>
        <View style={styles.metrics}>
          <AdminStatCard
            compact
            icon="pricetags-outline"
            label="Promoções"
            value={String(counts.total)}
            helper="Total cadastrado"
          />

          <AdminStatCard
            compact
            icon="checkmark-circle-outline"
            label="Ativas"
            value={String(counts.active)}
            helper="Disponíveis na loja"
            tone="success"
          />

          <AdminStatCard
            compact
            icon="calendar-outline"
            label="Agendadas"
            value={String(
              counts.scheduled,
            )}
            helper="Início programado"
            tone="warning"
          />

          <AdminStatCard
            compact
            icon="pause-circle-outline"
            label="Inativas ou encerradas"
            value={String(
              counts.inactive +
                counts.ended,
            )}
            helper={`${counts.ended} encerrada(s)`}
            tone={
              counts.inactive +
                counts.ended >
              0
                ? 'info'
                : 'success'
            }
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorCopy}>
              <Text
                style={styles.errorTitle}>
                Não foi possível carregar
              </Text>

              <Text
                style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void loadPromotions()
              }
              style={({ pressed }) => [
                styles.retryButton,
                pressed &&
                  styles.pressed,
              ]}>
              <Text
                style={
                  styles.retryButtonText
                }>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : null}

        <AdminSection
          title="Promoções cadastradas"
          description={`${items.length} ${
            items.length === 1
              ? 'promoção cadastrada'
              : 'promoções cadastradas'
          }`}>
          <AdminTable
            columns={columns}
            data={items}
            loading={loading}
            keyExtractor={(item) =>
              item.promotion.id
            }
            onPressRow={openPromotion}
            emptyIcon="pricetag-outline"
            emptyTitle="Nenhuma promoção cadastrada"
            emptyDescription="Crie uma promoção para reduzir o preço de um produto sem precisar criar uma campanha visual."
          />

          {!loading &&
          !errorMessage &&
          !items.length ? (
            <View style={styles.emptyAction}>
              <AdminToolbarButton
                label="Criar primeira promoção"
                icon="add"
                variant="primary"
                onPress={
                  openNewPromotion
                }
              />
            </View>
          ) : null}
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function getPromotionSituation(
  promotion: ProductPromotion,
): PromotionSituation {
  if (!promotion.enabled) {
    return 'inactive';
  }

  const now = Date.now();

  const start = promotion.startAt
    ? Date.parse(promotion.startAt)
    : null;

  const end = promotion.endAt
    ? Date.parse(promotion.endAt)
    : null;

  if (
    start !== null &&
    start > now
  ) {
    return 'scheduled';
  }

  if (end !== null && end < now) {
    return 'ended';
  }

  return 'active';
}

function getSituationTone(
  situation: PromotionSituation,
):
  | 'success'
  | 'warning'
  | 'danger'
  | 'info' {
  if (situation === 'active') {
    return 'success';
  }

  if (situation === 'scheduled') {
    return 'warning';
  }

  if (situation === 'inactive') {
    return 'danger';
  }

  return 'info';
}

function formatPeriod(
  startAt: string | null,
  endAt: string | null,
) {
  if (!startAt && !endAt) {
    return 'Sem período definido';
  }

  if (startAt && endAt) {
    return `${formatPromotionDate(
      startAt,
    )} até ${formatPromotionDate(
      endAt,
    )}`;
  }

  if (startAt) {
    return `A partir de ${formatPromotionDate(
      startAt,
    )}`;
  }

  return `Até ${formatPromotionDate(
    endAt as string,
  )}`;
}

function formatPromotionDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone: 'America/Maceio',
    },
  ).format(date);
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  productCell: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  imageWrap: {
    width: 48,
    height: 54,
    overflow: 'hidden',
    borderRadius: radii.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3ECE5',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    paddingHorizontal: 4,
    color: colors.textMuted,
    fontSize: 7,
    textAlign: 'center',
  },

  productCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },

  priceCell: {
    alignItems: 'flex-end',
  },

  normalPrice: {
    marginBottom: 2,
    color: colors.textMuted,
    fontSize: 8,
    textDecorationLine:
      'line-through',
  },

  promotionalPrice: {
    color: '#9D5F1D',
    fontSize: 12,
    fontWeight: '900',
  },

  errorCard: {
    minHeight: 72,
    padding: spacing.md,
    borderWidth: 1,
    borderColor:
      'rgba(188,72,72,0.32)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor:
      colors.dangerSoft,
  },

  errorCopy: {
    minWidth: 220,
    flex: 1,
  },

  errorTitle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
  },

  errorText: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
  },

  retryButton: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor:
      'rgba(188,72,72,0.25)',
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFC',
  },

  retryButtonText: {
    color: colors.danger,
    fontSize: 9,
    fontWeight: '900',
  },

  emptyAction: {
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.65,
  },
});