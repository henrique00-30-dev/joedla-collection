import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme';

type ProductImageProps = {
  uri?: string;
  style?: StyleProp<ImageStyle>;
};

export function ProductImage({ uri, style }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="bag-handle-outline" size={34} color={colors.primarySoft} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      contentFit="cover"
      onError={() => setFailed(true)}
      transition={180}
      style={[styles.image, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceWarm,
  },
  placeholder: {
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
