import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View
} from 'react-native';

import {
  AdminCard,
  AdminFilterChip,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminToolbar,
  AdminToolbarButton,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { loadStoreAnalytics } from '@/src/services/analytics';
import { colors, radii, spacing } from '@/src/theme';
import type {
  AnalyticsProductMetric,
  StoreAnalytics,
} from '@/src/types';

const periods = [7, 30, 90, 365] as const;

export default function AdminAnalyticsScreen() {
  const [period, setPeriod] = useState(30);
  const [analytics, setAnalytics] =
    useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refreshAnalytics();
    // A troca do período deve recarregar as métricas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function refreshAnalytics() {
    setLoading(true);

    try {
      setAnalytics(
        await loadStoreAnalytics(period),
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível carregar',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Relatórios"
        title="Desempenho"
        description="Acompanhe visitantes, visualizações e produtos mais procurados no período selecionado."
        actions={
          <AdminToolbarButton
            label={
              loading
                ? 'Atualizando...'
                : 'Atualizar'
            }
            icon="refresh-outline"
            disabled={loading}
            onPress={() =>
              void refreshAnalytics()
            }
          />
        }>
        <AdminCard
          compact
          icon="shield-checkmark-outline"
          title="Métricas anônimas"
          description="Os acessos são contados por navegador, de forma anônima, uma vez por dia."
        />

        <AdminToolbar
          left={
            <>
              {periods.map((days) => (
                <AdminFilterChip
                  key={days}
                  label={`${days} dias`}
                  active={period === days}
                  onPress={() =>
                    setPeriod(days)
                  }
                />
              ))}
            </>
          }
        />

        {loading ? (
          <View style={styles.loading}>
            <View
              style={styles.loadingIcon}>
              <Ionicons
                name="analytics-outline"
                size={28}
                color="#9D5F1D"
              />
            </View>

            <Text
              style={styles.loadingTitle}>
              Calculando métricas
            </Text>

            <Text
              style={styles.loadingText}>
              Aguarde enquanto os dados do
              período são carregados.
            </Text>
          </View>
        ) : analytics ? (
          <>
            <View style={styles.metrics}>
              <AdminStatCard
                compact
                icon="people-outline"
                label="Visitantes"
                value={analytics.uniqueVisitors.toLocaleString(
                  'pt-BR',
                )}
                helper="Navegadores únicos"
                tone="info"
              />

              <AdminStatCard
                compact
                icon="calendar-outline"
                label="Acessos"
                value={analytics.totalVisits.toLocaleString(
                  'pt-BR',
                )}
                helper={`Últimos ${period} dias`}
              />

              <AdminStatCard
                compact
                icon="eye-outline"
                label="Produtos vistos"
                value={analytics.productViews.toLocaleString(
                  'pt-BR',
                )}
                helper="Visualizações registradas"
                tone="warning"
              />

              <AdminStatCard
                compact
                icon="bag-check-outline"
                label="Pedidos"
                value={analytics.orders.toLocaleString(
                  'pt-BR',
                )}
                helper="Pedidos no período"
                tone="success"
              />
            </View>

            <AdminSection
              title="Produtos mais vistos"
              description="Ranking dos produtos que mais receberam visualizações.">
              <Ranking
                icon="eye-outline"
                emptyText="As visualizações começarão a aparecer após a publicação desta versão."
                items={analytics.topViewed}
                suffix="visualizações"
              />
            </AdminSection>

            <AdminSection
              title="Produtos mais comprados"
              description="Ranking dos produtos com maior quantidade vendida.">
              <Ranking
                icon="bag-check-outline"
                emptyText="Ainda não há compras no período selecionado."
                items={
                  analytics.topPurchased
                }
                suffix="unidades"
              />
            </AdminSection>
          </>
        ) : null}
      </AdminPage>
    </AdminGuard>
  );
}

function Ranking({
  icon,
  emptyText,
  items,
  suffix,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  items: AnalyticsProductMetric[];
  suffix: string;
}) {
  const highest = items[0]?.count ?? 1;

  return (
    <View style={styles.rankingCard}>
      {!items.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={icon}
              size={26}
              color="#9D5F1D"
            />
          </View>

          <Text style={styles.emptyText}>
            {emptyText}
          </Text>
        </View>
      ) : (
        items.map((item, index) => (
          <View
            key={`${item.productId}-${item.name}`}
            style={[
              styles.rankingItem,
              index < items.length - 1 &&
                styles.rankingItemBorder,
            ]}>
            <View
              style={[
                styles.position,
                index < 3 &&
                  styles.positionTop,
              ]}>
              <Text
                style={[
                  styles.positionText,
                  index < 3 &&
                    styles.positionTextTop,
                ]}>
                {index + 1}
              </Text>
            </View>

            <View
              style={styles.rankingInfo}>
              <View
                style={
                  styles.rankingTextRow
                }>
                <Text
                  numberOfLines={1}
                  style={styles.productName}>
                  {item.name}
                </Text>

                <Text
                  style={styles.productCount}>
                  {item.count.toLocaleString(
                    'pt-BR',
                  )}{' '}
                  {suffix}
                </Text>
              </View>

              <View
                style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(
                        6,
                        (item.count /
                          highest) *
                          100,
                      )}%`,
                    },
                  ]}
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
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  loading: {
    minHeight: 220,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFC',
  },

  loadingIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  loadingTitle: {
    marginTop: spacing.md,
    color: '#2C211A',
    fontSize: 14,
    fontWeight: '900',
  },

  loadingText: {
    maxWidth: 360,
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  rankingCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: radii.medium,
    backgroundColor: '#FFFDFC',
  },

  rankingItem: {
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  rankingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE5DC',
  },

  position: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECE3',
  },

  positionTop: {
    backgroundColor: '#A66A27',
  },

  positionText: {
    color: '#7D6E62',
    fontSize: 11,
    fontWeight: '900',
  },

  positionTextTop: {
    color: '#FFFFFF',
  },

  rankingInfo: {
    minWidth: 0,
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
    minWidth: 0,
    flex: 1,
    color: '#2C211A',
    fontSize: 11,
    fontWeight: '900',
  },

  productCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  barTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: '#F1E8DF',
  },

  barFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: '#A66A27',
  },

  empty: {
    minHeight: 170,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  emptyText: {
    maxWidth: 430,
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});