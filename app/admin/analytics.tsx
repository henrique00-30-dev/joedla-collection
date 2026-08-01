import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { loadStoreAnalytics } from '@/src/services/analytics';
import { colors, radii, spacing } from '@/src/theme';
import { AnalyticsProductMetric, StoreAnalytics } from '@/src/types';

const periods = [7, 30, 90, 365] as const;

export default function AdminAnalyticsScreen() {
  const [period, setPeriod] = useState<number>(30);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refreshAnalytics();
    // A troca do período deve recarregar as métricas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function refreshAnalytics(manual = false) {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      setAnalytics(await loadStoreAnalytics(period));
    } catch (error) {
      Alert.alert(
        'Não foi possível carregar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Desempenho da loja" showBack showStoreHome />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshAnalytics(true)}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator>
          <Text style={styles.helpText}>
            Acessos são contados por navegador, de forma anônima, uma vez por dia.
          </Text>

          <View style={styles.periods}>
            {periods.map((days) => (
              <Pressable
                key={days}
                onPress={() => setPeriod(days)}
                style={[styles.periodChip, period === days && styles.periodChipActive]}>
                <Text
                  style={[
                    styles.periodChipText,
                    period === days && styles.periodChipTextActive,
                  ]}>
                  {days} dias
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.helpText}>Calculando métricas...</Text>
            </View>
          ) : analytics ? (
            <>
              <View style={styles.metrics}>
                <MetricCard
                  icon="people-outline"
                  label="Visitantes"
                  value={analytics.uniqueVisitors}
                />
                <MetricCard
                  icon="calendar-outline"
                  label="Acessos por dia"
                  value={analytics.totalVisits}
                />
                <MetricCard
                  icon="eye-outline"
                  label="Produtos vistos"
                  value={analytics.productViews}
                />
                <MetricCard
                  icon="bag-check-outline"
                  label="Pedidos"
                  value={analytics.orders}
                />
              </View>

              <Ranking
                icon="eye-outline"
                title="Produtos mais vistos"
                emptyText="As visualizações começarão a aparecer após a publicação desta versão."
                items={analytics.topViewed}
                suffix="visualizações"
              />
              <Ranking
                icon="bag-check-outline"
                title="Produtos mais comprados"
                emptyText="Ainda não há compras no período selecionado."
                items={analytics.topPurchased}
                suffix="unidades"
              />
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.metricValue}>{value.toLocaleString('pt-BR')}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Ranking({
  icon,
  title,
  emptyText,
  items,
  suffix,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  emptyText: string;
  items: AnalyticsProductMetric[];
  suffix: string;
}) {
  const highest = items[0]?.count ?? 1;

  return (
    <View style={styles.rankingCard}>
      <View style={styles.rankingTitleRow}>
        <Ionicons name={icon} size={21} color={colors.primary} />
        <Text style={styles.rankingTitle}>{title}</Text>
      </View>
      {!items.length ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        items.map((item, index) => (
          <View key={`${item.productId}-${item.name}`} style={styles.rankingItem}>
            <Text style={styles.position}>{index + 1}</Text>
            <View style={styles.rankingInfo}>
              <View style={styles.rankingTextRow}>
                <Text numberOfLines={1} style={styles.productName}>
                  {item.name}
                </Text>
                <Text style={styles.productCount}>
                  {item.count} {suffix}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${Math.max(6, (item.count / highest) * 100)}%` }]}
                />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  helpText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  periods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  periodChip: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  periodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  periodChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  periodChipTextActive: {
    color: colors.white,
  },
  loading: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    minHeight: 118,
    flexBasis: '46%',
    flexGrow: 1,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: 5,
    backgroundColor: colors.surface,
  },
  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  rankingCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  rankingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankingTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    paddingVertical: spacing.lg,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  position: {
    width: 24,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  rankingInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  rankingTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  productName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  productCount: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  barTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceWarm,
  },
  barFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
});
