import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
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
import { MarketingBanners } from '@/src/components/marketing-banners';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { SectionHeader } from '@/src/components/section-header';
import { StoreFooter } from '@/src/components/store-footer';
import { useStore } from '@/src/context/store-context';
import { activePlacements } from '@/src/features/marketing/storefront';
import { colors, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { products, categories, settings, marketing, loading, refreshStore } = useStore();
  const { search } = useLocalSearchParams<{ search?: string }>();
  const { width } = useWindowDimensions();

  const desktop = width >= 900;

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    if (typeof search === 'string') setQuery(search);
  }, [search]);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.hostname.startsWith('painel.')
    ) {
      window.location.replace('/admin/login');
    }
  }, []);

  const visibleProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );

  const featured = useMemo(
    () => visibleProducts.filter((product) => product.featured).slice(0, 6),
    [visibleProducts],
  );

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');

    if (!normalized) {
      return [];
    }

    return visibleProducts.filter(
      (product) =>
        product.name.toLocaleLowerCase('pt-BR').includes(normalized) ||
        product.description
          .toLocaleLowerCase('pt-BR')
          .includes(normalized),
    );
  }, [query, visibleProducts]);

  const legacyBannerActive = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    if (settings.bannerStartAt && today < settings.bannerStartAt) {
      return false;
    }

    if (settings.bannerEndAt && today > settings.bannerEndAt) {
      return false;
    }

    return true;
  }, [settings.bannerEndAt, settings.bannerStartAt]);

  const activeBanners = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return settings.banners
      .filter((banner) => banner.active)
      .filter((banner) => !banner.startAt || today >= banner.startAt)
      .filter((banner) => !banner.endAt || today <= banner.endAt)
      .sort((first, second) => first.order - second.order)
      .slice(0, 4);
  }, [settings.banners]);

  const currentBanner =
    activeBanners[currentBannerIndex] ?? activeBanners[0] ?? null;

  useEffect(() => {
    if (activeBanners.length <= 1) {
      setCurrentBannerIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentBannerIndex((current) =>
        current + 1 >= activeBanners.length ? 0 : current + 1,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const bannerTitle = currentBanner?.title ?? settings.bannerTitle;
  const bannerSubtitle = currentBanner?.subtitle ?? settings.bannerSubtitle;
  const bannerButtonLabel =
    currentBanner?.buttonLabel ?? settings.bannerButtonLabel;
  const bannerImageUrl =
    currentBanner?.imageUrl ?? settings.bannerImageUrl;
  const bannerLink = currentBanner?.link ?? settings.bannerLink;

  const shouldShowBanner = Boolean(currentBanner) || legacyBannerActive;
  const hasMarketingHero = marketing.settings.enabled && activePlacements(marketing.campaigns)
    .some(({ placement }) => placement.position === 'home_hero');

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
    const destination = bannerLink.trim();

    if (!destination) {
      return;
    }

    if (
      Platform.OS === 'web' &&
      (destination.startsWith('http://') ||
        destination.startsWith('https://'))
    ) {
      window.open(destination, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push(destination as never);
  }

  function showPreviousBanner() {
    if (activeBanners.length <= 1) {
      return;
    }

    setCurrentBannerIndex((current) =>
      current - 1 < 0 ? activeBanners.length - 1 : current - 1,
    );
  }

  function showNextBanner() {
    if (activeBanners.length <= 1) {
      return;
    }

    setCurrentBannerIndex((current) =>
      current + 1 >= activeBanners.length ? 0 : current + 1,
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={desktop ? [0] : undefined}
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
          <SearchBar value={query} onChangeText={setQuery} />
        </View>

        {query.trim() ? (
          <View style={[styles.pageWidth, styles.section]}>
            <SectionHeader title={`Resultados (${searchResults.length})`} />

            <ProductGrid products={searchResults} />

            {!searchResults.length ? (
              <Text style={styles.noResults}>
                Nenhum produto encontrado.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <AnnouncementTicker messages={settings.tickerMessages} />

            {hasMarketingHero ? (
              <View style={[styles.pageWidth, styles.horizontalPadding, styles.marketingHero]}>
                <MarketingBanners
                  campaigns={marketing.campaigns}
                  desktop={desktop}
                  whatsappNumber={settings.whatsappNumber}
                  positions={['home_hero']}
                />
              </View>
            ) : shouldShowBanner ? (
              <View style={[styles.pageWidth, styles.horizontalPadding]}>
                <HeroBannerPremium
                  title={bannerTitle}
                  subtitle={bannerSubtitle}
                  imageUrl={bannerImageUrl}
                  buttonLabel={bannerButtonLabel}
                  showButton={Boolean(
                    bannerButtonLabel.trim() && bannerLink.trim(),
                  )}
                  showNavigation={activeBanners.length > 1}
                  currentIndex={currentBannerIndex}
                  totalItems={activeBanners.length}
                  onPress={openBannerDestination}
                  onPrevious={showPreviousBanner}
                  onNext={showNextBanner}
                />
              </View>
            ) : null}
            <View style={[styles.pageWidth, styles.horizontalPadding]}>
              <BenefitsStrip />
            </View>

            <View style={[styles.pageWidth, styles.section]}>
              <SectionHeader
                title="Categorias"
                actionLabel="Ver todas"
                onAction={() => router.push('/(tabs)/categories')}
              />

              <ScrollView
                horizontal
                contentContainerStyle={styles.categories}
                showsHorizontalScrollIndicator>
                {categories.map((category) => (
                  <CategoryTile
                    key={category.slug}
                    category={category}
                    onPress={() =>
                      router.push({
                        pathname: '/category/[slug]',
                        params: {
                          slug: category.slug,
                        },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>

            {marketing.settings.enabled ? (
              <View style={[styles.pageWidth, styles.horizontalPadding, styles.secondaryCampaigns]}>
                <MarketingBanners
                  campaigns={marketing.campaigns}
                  desktop={desktop}
                  whatsappNumber={settings.whatsappNumber}
                  positions={[
                    'home_secondary_1',
                    'home_secondary_2',
                    'home_secondary_3',
                  ]}
                />
              </View>
            ) : null}

            <View style={[styles.pageWidth, styles.section]}>
              <SectionHeader
                title="Destaques"
                actionLabel="Ver todos"
                onAction={() => router.push('/(tabs)/categories')}
              />

              <ProductGrid
                products={
                  featured.length
                    ? featured
                    : visibleProducts.slice(0, 8)
                }
              />

              {loading ? (
                <Text style={styles.loadingText}>
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

  marketingHero: {
    marginTop: spacing.lg,
  },

  secondaryCampaigns: {
    marginTop: spacing.xl,
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