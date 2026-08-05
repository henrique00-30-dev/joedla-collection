export const MARKETING_TIMEZONE = 'America/Maceio' as const;

export const campaignStatuses = ['draft', 'published', 'paused', 'archived'] as const;
export const campaignSituations = ['draft', 'scheduled', 'active', 'ended', 'paused', 'archived'] as const;

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
export type CampaignBadgeTone = 'wine' | 'caramel' | 'dark' | 'success' | 'attention';
export type CampaignPriceRuleType = 'percentage' | 'manual_price';
export type PriceSource =
  | 'normal'
  | 'individual'
  | 'campaign_product'
  | 'campaign_category'
  | 'campaign_store';

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

export type MarketingCampaignTarget = {
  id: string;
  campaignId: string;
  targetType: CampaignTargetType;
  productId: string | null;
  categorySlug: string | null;
  includeNewProducts: boolean;
  version: number;
};

export type MarketingCampaignAsset = {
  id: string;
  campaignId: string;
  storagePath: string;
  publicUrl: string;
  format: CampaignAssetFormat;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  byteSize: number;
  width: number;
  height: number;
  altText: string;
  focalX: number;
  focalY: number;
  zoom: number;
  lifecycleStatus: CampaignAssetLifecycle;
  recoverAfter: string | null;
  version: number;
};

export type MarketingCampaignPlacement = {
  id: string;
  campaignId: string;
  position: CampaignPlacementPosition;
  title: string;
  subtitle: string;
  buttonLabel: string;
  desktopAssetId: string | null;
  mobileAssetId: string | null;
  destinationType: CampaignDestinationType;
  destinationProductId: string | null;
  destinationCategorySlug: string | null;
  destinationSearch: string | null;
  destinationUrl: string | null;
  sortOrder: number;
  version: number;
};

export type MarketingCampaignBadge = {
  id: string;
  campaignId: string;
  label: string;
  tone: CampaignBadgeTone;
  version: number;
};

export type MarketingCampaignPriceRule = {
  id: string;
  campaignId: string;
  productId: string | null;
  ruleType: CampaignPriceRuleType;
  percentageBasisPoints: number | null;
  promotionalPriceCents: number | null;
  version: number;
};

export type ProductPromotion = {
  id: string;
  productId: string;
  enabled: boolean;
  promotionalPriceCents: number;
  startAt: string | null;
  endAt: string | null;
  showBadge: boolean;
  badgeLabel: string;
  badgeTone: CampaignBadgeTone;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductPromotionInput = Omit<
  ProductPromotion,
  'id' | 'productId' | 'version' | 'createdAt' | 'updatedAt'
>;

export type MarketingCampaignBundle = MarketingCampaign & {
  targets: MarketingCampaignTarget[];
  assets: MarketingCampaignAsset[];
  placements: MarketingCampaignPlacement[];
  badge: MarketingCampaignBadge | null;
  priceRules: MarketingCampaignPriceRule[];
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
  pricingEnabled: boolean;
  storeTimezone: typeof MARKETING_TIMEZONE;
  maxImageBytes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type MarketingStorefront = {
  settings: MarketingSettings;
  campaigns: MarketingCampaignBundle[];
  nextBoundaryAt: string | null;
  nextBoundaryDelayMs: number | null;
};

export type MarketingBadgeView = Pick<MarketingCampaignBadge, 'label' | 'tone'> & {
  campaignId: string;
};

export type CatalogPriceResolution = {
  productId: string;
  originalPriceCents: number;
  finalPriceCents: number;
  priceSource: PriceSource;
  individualPromotionId: string | null;
  individualPriceCents: number | null;
  individualBadgeLabel: string | null;
  individualBadgeTone: CampaignBadgeTone | null;
  campaignPriceCents: number | null;
  campaignId: string | null;
  campaignName: string | null;
  ruleType: CampaignPriceRuleType | null;
  discountBasisPoints: number | null;
  usedSafetyTieBreak: boolean;
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
