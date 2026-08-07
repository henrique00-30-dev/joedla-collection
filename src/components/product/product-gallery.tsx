import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { MarketingBadge } from '@/src/components/marketing-badge';
import { ProductImage } from '@/src/components/product-image';
import { colors, radii, shadow, spacing } from '@/src/theme';
import type { Product } from '@/src/types';

type ProductGalleryProps = {
  product: Product;
  imageUrls: string[];
  selectedImageIndex: number;
  onSelectImage: (index: number) => void;
};

export function ProductGallery({
  product,
  imageUrls,
  selectedImageIndex,
  onSelectImage,
}: ProductGalleryProps) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const selectedImage =
    imageUrls[selectedImageIndex] ?? imageUrls[0] ?? '';

  const imageContentFit =
    product.photoProvisional ||
    product.photoQuality === 'reduced'
      ? 'contain'
      : 'cover';

  return (
    <View
      style={[
        styles.container,
        desktop && styles.containerDesktop,
      ]}>
      {desktop && imageUrls.length > 1 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.desktopThumbnailsScroll}
          contentContainerStyle={styles.desktopThumbnails}>
          {imageUrls.map((uri, index) => (
            <Thumbnail
              key={`${uri}-${index}`}
              uri={uri}
              index={index}
              total={imageUrls.length}
              selected={selectedImageIndex === index}
              onPress={() => onSelectImage(index)}
              desktop
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.mainColumn}>
        <View style={styles.mainImageWrap}>
          <ProductImage
            uri={selectedImage}
            contentFit={imageContentFit}
            style={styles.mainImage}
          />

          <View style={styles.imageGlow} />

          {product.marketingBadge ? (
            <MarketingBadge
              badge={product.marketingBadge}
            />
          ) : null}

          {imageUrls.length > 1 ? (
            <View style={styles.imageCounter}>
              <Ionicons
                name="images-outline"
                size={14}
                color={colors.white}
              />

              <Text style={styles.imageCounterText}>
                {selectedImageIndex + 1}/{imageUrls.length}
              </Text>
            </View>
          ) : null}
        </View>

        {!desktop && imageUrls.length > 1 ? (
          <View style={styles.mobileGallery}>
            <View style={styles.galleryHeader}>
              <Text style={styles.galleryTitle}>
                Fotos do produto
              </Text>

              <Text style={styles.galleryCount}>
                {selectedImageIndex + 1} de {imageUrls.length}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileThumbnails}>
              {imageUrls.map((uri, index) => (
                <Thumbnail
                  key={`${uri}-${index}`}
                  uri={uri}
                  index={index}
                  total={imageUrls.length}
                  selected={selectedImageIndex === index}
                  onPress={() => onSelectImage(index)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Thumbnail({
  uri,
  index,
  total,
  selected,
  onPress,
  desktop = false,
}: {
  uri: string;
  index: number;
  total: number;
  selected: boolean;
  onPress: () => void;
  desktop?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver foto ${index + 1} de ${total}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumbnailButton,
        desktop && styles.thumbnailButtonDesktop,
        selected && styles.thumbnailButtonActive,
        pressed && styles.thumbnailPressed,
      ]}>
      <ProductImage
        uri={uri}
        contentFit="cover"
        style={styles.thumbnail}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#FFFEFC',
  },

  containerDesktop: {
    width: '58%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'transparent',
  },

  desktopThumbnailsScroll: {
    width: 88,
    maxHeight: 650,
  },

  desktopThumbnails: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },

  mainColumn: {
    minWidth: 0,
    flex: 1,
  },

  mainImageWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 26,
    backgroundColor: '#F7F1EA',
    ...shadow,
  },

  mainImage: {
    width: '100%',
    aspectRatio: 0.9,
    backgroundColor: '#F7F1EA',
  },

  imageGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: 'rgba(31,23,19,0.05)',
  },

  imageCounter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(31,23,19,0.62)',
  },

  imageCounterText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },

  mobileGallery: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFEFC',
  },

  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  galleryTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  galleryCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  mobileThumbnails: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  thumbnailButton: {
    width: 68,
    height: 68,
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },

  thumbnailButtonDesktop: {
    width: 82,
    height: 94,
  },

  thumbnailButtonActive: {
    borderColor: '#9D6A2F',
    backgroundColor: '#FFF9F1',
  },

  thumbnailPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },

  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radii.small,
  },
});