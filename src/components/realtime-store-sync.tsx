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

const ORDER_TABLES = ['orders', 'order_transactions'] as const;

const AUXILIARY_TABLES = [
  'financial_entries',
  'coupons',
  'club_customers',
  'club_payments',
  'club_points_ledger',
  'club_rewards',
  'club_settings',
] as const;

const ALL_TABLES = [...STORE_TABLES, ...ORDER_TABLES, ...AUXILIARY_TABLES] as const;

export function RealtimeStoreSync() {
  const pathname = usePathname();
  const { cloudEnabled, isAdmin, refreshStore, refreshAdminOrders } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshStoreRef = useRef(refreshStore);
  const refreshAdminOrdersRef = useRef(refreshAdminOrders);

  useEffect(() => {
    refreshStoreRef.current = refreshStore;
    refreshAdminOrdersRef.current = refreshAdminOrders;
  }, [refreshAdminOrders, refreshStore]);

  useEffect(() => {
    if (!cloudEnabled || !supabase) return;

    const channel = supabase.channel('joedla-live-sync');

    const scheduleRefresh = (table: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        if (STORE_TABLES.includes(table as never)) {
          void refreshStoreRef.current().catch(() => undefined);
        }

        if (isAdmin && ORDER_TABLES.includes(table as never)) {
          void refreshAdminOrdersRef.current().catch(() => undefined);
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
  }, [cloudEnabled, isAdmin]);

  useEffect(() => {
    if (!cloudEnabled) return;

    const timer = setTimeout(() => {
      void refreshStoreRef.current().catch(() => undefined);
      if (isAdmin && pathname.startsWith('/admin')) {
        void refreshAdminOrdersRef.current().catch(() => undefined);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [cloudEnabled, isAdmin, pathname]);

  return null;
}
