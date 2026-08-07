import { customerSupabase } from '@/src/lib/supabase';
import type { Order } from '@/src/types';

export async function claimCustomerOrders(orders: Order[]) {
  if (!customerSupabase || !orders.length) return;

  const { data: userData } = await customerSupabase.auth.getUser();
  if (!userData.user) return;

  await Promise.all(
    orders
      .filter((order) => Boolean(order.id && order.lookupToken))
      .map(async (order) => {
        const { error } = await customerSupabase.rpc('claim_order_for_current_customer', {
          requested_order_id: order.id,
          requested_lookup_token: order.lookupToken,
        });
        if (error) throw error;
      }),
  );
}
