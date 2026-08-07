import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { useStore } from '@/src/context/store-context';
import { campaignAppliesToProduct } from '@/src/features/marketing/storefront';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { CategorySlug } from '@/src/types';

type Filter = 'all' | CategorySlug;

export default function CategoriesScreen() {
  const {
    campaign: campaignId,
    search,
  } = useLocalSearchParams<{
    campaign?: string;
    search?: string;
  }>();

  const { products, categories, marketing } = useStore();
  const { width } = useWindowDimensions();

  const desktop = width >= 900;

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const campaign = marketing.campaigns.find(
    (item) => item.id === campaignId,
  );

  useEffect(() => {
    if (typeof search === 'string') {
      setQuery(search);
    }
  }, [search]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase('pt-BR');

    return products.filter((product) => {
      if (!product.active) {
        return false;
      }

      if (
        campaign &&
        !campaignAppliesToProduct(campaign, product)
      ) {
        return false;
      }

      if (
        filter !== 'all' &&
        product.category !== filter
      ) {
        return false;
      }

      return (
        !normalized ||
        product.name
          .toLocaleLowerCase('pt-BR')
          .includes(normalized) ||
        product.description
          .toLocaleLowerCase('pt-BR')
          .includes(normalized)
      );
    });
  }, [campaign, filter, products, query]);

  const currentTitle = campaign
    ? campaign.name
    : filter === 'all'
      ? 'Todos os produtos'
      : categories.find(
          (category) => category.slug === filter,
        )?.name ?? 'Categoria';

  function clearFilters() {
    setFilter('all');
    setQuery('');

    if (campaignId) {
      router.replace('/(tabs)/categories');
    }
  }

  return (
    <Screen>
      <AppHeader
        compact
        title="Categorias"
        showBack
        showStoreHome
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          desktop && styles.contentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderCopy}>
            <Text style={styles.eyebrow}>
              CATÁLOGO JOEDLA
            </Text>

            <Text style={styles.pageTitle}>
              Encontre seu próximo favorito
            </Text>

            <Text style={styles.pageSubtitle}>
              Pesquise por nome, descrição ou navegue pelas
              categorias da loja.
            </Text>
          </View>

          <View style={styles.resultCounter}>
            <Ionicons
              name="grid-outline"
              size={19}
              color={colors.primary}
            />

            <View>
              <Text style={styles.resultCounterValue}>
                {filtered.length}
              </Text>

              <Text style={styles.resultCounterLabel}>
                {filtered.length === 1 ? 'produto' : 'produtos'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          <FilterChip
            active={filter === 'all'}
            label="Todos"
            icon="apps-outline"
            onPress={() => setFilter('all')}
          />

          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              active={filter === category.slug}
              label={category.name}
              icon="pricetag-outline"
              onPress={() => setFilter(category.slug)}
            />
          ))}
        </ScrollView>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{currentTitle}</Text>

            <Text style={styles.count}>
              {filtered.length}{' '}
              {filtered.length === 1 ? 'item encontrado' : 'itens encontrados'}
            </Text>
          </View>

          {(filter !== 'all' || query.trim() || campaignId) ? (
            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}>
              <Ionicons
                name="close-circle-outline"
                size={17}
                color={colors.primary}
              />

              <Text style={styles.clearButtonText}>
                Limpar filtros
              </Text>
            </Pressable>
          ) : null}
        </View>

        <ProductGrid products={filtered} />

        {!filtered.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search-outline"
                size={34}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Nenhum produto encontrado
            </Text>

            <Text style={styles.emptyText}>
              Tente mudar a categoria ou ajustar sua pesquisa.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.emptyButtonPressed,
              ]}>
              <Text style={styles.emptyButtonText}>
                Limpar filtros
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FilterChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}>
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.white : colors.primary}
      />

      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  contentDesktop: {
    maxWidth: 1180,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignSelf: 'center',
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  pageHeaderCopy: {
    minWidth: 260,
    flex: 1,
  },

  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  pageTitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },

  pageSubtitle: {
    maxWidth: 620,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  resultCounter: {
    minWidth: 150,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  resultCounterValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  resultCounterLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },

  searchCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 20,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  filters: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },

  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(157,106,47,0.25)',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFEFC',
  },

  chipActive: {
    borderColor: '#8B451C',
    backgroundColor: '#8B451C',
  },

  chipPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },

  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  chipTextActive: {
    color: colors.white,
  },

  titleRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  title: {
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
  },

  count: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  clearButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceWarm,
  },

  clearButtonPressed: {
    opacity: 0.7,
  },

  clearButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },

  empty: {
    minHeight: 320,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  emptyTitle: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  emptyText: {
    maxWidth: 420,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  emptyButton: {
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B451C',
  },

  emptyButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  emptyButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});