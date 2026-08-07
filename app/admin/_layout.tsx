import { Ionicons } from '@expo/vector-icons';
import {
  Href,
  router,
  Slot,
  usePathname,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';
import {
  colors,
  fonts,
  shadow,
} from '@/src/theme';

type AdminMenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

type AdminMenuGroup = {
  title?: string;
  items: AdminMenuItem[];
};

const MENU_GROUPS: AdminMenuGroup[] = [
  {
    items: [
      {
        label: 'Dashboard',
        icon: 'grid-outline',
        href: '/admin',
      },
    ],
  },
  {
    title: 'GESTÃO DE LOJA',
    items: [
      {
        label: 'Pedidos',
        icon: 'bag-handle-outline',
        href: '/admin/orders',
      },
      {
        label: 'Produtos',
        icon: 'cube-outline',
        href: '/admin/products',
      },
      {
        label: 'Categorias',
        icon: 'git-branch-outline',
        href: '/admin/categories',
      },
      {
        label: 'Promoções',
        icon: 'pricetag-outline',
        href: '/admin/promotions',
      },
      {
        label: 'Campanhas',
        icon: 'megaphone-outline',
        href: '/admin/campaigns',
      },
    ],
  },
  {
    title: 'COMUNICAÇÃO',
    items: [
      {
        label: 'Barra de informações',
        icon: 'reorder-three-outline',
        href: '/admin/notices',
      },
    ],
  },
  {
    title: 'RELATÓRIOS',
    items: [
      {
        label: 'Desempenho',
        icon: 'stats-chart-outline',
        href: '/admin/analytics',
      },
    ],
  },
  {
    title: 'CONFIGURAÇÕES',
    items: [
      {
        label: 'Aparência da loja',
        icon: 'color-palette-outline',
        href: '/admin/appearance',
      },
      {
        label: 'Configurações',
        icon: 'settings-outline',
        href: '/admin/settings',
      },
    ],
  },
];

export default function AdminLayout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const desktop = width >= 980;
  const isLoginPage = pathname === '/admin/login';

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <Slot />;
  }

  return (
    <View style={styles.shell}>
      {desktop ? (
        <AdminSidebar pathname={pathname} />
      ) : null}

      <View style={styles.main}>
        {!desktop ? (
          <MobileHeader
            onOpenMenu={() =>
              setMobileMenuOpen(true)
            }
          />
        ) : null}

        <View style={styles.page}>
          <Slot />
        </View>
      </View>

      {!desktop && mobileMenuOpen ? (
        <View style={styles.mobileOverlay}>
          <Pressable
            accessibilityLabel="Fechar menu"
            onPress={() =>
              setMobileMenuOpen(false)
            }
            style={styles.overlayBackdrop}
          />

          <View style={styles.mobileSidebar}>
            <AdminSidebar
              pathname={pathname}
              mobile
              onNavigate={() =>
                setMobileMenuOpen(false)
              }
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AdminSidebar({
  pathname,
  mobile = false,
  onNavigate,
}: {
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  async function handleSignOut() {
    try {
      if (supabase) {
        const { error } =
          await supabase.auth.signOut({
            scope: 'local',
          });

        if (error) {
          throw error;
        }
      }

      onNavigate?.();
      router.replace('/admin/login');
    } catch (error) {
      Alert.alert(
        'Não foi possível sair',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    }
  }

  function openRoute(href: Href) {
    onNavigate?.();
    router.push(href);
  }

  return (
    <View
      style={[
        styles.sidebar,
        mobile && styles.sidebarMobile,
      ]}>
      <View style={styles.sidebarHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para a loja"
          onPress={() => router.push('/')}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.sidebarPressed,
          ]}>
          <Ionicons
            name="arrow-back"
            size={17}
            color="#F7EEE7"
          />
        </Pressable>

        <View style={styles.brand}>
          <Text style={styles.brandName}>
            JOEDLA
          </Text>

          <Text style={styles.brandCollection}>
            COLLECTION
          </Text>
        </View>

        {mobile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
            onPress={onNavigate}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.sidebarPressed,
            ]}>
            <Ionicons
              name="close"
              size={19}
              color="#F7EEE7"
            />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator
        contentContainerStyle={
          styles.menuContent
        }>
        {MENU_GROUPS.map(
          (group, groupIndex) => (
            <View
              key={
                group.title ??
                `group-${groupIndex}`
              }
              style={styles.menuGroup}>
              {group.title ? (
                <Text style={styles.groupTitle}>
                  {group.title}
                </Text>
              ) : null}

              <View style={styles.groupItems}>
                {group.items.map((item) => {
                  const active =
                    isRouteActive(
                      pathname,
                      item.href,
                    );

                  return (
                    <Pressable
                      key={item.label}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: active,
                      }}
                      onPress={() =>
                        openRoute(item.href)
                      }
                      style={({ pressed }) => [
                        styles.menuItem,
                        active &&
                          styles.menuItemActive,
                        pressed &&
                          styles.sidebarPressed,
                      ]}>
                      <Ionicons
                        name={item.icon}
                        size={14}
                        color={
                          active
                            ? '#FFFFFF'
                            : '#D9CCC2'
                        }
                      />

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.menuLabel,
                          active &&
                            styles.menuLabelActive,
                        ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ),
        )}

        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOut,
            pressed && styles.sidebarPressed,
          ]}>
          <Ionicons
            name="log-out-outline"
            size={15}
            color="#D9CCC2"
          />

          <Text style={styles.signOutText}>
            Sair
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MobileHeader({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <View style={styles.mobileHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu administrativo"
        onPress={onOpenMenu}
        style={({ pressed }) => [
          styles.mobileHeaderButton,
          pressed &&
            styles.mobileHeaderPressed,
        ]}>
        <Ionicons
          name="menu"
          size={21}
          color={colors.text}
        />
      </Pressable>

      <View style={styles.mobileHeaderBrand}>
        <Text style={styles.mobileHeaderTitle}>
          JOEDLA
        </Text>

        <Text
          style={styles.mobileHeaderSubtitle}>
          PAINEL ADMINISTRATIVO
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver loja"
        onPress={() => router.push('/')}
        style={({ pressed }) => [
          styles.storeButtonMobile,
          pressed &&
            styles.mobileHeaderPressed,
        ]}>
        <Ionicons
          name="storefront-outline"
          size={17}
          color="#9D5F1D"
        />
      </Pressable>
    </View>
  );
}

function isRouteActive(
  pathname: string,
  href: Href,
) {
  const route = String(href);

  if (route === '/admin') {
    return pathname === '/admin';
  }

  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F4F0EA',
  },

  sidebar: {
    width: 160,
    minWidth: 160,
    maxWidth: 160,
    height: '100%',
    flexGrow: 0,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: '#2D231C',
    backgroundColor: '#17110D',
  },

  sidebarMobile: {
    width: 252,
    minWidth: 252,
    maxWidth: 252,
  },

  sidebarHeader: {
    minHeight: 54,
    paddingHorizontal: 6,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor:
      'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 28,
  },

  brand: {
    alignItems: 'center',
  },

  brandName: {
    fontFamily: fonts.display,
    color: '#D9A65B',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  brandCollection: {
    marginTop: 1,
    color: '#BFAE9E',
    fontSize: 5,
    fontWeight: '800',
    letterSpacing: 1.9,
  },

  menuScroll: {
    flex: 1,
  },

  menuContent: {
    flexGrow: 1,
    paddingHorizontal: 5,
    paddingTop: 7,
    paddingBottom: 26,
  },

  menuGroup: {
    marginBottom: 7,
  },

  groupTitle: {
    marginBottom: 3,
    paddingHorizontal: 6,
    color: '#C78B39',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  groupItems: {
    gap: 1,
  },

  menuItem: {
    minHeight: 28,
    paddingHorizontal: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  menuItemActive: {
    backgroundColor: '#A66A27',
  },

  menuLabel: {
    minWidth: 0,
    flex: 1,
    color: '#D9CCC2',
    fontSize: 9,
    fontWeight: '600',
  },

  menuLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  signOut: {
    minHeight: 32,
    marginTop: 4,
    paddingHorizontal: 6,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor:
      'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  signOutText: {
    color: '#D9CCC2',
    fontSize: 9,
    fontWeight: '700',
  },

  sidebarPressed: {
    opacity: 0.68,
  },

  main: {
    minWidth: 0,
    flex: 1,
    backgroundColor: '#F4F0EA',
  },

  page: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F4F0EA',
  },

  mobileHeader: {
    minHeight: 56,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E3D8CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDFC',
    ...shadow,
  },

  mobileHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mobileHeaderBrand: {
    alignItems: 'center',
  },

  mobileHeaderTitle: {
    fontFamily: fonts.display,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  mobileHeaderSubtitle: {
    color: colors.textMuted,
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 1,
  },

  storeButtonMobile: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: '#D4A260',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mobileHeaderPressed: {
    opacity: 0.65,
  },

  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    flexDirection: 'row',
  },

  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(18,13,10,0.55)',
  },

  mobileSidebar: {
    zIndex: 2,
    height: '100%',
    ...Platform.select({
      web: {
        boxShadow:
          '10px 0 26px rgba(0,0,0,0.24)',
      },
      default: {
        elevation: 18,
      },
    }),
  },
});