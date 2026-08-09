import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useStore } from '@/src/context/store-context';
import { supabase } from '@/src/lib/supabase';

const STORE_TABLES = [
  'products',
  'categories',
  'store_settings',
  'marketing_campaigns',
  'marketing_campaign_assets',
  'marketing_campaign_badges',
  'marketing_campaign_placements',
  'marketing_campaign_price_rules',
  'marketing_campaign_targets',
  'marketing_settings',
  'product_promotions',
] as const;

const ORDER_TABLES = [
  'orders',
  'order_transactions',
] as const;

const AUXILIARY_TABLES = [
  'financial_entries',
  'coupons',
  'club_customers',
  'club_payments',
  'club_points_ledger',
  'club_rewards',
  'club_settings',
] as const;

const ALL_TABLES = [
  ...STORE_TABLES,
  ...ORDER_TABLES,
  ...AUXILIARY_TABLES,
] as const;

export function RealtimeStoreSync() {
  const pathname = usePathname();
  const {
    cloudEnabled,
    isAdmin,
    refreshStore,
    refreshAdminOrders,
  } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cloudEnabled || !supabase) return;

    const channel = supabase.channel('joedla-live-sync');

    const scheduleRefresh = (table: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        const shouldRefreshStore = STORE_TABLES.includes(table as never);
        const shouldRefreshOrders = ORDER_TABLES.includes(table as never);

        if (shouldRefreshStore) {
          void refreshStore().catch(() => undefined);
        }

        if (isAdmin && shouldRefreshOrders) {
          void refreshAdminOrders().catch(() => undefined);
        }
      }, 180);
    };

    ALL_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => scheduleRefresh(table),
      );
    });

    channel.subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [cloudEnabled, isAdmin, refreshAdminOrders, refreshStore]);

  useEffect(() => {
    if (!cloudEnabled) return;

    const timer = setTimeout(() => {
      void refreshStore().catch(() => undefined);
      if (isAdmin && pathname.startsWith('/admin')) {
        void refreshAdminOrders().catch(() => undefined);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [cloudEnabled, isAdmin, pathname, refreshAdminOrders, refreshStore]);

  return null;
}
