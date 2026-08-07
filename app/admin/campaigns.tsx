import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AdminCard,
  AdminPage,
  AdminSection,
  AdminStatCard,
  AdminSwitchField,
  AdminTable,
  AdminTableBadge,
  AdminTableText,
  AdminToolbarButton,
  type AdminTableColumn,
} from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { useStore } from '@/src/context/store-context';
import { campaignStatusLabel } from '@/src/features/marketing/admin';
import { getCampaignSituation } from '@/src/features/marketing/foundation';
import {
  cleanupExpiredMarketingAssets,
  createMarketingCampaign,
  deleteDraftMarketingCampaign,
  loadAdminMarketingCampaigns,
  loadMarketingSettings,
  updateMarketingSettings,
} from '@/src/features/marketing/service';
import type {
  MarketingCampaignBundle,
  MarketingSettings,
} from '@/src/features/marketing/types';
import { colors, radii, spacing } from '@/src/theme';
import { formatMaceioDate } from '@/src/utils/fields';

type CampaignSituation = ReturnType<typeof getCampaignSituation>;

export default function AdminCampaignsScreen() {
  const { refreshStore } = useStore();

  const [campaigns, setCampaigns] = useState<
    MarketingCampaignBundle[]
  >([]);

  const [settings, setSettings] =
    useState<MarketingSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] =
    useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [nextCampaigns, nextSettings] =
        await Promise.all([
          loadAdminMarketingCampaigns(),
          loadMarketingSettings(),
        ]);

      setCampaigns(nextCampaigns);
      setSettings(nextSettings);

      void cleanupExpiredMarketingAssets().catch(() => {
        // A limpeza não bloqueia o uso do painel.
      });
    } catch (error) {
      Alert.alert(
        'Não foi possível abrir as campanhas',
        errorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const metrics = useMemo(() => {
    const published = campaigns.filter(
      (campaign) => campaign.status === 'published',
    ).length;

    const drafts = campaigns.filter(
      (campaign) => campaign.status === 'draft',
    ).length;

    const active = campaigns.filter(
      (campaign) =>
        getCampaignSituation(campaign) === 'active',
    ).length;

    const withPriceRules = campaigns.filter(
      (campaign) => campaign.priceRules.length > 0,
    ).length;

    return {
      total: campaigns.length,
      published,
      drafts,
      active,
      withPriceRules,
    };
  }, [campaigns]);

  async function createCampaign() {
    if (creating) {
      return;
    }

    setCreating(true);

    try {
      const campaign =
        await createMarketingCampaign({
          name: `Nova campanha ${campaigns.length + 1}`,
          priority: 0,
        });

      router.push({
        pathname: '/admin/campaign/[id]',
        params: { id: campaign.id },
      });
    } catch (error) {
      Alert.alert(
        'Não foi possível criar',
        errorMessage(error),
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleSetting(
    field: 'enabled' | 'pricingEnabled',
    value: boolean,
  ) {
    if (!settings || savingSettings) {
      return;
    }

    setSavingSettings(true);

    try {
      const updated =
        await updateMarketingSettings(settings, {
          enabled:
            field === 'enabled'
              ? value
              : settings.enabled,
          pricingEnabled:
            field === 'pricingEnabled'
              ? value
              : settings.pricingEnabled,
        });

      setSettings(updated);
      await refreshStore();
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar',
        errorMessage(error),
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function deleteCampaign(
    campaign: MarketingCampaignBundle,
  ) {
    if (!(await confirmDeleteDraft())) {
      return;
    }

    try {
      const result =
        await deleteDraftMarketingCampaign(
          campaign.id,
        );

      setCampaigns((current) =>
        current.filter(
          (item) => item.id !== campaign.id,
        ),
      );

      Alert.alert(
        'Campanha excluída',
        result.storageCleanupPending
          ? 'O rascunho foi excluído. Uma imagem sem referência ficou pendente de limpeza.'
          : 'O rascunho e seus registros exclusivos foram removidos.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível excluir',
        errorMessage(error),
      );
    }
  }

  function openCampaign(
    campaign: MarketingCampaignBundle,
  ) {
    router.push({
      pathname: '/admin/campaign/[id]',
      params: { id: campaign.id },
    });
  }

  const columns = useMemo<
    AdminTableColumn<MarketingCampaignBundle>[]
  >(
    () => [
      {
        key: 'campaign',
        label: 'Campanha',
        minWidth: 250,
        flex: 1,
        render: (campaign) => (
          <View style={styles.campaignCell}>
            <AdminTableText bold>
              {campaign.name}
            </AdminTableText>

            <AdminTableText
              muted
              numberOfLines={2}>
              {campaignSummary(campaign)}
            </AdminTableText>
          </View>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 125,
        align: 'center',
        render: (campaign) => (
          <AdminTableBadge
            label={campaignStatusLabel(
              campaign.status,
            )}
            tone={statusTone(campaign.status)}
          />
        ),
      },
      {
        key: 'situation',
        label: 'Situação',
        width: 125,
        align: 'center',
        render: (campaign) => {
          const situation =
            getCampaignSituation(campaign);

          return (
            <AdminTableBadge
              label={
                situationLabels[situation]
              }
              tone={situationTone(situation)}
            />
          );
        },
      },
      {
        key: 'audience',
        label: 'Público',
        minWidth: 150,
        render: (campaign) => (
          <AdminTableText>
            {campaignAudience(campaign)}
          </AdminTableText>
        ),
      },
      {
        key: 'period',
        label: 'Período',
        minWidth: 190,
        render: (campaign) => (
          <AdminTableText
            numberOfLines={2}>
            {campaignPeriod(campaign)}
          </AdminTableText>
        ),
      },
      {
        key: 'actions',
        label: 'Ações',
        width: 115,
        align: 'center',
        render: (campaign) => {
          const canDelete =
            campaign.status === 'draft' &&
            !campaign.publishedAt;

          return (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${campaign.name}`}
                onPress={() =>
                  openCampaign(campaign)
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#8B541B"
                />
              </Pressable>

              {canDelete ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir rascunho ${campaign.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    void deleteCampaign(campaign);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.danger}
                  />
                </Pressable>
              ) : null}
            </View>
          );
        },
      },
    ],
    [],
  );

  return (
    <AdminGuard>
      <AdminPage
        eyebrow="Marketing"
        title="Campanhas"
        description="Gerencie campanhas visuais, banners, selos, públicos e regras promocionais."
        actions={
          <>
            <AdminToolbarButton
              label="Atualizar"
              icon="refresh-outline"
              disabled={loading}
              onPress={() => void load()}
            />

            <AdminToolbarButton
              label={
                creating
                  ? 'Criando...'
                  : 'Nova campanha'
              }
              icon="add"
              variant="primary"
              disabled={creating}
              onPress={() =>
                void createCampaign()
              }
            />
          </>
        }>
        <View style={styles.metrics}>
          <AdminStatCard
            compact
            icon="megaphone-outline"
            label="Campanhas"
            value={String(metrics.total)}
            helper="Total cadastrado"
          />

          <AdminStatCard
            compact
            icon="document-text-outline"
            label="Rascunhos"
            value={String(metrics.drafts)}
            helper="Ainda não publicados"
            tone={
              metrics.drafts > 0
                ? 'warning'
                : 'success'
            }
          />

          <AdminStatCard
            compact
            icon="radio-outline"
            label="Ativas agora"
            value={String(metrics.active)}
            helper={`${metrics.published} publicada(s)`}
            tone="success"
          />

          <AdminStatCard
            compact
            icon="cash-outline"
            label="Com regra de preço"
            value={String(
              metrics.withPriceRules,
            )}
            helper="Campanhas que alteram preços"
            tone="info"
          />
        </View>

        <View style={styles.modulesGrid}>
          <AdminCard
            compact
            icon="pricetag-outline"
            title="Promoções"
            description="Gerencie preços promocionais, selos e períodos."
            onPress={() =>
              router.push(
                '/admin/promotions' as never,
              )
            }
          />

          <AdminCard
            compact
            icon="desktop-outline"
            title="Preview geral"
            description="Visualize como a loja será exibida."
            onPress={() =>
              router.push(
                '/admin/marketing-preview' as never,
              )
            }
          />
        </View>

        <View style={styles.safetyCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.success}
          />

          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>
              Publicação controlada
            </Text>

            <Text style={styles.safetyText}>
              As campanhas são criadas como
              rascunho. Banners e selos só aparecem
              quando o módulo visual está ativo, e os
              preços promocionais possuem ativação
              independente.
            </Text>
          </View>
        </View>

        <AdminSection
          title="Configurações do módulo"
          description="Controle separadamente a exibição visual e a aplicação dos preços promocionais.">
          <View style={styles.settingsGrid}>
            <AdminSwitchField
              icon="images-outline"
              label="Campanhas visuais"
              description="Exibir banners e selos publicados na loja."
              value={settings?.enabled ?? false}
              disabled={
                !settings || savingSettings
              }
              onChange={(value) =>
                void toggleSetting(
                  'enabled',
                  value,
                )
              }
            />

            <AdminSwitchField
              icon="cash-outline"
              label="Preços promocionais"
              description="Aplicar preços calculados e validados pelo banco."
              value={
                settings?.pricingEnabled ??
                false
              }
              disabled={
                !settings || savingSettings
              }
              onChange={(value) =>
                void toggleSetting(
                  'pricingEnabled',
                  value,
                )
              }
            />
          </View>
        </AdminSection>

        <AdminSection
          title="Campanhas cadastradas"
          description="Horários exibidos no fuso America/Maceió.">
          <AdminTable
            columns={columns}
            data={campaigns}
            loading={loading}
            keyExtractor={(campaign) =>
              campaign.id
            }
            onPressRow={openCampaign}
            emptyIcon="megaphone-outline"
            emptyTitle="Nenhuma campanha cadastrada"
            emptyDescription="Crie um rascunho para preparar banners, público e promoção antes de publicar."
          />

          {!loading && !campaigns.length ? (
            <View style={styles.emptyAction}>
              <AdminToolbarButton
                label="Criar primeira campanha"
                icon="add"
                variant="primary"
                disabled={creating}
                onPress={() =>
                  void createCampaign()
                }
              />
            </View>
          ) : null}
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function campaignSummary(
  campaign: MarketingCampaignBundle,
) {
  const productCount = campaign.targets.filter(
    (target) =>
      target.targetType === 'product',
  ).length;

  const categoryCount =
    campaign.targets.filter(
      (target) =>
        target.targetType === 'category',
    ).length;

  return [
    productCount
      ? `${productCount} produto(s)`
      : null,
    categoryCount
      ? `${categoryCount} categoria(s)`
      : null,
    campaign.targets.some(
      (target) =>
        target.targetType === 'store',
    )
      ? 'Loja inteira'
      : null,
    campaign.placements.length
      ? `${campaign.placements.length} banner(es)`
      : 'Sem banner',
    campaign.priceRules.length
      ? 'Alteração de preço'
      : 'Sem alteração de preço',
    campaign.badge ? 'Com selo' : 'Sem selo',
  ]
    .filter(Boolean)
    .join(' · ');
}

function campaignAudience(
  campaign: MarketingCampaignBundle,
) {
  const hasStore = campaign.targets.some(
    (target) =>
      target.targetType === 'store',
  );

  if (hasStore) {
    return 'Loja inteira';
  }

  const productCount = campaign.targets.filter(
    (target) =>
      target.targetType === 'product',
  ).length;

  const categoryCount =
    campaign.targets.filter(
      (target) =>
        target.targetType === 'category',
    ).length;

  if (productCount && categoryCount) {
    return `${productCount} produto(s) e ${categoryCount} categoria(s)`;
  }

  if (productCount) {
    return `${productCount} produto(s)`;
  }

  if (categoryCount) {
    return `${categoryCount} categoria(s)`;
  }

  return 'Não definido';
}

function campaignPeriod(
  campaign: MarketingCampaignBundle,
) {
  if (!campaign.startAt) {
    return 'Período ainda não informado';
  }

  return `${formatMaceioDate(
    campaign.startAt,
  )}${
    campaign.endAt
      ? ` até ${formatMaceioDate(
          campaign.endAt,
        )}`
      : ' sem término'
  }`;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Tente novamente.';
}

async function confirmDeleteDraft() {
  const message =
    'Excluir esta campanha em rascunho? Esta ação é permanente e não poderá ser desfeita.';

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    return window.confirm(message);
  }

  return new Promise<boolean>((resolve) =>
    Alert.alert(
      'Excluir campanha',
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    ),
  );
}

const situationLabels: Record<
  CampaignSituation,
  string
> = {
  draft: 'Em preparação',
  scheduled: 'Agendada',
  active: 'Ativa agora',
  ended: 'Encerrada',
  paused: 'Pausada',
  archived: 'Arquivada',
};

function statusTone(
  status: MarketingCampaignBundle['status'],
):
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default' {
  if (status === 'published') {
    return 'success';
  }

  if (status === 'paused') {
    return 'warning';
  }

  if (status === 'archived') {
    return 'default';
  }

  return 'info';
}

function situationTone(
  situation: CampaignSituation,
):
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default' {
  if (situation === 'active') {
    return 'success';
  }

  if (
    situation === 'scheduled' ||
    situation === 'paused'
  ) {
    return 'warning';
  }

  if (situation === 'ended') {
    return 'danger';
  }

  if (situation === 'archived') {
    return 'default';
  }

  return 'info';
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  safetyCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor:
      'rgba(37,132,82,0.22)',
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor:
      colors.successSoft,
  },

  safetyCopy: {
    minWidth: 0,
    flex: 1,
  },

  safetyTitle: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '900',
  },

  safetyText: {
    marginTop: 3,
    color: '#493A30',
    fontSize: 10,
    lineHeight: 15,
  },

  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  campaignCell: {
    minWidth: 0,
    gap: 3,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  actionButton: {
    width: 31,
    height: 31,
    borderWidth: 1,
    borderColor: '#E0D3C6',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7EEE5',
  },

  deleteButton: {
    borderColor:
      'rgba(188,72,72,0.2)',
    backgroundColor:
      colors.dangerSoft,
  },

  emptyAction: {
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.58,
  },
});