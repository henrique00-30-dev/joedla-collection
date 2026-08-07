import { useEffect, useRef } from 'react';

import { useStore } from '@/src/context/store-context';
import { customerSupabase } from '@/src/lib/supabase';
import { claimCustomerOrders } from '@/src/services/customer-orders';
import { loadFavoriteProductIds, setCustomerFavorite } from '@/src/services/customer';

export function CustomerAccountBridge() {
  const { customerOrders, favorites, toggleFavorite } = useStore();
  const initializedUser = useRef<string | null>(null);
  const syncingFavorites = useRef(false);

  useEffect(() => {
    if (!customerSupabase) return;

    async function syncAccount() {
      const { data } = await customerSupabase!.auth.getUser();
      const user = data.user;
      if (!user) {
        initializedUser.current = null;
        return;
      }

      await claimCustomerOrders(customerOrders).catch(() => undefined);

      if (initializedUser.current !== user.id) {
        syncingFavorites.current = true;
        try {
          const cloudIds = await loadFavoriteProductIds();
          for (const productId of favorites) {
            if (!cloudIds.includes(productId)) await setCustomerFavorite(productId, true);
          }
          for (const productId of cloudIds) {
            if (!favorites.includes(productId)) toggleFavorite(productId);
          }
          initializedUser.current = user.id;
        } finally {
          syncingFavorites.current = false;
        }
      }
    }

    void syncAccount();
    const { data } = customerSupabase.auth.onAuthStateChange(() => void syncAccount());
    return () => data.subscription.unsubscribe();
  }, [customerOrders, favorites, toggleFavorite]);

  useEffect(() => {
    if (!customerSupabase || !initializedUser.current || syncingFavorites.current) return;

    let cancelled = false;
    async function persistFavorites() {
      try {
        const cloudIds = await loadFavoriteProductIds();
        if (cancelled) return;
        const all = new Set([...cloudIds, ...favorites]);
        await Promise.all(
          Array.from(all).map((productId) =>
            setCustomerFavorite(productId, favorites.includes(productId)),
          ),
        );
      } catch {
        // Favoritos locais continuam funcionando mesmo se a sincronização falhar.
      }
    }
    void persistFavorites();
    return () => { cancelled = true; };
  }, [favorites]);

  return null;
}
