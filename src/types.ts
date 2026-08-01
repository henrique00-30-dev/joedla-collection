export type CategorySlug = 'fitness' | 'casual' | 'bolsas' | 'infantil';

export type Availability = 'ready' | 'custom';

export type Product = {
  id: string;
  name: string;
  description: string;
  category: CategorySlug;
  price: number;
  imageUrls: string[];
  sizes: string[];
  colors: string[];
  availability: Availability;
  stock: number;
  featured: boolean;
  active: boolean;
  createdAt: string;
};

export type Category = {
  slug: CategorySlug;
  name: string;
  imageUrl: string;
};

export type CartItem = {
  key: string;
  productId: string;
  productName: string;
  imageUrl: string;
  unitPrice: number;
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
};

export type StoreSettings = {
  storeName: string;
  city: string;
  whatsappNumber: string;
  pixKey: string;
  pickupAddress: string;
  instagram: string;
  deliveryMessage: string;
};

export type ProductDraft = Omit<Product, 'id' | 'createdAt'> & {
  id?: string;
};

export type CheckoutDraft = {
  customer: CustomerDetails;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
};
