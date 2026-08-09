import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts, radii, shadow, spacing } from '@/src/theme';

type HeroBannerPremiumProps = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  buttonLabel: string;
  showButton?: boolean;
  showNavigation?: boolean;
  currentIndex?: number;
  totalItems?: number;
  onPress: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function HeroBannerPremium({
  title,
  subtitle = '',
  imageUrl,
  buttonLabel,
  showButton = true,
  showNavigation = false,
  currentIndex = 0,
  totalItems = 0,
  onPress,
  onPrevious,
  onNext,
}: HeroBannerPremiumProps) {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const narrowMobile = width < 390;
  const tablet = width >= 700 && width < 1000;

  return (
    <View
      style={[
        styles.container,
        tablet && styles.containerTablet,
        mobile && styles.containerMobile,
      ]}>
      <View
        style={[
          styles.textArea,
          tablet && styles.textAreaTablet,
          mobile && styles.textAreaMobile,
          narrowMobile && styles.textAreaNarrow,
        ]}>
        <Text style={styles.overline}>JOEDLA COLLECTION</Text>

        <Text
          numberOfLines={mobile ? 3 : 2}
          style={[
            styles.title,
            tablet && styles.titleTablet,
            mobile && styles.titleMobile,
            narrowMobile && styles.titleNarrow,
          ]}>
          {title}
        </Text>

        {subtitle.trim() ? (
          <Text
            numberOfLines={mobile ? 3 : 4}
            style={[styles.subtitle, mobile && styles.subtitleMobile]}>
            {subtitle}
          </Text>
        ) : null}

        {showButton && buttonLabel.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            onPress={onPress}
            style={({ pressed }) => [
              styles.button,
              narrowMobile && styles.buttonNarrow,
              pressed && styles.buttonPressed,
            ]}>
            <Text numberOfLines={2} style={styles.buttonText}>
              {buttonLabel}
            </Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.imageArea,
          tablet && styles.imageAreaTablet,
          mobile && styles.imageAreaMobile,
        ]}>
        {imageUrl.trim() ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="contain"
            contentPosition="center"
            transition={250}
            style={styles.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.62)" />
          </View>
        )}

        {showNavigation && totalItems > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mostrar banner anterior"
              onPress={onPrevious}
              style={({ pressed }) => [
                styles.arrow,
                styles.left,
                narrowMobile && styles.arrowNarrow,
                pressed && styles.arrowPressed,
              ]}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mostrar próximo banner"
              onPress={onNext}
              style={({ pressed }) => [
                styles.arrow,
                styles.right,
                narrowMobile && styles.arrowNarrow,
                pressed && styles.arrowPressed,
              ]}>
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </Pressable>
          </>
        ) : null}

        {showNavigation && totalItems > 1 ? (
          <View style={[styles.counter, narrowMobile && styles.counterNarrow]}>
            <Text style={styles.counterText}>
              {String(currentIndex + 1).padStart(2, '0')}
              {' / '}
              {String(totalItems).padStart(2, '0')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 0,
    minHeight: 510,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: 30,
    flexDirection: 'row',
    backgroundColor: '#1F1713',
    ...shadow,
  },
  containerTablet: { minHeight: 470 },
  containerMobile: {
    minHeight: 620,
    borderRadius: radii.large,
    flexDirection: 'column',
  },
  textArea: {
    zIndex: 2,
    minWidth: 0,
    flex: 0.76,
    paddingHorizontal: 46,
    paddingVertical: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  textAreaTablet: {
    paddingHorizontal: 30,
    paddingVertical: 34,
  },
  textAreaMobile: {
    width: '100%',
    minHeight: 280,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  textAreaNarrow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  overline: {
    maxWidth: '100%',
    marginBottom: spacing.md,
    color: '#D9B06A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.7,
  },
  title: {
    maxWidth: 520,
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: '800',
  },
  titleTablet: { fontSize: 38, lineHeight: 44 },
  titleMobile: { maxWidth: '100%', fontSize: 36, lineHeight: 41 },
  titleNarrow: { fontSize: 31, lineHeight: 36 },
  subtitle: {
    maxWidth: 500,
    marginTop: spacing.lg,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    lineHeight: 25,
  },
  subtitleMobile: {
    maxWidth: '100%',
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 49,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#B88433',
  },
  buttonNarrow: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  imageArea: {
    position: 'relative',
    minWidth: 0,
    flex: 1.32,
    minHeight: 510,
    overflow: 'hidden',
    backgroundColor: '#F3EEE8',
  },
  imageAreaTablet: { minHeight: 470 },
  imageAreaMobile: {
    flex: undefined,
    width: '100%',
    minHeight: 340,
  },
  image: { width: '100%', height: '100%' },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2A23',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    marginTop: -22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,13,10,0.58)',
  },
  arrowNarrow: {
    width: 40,
    height: 40,
    marginTop: -20,
    borderRadius: 20,
  },
  arrowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.95 }],
  },
  left: { left: spacing.md },
  right: { right: spacing.md },
  counter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    maxWidth: '70%',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(20,13,10,0.66)',
  },
  counterNarrow: {
    right: spacing.md,
    bottom: spacing.md,
  },
  counterText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
