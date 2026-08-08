import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { useStore } from '@/src/context/store-context';
import { AdminClubReward, ClubSettings, loadAdminClubRewards, loadClubSettings, removeClubReward, saveClubReward, saveClubSettings } from '@/src/services/club';
import { colors, radii, spacing } from '@/src/theme';

export default function AdminClubScreen() {
  const { products } = useStore();
  const [settings, setSettings] = useState<ClubSettings>({ active: true, reaisPerPoint: 1, discountPoints: 500, discountValue: 10 });
  const [rewards, setRewards] = useState<AdminClubReward[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const [nextSettings, nextRewards] = await Promise.all([loadClubSettings(), loadAdminClubRewards()]);
      setSettings(nextSettings);
      setRewards(nextRewards);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível carregar o Clube Joedla.');
    }
  }

  const rewardProducts = useMemo(() => rewards.map((reward) => ({ ...reward, product: products.find((item) => item.id === reward.productId) })).filter((item) => item.product), [rewards, products]);
  const availableProducts = useMemo(() => products.filter((product) => product.active && !rewards.some((reward) => reward.productId === product.id)), [products, rewards]);

  async function saveRules() {
    const reaisPerPoint = Number(String(settings.reaisPerPoint).replace(',', '.'));
    const discountPoints = Number(settings.discountPoints);
    const discountValue = Number(String(settings.discountValue).replace(',', '.'));
    if (!Number.isFinite(reaisPerPoint) || reaisPerPoint <= 0 || !Number.isFinite(discountPoints) || discountPoints <= 0 || !Number.isFinite(discountValue) || discountValue <= 0) {
      Alert.alert('Revise as regras', 'Todos os valores precisam ser maiores que zero.');
      return;
    }
    setSaving(true);
    try {
      await saveClubSettings({ ...settings, reaisPerPoint, discountPoints, discountValue });
      Alert.alert('Regras salvas', 'As novas regras do Clube Joedla foram atualizadas.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally { setSaving(false); }
  }

  async function addReward() {
    const points = Number(rewardPoints);
    if (!selectedProduct) { Alert.alert('Selecione um produto', 'Escolha um produto existente da loja.'); return; }
    if (!Number.isInteger(points) || points <= 0) { Alert.alert('Pontuação inválida', 'Informe quantos pontos serão necessários para a troca.'); return; }
    setSaving(true);
    try {
      await saveClubReward({ productId: selectedProduct, pointsRequired: points });
      setSelectedProduct(''); setRewardPoints('');
      await load();
      Alert.alert('Recompensa adicionada', 'O produto já pode aparecer no Clube Joedla.');
    } catch (error) { Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível adicionar.'); }
    finally { setSaving(false); }
  }

  async function removeReward(productId: string) {
    setSaving(true);
    try { await removeClubReward(productId); await load(); }
    catch (error) { Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível remover.'); }
    finally { setSaving(false); }
  }

  return (
    <AdminGuard>
      <AdminPage eyebrow="Fidelidade" title="Clube Joedla" description="Configure pontos e recompensas usando os produtos que já existem na loja.">
        <View style={styles.metrics}>
          <AdminStatCard compact icon="star-outline" label="Regra atual" value={`R$ ${settings.reaisPerPoint.toFixed(2)} = 1 ponto`} tone="warning" />
          <AdminStatCard compact icon="gift-outline" label="Recompensas" value={String(rewards.length)} helper="Produtos disponíveis para troca" tone="success" />
        </View>

        <AdminSection title="Regras de pontuação" description="Os pontos são liberados somente sobre valores efetivamente pagos. Produto em promoção não acumula outro desconto.">
          <AdminCard>
            <View style={styles.formGrid}>
              <Field label="Reais necessários para 1 ponto" value={String(settings.reaisPerPoint)} onChangeText={(value) => setSettings((current) => ({ ...current, reaisPerPoint: Number(value.replace(',', '.')) || 0 }))} keyboardType="decimal-pad" />
              <Field label="Pontos para desconto padrão" value={String(settings.discountPoints)} onChangeText={(value) => setSettings((current) => ({ ...current, discountPoints: Number(value.replace(/\D/g, '')) || 0 }))} keyboardType="number-pad" />
              <Field label="Valor do desconto padrão" value={String(settings.discountValue)} onChangeText={(value) => setSettings((current) => ({ ...current, discountValue: Number(value.replace(',', '.')) || 0 }))} keyboardType="decimal-pad" />
            </View>
            <Pressable disabled={saving} onPress={() => void saveRules()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.primaryText}>{saving ? 'Salvando...' : 'Salvar regras'}</Text></Pressable>
          </AdminCard>
        </AdminSection>

        <AdminSection title="Catálogo de recompensas" description="Selecione somente produtos existentes. Não é criado um cadastro de produto duplicado.">
          <AdminCard>
            {availableProducts.length ? (
              <>
                <Text style={styles.label}>Produto</Text>
                <View style={styles.productChoices}>
                  {availableProducts.map((product) => (
                    <Pressable key={product.id} onPress={() => setSelectedProduct(product.id)} style={[styles.productChoice, selectedProduct === product.id && styles.productChoiceActive]}>
                      <Text numberOfLines={2} style={selectedProduct === product.id ? styles.productChoiceTextActive : styles.productChoiceText}>{product.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field label="Pontos necessários para troca completa" value={rewardPoints} onChangeText={(value) => setRewardPoints(value.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Ex.: 4000" />
                <Pressable disabled={saving} onPress={() => void addReward()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}><Text style={styles.primaryText}>Adicionar recompensa</Text></Pressable>
              </>
            ) : <Text style={styles.empty}>Todos os produtos ativos já participam ou não há produtos disponíveis.</Text>}
          </AdminCard>

          <View style={styles.rewardList}>
            {rewardProducts.map(({ productId, pointsRequired, product }) => (
              <AdminCard key={productId} compact title={product!.name} description={`${pointsRequired.toLocaleString('pt-BR')} pontos`}>
                <Pressable disabled={saving} onPress={() => void removeReward(productId)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><Text style={styles.removeText}>Remover do Clube</Text></Pressable>
              </AdminCard>
            ))}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...rest} placeholderTextColor="#AA9B90" style={styles.input} /></View>; }

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 220, flex: 1, gap: 5 }, label: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  input: { minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, color: '#2C211A', backgroundColor: '#FCF9F6' },
  productChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  productChoice: { minWidth: 130, maxWidth: 220, minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  productChoiceActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' }, productChoiceText: { color: '#493A30', fontSize: 10, fontWeight: '800', textAlign: 'center' }, productChoiceTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  primaryButton: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' }, primaryText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  removeButton: { alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' }, removeText: { color: colors.danger, fontSize: 9, fontWeight: '900' },
  rewardList: { gap: spacing.sm }, empty: { color: colors.textMuted, fontSize: 10 }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.5 },
});
