import { Linking } from 'react-native';

import { Order, StoreSettings } from '@/src/types';
import { formatCurrency, normalizeWhatsApp } from '@/src/utils/format';

export function buildOrderMessage(order: Order, settings: StoreSettings): string {
  const lines = [
    `Olá! Quero confirmar meu pedido ${order.publicCode} na ${settings.storeName}.`,
    '',
    ...order.items.map((item) => {
      const variants = [
        item.selectedSize ? `Tam. ${item.selectedSize}` : '',
        item.selectedColor ?? '',
      ]
        .filter(Boolean)
        .join(' • ');
      return `• ${item.quantity}x ${item.productName}${variants ? ` (${variants})` : ''} — ${formatCurrency(item.subtotal)}`;
    }),
    '',
    `Total: ${formatCurrency(order.total)}`,
    `Entrega: ${
      order.deliveryMethod === 'delivery'
        ? 'Entrega grátis em Rosário do Catete'
        : order.deliveryMethod === 'pickup'
          ? 'Retirada'
          : 'Combinar para outra cidade'
    }`,
    `Pagamento: ${
      order.paymentMethod === 'pix'
        ? 'Pix'
        : order.paymentMethod === 'card_link'
          ? 'Cartão por link'
          : 'A combinar'
    }`,
    '',
    `Cliente: ${order.customer.name}`,
    `WhatsApp: ${order.customer.whatsapp}`,
  ];

  if (order.deliveryMethod === 'delivery') {
    lines.push(
      `Endereço: ${order.customer.address}, ${order.customer.neighborhood}`,
      order.customer.reference ? `Referência: ${order.customer.reference}` : '',
    );
  }

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
