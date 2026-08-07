import { useEffect, useRef, useState } from 'react';

import { useStore } from '@/src/context/store-context';
import { customerSupabase } from '@/src/lib/supabase';
import { claimCustomerOrders } from '@/src/services/customer-orders';
import { loadFavoriteProductIds, setCustomerFavorite } from '@/src/services/customer';

export function CustomerAccountBridge() {
  const { customerOrders, favorites, toggleFavorite } = useStore();
  const [userId, setUserId] = useState<string | null>(null);
  const favoritesReadyForUser = useRef<string | null>(null);
  const syncingFavorites = useRef(false);

  useEffect(() => {
    if (!customerSupabase) return;

    async function refreshUser() {
      const { data } = await customerSupabase!.auth.getUser();
      setUserId(data.user?.id ?? null);
      if (!data.user) favoritesReadyForUser.current = null;
    }

    void refreshUser();
    const { data } = customerSupabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) favoritesReadyForUser.current = null;
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void claimCustomerOrders(customerOrders).catch(() => undefined);
  }, [customerOrders, userId]);

  useEffect(() => {
    if (!userId || favoritesReadyForUser.current === userId || syncingFavorites.current) return;

    let cancelled = false;
    syncingFavorites.current = true;

    async function initializeFavorites() {
      try {
        const cloudIds = await loadFavoriteProductIds();
        if (cancelled) return;

        for (const productId of favorites) {
          if (!cloudIds.includes(productId)) await setCustomerFavorite(productId, true);
        }
        for (const productId of cloudIds) {
          if (!favorites.includes(productId)) toggleFavorite(productId);
        }

        if (!cancelled) favoritesReadyForUser.current = userId;
      } catch {
        // Favoritos locais continuam disponíveis mesmo se a nuvem estiver temporariamente indisponível.
      } finally {
        syncingFavorites.current = false;
      }
    }

    void initializeFavorites();
    return () => { cancelled = true; };
    // A primeira fusão usa o snapshot local existente no momento do login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || favoritesReadyForUser.current !== userId || syncingFavorites.current) return;

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
        // O estado local não é descartado se a sincronização falhar.
      }
    }

    void persistFavorites();
    return () => { cancelled = true; };
  }, [favorites, userId]);

  return null;
}
