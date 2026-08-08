import { customerSupabase, supabase } from '@/src/lib/supabase';

export type ClubOrderSummary = {
  id: string;
  publicCode: string;
  total: number;
  createdAt: string;
  paid: number;
  remaining: number;
};

export type ClubLedgerEntry = {
  id: string;
  points: number;
  type: 'payment' | 'redemption' | 'adjustment' | 'reversal';
  description: string;
  createdAt: string;
};

export type ClubReward = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string;
  pointsRequired: number;
};

export type ClubSummary = {
  customer: { id: string; name: string; whatsapp: string };
  points: number;
  orders: ClubOrderSummary[];
  ledger: ClubLedgerEntry[];
  rewards: ClubReward[];
};

export type AdminClubCustomer = {
  id: string;
  name: string;
  whatsapp: string;
  points: number;
  total_purchases: number;
  total_open: number;
};

export type AdminClubCustomerDetail = ClubSummary & {
  payments: Array<{
    id: string;
    orderId: string;
    amount: number;
    method: 'pix' | 'cash';
    paidAt: string;
    note?: string | null;
  }>;
};

function publicClient() {
  const client = customerSupabase ?? supabase;
  if (!client) throw new Error('A conexão da loja não está configurada.');
  return client;
}

function adminClient() {
  if (!supabase) throw new Error('A conexão administrativa não está configurada.');
  return supabase;
}

function rpcError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: string }).message || fallback));
  }
  return new Error(fallback);
}

export async function activateClub(whatsapp: string, orderCode: string, pin: string) {
  const { data, error } = await publicClient().rpc('club_activate', {
    p_whatsapp: whatsapp,
    p_order_code: orderCode,
    p_pin: pin,
  });
  if (error) throw rpcError(error, 'Não foi possível ativar o Clube Joedla.');
  return data as { token: string; name: string };
}

export async function loginClub(whatsapp: string, pin: string) {
  const { data, error } = await publicClient().rpc('club_login', {
    p_whatsapp: whatsapp,
    p_pin: pin,
  });
  if (error) throw rpcError(error, 'WhatsApp ou PIN inválidos.');
  return data as { token: string; name: string };
}

export async function loadClubSummary(token: string): Promise<ClubSummary> {
  const { data, error } = await publicClient().rpc('club_customer_summary', { p_token: token });
  if (error) throw rpcError(error, 'Não foi possível carregar seus pontos.');
  return data as ClubSummary;
}

export async function loadAdminClubCustomers(search = ''): Promise<AdminClubCustomer[]> {
  const { data, error } = await adminClient().rpc('club_admin_customers', { p_search: search.trim() });
  if (error) throw rpcError(error, 'Não foi possível carregar os clientes.');
  return (data ?? []) as AdminClubCustomer[];
}

export async function loadAdminClubCustomerDetail(customerId: string): Promise<AdminClubCustomerDetail> {
  const { data, error } = await adminClient().rpc('club_admin_customer_detail', { p_customer_id: customerId });
  if (error) throw rpcError(error, 'Não foi possível carregar a ficha do cliente.');
  return data as AdminClubCustomerDetail;
}

export async function registerClubPayment(input: {
  orderId: string;
  amount: number;
  method: 'pix' | 'cash';
  note?: string;
}) {
  const { data, error } = await adminClient().rpc('club_admin_register_payment', {
    p_order_id: input.orderId,
    p_amount: input.amount,
    p_method: input.method,
    p_note: input.note?.trim() || null,
  });
  if (error) throw rpcError(error, 'Não foi possível registrar o pagamento.');
  return data as { paid: number; remaining: number; pointsAdded: number; pointsBalance: number };
}
