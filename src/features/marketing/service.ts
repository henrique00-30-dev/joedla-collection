import * as Crypto from 'expo-crypto';

import { supabase } from '@/src/lib/supabase';

import {
  assertValidCampaign,
  isCampaignStatus,
  validateCampaignFoundation,
  validateCampaignTransition,
} from './foundation';
import {
  CampaignAssetFormat,
  CampaignStatus,
  CatalogPriceResolution,
  MARKETING_TIMEZONE,
  MarketingCampaign,
  MarketingCampaignAsset,
  MarketingCampaignBundle,
  MarketingCampaignCreate,
  MarketingCampaignUpdate,
  MarketingSettings,
  MarketingStorefront,
  ProductPromotion,
  ProductPromotionInput,
  PromotionBadgePosition,
  PromotionBadgeShape,
  PromotionBadgeSize,
} from './types';

const campaignColumns = [
  'id', 'name', 'status', 'start_at', 'end_at', 'priority', 'version',
  'published_at', 'paused_at', 'archived_at', 'created_at', 'updated_at',
].join(',');

const bundleColumns = [
  campaignColumns,
  'marketing_campaign_targets(*)',
  'marketing_campaign_assets(*)',
  'marketing_campaign_placements(*)',
  'marketing_campaign_badges(*)',
  'marketing_campaign_price_rules(*)',
].join(',');

const disabledSettings: MarketingSettings = {
  enabled: false,
  pricingEnabled: false,
  storeTimezone: MARKETING_TIMEZONE,
  maxImageBytes: 5_242_880,
  version: 1,
  createdAt: '',
  updatedAt: '',
};

export class MarketingConcurrencyError extends Error {
  constructor() {
    super('A campanha foi alterada em outra sessão. Atualize os dados antes de salvar novamente.');
    this.name = 'MarketingConcurrencyError';
  }
}
export async function loadMarketingStorefront(): Promise<MarketingStorefront> {
  let settings: MarketingSettings | null = null;

  try {
    settings = await loadMarketingSettings();
  } catch (error) {
    if (isMissingMarketingSchema(error)) {
      return {
        settings: disabledSettings,
        campaigns: [],
        nextBoundaryAt: null,
        nextBoundaryDelayMs: null,
      };
    }

    // Uma falha isolada no módulo de marketing não deve impedir
    // o catálogo público de carregar.
    console.warn('Não foi possível carregar as configurações de marketing.', error);

    return {
      settings: disabledSettings,
      campaigns: [],
      nextBoundaryAt: null,
      nextBoundaryDelayMs: null,
    };
  }

  const effectiveSettings = settings ?? disabledSettings;

  // Campanhas visuais e preços promocionais são independentes.
  // Mesmo com o módulo visual desligado, pricingEnabled deve continuar
  // disponível para as promoções individuais.
  if (!effectiveSettings.enabled) {
    return {
      settings: effectiveSettings,
      campaigns: [],
      nextBoundaryAt: null,
      nextBoundaryDelayMs: null,
    };
  }

  const [campaignsResult, boundaryResult] = await Promise.allSettled([
    loadMarketingCampaignBundles(false),
    loadNextMarketingBoundary(),
  ]);

  if (campaignsResult.status === 'rejected') {
    console.warn('Não foi possível carregar as campanhas visuais.', campaignsResult.reason);
  }

  if (boundaryResult.status === 'rejected') {
    console.warn('Não foi possível carregar a próxima atualização do marketing.', boundaryResult.reason);
  }

  const campaigns =
    campaignsResult.status === 'fulfilled'
      ? campaignsResult.value
      : [];

  const serverBoundary =
    boundaryResult.status === 'fulfilled'
      ? boundaryResult.value
      : null;

  return {
    settings: effectiveSettings,
    campaigns,
    nextBoundaryAt: serverBoundary?.at ?? null,
    nextBoundaryDelayMs: serverBoundary?.delayMs ?? null,
  };
}

async function loadNextMarketingBoundary() {
  const client = requireCloud();
  const { data, error } = await client.rpc('marketing_next_boundary');
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const boundary = data as { at?: unknown; delayMs?: unknown };
  return typeof boundary.at === 'string' && Number.isFinite(Number(boundary.delayMs))
    ? { at: boundary.at, delayMs: Math.max(0, Number(boundary.delayMs)) }
    : null;
}

export async function loadMarketingSettings(): Promise<MarketingSettings | null> {
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_settings')
    .select('enabled,pricing_enabled,store_timezone,max_image_bytes,version,created_at,updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSettings(data as Record<string, unknown>) : null;
}

export async function updateMarketingSettings(
  settings: MarketingSettings,
  changes: Pick<MarketingSettings, 'enabled' | 'pricingEnabled'>,
) {
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_settings')
    .update({ enabled: changes.enabled, pricing_enabled: changes.pricingEnabled })
    .eq('id', 1)
    .eq('version', settings.version)
    .select('enabled,pricing_enabled,store_timezone,max_image_bytes,version,created_at,updated_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new MarketingConcurrencyError();
  return mapSettings(data as Record<string, unknown>);
}

export async function loadActiveMarketingCampaigns() {
  return loadMarketingCampaignBundles(false);
}

export async function loadAdminMarketingCampaigns() {
  return loadMarketingCampaignBundles(true);
}

export async function loadAdminMarketingCampaign(campaignId: string) {
  const client = requireCloud();
  const { data, error } = await client
    .from('marketing_campaigns')
    .select(bundleColumns)
    .eq('id', campaignId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBundle(data as Record<string, any>) : null;
}

export async function createMarketingCampaign(input: MarketingCampaignCreate) {
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
  return mapCampaign(data as Record<string, any>);
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
  return mapCampaign(data as Record<string, any>);
}

export async function saveMarketingCampaignBundle(bundle: MarketingCampaignBundle) {
  assertValidCampaign(validateCampaignFoundation(bundle, bundle.status));
  const client = requireCloud();
  const { data, error } = await client.rpc('admin_save_marketing_campaign', {
    campaign_id: bundle.id,
    expected_version: bundle.version,
    campaign_payload: serializeBundle(bundle),
  });
  if (error) {
    if (error.message?.includes('alterada em outra sessão')) throw new MarketingConcurrencyError();
    throw error;
  }
  return loadAdminMarketingCampaign(String(data ?? bundle.id));
}

export async function loadCampaignChecklist(campaignId: string) {
  const client = requireCloud();
  const { data, error } = await client.rpc('admin_marketing_campaign_checklist', {
    campaign_id: campaignId,
  });
  if (error) throw error;
  return (data ?? { errors: [], warnings: [], impact: {} }) as {
    errors: string[];
    warnings: string[];
    impact: Record<string, number | string | boolean>;
  };
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
  return mapCampaign(data as Record<string, any>);
}

export async function loadCatalogPriceResolutions(productIds: string[]) {
  if (!productIds.length) return [];
  const client = requireCloud();
  let { data, error } = await client.rpc('resolve_catalog_prices_v2', {
    product_ids: productIds,
  });
  if (error && isMissingMarketingSchema(error)) {
    ({ data, error } = await client.rpc('resolve_catalog_prices', { product_ids: productIds }));
  }
  if (error) {
    if (isMissingMarketingSchema(error)) return [];
    throw error;
  }
  return ((data ?? []) as Record<string, any>[]).map((row): CatalogPriceResolution => ({
    productId: row.product_id,
    originalPriceCents: Number(row.original_price_cents),
    finalPriceCents: Number(row.final_price_cents),
    priceSource: row.price_source ?? (row.campaign_id ? 'campaign_product' : 'normal'),
    individualPromotionId: row.individual_promotion_id ?? null,
    individualPriceCents: row.individual_price_cents === null || row.individual_price_cents === undefined
      ? null
      : Number(row.individual_price_cents),
    individualBadgeLabel: row.individual_badge_label ?? null,
    individualBadgeTone: row.individual_badge_tone ?? null,
    campaignPriceCents: row.campaign_price_cents === null || row.campaign_price_cents === undefined
      ? null
      : Number(row.campaign_price_cents),
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    ruleType: row.rule_type,
    discountBasisPoints: row.discount_basis_points === null ? null : Number(row.discount_basis_points),
    usedSafetyTieBreak: Boolean(row.used_safety_tie_break),
  }));
}

export async function loadAdminProductPromotions() {
  const client = requireCloud();

  const { data, error } = await client
    .from('product_promotions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingMarketingSchema(error)) return [];
    throw error;
  }

  return ((data ?? []) as Record<string, any>[]).map(mapProductPromotion);
}

export async function loadActiveProductPromotionVisuals(): Promise<
  {
    productId: string;
    label: string;
    tone: ProductPromotion['badgeTone'];
    position: PromotionBadgePosition;
    size: PromotionBadgeSize;
    shape: PromotionBadgeShape;
  }[]
> {
  const client = requireCloud();

  const { data, error } = await client
    .from('product_promotions')
    .select(
      'product_id,start_at,end_at,badge_label,badge_tone,badge_position,badge_size,badge_shape',
    )
    .eq('enabled', true)
    .eq('show_badge', true);

  if (error) {
    if (isMissingMarketingSchema(error)) return [];
    throw error;
  }

  const now = Date.now();

  return ((data ?? []) as Record<string, any>[])
    .filter((row) => {
      const startsAt = row.start_at
        ? Date.parse(row.start_at)
        : null;
      const endsAt = row.end_at
        ? Date.parse(row.end_at)
        : null;

      return (
        (startsAt === null || startsAt <= now) &&
        (endsAt === null || now <= endsAt)
      );
    })
    .map((row) => ({
      productId: String(row.product_id),
      label: String(row.badge_label ?? 'Promoção'),
      tone: row.badge_tone ?? 'wine',
      position: row.badge_position ?? 'top-left',
      size: row.badge_size ?? 'medium',
      shape: row.badge_shape ?? 'pill',
    }));
}

export async function loadAdminProductPromotion(productId: string) {
  const client = requireCloud();
  const { data, error } = await client
    .from('product_promotions')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) {
    if (isMissingMarketingSchema(error)) return null;
    throw error;
  }
  return data ? mapProductPromotion(data as Record<string, any>) : null;
}

export async function saveProductPromotion(
  productId: string,
  expectedVersion: number | null,
  input: ProductPromotionInput,
) {
  const client = requireCloud();
  const { data, error } = await client.rpc('admin_upsert_product_promotion', {
    requested_product_id: productId,
    expected_version: expectedVersion,
    promotion_payload: {
      enabled: input.enabled,
      promotional_price_cents: input.promotionalPriceCents,
      start_at: input.startAt,
      end_at: input.endAt,
      show_badge: input.showBadge,
      badge_label: input.badgeLabel,
      badge_tone: input.badgeTone,
      badge_position: input.badgePosition,
      badge_size: input.badgeSize,
      badge_shape: input.badgeShape,
    },
  });
  if (error) {
    if (error.message?.includes('outra sessao')) throw new MarketingConcurrencyError();
    throw error;
  }
  if (!data || typeof data !== 'object') throw new Error('O banco não retornou a promoção individual.');
  return mapProductPromotion(data as Record<string, any>);
}

export async function deleteDraftMarketingCampaign(campaignId: string) {
  const client = requireCloud();
  const { data, error } = await client.rpc('admin_delete_draft_campaign', {
    requested_campaign_id: campaignId,
  });
  if (error) throw error;
  const paths = Array.isArray(data) ? data.filter((path): path is string => typeof path === 'string') : [];
  if (paths.length) {
    const { error: storageError } = await client.storage.from('campaign-images').remove(paths);
    if (storageError) {
      await client.rpc('admin_record_campaign_cleanup_failure', {
        deleted_campaign_id: campaignId,
        storage_paths: paths,
      });
      return { removed: true, storageCleanupPending: true };
    }
  }
  return { removed: true, storageCleanupPending: false };
}

export async function uploadMarketingCampaignImage(input: {
  campaignId: string;
  uri: string;
  format: CampaignAssetFormat;
  mimeType?: string;
  width: number;
  height: number;
  altText: string;
  maxBytes: number;
}): Promise<MarketingCampaignAsset> {
  const client = requireCloud();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) throw new Error('Entre novamente na área administrativa.');

  const response = await fetch(input.uri);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const mimeType = detectImageMime(bytes);
  if (!mimeType) throw new Error('A imagem precisa ser JPEG, PNG ou WebP válido.');
  if (bytes.byteLength > input.maxBytes) {
    throw new Error(`A imagem ultrapassa o limite de ${Math.round(input.maxBytes / 1_048_576)} MB.`);
  }
  if (input.width <= 0 || input.height <= 0) throw new Error('Não foi possível confirmar as dimensões da imagem.');

  const id = Crypto.randomUUID();
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${userData.user.id}/${input.campaignId}/${id}.${extension}`;
  const { error } = await client.storage.from('campaign-images').upload(storagePath, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  const publicUrl = client.storage.from('campaign-images').getPublicUrl(storagePath).data.publicUrl;
  const asset: MarketingCampaignAsset = {
    id,
    campaignId: input.campaignId,
    storagePath,
    publicUrl,
    format: input.format,
    mimeType,
    byteSize: bytes.byteLength,
    width: input.width,
    height: input.height,
    altText: input.altText.trim() || 'Imagem promocional',
    focalX: 0.5,
    focalY: 0.5,
    zoom: 1,
    lifecycleStatus: 'active',
    recoverAfter: null,
    version: 1,
  };
  const { error: assetError } = await client.from('marketing_campaign_assets').insert({
    id: asset.id,
    campaign_id: asset.campaignId,
    storage_path: asset.storagePath,
    format: asset.format,
    mime_type: asset.mimeType,
    byte_size: asset.byteSize,
    width: asset.width,
    height: asset.height,
    alt_text: asset.altText,
    focal_x: asset.focalX,
    focal_y: asset.focalY,
    zoom: asset.zoom,
    lifecycle_status: 'active',
    recover_after: null,
  });
  if (assetError) {
    await client.storage.from('campaign-images').remove([storagePath]);
    throw assetError;
  }
  return asset;
}

export async function cleanupExpiredMarketingAssets() {
  const client = requireCloud();
  const { data, error } = await client.rpc('admin_marketing_asset_cleanup_candidates');
  if (error) throw error;
  for (const candidate of (data ?? []) as { asset_id: string; storage_path: string }[]) {
    const { error: removalError } = await client.storage
      .from('campaign-images')
      .remove([candidate.storage_path]);
    const { error: resultError } = await client.rpc('admin_marketing_asset_cleanup_result', {
      requested_asset_id: candidate.asset_id,
      succeeded: !removalError,
      failure_message: removalError?.message ?? null,
    });
    if (resultError) throw resultError;
  }
}

function requireCloud() {
  if (!supabase) throw new Error('A conexão online da loja não foi configurada.');
  return supabase;
}

async function loadMarketingCampaignBundles(admin: boolean) {
  const client = requireCloud();
  let query = client.from('marketing_campaigns').select(bundleColumns);
  if (admin) query = query.order('updated_at', { ascending: false });
  else {
    const { data: activeIds, error: activeIdsError } = await client.rpc('active_marketing_campaign_ids');
    if (activeIdsError) throw activeIdsError;
    if (!Array.isArray(activeIds) || !activeIds.length) return [];
    query = query
      .in('id', activeIds as string[])
      .order('priority', { ascending: false })
      .order('start_at', { ascending: false });
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, any>[]).map(mapBundle);
}

function mapCampaign(row: Record<string, any>): MarketingCampaign {
  if (!isCampaignStatus(row.status)) throw new Error('O banco retornou um estado de campanha inválido.');
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

function mapBundle(row: Record<string, any>): MarketingCampaignBundle {
  const campaign = mapCampaign(row);
  const assets: MarketingCampaignAsset[] = (row.marketing_campaign_assets ?? []).map((asset: Record<string, any>) => ({
    id: asset.id,
    campaignId: asset.campaign_id,
    storagePath: asset.storage_path,
    publicUrl: requireCloud().storage.from('campaign-images').getPublicUrl(asset.storage_path).data.publicUrl,
    format: asset.format,
    mimeType: asset.mime_type,
    byteSize: Number(asset.byte_size),
    width: asset.width,
    height: asset.height,
    altText: asset.alt_text,
    focalX: Number(asset.focal_x),
    focalY: Number(asset.focal_y),
    zoom: Number(asset.zoom),
    lifecycleStatus: asset.lifecycle_status,
    recoverAfter: asset.recover_after,
    version: asset.version,
  }));
  const badgeRow = (row.marketing_campaign_badges ?? [])[0];
  return {
    ...campaign,
    targets: (row.marketing_campaign_targets ?? []).map((target: Record<string, any>) => ({
      id: target.id,
      campaignId: target.campaign_id,
      targetType: target.target_type,
      productId: target.product_id,
      categorySlug: target.category_slug,
      includeNewProducts: target.include_new_products,
      version: target.version,
    })),
    assets,
    placements: (row.marketing_campaign_placements ?? []).map((placement: Record<string, any>) => ({
      id: placement.id,
      campaignId: placement.campaign_id,
      position: placement.position,
      title: placement.title,
      subtitle: placement.subtitle,
      buttonLabel: placement.button_label,
      desktopAssetId: placement.desktop_asset_id,
      mobileAssetId: placement.mobile_asset_id,
      destinationType: placement.destination_type,
      destinationProductId: placement.destination_product_id,
      destinationCategorySlug: placement.destination_category_slug,
      destinationSearch: placement.destination_search,
      destinationUrl: placement.destination_url,
      sortOrder: placement.sort_order,
      version: placement.version,
    })),
    badge: badgeRow ? {
      id: badgeRow.id,
      campaignId: badgeRow.campaign_id,
      label: badgeRow.label,
      tone: badgeRow.tone,
      version: badgeRow.version,
    } : null,
    priceRules: (row.marketing_campaign_price_rules ?? []).map((rule: Record<string, any>) => ({
      id: rule.id,
      campaignId: rule.campaign_id,
      productId: rule.product_id,
      ruleType: rule.rule_type,
      percentageBasisPoints: rule.percentage_basis_points === null ? null : Number(rule.percentage_basis_points),
      promotionalPriceCents: rule.promotional_price_cents === null ? null : Number(rule.promotional_price_cents),
      version: rule.version,
    })),
  };
}

function mapSettings(row: Record<string, any>): MarketingSettings {
  if (row.store_timezone !== MARKETING_TIMEZONE) throw new Error('O banco retornou um fuso de marketing não suportado.');
  return {
    enabled: Boolean(row.enabled),
    pricingEnabled: Boolean(row.pricing_enabled),
    storeTimezone: MARKETING_TIMEZONE,
    maxImageBytes: Number(row.max_image_bytes),
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProductPromotion(row: Record<string, any>): ProductPromotion {
  return {
    id: row.id,
    productId: row.product_id,
    enabled: Boolean(row.enabled),
    promotionalPriceCents: Number(row.promotional_price_cents),
    startAt: row.start_at,
    endAt: row.end_at,
    showBadge: Boolean(row.show_badge),
    badgeLabel: row.badge_label,
    badgeTone: row.badge_tone,
    badgePosition: row.badge_position ?? 'top-left',
    badgeSize: row.badge_size ?? 'medium',
    badgeShape: row.badge_shape ?? 'pill',
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeBundle(bundle: MarketingCampaignBundle) {
  return {
    name: bundle.name,
    start_at: bundle.startAt,
    end_at: bundle.endAt,
    priority: bundle.priority,
    targets: bundle.targets.map((target) => ({
      id: target.id,
      target_type: target.targetType,
      product_id: target.productId,
      category_slug: target.categorySlug,
      include_new_products: target.includeNewProducts,
    })),
    assets: bundle.assets.map((asset) => ({
      id: asset.id,
      storage_path: asset.storagePath,
      format: asset.format,
      mime_type: asset.mimeType,
      byte_size: asset.byteSize,
      width: asset.width,
      height: asset.height,
      alt_text: asset.altText,
      focal_x: asset.focalX,
      focal_y: asset.focalY,
      zoom: asset.zoom,
    })),
    placements: bundle.placements.map((placement) => ({
      id: placement.id,
      position: placement.position,
      title: placement.title,
      subtitle: placement.subtitle,
      button_label: placement.buttonLabel,
      desktop_asset_id: placement.desktopAssetId,
      mobile_asset_id: placement.mobileAssetId,
      destination_type: placement.destinationType,
      destination_product_id: placement.destinationProductId,
      destination_category_slug: placement.destinationCategorySlug,
      destination_search: placement.destinationSearch,
      destination_url: placement.destinationUrl,
      sort_order: placement.sortOrder,
    })),
    badge: bundle.badge ? {
      id: bundle.badge.id,
      label: bundle.badge.label,
      tone: bundle.badge.tone,
    } : null,
    price_rules: bundle.priceRules.map((rule) => ({
      id: rule.id,
      product_id: rule.productId,
      rule_type: rule.ruleType,
      percentage_basis_points: rule.percentageBasisPoints,
      promotional_price_cents: rule.promotionalPriceCents,
    })),
  };
}

function detectImageMime(bytes: Uint8Array): MarketingCampaignAsset['mimeType'] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

function isMissingMarketingSchema(error: unknown) {
  const value = error as { code?: string; message?: string };
  return value?.code === '42P01'
    || value?.code === 'PGRST202'
    || value?.code === 'PGRST204'
    || value?.code === 'PGRST205'
    || /marketing_|resolve_catalog_prices/i.test(value?.message ?? '') && /not find|does not exist|schema cache/i.test(value?.message ?? '');
}