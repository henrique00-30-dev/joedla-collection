import { OrderStatus } from '@/src/types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeWhatsApp(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  preparing: 'Em preparação',
  ready: 'Pronto para retirada',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export function orderCodeFromUuid(id: string): string {
  return `JC-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
