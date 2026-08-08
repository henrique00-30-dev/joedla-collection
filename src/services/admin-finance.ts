import { supabase } from '@/src/lib/supabase';
import { OrderStatus } from '@/src/types';

export type AdminStoreCustomer = {
  id: string;
  name: string;
  whatsapp: string;
  total_orders: number;
  total_ordered: number;
  total_paid: number;
  total_open: number;
  club_member: boolean;
  first_order_at: string;
  last_order_at: string;
};

export type AdminStoreCustomerOrder = {
  id: string;
  publicCode: string;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  createdAt: string;
  financial: OrderFinancialSummary;
};

export type AdminStoreCustomerDetail = {
  customer: {
    id: string;
    name: string;
    whatsapp: string;
    firstOrderAt: string;
    lastOrderAt: string;
  };
  club: {
    member: boolean;
    points: number;
  };
  orders: AdminStoreCustomerOrder[];
};

export type PaymentMethod = 'pix' | 'cash' | 'card_link' | 'other';
export type OrderTransactionType = 'payment' | 'refund';

export type OrderFinancialSummary = {
  total: number;
  payments: number;
  refunds: number;
  paid: number;
  remaining: number;
  status?: 'pending' | 'partial' | 'paid' | 'refunded';
};

export type OrderTransaction = {
  id: string;
  type: OrderTransactionType;
  amount: number;
  method: PaymentMethod;
  note?: string | null;
  occurredAt: string;
};

export type OrderFinancialDetail = {
  summary: OrderFinancialSummary;
  transactions: OrderTransaction[];
};

export type FinancialEntryKind = 'income' | 'expense';
export type FinancialEntryCategory =
  | 'sale_payment'
  | 'refund'
  | 'merchandise'
  | 'packaging'
  | 'gift'
  | 'marketing'
  | 'operating'
  | 'other_income'
  | 'other';

export type FinancialEntry = {
  id: string;
  kind: FinancialEntryKind;
  category: FinancialEntryCategory;
  amount: number;
  description: string;
  occurredAt: string;
  orderId?: string | null;
};

export type FinancialDailyPoint = {
  date: string;
  income: number;
  expense: number;
  balance: number;
};

export type FinancialExpenseCategory = {
  category: FinancialEntryCategory;
  amount: number;
};

export type AdminFinancialOverview = {
  summary: {
    income: number;
    expenses: number;
    balance: number;
    pending: number;
    grossSales: number;
    costOfGoodsSold: number;
    grossMargin: number;
  };
  entries: FinancialEntry[];
  daily: FinancialDailyPoint[];
  expenseCategories: FinancialExpenseCategory[];
};

function client() {
  if (!supabase) throw new Error('A conexão administrativa não está configurada.');
  return supabase;
}

function rpcError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '').trim();
    if (message) return new Error(message);
  }
  return new Error(fallback);
}

export async function loadAdminStoreCustomers(search = ''): Promise<AdminStoreCustomer[]> {
  const { data, error } = await client().rpc('admin_store_customers', {
    p_search: search.trim(),
  });
  if (error) throw rpcError(error, 'Não foi possível carregar os clientes.');
  return (Array.isArray(data) ? data : []) as AdminStoreCustomer[];
}

export async function loadAdminStoreCustomerDetail(customerId: string): Promise<AdminStoreCustomerDetail> {
  const { data, error } = await client().rpc('admin_store_customer_detail', {
    p_customer_id: customerId,
  });
  if (error) throw rpcError(error, 'Não foi possível carregar a ficha do cliente.');
  return data as AdminStoreCustomerDetail;
}

export async function loadOrderFinancialDetail(orderId: string): Promise<OrderFinancialDetail> {
  const { data, error } = await client().rpc('admin_order_financial_detail', {
    p_order_id: orderId,
  });
  if (error) throw rpcError(error, 'Não foi possível carregar o financeiro do pedido.');
  return data as OrderFinancialDetail;
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const { data, error } = await client().rpc('admin_set_order_status', {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) throw rpcError(error, 'Não foi possível atualizar a situação do pedido.');
  return data as { id: string; status: OrderStatus };
}

export async function deleteCancelledOrder(orderId: string) {
  const { data, error } = await client().rpc('admin_delete_cancelled_order', {
    p_order_id: orderId,
  });
  if (error) throw rpcError(error, 'Não foi possível excluir o pedido cancelado.');
  return data as { id: string; deleted: boolean };
}

export async function registerOrderPayment(input: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}) {
  const { data, error } = await client().rpc('admin_register_order_payment', {
    p_order_id: input.orderId,
    p_amount: input.amount,
    p_method: input.method,
    p_note: input.note?.trim() || null,
  });
  if (error) throw rpcError(error, 'Não foi possível registrar o pagamento.');
  return data as OrderFinancialSummary & {
    transactionId: string;
    pointsAdded: number;
    pointsAdjusted: number;
    pointsBalance: number;
  };
}

export async function registerOrderRefund(input: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reason: string;
}) {
  const { data, error } = await client().rpc('admin_register_order_refund', {
    p_order_id: input.orderId,
    p_amount: input.amount,
    p_method: input.method,
    p_reason: input.reason.trim(),
  });
  if (error) throw rpcError(error, 'Não foi possível registrar o estorno.');
  return data as OrderFinancialSummary & {
    transactionId: string;
    pointsAdjusted: number;
    pointsBalance: number;
  };
}

export async function loadAdminFinancialOverview(start?: Date, end?: Date): Promise<AdminFinancialOverview> {
  const { data, error } = await client().rpc('admin_financial_overview', {
    p_start: start?.toISOString(),
    p_end: end?.toISOString(),
  });
  if (error) throw rpcError(error, 'Não foi possível carregar o financeiro.');
  return data as AdminFinancialOverview;
}

export async function addFinancialEntry(input: {
  kind: FinancialEntryKind;
  category: Exclude<FinancialEntryCategory, 'sale_payment' | 'refund'>;
  amount: number;
  description: string;
  occurredAt?: Date;
}) {
  const { data, error } = await client().rpc('admin_add_financial_entry', {
    p_kind: input.kind,
    p_category: input.category,
    p_amount: input.amount,
    p_description: input.description.trim(),
    p_occurred_at: input.occurredAt?.toISOString(),
  });
  if (error) throw rpcError(error, 'Não foi possível salvar o lançamento financeiro.');
  return data as string;
}

export async function setProductAcquisitionCost(productId: string, cost: number) {
  const { error } = await client().rpc('admin_set_product_acquisition_cost', {
    p_product_id: productId,
    p_cost: cost,
  });
  if (error) throw rpcError(error, 'Não foi possível salvar o custo do produto.');
}
