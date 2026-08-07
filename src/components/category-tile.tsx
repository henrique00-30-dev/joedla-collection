import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, shadow, spacing } from '@/src/theme';
import { Category } from '@/src/types';

type CategoryTileProps = {
  category: Category;
  onPress: () => void;
};

export function CategoryTile({
  category,
  onPress,
}: CategoryTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir categoria ${category.name}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.container,
        hovered && styles.containerHovered,
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.imageFrame,
          hovered && styles.imageFrameHovered,
        ]}>
        <View style={styles.imageClip}>
          <Image
            source={{ uri: category.imageUrl }}
            contentFit="cover"
            transition={220}
            style={[
              styles.image,
              hovered && styles.imageHovered,
            ]}
          />
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.label,
          hovered && styles.labelHovered,
        ]}>
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 126,
    minHeight: 156,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },

  containerHovered: {
    transform: [{ translateY: -3 }],
  },

  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },

  imageFrame: {
    width: 112,
    height: 112,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.14)',
    borderRadius: radii.pill,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  imageFrameHovered: {
    borderColor: colors.primary,
    ...(Platform.OS === 'web'
      ? {
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: {
            width: 0,
            height: 8,
          },
        }
      : {}),
  },

  imageClip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceWarm,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageHovered: {
    transform: [{ scale: 1.06 }],
  },

  label: {
    maxWidth: 118,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  labelHovered: {
    color: colors.primary,
  },
});