import { supabase } from '@/src/lib/supabase';

export type AdminCoupon = {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  maxUses: number | null;
  uses: number;
};

function client() {
  if (!supabase) throw new Error('A conexão administrativa não está configurada.');
  return supabase;
}

function rpcError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: string }).message || fallback));
  }
  return new Error(fallback);
}

export async function loadAdminCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await client().rpc('club_admin_coupons');
  if (error) throw rpcError(error, 'Não foi possível carregar os cupons.');
  return (data ?? []) as AdminCoupon[];
}

export async function saveAdminCoupon(input: {
  id?: string;
  code: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  maxUses?: number | null;
}) {
  const { data, error } = await client().rpc('club_admin_save_coupon', {
    p_id: input.id ?? null,
    p_code: input.code,
    p_description: input.description?.trim() || null,
    p_discount_type: input.discountType,
    p_discount_value: input.discountValue,
    p_min_order_value: input.minOrderValue,
    p_starts_at: input.startsAt || null,
    p_ends_at: input.endsAt || null,
    p_active: input.active,
    p_max_uses: input.maxUses ?? null,
  });
  if (error) throw rpcError(error, 'Não foi possível salvar o cupom.');
  return data as string;
}

export async function deleteAdminCoupon(id: string) {
  const { error } = await client().rpc('club_admin_delete_coupon', { p_id: id });
  if (error) throw rpcError(error, 'Não foi possível remover o cupom.');
}
