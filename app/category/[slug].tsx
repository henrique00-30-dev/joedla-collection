import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { useStore } from '@/src/context/store-context';
import { colors, spacing } from '@/src/theme';
import { CategorySlug } from '@/src/types';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: CategorySlug }>();
  const { products, categories } = useStore();
  const category = categories.find((item) => item.slug === slug);
  const filtered = products.filter((product) => product.active && product.category === slug);

  return (
    <Screen>
      <AppHeader compact title={category?.name ?? 'Categoria'} showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.count}>{filtered.length} produto(s)</Text>
        <ProductGrid products={filtered} />
        {!filtered.length ? (
          <Text style={styles.empty}>Ainda não há produtos nesta categoria.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  count: {
    marginBottom: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
  },
  empty: {
    paddingVertical: 80,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
