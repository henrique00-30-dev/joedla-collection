import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { CategoryTile } from '@/src/components/category-tile';
import { MarketingBanners } from '@/src/components/marketing-banners';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { SectionHeader } from '@/src/components/section-header';
import { StoreFooter } from '@/src/components/store-footer';
import { useStore } from '@/src/context/store-context';
import { activePlacements } from '@/src/features/marketing/storefront';
import { colors, fonts, radii, spacing } from '@/src/theme';

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
                <View style={[styles.hero, desktop && styles.heroDesktop]}>
                  <View style={styles.heroText}>
                    <Text style={styles.heroEyebrow}>
                      CURADORIA JOEDLA
                    </Text>

                    <Text
                      style={[
                        styles.heroTitle,
                        desktop && styles.heroTitleDesktop,
                      ]}>
                      {bannerTitle}
                    </Text>

                    <Text
                      style={[
                        styles.heroSubtitle,
                        !desktop && styles.heroSubtitleMobile,
                      ]}>
                      {bannerSubtitle}
                    </Text>

                    {bannerButtonLabel.trim() && bannerLink.trim() ? (
                      <Pressable
                        onPress={openBannerDestination}
                        style={({ pressed }) => [
                          styles.heroButton,
                          pressed && styles.heroButtonPressed,
                        ]}>
                        <Text style={styles.heroButtonText}>
                          {bannerButtonLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {bannerImageUrl.trim() ? (
                    <Image
                      source={{ uri: bannerImageUrl }}
                      contentFit="cover"
                      style={styles.heroImage}
                    />
                  ) : (
                    <View style={styles.heroImageFallback}>
                      <Ionicons
                        name="images-outline"
                        size={42}
                        color={colors.textMuted}
                      />
                    </View>
                  )}

                  {desktop && activeBanners.length > 1 ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mostrar banner anterior"
                        onPress={showPreviousBanner}
                        style={styles.heroArrowLeft}>
                        <Ionicons
                          name="chevron-back"
                          size={28}
                          color="#6B4B3E"
                        />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Mostrar próximo banner"
                        onPress={showNextBanner}
                        style={styles.heroArrowRight}>
                        <Ionicons
                          name="chevron-forward"
                          size={28}
                          color="#6B4B3E"
                        />
                      </Pressable>
                    </>
                  ) : null}

                  {activeBanners.length > 1 ? (
                    <View style={styles.heroIndicators}>
                      {activeBanners.map((banner, index) => (
                        <Pressable
                          key={banner.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Mostrar banner ${index + 1}`}
                          onPress={() => setCurrentBannerIndex(index)}
                          style={[
                            styles.heroIndicator,
                            index === currentBannerIndex &&
                              styles.heroIndicatorActive,
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={[styles.pageWidth, styles.benefits]}>
              <Benefit
                icon="shield-checkmark-outline"
                title="Compra segura"
                text="Atendimento direto com a loja"
              />

              <Benefit
                icon="sparkles-outline"
                title="Seleção especial"
                text="Peças escolhidas com cuidado"
              />

              <Benefit
                icon="logo-whatsapp"
                title="Suporte próximo"
                text="Dúvidas respondidas no WhatsApp"
              />
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

function Benefit({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitText}>{text}</Text>
      </View>
    </View>
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

  hero: {
    minHeight: 450,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F2E4D2',
  },

  heroDesktop: {
    minHeight: 450,
    borderRadius: 28,
  },

  heroText: {
    zIndex: 2,
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  heroEyebrow: {
    marginBottom: spacing.sm,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  heroTitle: {
    maxWidth: 560,
    fontFamily: fonts.display,
    color: colors.primaryDark,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '700',
  },

  heroTitleDesktop: {
    fontSize: 48,
    lineHeight: 52,
  },

  heroSubtitle: {
    maxWidth: 520,
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 28,
  },

  heroSubtitleMobile: {
    display: 'none',
  },

  heroButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },

  heroButtonPressed: {
    opacity: 0.82,
  },

  heroButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  heroImage: {
    flex: 1,
    height: '100%',
    minHeight: 450,
  },

  heroImageFallback: {
    flex: 1,
    minHeight: 450,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  heroIndicators: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  heroIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },

  heroIndicatorActive: {
    width: 24,
    backgroundColor: colors.primary,
  },

  heroArrowLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -22,
    zIndex: 20,
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  heroArrowRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -22,
    zIndex: 20,
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  benefits: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  benefit: {
    minWidth: 240,
    flex: 1,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },

  benefitIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  benefitCopy: {
    flex: 1,
  },

  benefitTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  benefitText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
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
