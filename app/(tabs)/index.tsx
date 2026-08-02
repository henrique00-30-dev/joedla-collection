import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
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
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { SectionHeader } from '@/src/components/section-header';
import { StoreFooter } from '@/src/components/store-footer';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { products, categories, settings, loading, refreshStore } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.hostname.startsWith('painel.')
    ) {
      router.replace('/admin/login');
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
    if (!normalized) return [];
    return visibleProducts.filter(
      (product) =>
        product.name.toLocaleLowerCase('pt-BR').includes(normalized) ||
        product.description.toLocaleLowerCase('pt-BR').includes(normalized),
    );
  }, [query, visibleProducts]);
  const bannerActive = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (settings.bannerStartAt && today < settings.bannerStartAt) return false;
    if (settings.bannerEndAt && today > settings.bannerEndAt) return false;
    return true;
  }, [settings.bannerEndAt, settings.bannerStartAt]);

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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={desktop ? [0] : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator>
        <AppHeader />

        <View style={[styles.pageWidth, styles.horizontalPadding, styles.searchArea]}>
          <SearchBar value={query} onChangeText={setQuery} />
        </View>

        {query.trim() ? (
          <View style={[styles.pageWidth, styles.section]}>
            <SectionHeader title={`Resultados (${searchResults.length})`} />
            <ProductGrid products={searchResults} />
            {!searchResults.length ? (
              <Text style={styles.noResults}>Nenhum produto encontrado.</Text>
            ) : null}
          </View>
        ) : (
          <>
            <AnnouncementTicker messages={settings.tickerMessages} />

            {bannerActive ? <View style={[styles.pageWidth, styles.horizontalPadding]}>
              <View style={[styles.hero, desktop && styles.heroDesktop]}>
                <View style={styles.heroText}>
                  <Text style={styles.heroEyebrow}>CURADORIA JOEDLA</Text>
                  <Text style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>
                    {settings.bannerTitle}
                  </Text>
                  <Text style={[styles.heroSubtitle, !desktop && styles.heroSubtitleMobile]}>
                    {settings.bannerSubtitle}
                  </Text>
                  <Pressable
                    onPress={() => router.push(settings.bannerLink as never)}
                    style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>{settings.bannerButtonLabel}</Text>
                  </Pressable>
                </View>
                <Image
                  source={{
                    uri: settings.bannerImageUrl,
                  }}
                  contentFit="cover"
                  style={styles.heroImage}
                />
              </View>
            </View> : null}

            <View style={[styles.pageWidth, styles.benefits]}>
              <Benefit icon="shield-checkmark-outline" title="Compra segura" text="Atendimento direto com a loja" />
              <Benefit icon="sparkles-outline" title="Seleção especial" text="Peças escolhidas com cuidado" />
              <Benefit icon="logo-whatsapp" title="Suporte próximo" text="Dúvidas respondidas no WhatsApp" />
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
                        params: { slug: category.slug },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>

            <View style={[styles.pageWidth, styles.section]}>
              <SectionHeader
                title="Destaques"
                actionLabel="Ver todos"
                onAction={() => router.push('/(tabs)/categories')}
              />
              <ProductGrid
                products={featured.length ? featured : visibleProducts.slice(0, 8)}
              />
              {loading ? <Text style={styles.loadingText}>Atualizando produtos...</Text> : null}
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
  searchArea: {
    paddingTop: spacing.md,
  },
  hero: {
    minHeight: 244,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.large,
    flexDirection: 'row',
    backgroundColor: '#F2E4D2',
  },
  heroDesktop: {
    minHeight: 390,
    borderRadius: 28,
  },
  heroText: {
    zIndex: 2,
    width: '58%',
    padding: spacing.lg,
    justifyContent: 'center',
  },
  heroEyebrow: {
    marginBottom: spacing.sm,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontFamily: fonts.display,
    color: colors.primaryDark,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '700',
  },
  heroTitleDesktop: {
    fontSize: 48,
    lineHeight: 52,
  },
  heroSubtitle: {
    maxWidth: 430,
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  heroSubtitleMobile: {
    display: 'none',
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  heroImage: {
    width: '48%',
    height: '100%',
    marginLeft: '-6%',
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
  benefitCopy: { flex: 1 },
  benefitTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  benefitText: { marginTop: 2, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
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
