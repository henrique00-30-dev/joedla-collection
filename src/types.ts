export type CategorySlug = string;

export type Availability = 'ready' | 'custom';
export type PhotoQuality = 'recommended' | 'acceptable' | 'reduced';

export type Product = {
  id: string;
  name: string;
  description: string;
  category: CategorySlug;
  price: number;
  originalPrice?: number;
  promotionCampaignId?: string;
  promotionCampaignName?: string;
  promotionType?: 'percentage' | 'manual_price';
  discountBasisPoints?: number;
  marketingBadge?: {
    label: string;
    tone: 'wine' | 'caramel' | 'dark' | 'success' | 'attention';
  };
  imageUrls: string[];
  sizes: string[];
  colors: string[];
  availability: Availability;
  stock: number;
  featured: boolean;
  active: boolean;
  photoQuality: PhotoQuality;
  photoProvisional: boolean;
  createdAt: string;
};

export type Category = {
  slug: CategorySlug;
  name: string;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
};

export type CategoryDraft = {
  slug?: CategorySlug;
  name: string;
  imageUrl: string;
};

export type CartItem = {
  key: string;
  productId: string;
  productName: string;
  imageUrl: string;
  unitPrice: number;
  originalUnitPrice?: number;
  promotionCampaignId?: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  availability: Availability;
  stock: number;
};

export type DeliveryMethod = 'delivery' | 'pickup' | 'whatsapp';

export type PaymentMethod = 'pix' | 'card_link' | 'whatsapp';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  unitPrice: number;
  originalUnitPrice?: number;
  campaignId?: string;
  campaignName?: string;
  promotionType?: 'percentage' | 'manual_price';
  discountBasisPoints?: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  availability: Availability;
  subtotal: number;
};

export type CustomerDetails = {
  name: string;
  whatsapp: string;
  city: string;
  neighborhood: string;
  address: string;
  reference: string;
  notes: string;
};

export type Order = {
  id: string;
  publicCode: string;
  lookupToken: string;
  customer: CustomerDetails;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  idempotencyKey?: string;
};
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonLabel: string;
  link: string;
  order: number;
  active: boolean;
  startAt: string;
  endAt: string;
};

export type StoreSettings = {
  storeName: string;
  city: string;
  whatsappNumber: string;
  pixKey: string;
  pickupAddress: string;
  instagram: string;
  deliveryMessage: string;
  tickerMessages: string[];
  banners: Banner[];
  bannerTitle: string;
  bannerSubtitle: string;
  bannerButtonLabel: string;
  bannerImageUrl: string;
  bannerLink: string;
  bannerStartAt: string;
  bannerEndAt: string;
};

export type ProductDraft = Omit<Product, 'id' | 'createdAt'> & {
  id?: string;
};

export type CheckoutDraft = {
  customer: CustomerDetails;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
};

export type AnalyticsProductMetric = {
  productId: string;
  name: string;
  count: number;
};

export type StoreAnalytics = {
  periodDays: number;
  uniqueVisitors: number;
  totalVisits: number;
  productViews: number;
  orders: number;
  topViewed: AnalyticsProductMetric[];
  topPurchased: AnalyticsProductMetric[];
};
