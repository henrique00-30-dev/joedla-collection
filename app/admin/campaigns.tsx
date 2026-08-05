import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

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
  loadAdminMarketingCampaigns,
  loadMarketingSettings,
  updateMarketingSettings,
} from '@/src/features/marketing/service';
import { MarketingCampaignBundle, MarketingSettings } from '@/src/features/marketing/types';
import { colors, radii, shadow, spacing } from '@/src/theme';

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
                return (
                  <Pressable
                    key={campaign.id}
                    onPress={() => router.push({
                      pathname: '/admin/campaign/[id]',
                      params: { id: campaign.id },
                    })}
                    style={({ pressed }) => [styles.campaignCard, pressed && styles.pressed]}>
                    <View style={styles.campaignCopy}>
                      <View style={styles.badges}>
                        <Text style={[styles.status, statusColors[campaign.status]]}>
                          {campaignStatusLabel(campaign.status)}
                        </Text>
                        <Text style={styles.situation}>{situationLabel[situation]}</Text>
                      </View>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <Text style={styles.campaignMeta}>
                        Prioridade {campaign.priority} · {campaign.placements.length} banner(es) · {campaign.targets.length} destino(s)
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={21} color={colors.textMuted} />
                  </Pressable>
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
  campaignCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, ...shadow },
  campaignCopy: { flex: 1, gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill, fontSize: 10, fontWeight: '900' },
  situation: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radii.pill, color: colors.textMuted, backgroundColor: colors.surfaceWarm, fontSize: 10, fontWeight: '800' },
  campaignName: { color: colors.text, fontSize: 17, fontWeight: '900' },
  campaignMeta: { color: colors.textMuted, fontSize: 12 },
  pressed: { opacity: 0.78 },
});
