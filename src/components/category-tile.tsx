import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Category } from '@/src/types';
import { colors, radii, spacing } from '@/src/theme';

type CategoryTileProps = {
  category: Category;
  onPress: () => void;
};

export function CategoryTile({ category, onPress }: CategoryTileProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={styles.imageFrame}>
        <Image source={{ uri: category.imageUrl }} contentFit="cover" style={styles.image} />
      </View>
      <Text numberOfLines={1} style={styles.label}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 82,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  imageFrame: {
    width: 72,
    height: 72,
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
  },
  image: {
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceWarm,
  },
  label: {
    maxWidth: 82,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
