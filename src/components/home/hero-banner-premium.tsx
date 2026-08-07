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
        ]}>
        <Text style={styles.overline}>JOEDLA COLLECTION</Text>

        <Text
          numberOfLines={mobile ? 3 : 2}
          style={[
            styles.title,
            tablet && styles.titleTablet,
            mobile && styles.titleMobile,
          ]}>
          {title}
        </Text>

        {subtitle.trim() ? (
          <Text
            numberOfLines={mobile ? 3 : 4}
            style={[
              styles.subtitle,
              mobile && styles.subtitleMobile,
            ]}>
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
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
            <Ionicons
              name="arrow-forward"
              size={17}
              color={colors.white}
            />
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
            contentFit="cover"
            transition={250}
            style={styles.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons
              name="images-outline"
              size={48}
              color="rgba(255,255,255,0.62)"
            />
          </View>
        )}

        <View style={styles.imageShade} />

        {showNavigation ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mostrar banner anterior"
              onPress={onPrevious}
              style={({ pressed }) => [
                styles.arrow,
                styles.left,
                pressed && styles.arrowPressed,
              ]}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.white}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mostrar próximo banner"
              onPress={onNext}
              style={({ pressed }) => [
                styles.arrow,
                styles.right,
                pressed && styles.arrowPressed,
              ]}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.white}
              />
            </Pressable>
          </>
        ) : null}

        {showNavigation && totalItems > 1 ? (
          <View style={styles.counter}>
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
    minHeight: 510,
    marginTop: spacing.lg,
    overflow: 'hidden',
    borderRadius: 30,
    flexDirection: 'row',
    backgroundColor: '#1F1713',
    ...shadow,
  },

  containerTablet: {
    minHeight: 470,
  },

  containerMobile: {
    minHeight: 620,
    borderRadius: radii.large,
    flexDirection: 'column',
  },

  textArea: {
    zIndex: 2,
    flex: 0.86,
    paddingHorizontal: 52,
    paddingVertical: 46,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  textAreaTablet: {
    paddingHorizontal: 34,
    paddingVertical: 36,
  },

  textAreaMobile: {
    minHeight: 290,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  overline: {
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
    fontSize: 49,
    lineHeight: 55,
    fontWeight: '800',
  },

  titleTablet: {
    fontSize: 40,
    lineHeight: 46,
  },

  titleMobile: {
    fontSize: 36,
    lineHeight: 41,
  },

  subtitle: {
    maxWidth: 500,
    marginTop: spacing.lg,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 16,
    lineHeight: 25,
  },

  subtitleMobile: {
    marginTop: spacing.md,
    fontSize: 14,
    lineHeight: 21,
  },

  button: {
    minHeight: 49,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#B88433',
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },

  imageArea: {
    position: 'relative',
    flex: 1.15,
    minHeight: 510,
    overflow: 'hidden',
  },

  imageAreaTablet: {
    minHeight: 470,
  },

  imageAreaMobile: {
    flex: undefined,
    width: '100%',
    minHeight: 330,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2A23',
  },

  imageShade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '28%',
    backgroundColor: 'rgba(31,23,19,0.3)',
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
    backgroundColor: 'rgba(20,13,10,0.48)',
  },

  arrowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.95 }],
  },

  left: {
    left: spacing.md,
  },

  right: {
    right: spacing.md,
  },

  counter: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(20,13,10,0.58)',
  },

  counterText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});