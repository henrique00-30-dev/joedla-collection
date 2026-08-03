import { Category, StoreSettings } from '@/src/types';

export const defaultCategories: Category[] = [
  {
    slug: 'fitness',
    name: 'Fitness',
    imageUrl:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=85',
    active: true,
    sortOrder: 10,
  },
  {
    slug: 'casual',
    name: 'Moda Casual',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=85',
    active: true,
    sortOrder: 20,
  },
  {
    slug: 'bolsas',
    name: 'Bolsas',
    imageUrl:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=85',
    active: true,
    sortOrder: 30,
  },
  {
    slug: 'infantil',
    name: 'Infantil',
    imageUrl:
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=600&q=85',
    active: true,
    sortOrder: 40,
  },
];

export const defaultSettings: StoreSettings = {
  storeName: 'Joedla Collection',
  city: 'Rosário do Catete',
  whatsappNumber: '',
  pixKey: '',
  pickupAddress: 'Endereço de retirada a combinar',
  instagram: '',
  deliveryMessage: 'Entrega grátis em Rosário do Catete',
  tickerMessages: [],
  banners: [],
  bannerTitle: 'Elegância para todos os momentos',
  bannerSubtitle: 'Novidades selecionadas para renovar seu estilo com leveza.',
  bannerButtonLabel: 'Conhecer coleção',
  bannerImageUrl:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=85',
  bannerLink: '/(tabs)/categories',
  bannerStartAt: '',
  bannerEndAt: '',
};
