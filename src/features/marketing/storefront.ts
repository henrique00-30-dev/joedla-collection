import { Product } from '../../types';

import {
  CampaignDestinationType,
  MarketingBadgeView,
  MarketingCampaignBundle,
  MarketingCampaignPlacement,
} from './types';

export function campaignAppliesToProduct(
  campaign: MarketingCampaignBundle,
  product: Pick<Product, 'id' | 'category'>,
) {
  return campaign.targets.some((target) => {
    if (target.targetType === 'store') return true;
    if (target.targetType === 'product') return target.productId === product.id;
    return target.categorySlug === product.category;
  });
}

export function campaignTargetRank(
  campaign: MarketingCampaignBundle,
  product: Pick<Product, 'id' | 'category'>,
) {
  let rank = 0;
  for (const target of campaign.targets) {
    if (target.targetType === 'product' && target.productId === product.id) rank = 3;
    else if (target.targetType === 'category' && target.categorySlug === product.category) rank = Math.max(rank, 2);
    else if (target.targetType === 'store') rank = Math.max(rank, 1);
  }
  return rank;
}

export function resolveProductMarketingBadge(
  campaigns: MarketingCampaignBundle[],
  product: Pick<Product, 'id' | 'category'>,
): MarketingBadgeView | null {
  const candidates = campaigns
    .filter((campaign) => campaign.badge && campaignAppliesToProduct(campaign, product))
    .sort((first, second) => {
      const rank = campaignTargetRank(second, product) - campaignTargetRank(first, product);
      if (rank) return rank;
      if (first.priority !== second.priority) return second.priority - first.priority;
      const start = Date.parse(second.startAt ?? '') - Date.parse(first.startAt ?? '');
      if (Number.isFinite(start) && start) return start;
      return first.id.localeCompare(second.id);
    });

  const winner = candidates[0];
  return winner?.badge
    ? { campaignId: winner.id, label: winner.badge.label, tone: winner.badge.tone }
    : null;
}

export function activePlacements(campaigns: MarketingCampaignBundle[]) {
  return campaigns
    .flatMap((campaign) => campaign.placements.map((placement) => ({ campaign, placement })))
    .sort((first, second) => {
      if (first.placement.position !== second.placement.position) {
        return positionRank(first.placement.position) - positionRank(second.placement.position);
      }
      if (first.campaign.priority !== second.campaign.priority) {
        return second.campaign.priority - first.campaign.priority;
      }
      return first.placement.sortOrder - second.placement.sortOrder;
    })
    .filter((entry, index, entries) => (
      entries.findIndex((candidate) => candidate.placement.position === entry.placement.position) === index
    ));
}

export function marketingDestination(
  placement: MarketingCampaignPlacement,
  whatsappNumber: string,
): string | null {
  const destinations: Record<CampaignDestinationType, () => string | null> = {
    none: () => null,
    product: () => placement.destinationProductId
      ? `/product/${placement.destinationProductId}`
      : null,
    category: () => placement.destinationCategorySlug
      ? `/category/${placement.destinationCategorySlug}`
      : null,
    campaign_products: () => placement.campaignId
      ? `/(tabs)/categories?campaign=${encodeURIComponent(placement.campaignId)}`
      : null,
    search: () => placement.destinationSearch
      ? `/(tabs)?search=${encodeURIComponent(placement.destinationSearch)}`
      : null,
    whatsapp: () => whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`
      : null,
    external: () => placement.destinationUrl && isSafeExternalUrl(placement.destinationUrl)
      ? placement.destinationUrl
      : null,
  };

  return destinations[placement.destinationType]();
}

function isSafeExternalUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !/[<>\s]/.test(value);
  } catch {
    return false;
  }
}

export function nextCampaignBoundary(campaigns: MarketingCampaignBundle[], now = new Date()) {
  const nowMs = now.getTime();
  let next: number | null = null;

  for (const campaign of campaigns) {
    for (const value of [campaign.startAt, campaign.endAt]) {
      if (!value) continue;
      const timestamp = Date.parse(value);
      if (!Number.isFinite(timestamp) || timestamp <= nowMs) continue;
      next = next === null ? timestamp : Math.min(next, timestamp);
    }
  }

  return next === null ? null : new Date(next).toISOString();
}

function positionRank(position: MarketingCampaignPlacement['position']) {
  return {
    home_hero: 0,
    home_secondary_1: 1,
    home_secondary_2: 2,
    home_secondary_3: 3,
  }[position];
}
