import * as Crypto from 'expo-crypto';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  defaultSettings,
  demoProducts,
} from '@/src/data/demo';
import { isCloudConfigured } from '@/src/lib/supabase';
import { getStoredJson, setStoredJson } from '@/src/lib/storage';
import {
  archiveCloudProduct,
  createCloudOrder,
  loadCloudAdminOrders,
  loadCloudCatalog,
  loadCloudSettings,
  productFromDraft,
  restoreCloudAdminSession,
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
  CheckoutDraft,
  Order,
  OrderStatus,
  Product,
  ProductDraft,
  StoreSettings,
} from '@/src/types';
import { orderCodeFromUuid } from '@/src/utils/format';

const STORAGE_KEYS = {
  products: 'joedla.products.v1',
  settings: 'joedla.settings.v1',
  cart: 'joedla.cart.v1',
  customerOrders: 'joedla.customer-orders.v1',
  adminOrders: 'joedla.admin-orders.v1',
  favorites: 'joedla.favorites.v1',
};

type StoreContextValue = {
  products: Product[];
  settings: StoreSettings;
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
  refreshStore: () => Promise<void>;
  addToCart: (
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  createOrder: (draft: CheckoutDraft) => Promise<Order>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  refreshAdminOrders: () => Promise<void>;
  saveProduct: (draft: ProductDraft) => Promise<Product>;
  archiveProduct: (productId: string) => Promise<void>;
  changeOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateSettings: (settings: StoreSettings) => Promise<void>;
  uploadProductImage: (uri: string, mimeType?: string) => Promise<string>;
  resetDemo: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [cart, setCart] = useState<CartItem[]>([]);
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
    if (!loading) void setStoredJson(STORAGE_KEYS.cart, cart);
  }, [cart, loading]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.customerOrders, customerOrders);
  }, [customerOrders, loading]);

  useEffect(() => {
    if (!loading) void setStoredJson(STORAGE_KEYS.favorites, favorites);
  }, [favorites, loading]);

  async function initialize() {
    setLoading(true);
    try {
      const [storedCart, storedOrders, storedFavorites] = await Promise.all([
        getStoredJson<CartItem[]>(STORAGE_KEYS.cart, []),
        getStoredJson<Order[]>(STORAGE_KEYS.customerOrders, []),
        getStoredJson<string[]>(STORAGE_KEYS.favorites, []),
      ]);

      setCart(storedCart);
      setCustomerOrders(storedOrders);
      setFavorites(storedFavorites);
      try {
        await refreshStore();
      } catch {
        const [storedProducts, storedSettings] = await Promise.all([
          getStoredJson<Product[]>(STORAGE_KEYS.products, demoProducts),
          getStoredJson<StoreSettings>(STORAGE_KEYS.settings, defaultSettings),
        ]);
        setProducts(storedProducts);
        setSettings(storedSettings);
      }

      if (cloudEnabled) {
        try {
          setIsAdmin(await restoreCloudAdminSession());
        } catch {
          setIsAdmin(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshStore() {
    if (cloudEnabled) {
      const [cloudProducts, cloudSettings] = await Promise.all([
        loadCloudCatalog(),
        loadCloudSettings(),
      ]);
      setProducts(cloudProducts);
      if (cloudSettings) setSettings(cloudSettings);
      return;
    }

    const [storedProducts, storedSettings] = await Promise.all([
      getStoredJson<Product[]>(STORAGE_KEYS.products, demoProducts),
      getStoredJson<StoreSettings>(STORAGE_KEYS.settings, defaultSettings),
    ]);
    setProducts(storedProducts);
    setSettings(storedSettings);
  }

  function addToCart(
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
    availabilityOverride?: Availability,
  ) {
    const effectiveAvailability = availabilityOverride ?? product.availability;
    const effectiveStock = effectiveAvailability === 'ready' ? product.stock : 99;
    const key = [
      product.id,
      selectedSize ?? '',
      selectedColor ?? '',
      effectiveAvailability,
    ].join(':');
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity:
                  effectiveAvailability === 'ready'
                    ? Math.min(item.quantity + quantity, effectiveStock)
                    : item.quantity + quantity,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          key,
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrls[0] ?? '',
          unitPrice: product.price,
          quantity,
          selectedSize,
          selectedColor,
          availability: effectiveAvailability,
          stock: effectiveStock,
        },
      ];
    });
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

  async function createOrder(draft: CheckoutDraft): Promise<Order> {
    if (!cart.length) throw new Error('Seu carrinho está vazio.');

    const id = Crypto.randomUUID();
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const order: Order = {
      id,
      publicCode: orderCodeFromUuid(id),
      lookupToken: Crypto.randomUUID(),
      customer: draft.customer,
      deliveryMethod: draft.deliveryMethod,
      paymentMethod: draft.paymentMethod,
      items: cart.map((item) => ({
        id: Crypto.randomUUID(),
        productId: item.productId,
        productName: item.productName,
        imageUrl: item.imageUrl,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        availability: item.availability,
        subtotal: item.unitPrice * item.quantity,
      })),
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (cloudEnabled) await createCloudOrder(order);

    setCustomerOrders((current) => [order, ...current]);
    setCart([]);

    if (cloudEnabled) {
      setAdminOrders((current) => [order, ...current]);
    } else {
      const storedAdminOrders = await getStoredJson<Order[]>(
        STORAGE_KEYS.adminOrders,
        customerOrders,
      );
      const nextAdminOrders = [
        order,
        ...storedAdminOrders.filter((item) => item.id !== order.id),
      ];
      setAdminOrders(nextAdminOrders);
      await setStoredJson(STORAGE_KEYS.adminOrders, nextAdminOrders);
    }

    return order;
  }

  async function loginAdmin(email: string, password: string) {
    setAdminLoading(true);
    try {
      if (cloudEnabled) {
        await signInCloudAdmin(email.trim(), password);
      } else if (
        email.trim().toLowerCase() !== DEMO_ADMIN_EMAIL ||
        password !== DEMO_ADMIN_PASSWORD
      ) {
        throw new Error('E-mail ou senha de demonstração incorretos.');
      }
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
      if (cloudEnabled) {
        setAdminOrders(await loadCloudAdminOrders());
      } else {
        setAdminOrders(
          await getStoredJson<Order[]>(STORAGE_KEYS.adminOrders, customerOrders),
        );
      }
    } finally {
      setAdminLoading(false);
    }
  }

  async function saveProduct(draft: ProductDraft): Promise<Product> {
    const existing = draft.id ? products.find((item) => item.id === draft.id) : null;
    const product = existing
      ? { ...existing, ...draft, id: existing.id, createdAt: existing.createdAt }
      : productFromDraft(draft);

    if (cloudEnabled) await saveCloudProduct(product);

    const nextProducts = existing
      ? products.map((item) => (item.id === product.id ? product : item))
      : [product, ...products];
    setProducts(nextProducts);

    if (!cloudEnabled) await setStoredJson(STORAGE_KEYS.products, nextProducts);
    return product;
  }

  async function archiveProduct(productId: string) {
    if (cloudEnabled) {
      await archiveCloudProduct(productId);
      setProducts((current) => current.filter((item) => item.id !== productId));
      return;
    }

    const nextProducts = products.filter((item) => item.id !== productId);
    setProducts(nextProducts);
    await setStoredJson(STORAGE_KEYS.products, nextProducts);
  }

  async function changeOrderStatus(orderId: string, status: OrderStatus) {
    const previousOrder = adminOrders.find((order) => order.id === orderId);
    if (cloudEnabled) {
      await updateCloudOrderStatus(orderId, status);
      await refreshStore();
    }

    const update = (orders: Order[]) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order));

    const nextAdminOrders = update(adminOrders);
    setAdminOrders(nextAdminOrders);
    setCustomerOrders((current) => update(current));

    if (!cloudEnabled) {
      const reservedStatuses: OrderStatus[] = [
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'completed',
      ];
      const wasReserved = previousOrder
        ? reservedStatuses.includes(previousOrder.status)
        : false;
      const willBeReserved = reservedStatuses.includes(status);

      if (previousOrder && wasReserved !== willBeReserved) {
        const direction = willBeReserved ? -1 : 1;
        const nextProducts = products.map((product) => {
          const orderedQuantity = previousOrder.items
            .filter(
              (item) =>
                item.productId === product.id &&
                item.availability === 'ready',
            )
            .reduce((sum, item) => sum + item.quantity, 0);

          return orderedQuantity
            ? {
                ...product,
                stock: Math.max(0, product.stock + direction * orderedQuantity),
              }
            : product;
        });
        setProducts(nextProducts);
        await setStoredJson(STORAGE_KEYS.products, nextProducts);
      }
      await setStoredJson(STORAGE_KEYS.adminOrders, nextAdminOrders);
    }
  }

  async function updateSettings(nextSettings: StoreSettings) {
    if (cloudEnabled) await saveCloudSettings(nextSettings);
    setSettings(nextSettings);
    if (!cloudEnabled) await setStoredJson(STORAGE_KEYS.settings, nextSettings);
  }

  async function uploadProductImage(uri: string, mimeType?: string): Promise<string> {
    if (!cloudEnabled) return uri;
    return uploadCloudProductImage(uri, mimeType);
  }

  async function resetDemo() {
    if (cloudEnabled) return;
    setProducts(demoProducts);
    setSettings(defaultSettings);
    setCart([]);
    setCustomerOrders([]);
    setAdminOrders([]);
    setFavorites([]);
    await Promise.all([
      setStoredJson(STORAGE_KEYS.products, demoProducts),
      setStoredJson(STORAGE_KEYS.settings, defaultSettings),
      setStoredJson(STORAGE_KEYS.cart, []),
      setStoredJson(STORAGE_KEYS.customerOrders, []),
      setStoredJson(STORAGE_KEYS.adminOrders, []),
      setStoredJson(STORAGE_KEYS.favorites, []),
    ]);
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
    settings,
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
    refreshStore,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleFavorite,
    createOrder,
    loginAdmin,
    logoutAdmin,
    refreshAdminOrders,
    saveProduct,
    archiveProduct,
    changeOrderStatus,
    updateSettings,
    uploadProductImage,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore precisa estar dentro de StoreProvider.');
  return context;
}
