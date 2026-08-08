import { Linking } from 'react-native';

import { Order, StoreSettings } from '@/src/types';
import { formatCurrency, formatDate, normalizeWhatsApp } from '@/src/utils/format';

export function buildOrderMessage(order: Order, settings: StoreSettings): string {
  const orderKind = order.publicCode.startsWith('ENC-')
    || order.items.some((item) => item.availability === 'custom')
    ? 'ENCOMENDA'
    : 'COMPRA';

  const deliveryLabel = order.deliveryMethod === 'delivery'
    ? 'Entrega grátis em Rosário do Catete'
    : order.deliveryMethod === 'pickup'
      ? 'Retirada'
      : 'Outra cidade — combinar com a loja';

  const paymentLabel = order.paymentMethod === 'pix'
    ? 'Pix'
    : order.paymentMethod === 'card_link'
      ? 'Cartão por link'
      : 'A combinar';

  const lines = [
    `🧾 ${orderKind} — JOEDLA COLLECTION`,
    `Número: ${order.publicCode}`,
    `Data: ${formatDate(order.createdAt)}`,
    '',
    'ITENS',
    ...order.items.map((item) => {
      const variants = [
        item.selectedSize ? `Tam. ${item.selectedSize}` : '',
        item.selectedColor ? `Cor: ${item.selectedColor}` : '',
        item.availability === 'custom' ? 'Encomenda' : 'Pronta entrega',
      ]
        .filter(Boolean)
        .join(' • ');
      return `• ${item.quantity}x ${item.productName}${variants ? ` — ${variants}` : ''}\n  ${formatCurrency(item.subtotal)}`;
    }),
    '',
    'VALORES',
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    order.deliveryFee > 0 ? `Entrega: ${formatCurrency(order.deliveryFee)}` : 'Entrega: R$ 0,00',
    Number(order.discountAmount ?? 0) > 0 ? `Desconto: -${formatCurrency(Number(order.discountAmount))}` : '',
    `TOTAL: ${formatCurrency(order.total)}`,
    '',
    'ENTREGA E PAGAMENTO',
    `Entrega: ${deliveryLabel}`,
    `Pagamento escolhido: ${paymentLabel}`,
    '',
    'CLIENTE',
    `Nome: ${order.customer.name}`,
    `WhatsApp: ${order.customer.whatsapp}`,
    `Cidade: ${order.customer.city}`,
  ];

  if (order.deliveryMethod === 'delivery') {
    lines.push(
      `Endereço: ${order.customer.address}, ${order.customer.neighborhood}`,
      order.customer.reference ? `Referência: ${order.customer.reference}` : '',
    );
  }

  if (order.customer.notes) {
    lines.push(`Observações: ${order.customer.notes}`);
  }

  lines.push(
    '',
    `Situação inicial: aguardando confirmação da loja.`,
    '',
    'Painel administrativo:',
    'https://www.joedla-collection.com.br/admin/orders',
  );

  return lines.filter((line) => line !== '').join('\n');
}

export async function openStoreWhatsApp(
  settings: StoreSettings,
  message = 'Olá! Gostaria de falar com a Joedla Collection.',
): Promise<boolean> {
  const number = normalizeWhatsApp(settings.whatsappNumber);
  if (!number) return false;
  await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
  return true;
}
