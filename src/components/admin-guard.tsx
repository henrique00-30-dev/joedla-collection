import { router } from 'expo-router';
import { PropsWithChildren, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/src/context/store-context';
import { colors, spacing } from '@/src/theme';

export function AdminGuard({ children }: PropsWithChildren) {
  const { isAdmin, loading } = useStore();

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

  return children;
}

const styles = StyleSheet.create({
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
});
