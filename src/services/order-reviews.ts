import { supabase } from '@/src/lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error('A conexão da loja não está configurada.');
  }
  return supabase;
}

export async function loadReviewedProductIds(lookupToken: string): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('get_verified_order_reviewed_products', {
    p_lookup_token: lookupToken,
  });

  if (error) throw error;
  return (data ?? []).map((row: { product_id: string }) => row.product_id);
}

export async function submitVerifiedOrderReview(input: {
  lookupToken: string;
  productId: string;
  rating: number;
  comment: string;
}) {
  const client = requireClient();
  const { data, error } = await client.rpc('submit_verified_order_review', {
    p_lookup_token: input.lookupToken,
    p_product_id: input.productId,
    p_rating: input.rating,
    p_comment: input.comment.trim(),
  });

  if (error) {
    if (error.code === '23505' || /já foi avaliado/i.test(error.message ?? '')) {
      throw new Error('Este produto já foi avaliado neste pedido.');
    }
    if (/conclusão do pedido/i.test(error.message ?? '')) {
      throw new Error('A avaliação fica disponível somente depois que o pedido for concluído.');
    }
    throw new Error(error.message || 'Não foi possível enviar a avaliação.');
  }

  return String(data ?? '');
}
