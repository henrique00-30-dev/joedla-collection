import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AnnouncementTicker } from '@/src/components/announcement-ticker';
import { AppHeader } from '@/src/components/app-header';
import { BenefitsStrip } from '@/src/components/home/benefits-strip';
import { CategoryTile } from '@/src/components/category-tile';
import { HeroBannerPremium } from '@/src/components/home/hero-banner-premium';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { SectionHeader } from '@/src/components/section-header';
import { StoreFooter } from '@/src/components/store-footer';
import { useStore } from '@/src/context/store-context';
import {
  activePlacements,
  marketingDestination,
} from '@/src/features/marketing/storefront';
import type {
  MarketingCampaignAsset,
  MarketingCampaignBundle,
  MarketingCampaignPlacement,
} from '@/src/features/marketing/types';
import { colors, spacing } from '@/src/theme';

type CarouselItem =
  | {
      kind: 'fixed' | 'banner';
      id: string;
      title: string;
      subtitle: string;
      imageUrl: string;
      buttonLabel: string;
      destination: string;
    }
  | {
      kind: 'campaign';
      id: string;
      title: string;
      subtitle: string;
      imageUrl: string;
      buttonLabel: string;
      destination: string;
    };

export default function HomeScreen() {
  const {
    products,
    categories,
    settings,
    marketing,
    loading,
    refreshStore,
  } = useStore();

  const { search } =
    useLocalSearchParams<{ search?: string }>();

  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] =
    useState(false);
  const [
    currentBannerIndex,
    setCurrentBannerIndex,
  ] = useState(0);

  useEffect(() => {
    if (typeof search === 'string') {
      setQuery(search);
    }
  }, [search]);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.hostname.startsWith(
        'painel.',
      )
    ) {
      window.location.replace('/admin/login');
    }
  }, []);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) => product.active,
      ),
    [products],
  );

  const featured = useMemo(
    () =>
      visibleProducts
        .filter(
          (product) => product.featured,
        )
        .slice(0, 6),
    [visibleProducts],
  );

  const searchResults = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase('pt-BR');

    if (!normalized) return [];

    return visibleProducts.filter(
      (product) =>
        product.name
          .toLocaleLowerCase('pt-BR')
          .includes(normalized) ||
        product.description
          .toLocaleLowerCase('pt-BR')
          .includes(normalized),
    );
  }, [query, visibleProducts]);

  const carouselItems =
    useMemo<CarouselItem[]>(() => {
      const items: CarouselItem[] = [];

      // POSIÇÃO 1: sempre é o banner principal editável.
      if (
        settings.bannerTitle.trim() ||
        settings.bannerImageUrl.trim()
      ) {
        items.push({
          kind: 'fixed',
          id: 'fixed-main-banner',
          title: settings.bannerTitle,
          subtitle: settings.bannerSubtitle,
          imageUrl: settings.bannerImageUrl,
          buttonLabel:
            settings.bannerButtonLabel,
          destination: settings.bannerLink,
        });
      }

      // CAMPANHAS ATIVAS ocupam primeiro as posições 2 a 4.
      if (marketing.settings.enabled) {
        const campaignEntries =
          activePlacements(
            marketing.campaigns,
          )
            .filter(({ placement }) =>
              [
                'home_hero',
                'home_secondary_1',
                'home_secondary_2',
                'home_secondary_3',
              ].includes(
                placement.position,
              ),
            )
            .map(
              ({
                campaign,
                placement,
              }) =>
                campaignToCarouselItem(
                  campaign,
                  placement,
                  desktop,
                  settings.whatsappNumber,
                ),
            )
            .filter(
              (
                item,
              ): item is CarouselItem =>
                item !== null,
            );

        items.push(
          ...campaignEntries.slice(0, 3),
        );
      }

      const today =
        new Date().toISOString().slice(0, 10);

      const regularBanners =
        settings.banners
          .filter((banner) => banner.active)
          .filter(
            (banner) =>
              !banner.startAt ||
              today >= banner.startAt,
          )
          .filter(
            (banner) =>
              !banner.endAt ||
              today <= banner.endAt,
          )
          .sort(
            (first, second) =>
              first.order - second.order,
          )
          .map<CarouselItem>((banner) => ({
            kind: 'banner',
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle,
            imageUrl: banner.imageUrl,
            buttonLabel:
              banner.buttonLabel,
            destination: banner.link,
          }));

      // Completa as posições restantes até o máximo de 4.
      const remaining =
        Math.max(0, 4 - items.length);

      items.push(
        ...regularBanners.slice(
          0,
          remaining,
        ),
      );

      return items.slice(0, 4);
    }, [
      desktop,
      marketing.campaigns,
      marketing.settings.enabled,
      settings.bannerButtonLabel,
      settings.bannerImageUrl,
      settings.bannerLink,
      settings.bannerSubtitle,
      settings.bannerTitle,
      settings.banners,
      settings.whatsappNumber,
    ]);

  useEffect(() => {
    if (carouselItems.length <= 1) {
      setCurrentBannerIndex(0);
      return;
    }

    if (
      currentBannerIndex >=
      carouselItems.length
    ) {
      setCurrentBannerIndex(0);
    }
  }, [
    carouselItems.length,
    currentBannerIndex,
  ]);

  useEffect(() => {
    if (carouselItems.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentBannerIndex((current) =>
        current + 1 >=
        carouselItems.length
          ? 0
          : current + 1,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselItems.length]);

  const currentBanner =
    carouselItems[currentBannerIndex] ??
    carouselItems[0] ??
    null;

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await refreshStore();
    } catch {
      Alert.alert(
        'Não foi possível atualizar',
        'Confira a internet e tente novamente. O catálogo salvo continuará disponível.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  function openBannerDestination() {
    const destination =
      currentBanner?.destination.trim() ??
      '';

    if (!destination) return;

    if (
      Platform.OS === 'web' &&
      (destination.startsWith(
        'http://',
      ) ||
        destination.startsWith(
          'https://',
        ))
    ) {
      window.open(
        destination,
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }

    router.push(destination as never);
  }

  function showPreviousBanner() {
    if (carouselItems.length <= 1) {
      return;
    }

    setCurrentBannerIndex((current) =>
      current - 1 < 0
        ? carouselItems.length - 1
        : current - 1,
    );
  }

  function showNextBanner() {
    if (carouselItems.length <= 1) {
      return;
    }

    setCurrentBannerIndex((current) =>
      current + 1 >=
      carouselItems.length
        ? 0
        : current + 1,
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={
          desktop ? [0] : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator>
        <AppHeader />

        <View
          style={[
            styles.pageWidth,
            styles.horizontalPadding,
            styles.searchArea,
          ]}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {query.trim() ? (
          <View
            style={[
              styles.pageWidth,
              styles.section,
            ]}>
            <SectionHeader
              title={`Resultados (${searchResults.length})`}
            />

            <ProductGrid
              products={searchResults}
            />

            {!searchResults.length ? (
              <Text
                style={styles.noResults}>
                Nenhum produto encontrado.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <AnnouncementTicker
              messages={
                settings.tickerMessages
              }
            />

            {currentBanner ? (
              <View
                style={[
                  styles.pageWidth,
                  styles.horizontalPadding,
                  styles.heroArea,
                ]}>
                <HeroBannerPremium
                  title={currentBanner.title}
                  subtitle={
                    currentBanner.subtitle
                  }
                  imageUrl={
                    currentBanner.imageUrl
                  }
                  buttonLabel={
                    currentBanner.buttonLabel
                  }
                  showButton={Boolean(
                    currentBanner.buttonLabel.trim() &&
                      currentBanner.destination.trim(),
                  )}
                  showNavigation={
                    carouselItems.length > 1
                  }
                  currentIndex={
                    currentBannerIndex
                  }
                  totalItems={
                    carouselItems.length
                  }
                  onPress={
                    openBannerDestination
                  }
                  onPrevious={
                    showPreviousBanner
                  }
                  onNext={showNextBanner}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.pageWidth,
                styles.horizontalPadding,
              ]}>
              <BenefitsStrip />
            </View>

            <View
              style={[
                styles.pageWidth,
                styles.section,
              ]}>
              <SectionHeader
                title="Categorias"
                actionLabel="Ver todas"
                onAction={() =>
                  router.push(
                    '/(tabs)/categories',
                  )
                }
              />

              <ScrollView
                horizontal
                contentContainerStyle={
                  styles.categories
                }
                showsHorizontalScrollIndicator>
                {categories.map(
                  (category) => (
                    <CategoryTile
                      key={category.slug}
                      category={category}
                      onPress={() =>
                        router.push({
                          pathname:
                            '/category/[slug]',
                          params: {
                            slug:
                              category.slug,
                          },
                        })
                      }
                    />
                  ),
                )}
              </ScrollView>
            </View>

            <View
              style={[
                styles.pageWidth,
                styles.section,
              ]}>
              <SectionHeader
                title="Destaques"
                actionLabel="Ver todos"
                onAction={() =>
                  router.push(
                    '/(tabs)/categories',
                  )
                }
              />

              <ProductGrid
                products={
                  featured.length
                    ? featured
                    : visibleProducts.slice(
                        0,
                        8,
                      )
                }
              />

              {loading ? (
                <Text
                  style={
                    styles.loadingText
                  }>
                  Atualizando produtos...
                </Text>
              ) : null}
            </View>

            <StoreFooter />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function campaignToCarouselItem(
  campaign: MarketingCampaignBundle,
  placement: MarketingCampaignPlacement,
  desktop: boolean,
  whatsappNumber: string,
): CarouselItem | null {
  const asset = selectedAsset(
    campaign,
    placement,
    desktop,
  );

  if (!asset) return null;

  return {
    kind: 'campaign',
    id: `campaign-${placement.id}`,
    title:
      placement.title || campaign.name,
    subtitle: placement.subtitle || '',
    imageUrl: asset.publicUrl,
    buttonLabel:
      placement.buttonLabel || '',
    destination:
      marketingDestination(
        placement,
        whatsappNumber,
      ) ?? '',
  };
}

function selectedAsset(
  campaign: MarketingCampaignBundle,
  placement: MarketingCampaignPlacement,
  desktop: boolean,
): MarketingCampaignAsset | null {
  const preferredId = desktop
    ? placement.desktopAssetId
    : placement.mobileAssetId;

  const fallbackId = desktop
    ? placement.mobileAssetId
    : placement.desktopAssetId;

  return (
    campaign.assets.find(
      (asset) =>
        asset.id === preferredId,
    ) ??
    campaign.assets.find(
      (asset) =>
        asset.id === fallbackId,
    ) ??
    null
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },

  horizontalPadding: {
    paddingHorizontal: spacing.lg,
  },

  pageWidth: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  heroArea: {
    marginTop: spacing.lg,
  },

  searchArea: {
    paddingTop: spacing.md,
  },

  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  categories: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },

  noResults: {
    paddingVertical: 60,
    color: colors.textMuted,
    textAlign: 'center',
  },

  loadingText: {
    padding: spacing.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
