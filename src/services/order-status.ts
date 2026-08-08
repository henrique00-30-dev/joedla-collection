import { customerSupabase, supabase } from '@/src/lib/supabase';
import { Order } from '@/src/types';

type OrderStatusRow = {
  id: string;
  lookup_token: string;
  status: Order['status'];
  updated_at: string;
};

function publicClient() {
  const client = customerSupabase ?? supabase;
  if (!client) throw new Error('A conexão da loja não está configurada.');
  return client;
}

export async function syncOrderStatuses(orders: Order[]): Promise<Order[]> {
  const tokens = orders
    .map((order) => order.lookupToken)
    .filter((token): token is string => Boolean(token));

  if (!tokens.length) return orders;

  const { data, error } = await publicClient().rpc('get_order_statuses', {
    p_lookup_tokens: tokens,
  });

  if (error) throw new Error(error.message || 'Não foi possível atualizar seus pedidos.');

  const rows = (data ?? []) as OrderStatusRow[];
  const byToken = new Map(rows.map((row) => [row.lookup_token, row]));

  return orders.map((order) => {
    const fresh = order.lookupToken ? byToken.get(order.lookupToken) : undefined;
    return fresh ? { ...order, status: fresh.status } : order;
  });
}
