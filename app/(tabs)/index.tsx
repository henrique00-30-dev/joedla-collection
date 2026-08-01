import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { AnnouncementTicker } from '@/src/components/announcement-ticker';
import { CategoryTile } from '@/src/components/category-tile';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { SectionHeader } from '@/src/components/section-header';
import { useStore } from '@/src/context/store-context';
import { colors, fonts, radii, spacing } from '@/src/theme';

export default function HomeScreen() {
  const { products, categories, settings, loading, refreshStore } = useStore();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator>
        <AppHeader />

        <View style={[styles.horizontalPadding, styles.searchArea]}>
          <SearchBar value={query} onChangeText={setQuery} />
        </View>

        {query.trim() ? (
          <View style={styles.section}>
            <SectionHeader title={`Resultados (${searchResults.length})`} />
            <ProductGrid products={searchResults} />
            {!searchResults.length ? (
              <Text style={styles.noResults}>Nenhum produto encontrado.</Text>
            ) : null}
          </View>
        ) : (
          <>
            <AnnouncementTicker messages={settings.tickerMessages} />

            <View style={styles.horizontalPadding}>
              <View style={styles.hero}>
                <View style={styles.heroText}>
                  <Text style={styles.heroEyebrow}>JOEDLA COLLECTION</Text>
                  <Text style={styles.heroTitle}>Novidades{'\n'}da semana</Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/categories')}
                    style={styles.heroButton}>
                    <Text style={styles.heroButtonText}>Ver produtos</Text>
                  </Pressable>
                </View>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=85',
                  }}
                  contentFit="cover"
                  style={styles.heroImage}
                />
              </View>
            </View>

            <View style={styles.section}>
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

            <View style={styles.section}>
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
  searchArea: {
    paddingTop: spacing.md,
  },
  hero: {
    height: 222,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: radii.large,
    flexDirection: 'row',
    backgroundColor: '#F2E4D2',
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
