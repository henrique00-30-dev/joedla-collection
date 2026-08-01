import { Category, Product, StoreSettings } from '@/src/types';

export const categories: Category[] = [
  {
    slug: 'fitness',
    name: 'Fitness',
    imageUrl:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=85',
  },
  {
    slug: 'casual',
    name: 'Moda Casual',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=85',
  },
  {
    slug: 'bolsas',
    name: 'Bolsas',
    imageUrl:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=85',
  },
  {
    slug: 'infantil',
    name: 'Infantil',
    imageUrl:
      'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=600&q=85',
  },
];

export const demoProducts: Product[] = [
  {
    id: 'demo-fitness-1',
    name: 'Conjunto Fitness Essencial',
    description:
      'Conjunto confortável para treino, com tecido firme, toque macio e ótima liberdade de movimento.',
    category: 'fitness',
    price: 139.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: ['P', 'M', 'G'],
    colors: ['Marrom', 'Preto', 'Rosa'],
    availability: 'ready',
    stock: 6,
    featured: true,
    active: true,
    createdAt: '2026-07-20T12:00:00.000Z',
  },
  {
    id: 'demo-fitness-2',
    name: 'Legging Cintura Alta',
    description: 'Legging de cintura alta com compressão confortável e cós anatômico.',
    category: 'fitness',
    price: 89.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: ['P', 'M', 'G', 'GG'],
    colors: ['Preto', 'Azul-marinho'],
    availability: 'custom',
    stock: 0,
    featured: false,
    active: true,
    createdAt: '2026-07-21T12:00:00.000Z',
  },
  {
    id: 'demo-casual-1',
    name: 'Conjunto Casual Feminino',
    description: 'Conjunto leve e elegante para passeios, encontros e ocasiões do dia a dia.',
    category: 'casual',
    price: 159.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: ['P', 'M', 'G'],
    colors: ['Bege', 'Terracota'],
    availability: 'ready',
    stock: 4,
    featured: true,
    active: true,
    createdAt: '2026-07-22T12:00:00.000Z',
  },
  {
    id: 'demo-casual-2',
    name: 'Vestido Serena',
    description: 'Vestido casual versátil, com caimento leve e acabamento delicado.',
    category: 'casual',
    price: 149.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: ['P', 'M', 'G'],
    colors: ['Nude', 'Verde'],
    availability: 'custom',
    stock: 0,
    featured: false,
    active: true,
    createdAt: '2026-07-23T12:00:00.000Z',
  },
  {
    id: 'demo-bolsa-1',
    name: 'Bolsa Festa Shine',
    description: 'Bolsa pequena para festa com alça removível e acabamento sofisticado.',
    category: 'bolsas',
    price: 129.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: [],
    colors: ['Dourada', 'Prata', 'Preta'],
    availability: 'custom',
    stock: 0,
    featured: true,
    active: true,
    createdAt: '2026-07-24T12:00:00.000Z',
  },
  {
    id: 'demo-bolsa-2',
    name: 'Bolsa Transversal Mini',
    description: 'Bolsa compacta e moderna para levar o essencial com praticidade.',
    category: 'bolsas',
    price: 109.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: [],
    colors: ['Caramelo', 'Preta'],
    availability: 'ready',
    stock: 3,
    featured: true,
    active: true,
    createdAt: '2026-07-25T12:00:00.000Z',
  },
  {
    id: 'demo-infantil-1',
    name: 'Mochila Infantil Doce',
    description: 'Mochila infantil leve, espaçosa e confortável para passeios e escola.',
    category: 'infantil',
    price: 119.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: [],
    colors: ['Rosa', 'Azul'],
    availability: 'ready',
    stock: 5,
    featured: true,
    active: true,
    createdAt: '2026-07-26T12:00:00.000Z',
  },
  {
    id: 'demo-bolsa-3',
    name: 'Bolsa Tote Clássica',
    description: 'Bolsa adulta espaçosa para trabalho, passeio e rotina.',
    category: 'bolsas',
    price: 169.9,
    imageUrls: [
      'https://images.unsplash.com/photo-1585488434455-1e7b6b29364f?auto=format&fit=crop&w=900&q=85',
    ],
    sizes: [],
    colors: ['Marrom', 'Preta'],
    availability: 'ready',
    stock: 2,
    featured: false,
    active: true,
    createdAt: '2026-07-27T12:00:00.000Z',
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
};

export const DEMO_ADMIN_EMAIL = 'admin@joedla.local';
export const DEMO_ADMIN_PASSWORD = 'joedla123';
