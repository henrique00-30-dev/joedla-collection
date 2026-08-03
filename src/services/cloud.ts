import * as Crypto from 'expo-crypto';

import { supabase } from '@/src/lib/supabase';
import {
  Category,
  CategoryDraft,
  Order,
  OrderStatus,
  Product,
  ProductDraft,
  StoreSettings,
} from '@/src/types';

function requireClient() {
  if (!supabase) {
    throw new Error('O banco online ainda não foi configurado.');
  }

  return supabase;
}

function mapProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    category: row.category,
    price: Number(row.price),
    imageUrls: row.image_urls ?? [],
    sizes: row.sizes ?? [],
    colors: row.colors ?? [],
    availability: row.availability,
    stock: row.stock ?? 0,
    featured: row.featured ?? false,
    active: row.active ?? true,
    photoQuality: row.photo_quality ?? 'acceptable',
    photoProvisional: row.photo_provisional ?? false,
    createdAt: row.created_at,
  };
}

function mapCategory(row: Record<string, any>): Category {
  return {
    slug: row.slug,
    name: row.name,
    imageUrl: row.image_url ?? '',
    active: row.active ?? true,
    sortOrder: row.sort_order ?? 0,
  };
}

function categorySlug(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || `categoria-${Crypto.randomUUID().slice(0, 8)}`;
}

function productToRow(product: Product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    image_urls: product.imageUrls,
    sizes: product.sizes,
    colors: product.colors,
    availability: product.availability,
    stock: product.stock,
    featured: product.featured,
    active: product.active,
    photo_quality: product.photoQuality,
    photo_provisional: product.photoProvisional,
    created_at: product.createdAt,
  };
}

function mapOrder(row: Record<string, any>): Order {
  const items = (row.items ?? []).map((item: Record<string, any>) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    imageUrl: item.imageUrl ?? '',
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    selectedSize: item.selectedSize ?? undefined,
    selectedColor: item.selectedColor ?? undefined,
    availability: item.availability,
    subtotal: Number(item.subtotal),
  }));

  return {
    id: row.id,
    publicCode: row.public_code,
    lookupToken: row.lookup_token,
    customer: {
      name: row.customer_name,
      whatsapp: row.customer_whatsapp,
      city: row.city,
      neighborhood: row.neighborhood ?? '',
      address: row.address ?? '',
      reference: row.reference ?? '',
      notes: row.notes ?? '',
    },
    deliveryMethod: row.delivery_method,
    paymentMethod: row.payment_method,
    items,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function loadCloudCatalog(): Promise<Product[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function loadCloudCategories(): Promise<Category[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function loadCloudSettings(): Promise<StoreSettings | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    storeName: data.store_name,
    city: data.city,
    whatsappNumber: data.whatsapp_number ?? '',
    pixKey: data.pix_key ?? '',
    pickupAddress: data.pickup_address ?? '',
    instagram: data.instagram ?? '',
    deliveryMessage: data.delivery_message,
    tickerMessages: Array.isArray(data.ticker_messages) ? data.ticker_messages : [],
    banners: Array.isArray(data.banners) ? data.banners :
    [],
    bannerTitle: data.banner_title ?? 'Elegância para todos os momentos',
    bannerSubtitle: data.banner_subtitle ?? 'Novidades selecionadas para renovar seu estilo com leveza.',
    bannerButtonLabel: data.banner_button_label ?? 'Conhecer coleção',
    bannerImageUrl: data.banner_image_url ?? '',
    bannerLink: data.banner_link ?? '/(tabs)/categories',
    bannerStartAt: data.banner_start_at ?? '',
    bannerEndAt: data.banner_end_at ?? '',
  };
}

export async function createCloudOrder(order: Order): Promise<void> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const { error } = await client.from('orders').insert({
    id: order.id,
    public_code: order.publicCode,
    lookup_token: order.lookupToken,
    customer_name: order.customer.name,
    customer_whatsapp: order.customer.whatsapp,
    city: order.customer.city,
    neighborhood: order.customer.neighborhood,
    address: order.customer.address,
    reference: order.customer.reference,
    notes: order.customer.notes,
    delivery_method: order.deliveryMethod,
    payment_method: order.paymentMethod,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    total: order.total,
    status: order.status,
    items: order.items,
    created_at: order.createdAt,
    customer_id: user?.id ?? null,
  });

  if (error) throw error;
}

export async function loadCloudCustomerOrders(): Promise<Order[]> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];

  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function signInCloudAdmin(email: string, password: string): Promise<void> {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    await client.auth.signOut();
    throw new Error('Esta conta não possui acesso administrativo.');
  }
}

export async function restoreCloudAdminSession(): Promise<boolean> {
  const client = requireClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) return false;

  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return !error && data?.role === 'admin';
}

export async function signOutCloudAdmin(): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadCloudAdminOrders(): Promise<Order[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function saveCloudProduct(product: Product): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('products').upsert(productToRow(product));
  if (error?.code === '23505') {
    throw new Error('Já existe um produto ativo com esse nome. Edite o produto existente.');
  }
  if (error) throw error;
}

export async function saveCloudCategory(
  draft: CategoryDraft,
  sortOrder: number,
): Promise<Category> {
  const client = requireClient();
  const slug = draft.slug ?? categorySlug(draft.name);
  const row = {
    slug,
    name: draft.name.trim(),
    image_url: draft.imageUrl,
    active: true,
    sort_order: sortOrder,
  };

  const query = draft.slug
    ? client.from('categories').update(row).eq('slug', draft.slug)
    : client.from('categories').insert(row);
  const { data, error } = await query.select('*').single();

  if (error?.code === '23505') {
    throw new Error('Já existe uma categoria com esse nome.');
  }
  if (error) throw error;
  return mapCategory(data);
}

export async function archiveCloudCategory(slug: string): Promise<void> {
  const client = requireClient();
  const { count, error: productsError } = await client
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', slug)
    .eq('active', true);

  if (productsError) throw productsError;
  if ((count ?? 0) > 0) {
    throw new Error('Mova ou exclua os produtos ativos desta categoria antes de apagá-la.');
  }

  const { data, error } = await client
    .from('categories')
    .update({ active: false })
    .eq('slug', slug)
    .select('slug')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Categoria não encontrada ou sem permissão para excluir.');
}

export async function archiveCloudProduct(productId: string): Promise<void> {
  const client = requireClient();
  const { data, error } = await client
    .from('products')
    .update({ active: false })
    .eq('id', productId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('Produto não encontrado ou sem permissão para excluir.');
  }
}

export async function updateCloudOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const client = requireClient();
  const { data, error } = await client
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('Pedido não encontrado ou sem permissão para atualizar.');
  }
}

export async function saveCloudSettings(settings: StoreSettings): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('store_settings').upsert({
    id: 1,
    store_name: settings.storeName,
    city: settings.city,
    whatsapp_number: settings.whatsappNumber,
    pix_key: settings.pixKey,
    pickup_address: settings.pickupAddress,
    instagram: settings.instagram,
    delivery_message: settings.deliveryMessage,
    ticker_messages: settings.tickerMessages,
    banner_title: settings.bannerTitle,
    banner_subtitle: settings.bannerSubtitle,
    banner_button_label: settings.bannerButtonLabel,
    banner_image_url: settings.bannerImageUrl,
    banner_link: settings.bannerLink,
    banner_start_at: settings.bannerStartAt || null,
    banner_end_at: settings.bannerEndAt || null,
    banners: settings.banners,
  });

  if (error) throw error;
}

export async function uploadCloudProductImage(
  uri: string,
  mimeType = 'image/jpeg',
): Promise<string> {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) throw new Error('Entre novamente na área administrativa.');

  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const filePath = `${user.id}/${Crypto.randomUUID()}.${extension}`;
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await client.storage
    .from('product-images')
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  return client.storage.from('product-images').getPublicUrl(filePath).data.publicUrl;
}

export function productFromDraft(draft: ProductDraft): Product {
  return {
    ...draft,
    id: draft.id ?? Crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
