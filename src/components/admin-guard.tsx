import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { PropsWithChildren, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/context/store-context';
import { colors, radii, shadow, spacing } from '@/src/theme';

export function AdminGuard({ children }: PropsWithChildren) {
  const { isAdmin, loading } = useStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/admin/login');
  }, [isAdmin, loading]);

  if (loading || !isAdmin) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando acesso...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {children}
      {pathname !== '/admin/community' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir moderação de clientes"
          onPress={() => router.push('/admin/community')}
          style={({ pressed }) => [styles.communityShortcut, pressed && styles.pressed]}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
          <Text style={styles.communityShortcutText}>Moderação</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  communityShortcut: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  communityShortcutText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: { opacity: 0.78 },
});
