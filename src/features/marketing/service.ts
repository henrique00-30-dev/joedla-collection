import {
  assertValidCampaign,
  isCampaignStatus,
  validateCampaignFoundation,
  validateCampaignTransition,
} from './foundation';
import {
  CampaignStatus,
  MARKETING_TIMEZONE,
  MarketingCampaign,
  MarketingCampaignCreate,
  MarketingCampaignUpdate,
  MarketingSettings,
} from './types';
import { supabase } from '@/src/lib/supabase';

const campaignColumns = [
  'id',
  'name',
  'status',
  'start_at',
  'end_at',
  'priority',
  'version',
  'published_at',
  'paused_at',
  'archived_at',
  'created_at',
  'updated_at',
].join(',');

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  priority: number;
  version: number;
  published_at: string | null;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type MarketingSettingsRow = {
  enabled: boolean;
  store_timezone: string;
  max_image_bytes: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export class MarketingConcurrencyError extends Error {
  constructor() {
    super('A campanha foi alterada em outra sessão. Atualize os dados antes de salvar novamente.');
    this.name = 'MarketingConcurrencyError';
  }
}

export async function loadMarketingSettings(): Promise<MarketingSettings | null> {
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_settings')
    .select('enabled,store_timezone,max_image_bytes,version,created_at,updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSettings(data as MarketingSettingsRow) : null;
}

export async function loadActiveMarketingCampaigns() {
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_campaigns')
    .select(campaignColumns)
    .order('priority', { ascending: false })
    .order('start_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as CampaignRow[]).map(mapCampaign);
}

export async function loadAdminMarketingCampaigns() {
  return loadActiveMarketingCampaigns();
}

export async function createMarketingCampaign(
  input: MarketingCampaignCreate,
) {
  assertValidCampaign(validateCampaignFoundation(input, 'draft'));
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_campaigns')
    .insert({
      name: input.name.trim(),
      status: 'draft',
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      priority: input.priority ?? 0,
    })
    .select(campaignColumns)
    .single();

  if (error) throw error;
  return mapCampaign(data as unknown as CampaignRow);
}

export async function updateMarketingCampaign(
  campaign: MarketingCampaign,
  changes: MarketingCampaignUpdate,
) {
  assertValidCampaign(validateCampaignFoundation({
    name: changes.name ?? campaign.name,
    startAt: changes.startAt === undefined ? campaign.startAt : changes.startAt,
    endAt: changes.endAt === undefined ? campaign.endAt : changes.endAt,
    priority: changes.priority ?? campaign.priority,
  }, campaign.status));
  const client = requireCloud();
  const payload: Record<string, string | number | null> = {};

  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.startAt !== undefined) payload.start_at = changes.startAt;
  if (changes.endAt !== undefined) payload.end_at = changes.endAt;
  if (changes.priority !== undefined) payload.priority = changes.priority;

  const { data, error } = await client
    .from('marketing_campaigns')
    .update(payload)
    .eq('id', campaign.id)
    .eq('version', campaign.version)
    .select(campaignColumns)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new MarketingConcurrencyError();
  return mapCampaign(data as unknown as CampaignRow);
}

export async function changeMarketingCampaignStatus(
  campaign: MarketingCampaign,
  nextStatus: CampaignStatus,
) {
  assertValidCampaign(validateCampaignTransition(campaign, nextStatus));
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_campaigns')
    .update({ status: nextStatus })
    .eq('id', campaign.id)
    .eq('version', campaign.version)
    .select(campaignColumns)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new MarketingConcurrencyError();
  return mapCampaign(data as unknown as CampaignRow);
}

function requireCloud() {
  if (!supabase) {
    throw new Error('A conexão online da loja não foi configurada.');
  }
  return supabase;
}

function mapCampaign(row: CampaignRow): MarketingCampaign {
  if (!isCampaignStatus(row.status)) {
    throw new Error('O banco retornou um estado de campanha inválido.');
  }

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    priority: row.priority,
    version: row.version,
    publishedAt: row.published_at,
    pausedAt: row.paused_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettings(row: MarketingSettingsRow): MarketingSettings {
  if (row.store_timezone !== MARKETING_TIMEZONE) {
    throw new Error('O banco retornou um fuso de marketing não suportado.');
  }

  return {
    enabled: row.enabled,
    storeTimezone: MARKETING_TIMEZONE,
    maxImageBytes: row.max_image_bytes,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
