import * as Crypto from 'expo-crypto';

import { MarketingCampaign, MarketingCampaignBundle } from './types';

export function emptyCampaignBundle(campaign: MarketingCampaign): MarketingCampaignBundle {
  return {
    ...campaign,
    targets: [{
      id: Crypto.randomUUID(),
      campaignId: campaign.id,
      targetType: 'store',
      productId: null,
      categorySlug: null,
      includeNewProducts: false,
      version: 1,
    }],
    assets: [],
    placements: [],
    badge: null,
    priceRules: [],
  };
}

export function isoToLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Maceio',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function maceioInputToIso(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    throw new Error('Use data e hora no formato AAAA-MM-DDTHH:MM.');
  }
  const parsed = new Date(`${normalized}:00-03:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Data ou hora inválida.');
  return parsed.toISOString();
}

export function campaignStatusLabel(status: MarketingCampaign['status']) {
  return {
    draft: 'Rascunho',
    published: 'Publicada',
    paused: 'Pausada',
    archived: 'Arquivada',
  }[status];
}
