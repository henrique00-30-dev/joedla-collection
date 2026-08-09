import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { activePlacements, marketingDestination } from '@/src/features/marketing/storefront';
import {
  CampaignPlacementPosition,
  MarketingCampaignAsset,
  MarketingCampaignBundle,
  MarketingCampaignPlacement,
} from '@/src/features/marketing/types';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';

type MarketingBannersProps = {
  campaigns: MarketingCampaignBundle[];
  desktop: boolean;
  whatsappNumber: string;
  positions: CampaignPlacementPosition[];
};

function marketingTitleStyle(length: number, isHero: boolean, desktop: boolean) {
  if (!isHero) {
    if (length > 78) return styles.secondaryTitleVeryLong;
    if (length > 48) return styles.secondaryTitleLong;
    return null;
  }

  if (desktop) {
    if (length > 88) return styles.heroTitleDesktopVeryLong;
    if (length > 58) return styles.heroTitleDesktopLong;
    if (length > 38) return styles.heroTitleDesktopMedium;
    return styles.heroTitleDesktop;
  }

  if (length > 82) return styles.heroTitleMobileVeryLong;
  if (length > 54) return styles.heroTitleMobileLong;
  return null;
}

export function MarketingBanners({
  campaigns,
  desktop,
  whatsappNumber,
  positions,
}: MarketingBannersProps) {
  const entries = activePlacements(campaigns).filter(({ placement }) =>
    positions.includes(placement.position),
  );

  if (!entries.length) return null;

  const heroOnly = entries.length === 1 && entries[0].placement.position === 'home_hero';

  return (
    <View style={[styles.group, !heroOnly && styles.secondaryGrid]}>
      {entries.map(({ campaign, placement }) => {
        const asset = selectedAsset(campaign, placement, desktop);
        const destination = marketingDestination(placement, whatsappNumber);
        const isHero = placement.position === 'home_hero';
        const title = (placement.title || campaign.name).trim();
        const adaptiveTitleStyle = marketingTitleStyle(title.length, isHero, desktop);

        return (
          <Pressable
            key={placement.id}
            accessibilityRole={destination ? 'link' : undefined}
            accessibilityLabel={asset?.altText || title}
            disabled={!destination}
            onPress={() => openDestination(destination)}
            style={({ pressed }) => [
              styles.banner,
              isHero ? styles.hero : styles.secondary,
              isHero && desktop && styles.heroDesktop,
              !isHero && desktop && styles.secondaryDesktop,
              pressed && destination && styles.pressed,
            ]}>
            {asset ? (
              <Image
                source={{ uri: asset.publicUrl }}
                accessibilityLabel={asset.altText}
                contentFit="contain"
                contentPosition="center"
                style={[styles.image, { transform: [{ scale: Math.max(1, asset.zoom) }] }]}
              />
            ) : (
              <View style={styles.imageFallback} />
            )}

            <View style={styles.overlay} />
            <View style={[styles.copy, !isHero && styles.secondaryCopy]}>
              <Text style={styles.eyebrow}>JOEDLA COLLECTION</Text>
              <Text
                numberOfLines={isHero ? 4 : 3}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[
                  styles.title,
                  isHero && desktop && styles.heroTitleDesktop,
                  adaptiveTitleStyle,
                ]}>
                {title}
              </Text>
              {placement.subtitle ? (
                <Text
                  numberOfLines={isHero ? 4 : 3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={styles.subtitle}>
                  {placement.subtitle}
                </Text>
              ) : null}
              {placement.buttonLabel && destination ? (
                <View style={styles.button}>
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    style={styles.buttonText}>
                    {placement.buttonLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function selectedAsset(
  campaign: MarketingCampaignBundle,
  placement: MarketingCampaignPlacement,
  desktop: boolean,
): MarketingCampaignAsset | null {
  const preferredId = desktop ? placement.desktopAssetId : placement.mobileAssetId;
  const fallbackId = desktop ? placement.mobileAssetId : placement.desktopAssetId;
  return campaign.assets.find((asset) => asset.id === preferredId)
    ?? campaign.assets.find((asset) => asset.id === fallbackId)
    ?? null;
}

function openDestination(destination: string | null) {
  if (!destination) return;
  if (Platform.OS === 'web' && destination.startsWith('https://')) {
    window.open(destination, '_blank', 'noopener,noreferrer');
    return;
  }
  router.push(destination as never);
}

const styles = StyleSheet.create({
  group: { width: '100%' },
  secondaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  banner: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.large,
    backgroundColor: '#F3EEE8',
    ...shadow,
  },
  hero: { width: '100%', minHeight: 390 },
  heroDesktop: { minHeight: 450, borderRadius: 28 },
  secondary: { width: '100%', minHeight: 220 },
  secondaryDesktop: { minWidth: 280, flex: 1 },
  image: { ...StyleSheet.absoluteFillObject },
  imageFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#8A5A3A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28, 17, 11, 0.30)' },
  copy: {
    zIndex: 2,
    width: '100%',
    minWidth: 0,
    minHeight: 390,
    maxWidth: 690,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  secondaryCopy: { minHeight: 220 },
  eyebrow: {
    marginBottom: spacing.sm,
    color: '#F8E7D2',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    width: '100%',
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroTitleDesktop: { fontSize: 50, lineHeight: 56 },
  heroTitleDesktopMedium: { fontSize: 44, lineHeight: 50 },
  heroTitleDesktopLong: { fontSize: 37, lineHeight: 43 },
  heroTitleDesktopVeryLong: { fontSize: 31, lineHeight: 37 },
  heroTitleMobileLong: { fontSize: 30, lineHeight: 36 },
  heroTitleMobileVeryLong: { fontSize: 26, lineHeight: 32 },
  secondaryTitleLong: { fontSize: 29, lineHeight: 35 },
  secondaryTitleVeryLong: { fontSize: 25, lineHeight: 31 },
  subtitle: {
    width: '100%',
    minWidth: 0,
    maxWidth: 560,
    flexShrink: 1,
    marginTop: spacing.sm,
    color: '#FFF9F2',
    fontSize: 15,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  button: {
    maxWidth: '100%',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  buttonText: {
    maxWidth: '100%',
    flexShrink: 1,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: { opacity: 0.9 },
});
