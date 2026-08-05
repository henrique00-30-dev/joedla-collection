import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AdminGuard } from '@/src/components/admin-guard';
import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, EmptyState } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { campaignStatusLabel } from '@/src/features/marketing/admin';
import { getCampaignSituation } from '@/src/features/marketing/foundation';
import {
  createMarketingCampaign,
  cleanupExpiredMarketingAssets,
  deleteDraftMarketingCampaign,
  loadAdminMarketingCampaigns,
  loadMarketingSettings,
  updateMarketingSettings,
} from '@/src/features/marketing/service';
import { MarketingCampaignBundle, MarketingSettings } from '@/src/features/marketing/types';
import { colors, radii, shadow, spacing } from '@/src/theme';
import { formatMaceioDate } from '@/src/utils/fields';

export default function AdminCampaignsScreen() {
  const { refreshStore } = useStore();
  const [campaigns, setCampaigns] = useState<MarketingCampaignBundle[]>([]);
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCampaigns, nextSettings] = await Promise.all([
        loadAdminMarketingCampaigns(),
        loadMarketingSettings(),
      ]);
      setCampaigns(nextCampaigns);
      setSettings(nextSettings);
      void cleanupExpiredMarketingAssets().catch(() => {
        // A falha fica registrada pelo banco e não impede o uso do painel.
      });
    } catch (error) {
      Alert.alert('Não foi possível abrir as campanhas', errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  async function createCampaign() {
    setCreating(true);
    try {
      const campaign = await createMarketingCampaign({
        name: `Nova campanha ${campaigns.length + 1}`,
        priority: 0,
      });
      router.push({ pathname: '/admin/campaign/[id]', params: { id: campaign.id } });
    } catch (error) {
      Alert.alert('Não foi possível criar', errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function toggleSetting(field: 'enabled' | 'pricingEnabled', value: boolean) {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await updateMarketingSettings(settings, {
        enabled: field === 'enabled' ? value : settings.enabled,
        pricingEnabled: field === 'pricingEnabled' ? value : settings.pricingEnabled,
      });
      setSettings(updated);
      await refreshStore();
    } catch (error) {
      Alert.alert('Não foi possível alterar', errorMessage(error));
    } finally {
      setSavingSettings(false);
    }
  }

  async function deleteCampaign(campaign: MarketingCampaignBundle) {
    if (!await confirmDeleteDraft()) return;
    try {
      const result = await deleteDraftMarketingCampaign(campaign.id);
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
      Alert.alert(
        'Campanha excluída',
        result.storageCleanupPending
          ? 'O rascunho foi excluído. Uma imagem sem referência ficou pendente de limpeza.'
          : 'O rascunho e seus registros exclusivos foram removidos.',
      );
    } catch (error) {
      Alert.alert('Não foi possível excluir', errorMessage(error));
    }
  }

  return (
    <AdminGuard>
      <Screen>
        <AppHeader compact title="Campanhas e promoções" showBack showStoreHome />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={23} color={colors.success} />
            <View style={styles.safetyCopy}>
              <Text style={styles.safetyTitle}>Publicação controlada</Text>
              <Text style={styles.safetyText}>
                Campanhas são criadas como rascunho. A loja só usa o módulo quando o interruptor visual está ligado; preços possuem ativação independente.
              </Text>
            </View>
          </View>

          <View style={styles.settingsCard}>
            <SettingRow
              title="Campanhas visuais"
              description="Exibir banners e selos publicados na loja"
              value={settings?.enabled ?? false}
              disabled={!settings || savingSettings}
              onValueChange={(value) => void toggleSetting('enabled', value)}
            />
            <View style={styles.divider} />
            <SettingRow
              title="Preços promocionais"
              description="Aplicar preços calculados e validados pelo banco"
              value={settings?.pricingEnabled ?? false}
              disabled={!settings || savingSettings}
              onValueChange={(value) => void toggleSetting('pricingEnabled', value)}
            />
          </View>

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sectionTitle}>Campanhas</Text>
              <Text style={styles.sectionSubtitle}>Horários exibidos em America/Maceió</Text>
            </View>
            <Button icon="add-outline" loading={creating} onPress={() => void createCampaign()}>
              Nova
            </Button>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Carregando campanhas...</Text>
            </View>
          ) : !campaigns.length ? (
            <EmptyState
              icon="megaphone-outline"
              title="Nenhuma campanha"
              message="Crie um rascunho para preparar banners, público e promoção antes de publicar."
              actionLabel="Criar primeira campanha"
              onAction={() => void createCampaign()}
            />
          ) : (
            <View style={styles.list}>
              {campaigns.map((campaign) => {
                const situation = getCampaignSituation(campaign);
                const productCount = campaign.targets.filter((target) => target.targetType === 'product').length;
                const categoryCount = campaign.targets.filter((target) => target.targetType === 'category').length;
                const period = campaign.startAt
                  ? `${formatMaceioDate(campaign.startAt)}${campaign.endAt ? ` até ${formatMaceioDate(campaign.endAt)}` : ' sem término'}`
                  : 'Período ainda não informado';
                const summary = [
                  productCount ? `${productCount} produto(s)` : null,
                  categoryCount ? `${categoryCount} categoria(s)` : null,
                  campaign.targets.some((target) => target.targetType === 'store') ? 'Loja inteira' : null,
                  campaign.placements.length ? `${campaign.placements.length} banner(es)` : 'Sem banner',
                  campaign.priceRules.length ? 'Alteração de preço' : 'Sem alteração de preço',
                  campaign.badge ? 'Com selo' : 'Sem selo',
                ].filter(Boolean).join(' · ');
                const canDelete = campaign.status === 'draft' && !campaign.publishedAt;
                return (
                  <View key={campaign.id} style={styles.campaignCard}>
                    <Pressable
                      onPress={() => router.push({
                        pathname: '/admin/campaign/[id]',
                        params: { id: campaign.id },
                      })}
                      style={({ pressed }) => [styles.campaignMain, pressed && styles.pressed]}>
                      <View style={styles.campaignCopy}>
                        <View style={styles.badges}>
                          <Text style={[styles.status, statusColors[campaign.status]]}>
                            {campaignStatusLabel(campaign.status)}
                          </Text>
                          {campaign.status === 'published' ? <Text style={styles.situation}>{situationLabel[situation]}</Text> : null}
                        </View>
                        <Text style={styles.campaignName}>{campaign.name}</Text>
                        <Text style={styles.campaignMeta}>{summary}</Text>
                        <Text style={styles.campaignPeriod}>{period}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={21} color={colors.textMuted} />
                    </Pressable>
                    {canDelete ? (
                      <Pressable
                        accessibilityLabel={`Excluir rascunho ${campaign.name}`}
                        onPress={() => void deleteCampaign(campaign)}
                        style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}>
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                        <Text style={styles.deleteText}>Excluir rascunho</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </Screen>
    </AdminGuard>
  );
}

function SettingRow({ title, description, value, disabled, onValueChange }: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Tente novamente.';
}

async function confirmDeleteDraft() {
  const message = 'Excluir esta campanha em rascunho? Esta ação é permanente e não poderá ser desfeita.';
  if (Platform.OS === 'web') return window.confirm(message);
  return new Promise<boolean>((resolve) => Alert.alert(
    'Excluir campanha',
    message,
    [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ],
    { cancelable: true, onDismiss: () => resolve(false) },
  ));
}

const situationLabel = {
  draft: 'Em preparação',
  scheduled: 'Agendada',
  active: 'Ativa agora',
  ended: 'Encerrada',
  paused: 'Pausada',
  archived: 'Arquivada',
};

const statusColors = StyleSheet.create({
  draft: { color: colors.info, backgroundColor: colors.infoSoft },
  published: { color: colors.success, backgroundColor: colors.successSoft },
  paused: { color: colors.warning, backgroundColor: colors.warningSoft },
  archived: { color: colors.textMuted, backgroundColor: colors.border },
});

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: spacing.lg, paddingBottom: 80, gap: spacing.xl },
  safetyCard: { padding: spacing.lg, borderRadius: radii.medium, flexDirection: 'row', gap: spacing.md, backgroundColor: colors.successSoft },
  safetyCopy: { flex: 1, gap: spacing.xs },
  safetyTitle: { color: colors.success, fontSize: 14, fontWeight: '900' },
  safetyText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  settingsCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: colors.surface, ...shadow },
  settingRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingCopy: { flex: 1, gap: spacing.xs },
  settingTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  settingDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  divider: { height: 1, marginVertical: spacing.md, backgroundColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  sectionSubtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 12 },
  loading: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  muted: { color: colors.textMuted, fontSize: 13 },
  list: { gap: spacing.md },
  campaignCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, backgroundColor: colors.surface, ...shadow },
  campaignMain: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  campaignCopy: { flex: 1, gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill, fontSize: 10, fontWeight: '900' },
  situation: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill, color: colors.textMuted, backgroundColor: colors.surfaceWarm, fontSize: 10, fontWeight: '800' },
  campaignName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  campaignMeta: { color: colors.textMuted, fontSize: 12 },
  campaignPeriod: { color: colors.text, fontSize: 12, fontWeight: '700' },
  deleteAction: { minHeight: 44, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: colors.dangerSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm, backgroundColor: colors.dangerSoft },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.78 },
});
