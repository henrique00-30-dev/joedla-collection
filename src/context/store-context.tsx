import { useGlobalSearchParams, usePathname } from 'expo-router';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { defaultCategories, defaultSettings } from '@/src/data/defaults';
import {
  loadActiveProductPromotionVisuals,
  loadCatalogPriceResolutions,
  loadMarketingStorefront,
} from '@/src/features/marketing/service';
import { resolveProductMarketingBadge } from '@/src/features/marketing/storefront';
import { MARKETING_TIMEZONE, MarketingStorefront } from '@/src/features/marketing/types';
import { getStoredJson, setStoredJson } from '@/src/lib/storage';
import { isCloudConfigured } from '@/src/lib/supabase';
import { recordSiteVisit } from '@/src/services/analytics';
import {
  archiveCloudCategory,
  archiveCloudProduct,
  createTrustedCloudOrder,
  loadCloudAdminOrders,
  loadCloudCatalog,
  loadCloudCategories,
  loadCloudSettings,
  productFromDraft,
  restoreCloudAdminSession,
  saveCloudCategory,
  saveCloudProduct,
  saveCloudSettings,
  signInCloudAdmin,
  signOutCloudAdmin,
  updateCloudOrderStatus,
  uploadCloudProductImage,
} from '@/src/services/cloud';
import {
  Availability,
  CartItem,
  Category,
  CategoryDraft,
  CheckoutDraft,
  Order,
  OrderStatus,
  Product,
  ProductDraft,
  StoreSettings,
} from '@/src/types';

const STORAGE_KEYS = {
  products: 'joedla.products.v1',
  categories: 'joedla.categories.v1',
  settings: 'joedla.settings.v1',
  cart: 'joedla.cart.v1',
  directCheckout: 'joedla.direct-checkout.v1',
  customerOrders: 'joedla.customer-orders.v1',
  favorites: 'joedla.favorites.v1',
};

type DirectCheckout = {
  token: string;
  item: CartItem;
};

type StoreContextValue = {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  marketing: MarketingStorefront;
  cart: CartItem[];
  customerOrders: Order[];
  adminOrders: Order[];
  favorites: string[];
  loading: boolean;
  adminLoading: boolean;
  isAdmin: boolean;
  cloudEnabled: boolean;
  cartCount: number;
  cartSubtotal: number;
  directCheckout: DirectCheckout | null;
  refreshStore: () => Promise<void>;
  addToCart: (
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) => void;
  startDirectCheckout: (
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) => string;
  updateCartQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  createOrder: (draft: CheckoutDraft) => Promise<Order>;
  createDirectOrder: (draft: CheckoutDraft, token: string) => Promise<Order>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  refreshAdminOrders: () => Promise<void>;
  saveProduct: (draft: ProductDraft) => Promise<Product>;
  archiveProduct: (productId: string) => Promise<void>;
  saveCategory: (draft: CategoryDraft) => Promise<Category>;
  archiveCategory: (slug: string) => Promise<void>;
  changeOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateSettings: (settings: StoreSettings) => Promise<void>;
  uploadProductImage: (uri: string, mimeType?: string) => Promise<string>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [marketing, setMarketing] = useState<MarketingStorefront>({
    settings: {
      enabled: false,
      pricingEnabled: false,
      storeTimezone: MARKETING_TIMEZONE,
      maxImageBytes: 5_242_880,
      version: 1,
      createdAt: '',
      updatedAt: '',
    },
    campaigns: [],
    nextBoundaryAt: null,
    nextBoundaryDelayMs: null,
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [directCheckout, setDirectCheckout] = useState<DirectCheckout | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const cloudEnabled = isCloudConfigured;

  useEffect(() => {
    void initialize();
    // A inicialização da persistência deve acontecer apenas uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cloudEnabled) void recordSiteVisit();
  }, [cloudEnabled]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.cart, cart);
  }, [cart, loading]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.directCheckout, directCheckout);
  }, [directCheckout, loading]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.customerOrders, customerOrders);
  }, [customerOrders, loading]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.favorites, favorites);
  }, [favorites, loading]);

  useEffect(() => {
    if (marketing.nextBoundaryDelayMs === null) return;
    const delay = Math.max(1_000, marketing.nextBoundaryDelayMs + 500);
    const timer = setTimeout(() => void refreshStore(), Math.min(delay, 2_147_000_000));
    return () => clearTimeout(timer);
    // A fronteira calculada é a única dependência temporal necessária.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketing.nextBoundaryDelayMs]);

  useEffect(() => {
    if (!cloudEnabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshStore().catch(() => undefined);
    });
    return () => subscription.remove();
    // A retomada apenas revalida a fonte online configurada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled]);

  async function initialize() {
    setLoading(true);
    try {
      const [storedCart, storedDirectCheckout, storedOrders, storedFavorites] = await Promise.all([
        getStoredJson<CartItem[]>(STORAGE_KEYS.cart, []),
        getStoredJson<DirectCheckout | null>(STORAGE_KEYS.directCheckout, null),
        getStoredJson<Order[]>(STORAGE_KEYS.customerOrders, []),
        getStoredJson<string[]>(STORAGE_KEYS.favorites, []),
      ]);

      setCart(storedCart);
      setDirectCheckout(storedDirectCheckout);
      setCustomerOrders(storedOrders);
      setFavorites(storedFavorites);
      if (cloudEnabled) {
        try {
          await refreshStore();
          setIsAdmin(await restoreCloudAdminSession());
        } catch {
          const [storedProducts, storedCategories, storedSettings] = await Promise.all([
            getStoredJson<Product[]>(STORAGE_KEYS.products, []),
            getStoredJson<Category[]>(STORAGE_KEYS.categories, defaultCategories),
            getStoredJson<StoreSettings>(STORAGE_KEYS.settings, defaultSettings),
          ]);
          setProducts(storedProducts);
          setCategories(storedCategories);
          setSettings(storedSettings);
          setIsAdmin(false);
        }
      } else {
        setProducts([]);
        setCategories(defaultCategories);
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshStore() {
    if (!cloudEnabled) {
      throw new Error(
        'A conexão online da loja não foi configurada.',
      );
    }

    const [
      baseProducts,
      cloudCategories,
      cloudSettings,
    ] = await Promise.all([
      loadCloudCatalog(),
      loadCloudCategories(),
      loadCloudSettings(),
    ]);

    let cloudMarketing = marketing;

    try {
      cloudMarketing = await loadMarketingStorefront();
    } catch (error) {
      console.warn(
        'Falha ao carregar o marketing da loja.',
        error,
      );
    }

    let priceResolutions: Awaited<
      ReturnType<typeof loadCatalogPriceResolutions>
    > = [];

    let individualVisuals: Awaited<
      ReturnType<typeof loadActiveProductPromotionVisuals>
    > = [];

    if (cloudMarketing.settings.pricingEnabled) {
      const [pricesResult, visualsResult] =
        await Promise.allSettled([
          loadCatalogPriceResolutions(
            baseProducts.map((product) => product.id),
          ),
          loadActiveProductPromotionVisuals(),
        ]);

      if (pricesResult.status === 'fulfilled') {
        priceResolutions = pricesResult.value;
      } else {
        console.warn(
          'Falha ao carregar preços promocionais.',
          pricesResult.reason,
        );
      }

      if (visualsResult.status === 'fulfilled') {
        individualVisuals = visualsResult.value;
      } else {
        console.warn(
          'Falha ao carregar o visual dos selos promocionais.',
          visualsResult.reason,
        );
      }
    }

    const priceByProduct = new Map(
      priceResolutions.map((price) => [
        price.productId,
        price,
      ]),
    );

    const visualByProduct = new Map(
      individualVisuals.map((visual) => [
        visual.productId,
        visual,
      ]),
    );

    const cloudProducts: Product[] = baseProducts.map(
      (product) => {
        const resolution = priceByProduct.get(product.id);
        const individualVisual = visualByProduct.get(
          product.id,
        );

        const campaignBadge =
          resolveProductMarketingBadge(
            cloudMarketing.campaigns,
            product,
          );

        const individualBadge =
          resolution?.individualBadgeLabel &&
          resolution.individualBadgeTone
            ? {
                label:
                  resolution.individualBadgeLabel,
                tone:
                  resolution.individualBadgeTone,
                position:
                  individualVisual?.position ??
                  ('top-left' as const),
                size:
                  individualVisual?.size ??
                  ('medium' as const),
                shape:
                  individualVisual?.shape ??
                  ('pill' as const),
              }
            : null;

        const badge = campaignBadge
          ? {
              label: campaignBadge.label,
              tone: campaignBadge.tone,
              position: 'top-left' as const,
              size: 'medium' as const,
              shape: 'pill' as const,
            }
          : individualBadge;

        return {
          ...product,
          price: resolution
            ? resolution.finalPriceCents / 100
            : product.price,
          originalPrice:
            resolution &&
            resolution.finalPriceCents <
              resolution.originalPriceCents
              ? resolution.originalPriceCents / 100
              : undefined,
          promotionCampaignId:
            resolution?.campaignId ?? undefined,
          promotionCampaignName:
            resolution?.campaignName ?? undefined,
          promotionType:
            resolution?.ruleType ?? undefined,
          discountBasisPoints:
            resolution?.discountBasisPoints ??
            undefined,
          priceSource:
            resolution?.priceSource ?? 'normal',
          individualPromotionId:
            resolution?.individualPromotionId ??
            undefined,
          marketingBadge: badge ?? undefined,
        };
      },
    );

    setProducts(cloudProducts);
    setCategories(cloudCategories);
    setMarketing(cloudMarketing);

    setCart((current) =>
      current.map((item) => {
        const product = cloudProducts.find(
          (candidate) =>
            candidate.id === item.productId,
        );

        if (!product) return item;

        return {
          ...item,
          unitPrice: product.price,
          originalUnitPrice:
            product.originalPrice,
          promotionCampaignId:
            product.promotionCampaignId,
          individualPromotionId:
            product.individualPromotionId,
          priceSource: product.priceSource,
          stock:
            product.availability === 'ready'
              ? product.stock
              : item.stock,
        };
      }),
    );

    setDirectCheckout((current) => {
      if (!current) return current;
      const product = cloudProducts.find((candidate) => candidate.id === current.item.productId);
      if (!product) return null;
      return {
        ...current,
        item: {
          ...current.item,
          productName: product.name,
          imageUrl: product.imageUrls[0] ?? current.item.imageUrl,
          unitPrice: product.price,
          originalUnitPrice: product.originalPrice,
          promotionCampaignId: product.promotionCampaignId,
          individualPromotionId: product.individualPromotionId,
          priceSource: product.priceSource,
          stock: product.availability === 'ready' ? product.stock : current.item.stock,
        },
      };
    });

    await Promise.all([
      setStoredJson(
        STORAGE_KEYS.products,
        cloudProducts,
      ),
      setStoredJson(
        STORAGE_KEYS.categories,
        cloudCategories,
      ),
    ]);

    if (cloudSettings) {
      setSettings(cloudSettings);
      await setStoredJson(
        STORAGE_KEYS.settings,
        cloudSettings,
      );
    }
  }

  function buildCartItem(
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ): CartItem | null {
    const effectiveAvailability = availabilityOverride ?? product.availability;
    if (effectiveAvailability === 'ready' && product.stock <= 0) return null;
    const effectiveStock = effectiveAvailability === 'ready' ? product.stock : 99;
    const key = [
      product.id,
      selectedSize ?? '',
      selectedColor ?? '',
      effectiveAvailability,
    ].join(':');

    return {
      key,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrls[0] ?? '',
      unitPrice: product.price,
      originalUnitPrice: product.originalPrice,
      promotionCampaignId: product.promotionCampaignId,
      individualPromotionId: product.individualPromotionId,
      priceSource: product.priceSource,
      quantity: Math.max(1, Math.min(quantity, effectiveStock, 99)),
      selectedSize,
      selectedColor,
      availability: effectiveAvailability,
      stock: effectiveStock,
    };
  }

  function addToCart(
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) {
    const nextItem = buildCartItem(
      product,
      quantity,
      selectedSize,
      selectedColor,
      availabilityOverride,
    );
    if (!nextItem) return;

    setCart((current) => {
      const existing = current.find((item) => item.key === nextItem.key);
      if (existing) {
        return current.map((item) =>
          item.key === nextItem.key
            ? {
                ...item,
                quantity:
                  nextItem.availability === 'ready'
                    ? Math.min(item.quantity + nextItem.quantity, nextItem.stock)
                    : Math.min(item.quantity + nextItem.quantity, 99),
              }
            : item,
        );
      }
      return [...current, nextItem];
    });
  }

  function startDirectCheckout(
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) {
    const item = buildCartItem(
      product,
      quantity,
      selectedSize,
      selectedColor,
      availabilityOverride,
    );
    if (!item) throw new Error('Produto indisponível no momento.');

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    setDirectCheckout({ token, item });
    return token;
  }

  function updateCartQuantity(key: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.key !== key) return item;
          const maximum = item.availability === 'ready' ? item.stock : 99;
          return { ...item, quantity: Math.max(1, Math.min(quantity, maximum)) };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(key: string) {
    setCart((current) => current.filter((item) => item.key !== key));
  }

  function clearCart() {
    setCart([]);
  }

  function toggleFavorite(productId: string) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  async function createOrderFromItems(
    draft: CheckoutDraft,
    items: CartItem[],
    directToken?: string,
  ): Promise<Order> {
    if (!items.length) throw new Error('Nenhum produto selecionado para finalizar.');
    if (!cloudEnabled) {
      throw new Error('A loja está sem conexão com o banco online. Tente novamente depois.');
    }

    const currentPrices = await loadCatalogPriceResolutions(
      [...new Set(items.map((item) => item.productId))],
    );
    const priceByProduct = new Map(
      currentPrices.map((price) => [price.productId, price]),
    );
    const priceChanged = items.some((item) => {
      const resolution = priceByProduct.get(item.productId);
      return resolution
        ? Math.round(item.unitPrice * 100) !== resolution.finalPriceCents
        : false;
    });

    if (priceChanged) {
      const updateItemPrice = (item: CartItem) => {
        const resolution = priceByProduct.get(item.productId);
        if (!resolution) return item;
        return {
          ...item,
          unitPrice: resolution.finalPriceCents / 100,
          originalUnitPrice: resolution.finalPriceCents < resolution.originalPriceCents
            ? resolution.originalPriceCents / 100
            : undefined,
          promotionCampaignId: resolution.campaignId ?? undefined,
          individualPromotionId: resolution.individualPromotionId ?? undefined,
          priceSource: resolution.priceSource,
        };
      };

      if (directToken) {
        setDirectCheckout((current) =>
          current?.token === directToken
            ? { ...current, item: updateItemPrice(current.item) }
            : current,
        );
      } else {
        setCart((current) => current.map(updateItemPrice));
      }

      throw new Error(
        'Os preços foram atualizados. Revise os valores e confirme o pedido novamente.',
      );
    }

    const order = await createTrustedCloudOrder(draft, items);
    setCustomerOrders((current) => [order, ...current]);

    if (directToken) {
      setDirectCheckout((current) => current?.token === directToken ? null : current);
    } else {
      setCart([]);
    }

    setAdminOrders((current) => [order, ...current]);
    return order;
  }

  async function createOrder(draft: CheckoutDraft): Promise<Order> {
    return createOrderFromItems(draft, cart);
  }

  async function createDirectOrder(draft: CheckoutDraft, token: string): Promise<Order> {
    if (!directCheckout || directCheckout.token !== token) {
      throw new Error('A compra direta expirou. Volte ao produto e toque em Comprar agora novamente.');
    }
    return createOrderFromItems(draft, [directCheckout.item], token);
  }

  async function loginAdmin(email: string, password: string) {
    setAdminLoading(true);
    try {
      if (!cloudEnabled) {
        throw new Error('A área administrativa online não está configurada.');
      }
      await signInCloudAdmin(email.trim(), password);
      setIsAdmin(true);
      await refreshAdminOrders();
    } finally {
      setAdminLoading(false);
    }
  }

  async function logoutAdmin() {
    if (cloudEnabled) await signOutCloudAdmin();
    setIsAdmin(false);
  }

  async function refreshAdminOrders() {
    setAdminLoading(true);
    try {
      if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
      setAdminOrders(await loadCloudAdminOrders());
    } finally {
      setAdminLoading(false);
    }
  }

  async function saveProduct(draft: ProductDraft): Promise<Product> {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    const existing = draft.id ? products.find((item) => item.id === draft.id) : null;
    const product = existing
      ? { ...existing, ...draft, id: existing.id, createdAt: existing.createdAt }
      : productFromDraft(draft);

    await saveCloudProduct(product);

    const nextProducts = existing
      ? products.map((item) => (item.id === product.id ? product : item))
      : [product, ...products];
    setProducts(nextProducts);
    await setStoredJson(STORAGE_KEYS.products, nextProducts);

    return product;
  }

  async function archiveProduct(productId: string) {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    await archiveCloudProduct(productId);
    const nextProducts = products.filter((item) => item.id !== productId);
    setProducts(nextProducts);
    await setStoredJson(STORAGE_KEYS.products, nextProducts);
  }

  async function saveCategory(draft: CategoryDraft): Promise<Category> {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    const existing = draft.slug
      ? categories.find((item) => item.slug === draft.slug)
      : undefined;
    const nextSortOrder = existing?.sortOrder
      ?? Math.max(0, ...categories.map((item) => item.sortOrder)) + 10;
    const category = await saveCloudCategory(draft, nextSortOrder);
    const nextCategories = (
      existing
        ? categories.map((item) => (item.slug === category.slug ? category : item))
        : [...categories, category]
    ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    setCategories(nextCategories);
    await setStoredJson(STORAGE_KEYS.categories, nextCategories);
    return category;
  }

  async function archiveCategory(slug: string) {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    await archiveCloudCategory(slug);
    const nextCategories = categories.filter((item) => item.slug !== slug);
    setCategories(nextCategories);
    await setStoredJson(STORAGE_KEYS.categories, nextCategories);
  }

  async function changeOrderStatus(orderId: string, status: OrderStatus) {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    await updateCloudOrderStatus(orderId, status);
    await refreshStore();

    const update = (orders: Order[]) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order));

    const nextAdminOrders = update(adminOrders);
    setAdminOrders(nextAdminOrders);
    setCustomerOrders((current) => update(current));
  }

  async function updateSettings(nextSettings: StoreSettings) {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    await saveCloudSettings(nextSettings);
    setSettings(nextSettings);
    await setStoredJson(STORAGE_KEYS.settings, nextSettings);
  }

  async function uploadProductImage(uri: string, mimeType?: string): Promise<string> {
    if (!cloudEnabled) throw new Error('A área administrativa online não está configurada.');
    return uploadCloudProductImage(uri, mimeType);
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart],
  );

  const value: StoreContextValue = {
    products,
    categories,
    settings,
    marketing,
    cart,
    customerOrders,
    adminOrders,
    favorites,
    loading,
    adminLoading,
    isAdmin,
    cloudEnabled,
    cartCount,
    cartSubtotal,
    directCheckout,
    refreshStore,
    addToCart,
    startDirectCheckout,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleFavorite,
    createOrder,
    createDirectOrder,
    loginAdmin,
    logoutAdmin,
    refreshAdminOrders,
    saveProduct,
    archiveProduct,
    saveCategory,
    archiveCategory,
    changeOrderStatus,
    updateSettings,
    uploadProductImage,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ buyNow?: string }>();

  if (!context) throw new Error('useStore precisa estar dentro de StoreProvider.');

  const buyNowToken = typeof params.buyNow === 'string' ? params.buyNow : undefined;
  const isDirectCheckoutRoute = pathname === '/checkout' && Boolean(buyNowToken);
  const direct = isDirectCheckoutRoute
    && context.directCheckout?.token === buyNowToken
    ? context.directCheckout
    : null;

  if (isDirectCheckoutRoute && !direct) {
    return {
      ...context,
      cart: [],
      cartSubtotal: 0,
      createOrder: async () => {
        throw new Error('A compra direta expirou. Volte ao produto e toque em Comprar agora novamente.');
      },
    };
  }

  if (!direct) return context;

  return {
    ...context,
    cart: [direct.item],
    cartSubtotal: direct.item.unitPrice * direct.item.quantity,
    createOrder: (draft: CheckoutDraft) => context.createDirectOrder(draft, direct.token),
  };
}