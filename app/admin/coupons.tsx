import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminCard, AdminPage, AdminSection, AdminStatCard } from '@/src/components/admin';
import { AdminGuard } from '@/src/components/admin-guard';
import { AdminCoupon, deleteAdminCoupon, loadAdminCoupons, saveAdminCoupon } from '@/src/services/coupons';
import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

type DiscountType = 'percent' | 'fixed';

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCoupons(await loadAdminCoupons());
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível carregar os cupons.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function createCoupon() {
    const value = Number(discountValue.replace(',', '.'));
    const minimum = Number(minOrderValue.replace(',', '.')) || 0;
    const limit = maxUses.trim() ? Number(maxUses) : null;

    if (code.trim().length < 3) {
      Alert.alert('Código obrigatório', 'Informe um código com pelo menos 3 caracteres.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Desconto inválido', 'Informe um desconto maior que zero.');
      return;
    }
    if (discountType === 'percent' && value > 100) {
      Alert.alert('Desconto inválido', 'O percentual não pode ultrapassar 100%.');
      return;
    }
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      Alert.alert('Limite inválido', 'O limite de usos precisa ser um número inteiro maior que zero.');
      return;
    }

    setSaving(true);
    try {
      await saveAdminCoupon({
        code,
        description,
        discountType,
        discountValue: value,
        minOrderValue: minimum,
        maxUses: limit,
        active: true,
      });
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMinOrderValue('0');
      setMaxUses('');
      await load();
      Alert.alert('Cupom criado', 'O cupom já pode ser usado em pedidos sem produtos em promoção.');
    } catch (error) {
      Alert.alert('Não foi possível criar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon: AdminCoupon) {
    setSaving(true);
    try {
      await saveAdminCoupon({
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderValue: Number(coupon.minOrderValue),
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        active: !coupon.active,
        maxUses: coupon.maxUses,
      });
      await load();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível atualizar o cupom.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(coupon: AdminCoupon) {
    Alert.alert(
      'Remover cupom?',
      coupon.uses > 0
        ? 'Como este cupom já foi usado, ele será desativado para preservar o histórico.'
        : 'Este cupom ainda não foi usado e poderá ser removido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => void (async () => {
            setSaving(true);
            try {
              await deleteAdminCoupon(coupon.id);
              await load();
            } catch (error) {
              Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível remover.');
            } finally {
              setSaving(false);
            }
          })(),
        },
      ],
    );
  }

  const activeCount = coupons.filter((coupon) => coupon.active).length;
  const totalUses = coupons.reduce((sum, coupon) => sum + Number(coupon.uses || 0), 0);

  return (
    <AdminGuard>
      <AdminPage eyebrow="Benefícios" title="Cupons" description="Crie descontos para pedidos sem promoção. Cupom e pontos nunca são acumulados.">
        <View style={styles.metrics}>
          <AdminStatCard compact icon="ticket-outline" label="Cupons ativos" value={String(activeCount)} tone="success" />
          <AdminStatCard compact icon="checkmark-done-outline" label="Usos registrados" value={String(totalUses)} />
        </View>

        <AdminSection title="Novo cupom" description="Use somente os campos necessários. O código é validado novamente pelo banco no fechamento do pedido.">
          <AdminCard>
            <View style={styles.formGrid}>
              <Field label="Código" value={code} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30))} placeholder="EX.: JOEDLA10" autoCapitalize="characters" />
              <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Ex.: desconto de boas-vindas" />
            </View>

            <Text style={styles.label}>Tipo de desconto</Text>
            <View style={styles.typeRow}>
              <Choice label="Percentual" active={discountType === 'percent'} onPress={() => setDiscountType('percent')} />
              <Choice label="Valor fixo" active={discountType === 'fixed'} onPress={() => setDiscountType('fixed')} />
            </View>

            <View style={styles.formGrid}>
              <Field label={discountType === 'percent' ? 'Percentual (%)' : 'Valor do desconto (R$)'} value={discountValue} onChangeText={setDiscountValue} keyboardType="decimal-pad" placeholder={discountType === 'percent' ? '10' : '20,00'} />
              <Field label="Compra mínima (R$)" value={minOrderValue} onChangeText={setMinOrderValue} keyboardType="decimal-pad" placeholder="0,00" />
              <Field label="Limite total de usos (opcional)" value={maxUses} onChangeText={(value) => setMaxUses(value.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Sem limite" />
            </View>

            <Pressable disabled={saving} onPress={() => void createCoupon()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
              <Text style={styles.primaryText}>{saving ? 'Salvando...' : 'Criar cupom'}</Text>
            </Pressable>
          </AdminCard>
        </AdminSection>

        <AdminSection title="Cupons cadastrados" description={`${coupons.length} ${coupons.length === 1 ? 'cupom' : 'cupons'}`}>
          <View style={styles.list}>
            {coupons.length ? coupons.map((coupon) => (
              <AdminCard
                key={coupon.id}
                compact
                title={coupon.code}
                description={coupon.description || (coupon.discountType === 'percent' ? `${coupon.discountValue}% de desconto` : `${formatCurrency(Number(coupon.discountValue))} de desconto`)}>
                <View style={styles.couponMeta}>
                  <Text style={coupon.active ? styles.active : styles.inactive}>{coupon.active ? 'Ativo' : 'Inativo'}</Text>
                  <Text style={styles.meta}>Compra mínima: {formatCurrency(Number(coupon.minOrderValue))}</Text>
                  <Text style={styles.meta}>Usos: {coupon.uses}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable disabled={saving} onPress={() => void toggleCoupon(coupon)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <Text style={styles.secondaryText}>{coupon.active ? 'Desativar' : 'Ativar'}</Text>
                  </Pressable>
                  <Pressable disabled={saving} onPress={() => confirmDelete(coupon)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                    <Text style={styles.deleteText}>Remover</Text>
                  </Pressable>
                </View>
              </AdminCard>
            )) : <Text style={styles.empty}>Nenhum cupom cadastrado.</Text>}
          </View>
        </AdminSection>
      </AdminPage>
    </AdminGuard>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...input} placeholderTextColor="#AA9B90" style={styles.input} /></View>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={active ? styles.choiceTextActive : styles.choiceText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 210, flex: 1, gap: 5 },
  label: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  input: { minHeight: 42, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, color: '#2C211A', backgroundColor: '#FCF9F6' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minWidth: 120, minHeight: 40, flexGrow: 1, flexBasis: 120, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCF9F6' },
  choiceActive: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  choiceText: { color: '#6F5D50', fontSize: 10, fontWeight: '800' },
  choiceTextActive: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  primaryButton: { minHeight: 46, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9D5F1D' },
  primaryText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  list: { gap: spacing.sm },
  couponMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  active: { color: '#238657', fontSize: 9, fontWeight: '900' },
  inactive: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  meta: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secondaryButton: { minHeight: 36, flexGrow: 1, flexBasis: 120, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#9D5F1D', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#9D5F1D', fontSize: 9, fontWeight: '900' },
  deleteButton: { minHeight: 36, flexGrow: 1, flexBasis: 120, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.danger, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.danger, fontSize: 9, fontWeight: '900' },
  empty: { color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});