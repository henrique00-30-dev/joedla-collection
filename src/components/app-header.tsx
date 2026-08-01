import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';

type AppHeaderProps = {
  compact?: boolean;
  title?: string;
  showBack?: boolean;
  showStoreHome?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    label?: string;
  };
};

export function AppHeader({
  compact = false,
  title,
  showBack = false,
  showStoreHome = false,
  rightAction,
}: AppHeaderProps) {
  const { cartCount } = useStore();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  if (compact || title) {
    return (
      <View style={styles.compactHeader}>
        <View
          style={[
            styles.side,
            showStoreHome && styles.sideWithStore,
            showStoreHome && rightAction && styles.sideWithTwoActions,
          ]}>
          {showBack ? (
            <Pressable
              accessibilityLabel="Voltar"
              hitSlop={12}
              onPress={handleBack}
              style={styles.iconButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View
          style={[
            styles.side,
            styles.sideRight,
            showStoreHome && styles.sideWithStore,
            showStoreHome && rightAction && styles.sideWithTwoActions,
          ]}>
          {showStoreHome ? (
            <Pressable
              accessibilityLabel="Voltar para a loja"
              hitSlop={10}
              onPress={() => router.replace('/')}
              style={styles.storeButton}>
              <Ionicons name="home-outline" size={18} color={colors.primary} />
              <Text style={styles.storeButtonText}>Loja</Text>
            </Pressable>
          ) : null}
          {rightAction ? (
            <Pressable
              accessibilityLabel={rightAction.label ?? 'Ação'}
              hitSlop={12}
              onPress={rightAction.onPress}
              style={styles.iconButton}>
              <Ionicons name={rightAction.icon} size={23} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainHeader}>
      <View style={styles.headerSideSpacer} />
      <Image
        source={require('@/assets/images/joedla-logo.png')}
        contentFit="contain"
        style={styles.logo}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Abrir carrinho"
          hitSlop={10}
          onPress={() => router.push('/(tabs)/cart')}
          style={styles.iconButton}>
          <Ionicons name="bag-handle-outline" size={25} color={colors.text} />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainHeader: {
    minHeight: 92,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideSpacer: {
    width: 42,
  },
  logo: {
    width: 150,
    height: 86,
  },
  actions: {
    width: 42,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -1,
    top: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  compactHeader: {
    minHeight: 58,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  side: {
    width: 52,
    alignItems: 'flex-start',
  },
  sideRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  sideWithTwoActions: {
    width: 100,
  },
  sideWithStore: {
    width: 68,
  },
  storeButton: {
    minWidth: 58,
    height: 38,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
  },
  storeButtonText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
