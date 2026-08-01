import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ProductCard } from '@/src/components/product-card';
import { Product } from '@/src/types';

const MAX_GRID_WIDTH = 1160;
const PAGE_HORIZONTAL_PADDING = 32;

export function ProductGrid({ products }: { products: Product[] }) {
  const { width } = useWindowDimensions();

  const layout = useMemo(() => {
    const columns = width >= 900 ? 4 : width >= 640 ? 3 : 2;
    const gap = width >= 900 ? 24 : width >= 640 ? 20 : 16;
    const availableWidth = Math.min(
      MAX_GRID_WIDTH,
      Math.max(0, width - PAGE_HORIZONTAL_PADDING),
    );
    const cardWidth = Math.max(0, (availableWidth - gap * (columns - 1)) / columns);

    return {
      cardWidth,
      gap,
      imageAspectRatio: width < 640 ? 0.86 : 1,
    };
  }, [width]);

  return (
    <View style={[styles.grid, { gap: layout.gap }]}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          cardWidth={layout.cardWidth}
          imageAspectRatio={layout.imageAspectRatio}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    maxWidth: MAX_GRID_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
});
