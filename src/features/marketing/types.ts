export const MARKETING_TIMEZONE = 'America/Maceio' as const;

export const campaignStatuses = [
  'draft',
  'published',
  'paused',
  'archived',
] as const;

export const campaignSituations = [
  'draft',
  'scheduled',
  'active',
  'ended',
  'paused',
  'archived',
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];
export type CampaignSituation = (typeof campaignSituations)[number];

export type CampaignTargetType = 'store' | 'category' | 'product';
export type CampaignAssetFormat = 'desktop' | 'mobile';
export type CampaignAssetLifecycle = 'active' | 'pending_deletion';
export type CampaignPlacementPosition =
  | 'home_hero'
  | 'home_secondary_1'
  | 'home_secondary_2'
  | 'home_secondary_3';
export type CampaignDestinationType =
  | 'none'
  | 'product'
  | 'category'
  | 'campaign_products'
  | 'search'
  | 'whatsapp'
  | 'external';
export type CampaignBadgeTone =
  | 'wine'
  | 'caramel'
  | 'dark'
  | 'success'
  | 'attention';

export type MarketingCampaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  version: number;
  publishedAt: string | null;
  pausedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingCampaignCreate = {
  name: string;
  startAt?: string | null;
  endAt?: string | null;
  priority?: number;
};

export type MarketingCampaignUpdate = Partial<
  Pick<MarketingCampaign, 'name' | 'startAt' | 'endAt' | 'priority'>
>;

export type MarketingSettings = {
  enabled: boolean;
  storeTimezone: typeof MARKETING_TIMEZONE;
  maxImageBytes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignValidationCode =
  | 'invalid_name'
  | 'invalid_start'
  | 'invalid_end'
  | 'missing_start'
  | 'end_before_start'
  | 'invalid_priority'
  | 'invalid_transition';

export type CampaignValidationIssue = {
  code: CampaignValidationCode;
  message: string;
  field?: 'name' | 'startAt' | 'endAt' | 'priority' | 'status';
};

