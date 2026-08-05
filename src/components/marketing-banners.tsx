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

        return (
          <Pressable
            key={placement.id}
            accessibilityRole={destination ? 'link' : undefined}
            accessibilityLabel={asset?.altText || placement.title || campaign.name}
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
                contentFit="cover"
                contentPosition={{
                  left: `${Math.round(asset.focalX * 100)}%`,
                  top: `${Math.round(asset.focalY * 100)}%`,
                }}
                style={[styles.image, { transform: [{ scale: asset.zoom }] }]}
              />
            ) : (
              <View style={styles.imageFallback} />
            )}

            <View style={styles.overlay} />
            <View style={[styles.copy, !isHero && styles.secondaryCopy]}>
              <Text style={styles.eyebrow}>JOEDLA COLLECTION</Text>
              <Text
                numberOfLines={isHero ? 3 : 2}
                style={[styles.title, isHero && desktop && styles.heroTitleDesktop]}>
                {placement.title || campaign.name}
              </Text>
              {placement.subtitle ? (
                <Text numberOfLines={isHero ? 3 : 2} style={styles.subtitle}>
                  {placement.subtitle}
                </Text>
              ) : null}
              {placement.buttonLabel && destination ? (
                <View style={styles.button}>
                  <Text style={styles.buttonText}>{placement.buttonLabel}</Text>
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
    backgroundColor: colors.primaryDark,
    ...shadow,
  },
  hero: { width: '100%', minHeight: 390 },
  heroDesktop: { minHeight: 450, borderRadius: 28 },
  secondary: { width: '100%', minHeight: 220 },
  secondaryDesktop: { minWidth: 280, flex: 1 },
  image: { ...StyleSheet.absoluteFillObject },
  imageFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#8A5A3A' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28, 17, 11, 0.42)' },
  copy: {
    zIndex: 2,
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
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  heroTitleDesktop: { fontSize: 50, lineHeight: 56 },
  subtitle: {
    maxWidth: 560,
    marginTop: spacing.sm,
    color: '#FFF9F2',
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  buttonText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.9 },
});
