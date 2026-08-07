import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useStore } from '@/src/context/store-context';
import { activePlacements } from '@/src/features/marketing/storefront';
import { colors, radii, spacing } from '@/src/theme';

export function AdminGuard({ children }: PropsWithChildren) {
  const { isAdmin, loading, marketing } = useStore();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 700;

  const carouselCampaigns = useMemo(() => {
    if (!marketing.settings.enabled) return [];
    return activePlacements(marketing.campaigns)
      .filter(({ placement }) =>
        ['home_secondary_1', 'home_secondary_2', 'home_secondary_3'].includes(
          placement.position,
        ),
      )
      .map(({ campaign, placement }) => ({
        id: placement.id,
        name: campaign.name,
        position: placement.position,
      }));
  }, [marketing.campaigns, marketing.settings.enabled]);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/admin/login');
  }, [isAdmin, loading]);

  if (loading || !isAdmin) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando acesso...</Text>
      </View>
    );
  }

  const showCarouselNotice =
    pathname === '/admin/appearance' && carouselCampaigns.length > 0;

  return (
    <View style={styles.root}>
      {showCarouselNotice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir campanhas do carrossel"
          onPress={() => router.push('/admin/campaigns')}
          style={({ pressed }) => [
            styles.carouselNotice,
            compact && styles.carouselNoticeCompact,
            pressed && styles.pressed,
          ]}>
          <Ionicons name="megaphone-outline" size={18} color={colors.warning} />
          <View style={styles.carouselNoticeCopy}>
            <Text style={styles.carouselNoticeTitle}>
              {carouselCampaigns.length === 1
                ? '1 campanha ocupa o carrossel'
                : `${carouselCampaigns.length} campanhas ocupam o carrossel`}
            </Text>
            <Text numberOfLines={compact ? 2 : 1} style={styles.carouselNoticeText}>
              {carouselCampaigns.map((item) => item.name).join(' • ')}. Esses itens aparecem além do banner principal.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={styles.content}>{children}</View>

      {pathname !== '/admin/community' ? (
        <View style={[styles.shortcutBar, compact && styles.shortcutBarCompact]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir moderação de clientes"
            onPress={() => router.push('/admin/community')}
            style={({ pressed }) => [
              styles.communityShortcut,
              compact && styles.communityShortcutCompact,
              pressed && styles.pressed,
            ]}>
            <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
            <Text style={styles.communityShortcutText}>Moderação</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
  },
  content: {
    minWidth: 0,
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  carouselNotice: {
    width: '100%',
    minWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
  },
  carouselNoticeCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  carouselNoticeCopy: {
    minWidth: 0,
    flex: 1,
  },
  carouselNoticeTitle: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
  },
  carouselNoticeText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  shortcutBar: {
    width: '100%',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  shortcutBarCompact: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  communityShortcut: {
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  communityShortcutCompact: {
    width: '100%',
  },
  communityShortcutText: {
    flexShrink: 1,
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: { opacity: 0.78 },
});
