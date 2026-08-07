import { customerSupabase } from '@/src/lib/supabase';

export type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
  isDefault: boolean;
};

export type CustomerCoupon = {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  endsAt: string | null;
  usedAt: string | null;
};

export type PrivacyRequest = {
  id: string;
  requestType: 'data_export' | 'account_deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
};

function requireClient() {
  if (!customerSupabase) throw new Error('A conexão da loja não está configurada.');
  return customerSupabase;
}

async function requireUserId() {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Entre na sua conta para continuar.');
  return data.user.id;
}

export async function loadCustomerAddresses(): Promise<CustomerAddress[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label ?? 'Principal',
    recipientName: row.recipient_name ?? '',
    phone: row.phone ?? '',
    cep: row.cep ?? '',
    street: row.street ?? '',
    number: row.number ?? '',
    complement: row.complement ?? '',
    neighborhood: row.neighborhood ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    reference: row.reference ?? '',
    isDefault: Boolean(row.is_default),
  }));
}

export async function saveCustomerAddress(address: Omit<CustomerAddress, 'id'> & { id?: string }) {
  const client = requireClient();
  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    label: address.label.trim() || 'Principal',
    recipient_name: address.recipientName.trim(),
    phone: address.phone.trim() || null,
    cep: address.cep.replace(/\D/g, '').slice(0, 8) || null,
    street: address.street.trim(),
    number: address.number.trim(),
    complement: address.complement.trim() || null,
    neighborhood: address.neighborhood.trim(),
    city: address.city.trim(),
    state: address.state.trim().toUpperCase().slice(0, 2),
    reference: address.reference.trim() || null,
    is_default: address.isDefault,
  };
  if (address.id) {
    const { error } = await client.from('customer_addresses').update(payload).eq('id', address.id).eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await client.from('customer_addresses').insert(payload);
    if (error) throw error;
  }
}

export async function deleteCustomerAddress(id: string) {
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client.from('customer_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function loadCustomerCoupons(): Promise<CustomerCoupon[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('customer_coupons')
    .select('used_at, coupons(id, code, description, discount_type, discount_value, min_order_value, ends_at, active)')
    .eq('user_id', userId);
  if (error) throw error;

  return (data ?? []).flatMap((row: any) => {
    const coupon = Array.isArray(row.coupons) ? row.coupons[0] : row.coupons;
    if (!coupon?.id || coupon.active === false) return [];
    return [{
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      minOrderValue: Number(coupon.min_order_value ?? 0),
      endsAt: coupon.ends_at ?? null,
      usedAt: row.used_at ?? null,
    } satisfies CustomerCoupon];
  });
}

export async function changeCustomerPassword(currentPassword: string, newPassword: string) {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const email = userData.user?.email;
  if (!email) throw new Error('Sessão inválida. Entre novamente.');

  const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new Error('A senha atual está incorreta.');
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new Error('A nova senha deve ter pelo menos 8 caracteres, com letras e números.');
  }

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function createPrivacyRequest(requestType: PrivacyRequest['requestType']) {
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client.from('customer_privacy_requests').insert({
    user_id: userId,
    request_type: requestType,
    status: 'pending',
  });
  if (error) throw error;
}

export async function loadPrivacyRequests(): Promise<PrivacyRequest[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('customer_privacy_requests')
    .select('id, request_type, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    requestType: row.request_type,
    status: row.status,
    createdAt: row.created_at,
  }));
}
