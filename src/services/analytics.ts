import * as Crypto from 'expo-crypto';

import { supabase } from '@/src/lib/supabase';
import { getStoredJson, setStoredJson } from '@/src/lib/storage';
import { StoreAnalytics } from '@/src/types';

const VISITOR_STORAGE_KEY = 'joedla.analytics-visitor.v1';

async function getVisitorId(): Promise<string> {
  const stored = await getStoredJson<string | null>(VISITOR_STORAGE_KEY, null);
  if (stored) return stored;

  const visitorId = Crypto.randomUUID();
  await setStoredJson(VISITOR_STORAGE_KEY, visitorId);
  return visitorId;
}

async function recordEvent(
  eventType: 'site_visit' | 'product_view',
  productId?: string,
): Promise<void> {
  if (!supabase) return;

  try {
    const visitorId = await getVisitorId();
    await supabase.rpc('record_analytics_event', {
      event_visitor_id: visitorId,
      event_kind: eventType,
      event_product_id: productId ?? null,
    });
  } catch {
    // Métricas nunca devem impedir o cliente de usar a loja.
  }
}

export async function recordSiteVisit(): Promise<void> {
  await recordEvent('site_visit');
}

export async function recordProductView(productId: string): Promise<void> {
  await recordEvent('product_view', productId);
}

export async function loadStoreAnalytics(periodDays: number): Promise<StoreAnalytics> {
  if (!supabase) throw new Error('A conexão online da loja não foi configurada.');

  const { data, error } = await supabase.rpc('admin_analytics_summary', {
    period_days: periodDays,
  });
  if (error) throw error;

  const result = (data ?? {}) as Record<string, any>;
  const mapMetrics = (items: Record<string, any>[] | undefined) =>
    (items ?? []).map((item) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? 'Produto'),
      count: Number(item.count ?? 0),
    }));

  return {
    periodDays: Number(result.periodDays ?? periodDays),
    uniqueVisitors: Number(result.uniqueVisitors ?? 0),
    totalVisits: Number(result.totalVisits ?? 0),
    productViews: Number(result.productViews ?? 0),
    orders: Number(result.orders ?? 0),
    topViewed: mapMetrics(result.topViewed),
    topPurchased: mapMetrics(result.topPurchased),
  };
}
