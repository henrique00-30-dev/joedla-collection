import { customerSupabase, supabase } from '@/src/lib/supabase';

export type ClubOrderSummary = { id: string; publicCode: string; total: number; createdAt: string; paid: number; remaining: number };
export type ClubLedgerEntry = { id: string; points: number; type: 'payment' | 'redemption' | 'adjustment' | 'reversal'; description: string; createdAt: string };
export type ClubReward = { id: string; productId: string; name: string; imageUrl: string; pointsRequired: number };
export type ClubSummary = { customer: { id: string; name: string; whatsapp: string }; points: number; orders: ClubOrderSummary[]; ledger: ClubLedgerEntry[]; rewards: ClubReward[] };
export type AdminClubCustomer = { id: string; name: string; whatsapp: string; points: number; total_purchases: number; total_open: number };
export type AdminClubCustomerDetail = ClubSummary & { payments: Array<{ id: string; orderId: string; amount: number; method: 'pix' | 'cash'; paidAt: string; note?: string | null }> };
export type ClubSettings = { active: boolean; reaisPerPoint: number; discountPoints: number; discountValue: number };
export type AdminClubReward = { id: string; productId: string; pointsRequired: number; active: boolean };
export type AdminFinancialReportPayment = { amount: number; method: 'pix' | 'cash'; paidAt: string; note?: string | null };
export type AdminFinancialReportRow = {
  orderId: string;
  publicCode: string;
  customerName: string;
  whatsapp: string;
  purchaseDate: string;
  total: number;
  paid: number;
  remaining: number;
  lastPaymentAt?: string | null;
  payments: AdminFinancialReportPayment[];
};
export type AdminFinancialReport = {
  summary: {
    completedOrders: number;
    customers: number;
    totalSales: number;
    totalReceived: number;
    totalPending: number;
  };
  rows: AdminFinancialReportRow[];
};

function publicClient() { const client = customerSupabase ?? supabase; if (!client) throw new Error('A conexão da loja não está configurada.'); return client; }
function adminClient() { if (!supabase) throw new Error('A conexão administrativa não está configurada.'); return supabase; }
function rpcError(error: unknown, fallback: string) { if (error && typeof error === 'object' && 'message' in error) return new Error(String((error as { message?: string }).message || fallback)); return new Error(fallback); }

export async function registerClub(name: string, whatsapp: string, pin: string) {
  const { data, error } = await publicClient().rpc('club_register', { p_name: name, p_whatsapp: whatsapp, p_pin: pin });
  if (error) throw rpcError(error, 'Não foi possível criar sua conta no Clube Joedla.');
  return data as { token: string; name: string };
}
export async function resetClubPin(whatsapp: string, orderCode: string, newPin: string) {
  const { data, error } = await publicClient().rpc('club_reset_pin', { p_whatsapp: whatsapp, p_order_code: orderCode, p_new_pin: newPin });
  if (error) throw rpcError(error, 'Não foi possível redefinir seu PIN.');
  return data as { success: boolean };
}
export async function activateClub(whatsapp: string, orderCode: string, pin: string) {
  const { data, error } = await publicClient().rpc('club_activate', { p_whatsapp: whatsapp, p_order_code: orderCode, p_pin: pin });
  if (error) throw rpcError(error, 'Não foi possível ativar o Clube Joedla.');
  return data as { token: string; name: string };
}
export async function loginClub(whatsapp: string, pin: string) {
  const { data, error } = await publicClient().rpc('club_login', { p_whatsapp: whatsapp, p_pin: pin });
  if (error) throw rpcError(error, 'WhatsApp ou PIN inválidos.');
  return data as { token: string; name: string };
}
export async function loadClubSummary(token: string): Promise<ClubSummary> {
  const { data, error } = await publicClient().rpc('club_customer_summary', { p_token: token });
  if (error) throw rpcError(error, 'Não foi possível carregar seus pontos.');
  return data as ClubSummary;
}
export async function prepareCheckoutBenefit(input: { requestId: string; couponCode?: string; clubToken?: string; points?: number }) {
  const { error } = await publicClient().rpc('prepare_checkout_benefit', {
    p_request_id: input.requestId,
    p_coupon_code: input.couponCode?.trim() || null,
    p_club_token: input.clubToken?.trim() || null,
    p_points: Math.max(0, Math.floor(input.points ?? 0)),
  });
  if (error) throw rpcError(error, 'Não foi possível validar o benefício.');
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
export async function registerClubPayment(input: { orderId: string; amount: number; method: 'pix' | 'cash'; note?: string }) {
  const { data, error } = await adminClient().rpc('club_admin_register_payment', { p_order_id: input.orderId, p_amount: input.amount, p_method: input.method, p_note: input.note?.trim() || null });
  if (error) throw rpcError(error, 'Não foi possível registrar o pagamento.');
  return data as { paid: number; remaining: number; pointsAdded: number; pointsBalance: number };
}
export async function loadAdminFinancialReport(): Promise<AdminFinancialReport> {
  const { data, error } = await adminClient().rpc('club_admin_financial_report');
  if (error) throw rpcError(error, 'Não foi possível carregar o relatório financeiro.');
  return data as AdminFinancialReport;
}
export async function loadClubSettings(): Promise<ClubSettings> {
  const { data, error } = await adminClient().from('club_settings').select('active,reais_per_point,discount_points,discount_value').eq('id', 1).single();
  if (error) throw error;
  return { active: Boolean(data.active), reaisPerPoint: Number(data.reais_per_point), discountPoints: Number(data.discount_points), discountValue: Number(data.discount_value) };
}
export async function saveClubSettings(settings: ClubSettings) {
  const { error } = await adminClient().from('club_settings').update({ active: settings.active, reais_per_point: settings.reaisPerPoint, discount_points: settings.discountPoints, discount_value: settings.discountValue, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw error;
}
export async function loadAdminClubRewards(): Promise<AdminClubReward[]> {
  const { data, error } = await adminClient().from('club_rewards').select('id,product_id,points_required,active').order('points_required');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, productId: row.product_id, pointsRequired: Number(row.points_required), active: Boolean(row.active) }));
}
export async function saveClubReward(input: { productId: string; pointsRequired: number; active?: boolean }) {
  const { error } = await adminClient().from('club_rewards').upsert({ product_id: input.productId, points_required: input.pointsRequired, active: input.active ?? true, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
  if (error) throw error;
}
export async function removeClubReward(productId: string) {
  const { error } = await adminClient().from('club_rewards').delete().eq('product_id', productId);
  if (error) throw error;
}
