import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { colors, spacing } from '@/src/theme';

export function AdminGuard({ children }: PropsWithChildren) {
  const {
    isAdmin,
    loading,
    marketing,
    refreshStore,
    refreshAdminOrders,
  } = useStore();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const refreshStoreRef = useRef(refreshStore);
  const refreshAdminOrdersRef = useRef(refreshAdminOrders);

  useEffect(() => {
    refreshStoreRef.current = refreshStore;
    refreshAdminOrdersRef.current = refreshAdminOrders;
  }, [refreshAdminOrders, refreshStore]);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin || loading) return;

      void Promise.allSettled([
        refreshStoreRef.current(),
        refreshAdminOrdersRef.current(),
      ]).then((results) => {
        results.forEach((result) => {
          if (result.status === 'rejected') {
            console.warn('Falha ao sincronizar dados do painel.', result.reason);
          }
        });
      });
    }, [isAdmin, loading]),
  );

  const carouselCampaigns = useMemo(() => {
    if (!marketing.settings.enabled) return [];
    return activePlacements(marketing.campaigns)
      .filter(({ placement }) =>
        ['home_secondary_1', 'home_secondary_2', 'home_secondary_3'].includes(
          placement.position,
        ),
      )
      .map(({ campaign, placement }) => ({
        id: campaign.id,
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

  function openCarouselCampaigns() {
    if (carouselCampaigns.length === 1) {
      router.push({
        pathname: '/admin/campaign/[id]',
        params: { id: carouselCampaigns[0].id },
      });
      return;
    }

    router.push('/admin/campaigns');
  }

  return (
    <View style={styles.root}>
      {showCarouselNotice ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir campanhas do carrossel"
          onPress={openCarouselCampaigns}
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
              {carouselCampaigns.map((item) => item.name).join(' • ')}. Toque para abrir e pausar ou arquivar.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={styles.content}>{children}</View>
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
  pressed: { opacity: 0.78 },
});