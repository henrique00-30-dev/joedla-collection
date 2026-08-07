import type { User } from '@supabase/supabase-js';

import { customerSupabase, supabase } from '@/src/lib/supabase';

export type CustomerProfile = {
  id: string;
  fullName: string;
  whatsapp: string;
  birthDate: string;
  marketingConsent: boolean;
};

export type ProductReview = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  displayName: string;
  verifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote: string;
  createdAt: string;
};

export type ProductQuestion = {
  id: string;
  userId: string;
  productId: string;
  question: string;
  displayName: string;
  answer: string;
  status: 'pending' | 'published' | 'rejected';
  createdAt: string;
};

export type CustomerNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type LoyaltySummary = {
  points: number;
  lifetimePoints: number;
};

function requireCustomerClient() {
  if (!customerSupabase) throw new Error('A conexão da loja não está configurada.');
  return customerSupabase;
}

function requireAdminClient() {
  if (!supabase) throw new Error('A conexão administrativa não está configurada.');
  return supabase;
}

async function currentCustomer(): Promise<User> {
  const client = requireCustomerClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Entre na sua conta para continuar.');
  return data.user;
}

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  password: string;
  whatsapp?: string;
}) {
  const client = requireCustomerClient();
  const { data, error } = await client.functions.invoke('register-customer', {
    body: input,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const { error: loginError } = await client.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (loginError) throw loginError;
}

export async function signInCustomer(email: string, password: string) {
  const client = requireCustomerClient();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error('E-mail ou senha inválidos.');
}

export async function signOutCustomer() {
  const client = requireCustomerClient();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function loadCustomerUser() {
  const client = requireCustomerClient();
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

export async function loadCustomerProfile(): Promise<CustomerProfile | null> {
  const client = requireCustomerClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, whatsapp, birth_date, marketing_consent')
    .eq('id', userData.user.id)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name ?? '',
    whatsapp: data.whatsapp ?? '',
    birthDate: data.birth_date ?? '',
    marketingConsent: Boolean(data.marketing_consent),
  };
}

export async function saveCustomerProfile(profile: Omit<CustomerProfile, 'id'>) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const previous = await loadCustomerProfile();

  const { error } = await client
    .from('profiles')
    .update({
      full_name: profile.fullName.trim(),
      whatsapp: profile.whatsapp.trim() || null,
      birth_date: profile.birthDate || null,
      marketing_consent: profile.marketingConsent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) throw error;

  await client.auth.updateUser({ data: { full_name: profile.fullName.trim(), whatsapp: profile.whatsapp.trim() } });

  if (previous?.marketingConsent !== profile.marketingConsent) {
    await client.from('marketing_consent_events').insert({
      user_id: user.id,
      consented: profile.marketingConsent,
      source: 'account',
    });
  }
}

export async function loadFavoriteProductIds(): Promise<string[]> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client
    .from('customer_favorites')
    .select('product_id')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

export async function setCustomerFavorite(productId: string, favorite: boolean) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  if (favorite) {
    const { error } = await client.from('customer_favorites').upsert({ user_id: user.id, product_id: productId });
    if (error) throw error;
  } else {
    const { error } = await client.from('customer_favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    if (error) throw error;
  }
}

export async function recordRecentlyViewed(productId: string) {
  const client = requireCustomerClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return;
  await client.from('recently_viewed_products').upsert({
    user_id: userData.user.id,
    product_id: productId,
    viewed_at: new Date().toISOString(),
  });
}

export async function loadRecentlyViewedProductIds(): Promise<string[]> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client
    .from('recently_viewed_products')
    .select('product_id, viewed_at')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

function mapReview(row: Record<string, any>): ProductReview {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    rating: Number(row.rating),
    title: row.title ?? '',
    comment: row.comment ?? '',
    displayName: row.display_name ?? 'Cliente',
    verifiedPurchase: Boolean(row.verified_purchase),
    status: row.status,
    moderationNote: row.moderation_note ?? '',
    createdAt: row.created_at,
  };
}

export async function loadProductReviews(productId: string): Promise<ProductReview[]> {
  const client = requireCustomerClient();
  const { data, error } = await client
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function createProductReview(productId: string, rating: number, comment: string, title = '') {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { error } = await client.from('product_reviews').insert({
    user_id: user.id,
    product_id: productId,
    rating,
    title: title.trim() || null,
    comment: comment.trim(),
    display_name: 'Cliente',
    status: 'pending',
  });
  if (error?.code === '23505') throw new Error('Você já avaliou este produto.');
  if (error) throw error;
}

export async function reportReview(reviewId: string, reason: string) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { error } = await client.from('review_reports').insert({ review_id: reviewId, user_id: user.id, reason: reason.trim() });
  if (error?.code === '23505') throw new Error('Você já denunciou esta avaliação.');
  if (error) throw error;
}

function mapQuestion(row: Record<string, any>): ProductQuestion {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    question: row.question,
    displayName: row.display_name ?? 'Cliente',
    answer: row.answer ?? '',
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function loadProductQuestions(productId: string): Promise<ProductQuestion[]> {
  const client = requireCustomerClient();
  const { data, error } = await client.from('product_questions').select('*').eq('product_id', productId).eq('status', 'published').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapQuestion);
}

export async function createProductQuestion(productId: string, question: string) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { error } = await client.from('product_questions').insert({
    user_id: user.id,
    product_id: productId,
    question: question.trim(),
    display_name: 'Cliente',
    status: 'pending',
  });
  if (error) throw error;
}

export async function subscribeStockNotification(productId: string) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { error } = await client.from('stock_notifications').upsert({
    user_id: user.id,
    product_id: productId,
    active: true,
    notified_at: null,
  });
  if (error) throw error;
}

export async function loadCustomerNotifications(): Promise<CustomerNotification[]> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client.from('customer_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    payload: row.payload ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string) {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { error } = await client.from('customer_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function loadLoyaltySummary(): Promise<LoyaltySummary> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client.from('loyalty_accounts').select('points, lifetime_points').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return { points: data?.points ?? 0, lifetimePoints: data?.lifetime_points ?? 0 };
}

export async function loadMyReviews(): Promise<ProductReview[]> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client.from('product_reviews').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function loadMyQuestions(): Promise<ProductQuestion[]> {
  const client = requireCustomerClient();
  const user = await currentCustomer();
  const { data, error } = await client.from('product_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapQuestion);
}

export async function loadAdminReviews(status?: ProductReview['status']): Promise<ProductReview[]> {
  const client = requireAdminClient();
  let query = client.from('product_reviews').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapReview);
}

export async function moderateReview(id: string, status: 'approved' | 'rejected', note = '') {
  const client = requireAdminClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error('Entre novamente no painel.');
  const { error } = await client.from('product_reviews').update({
    status,
    moderation_note: note.trim() || null,
    moderated_at: new Date().toISOString(),
    moderated_by: userData.user.id,
  }).eq('id', id);
  if (error) throw error;
}

export async function loadAdminQuestions(status?: ProductQuestion['status']): Promise<ProductQuestion[]> {
  const client = requireAdminClient();
  let query = client.from('product_questions').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapQuestion);
}

export async function answerQuestion(id: string, answer: string, publish = true) {
  const client = requireAdminClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error('Entre novamente no painel.');
  const { error } = await client.from('product_questions').update({
    answer: answer.trim() || null,
    status: publish ? 'published' : 'rejected',
    answered_at: new Date().toISOString(),
    answered_by: userData.user.id,
  }).eq('id', id);
  if (error) throw error;
}
