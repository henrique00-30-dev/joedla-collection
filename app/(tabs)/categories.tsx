import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { SearchBar } from '@/src/components/search-bar';
import { useStore } from '@/src/context/store-context';
import { campaignAppliesToProduct } from '@/src/features/marketing/storefront';
import { colors, radii, spacing } from '@/src/theme';
import { CategorySlug } from '@/src/types';

type Filter = 'all' | CategorySlug;

export default function CategoriesScreen() {
  const { campaign: campaignId, search } = useLocalSearchParams<{ campaign?: string; search?: string }>();
  const { products, categories, marketing } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const campaign = marketing.campaigns.find((item) => item.id === campaignId);

  useEffect(() => {
    if (typeof search === 'string') setQuery(search);
  }, [search]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return products.filter((product) => {
      if (!product.active) return false;
      if (campaign && !campaignAppliesToProduct(campaign, product)) return false;
      if (filter !== 'all' && product.category !== filter) return false;
      return (
        !normalized ||
        product.name.toLocaleLowerCase('pt-BR').includes(normalized) ||
        product.description.toLocaleLowerCase('pt-BR').includes(normalized)
      );
    });
  }, [campaign, filter, products, query]);

  return (
    <Screen>
      <AppHeader compact title="Categorias" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>
        <SearchBar value={query} onChangeText={setQuery} />

        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator>
          <FilterChip active={filter === 'all'} label="Todos" onPress={() => setFilter('all')} />
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              active={filter === category.slug}
              label={category.name}
              onPress={() => setFilter(category.slug)}
            />
          ))}
        </ScrollView>

        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {campaign
              ? campaign.name
              : filter === 'all'
              ? 'Todos os produtos'
              : categories.find((category) => category.slug === filter)?.name}
          </Text>
          <Text style={styles.count}>{filtered.length} itens</Text>
        </View>

        <ProductGrid products={filtered} />

        {!filtered.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptyText}>Tente mudar a categoria ou a pesquisa.</Text>
            <Pressable
              onPress={() => {
                setFilter('all');
                setQuery('');
                if (campaignId) router.replace('/(tabs)/categories');
              }}>
              <Text style={styles.clear}>Limpar filtros</Text>
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
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  filters: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.white,
  },
  titleRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
  },
  empty: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  clear: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '800',
  },
});
