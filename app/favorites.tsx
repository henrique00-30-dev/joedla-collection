import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductCard } from '@/src/components/product-card';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { spacing } from '@/src/theme';

export default function FavoritesScreen() {
  const { products, favorites } = useStore();
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  return (
    <Screen>
      <AppHeader compact title="Meus favoritos" showBack />
      {!favoriteProducts.length ? (
        <EmptyState
          icon="heart-outline"
          title="Nenhum favorito"
          message="Toque no coração dos produtos que você mais gostou."
          actionLabel="Ver produtos"
          onAction={() => router.replace('/(tabs)/categories')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
});
