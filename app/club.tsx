import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductImage } from '@/src/components/product-image';
import { Screen } from '@/src/components/screen';
import { keyValueStorage } from '@/src/lib/storage';
import { activateClub, ClubSummary, loadClubSummary, loginClub } from '@/src/services/club';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { formatCurrency, formatDate } from '@/src/utils/format';

const TOKEN_KEY = 'joedla.club.session.v1';

type Mode = 'login' | 'activate';

export default function ClubScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [whatsapp, setWhatsapp] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ClubSummary | null>(null);

  useEffect(() => {
    void restore();
  }, []);

  async function restore() {
    try {
      const token = await keyValueStorage.getItem(TOKEN_KEY);
      if (token) setSummary(await loadClubSummary(token));
    } catch {
      await keyValueStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length !== 11) {
      Alert.alert('Revise o WhatsApp', 'Informe DDD + celular, totalizando 11 números.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      Alert.alert('Revise o PIN', 'O PIN deve ter exatamente 6 números.');
      return;
    }
    if (mode === 'activate' && !orderCode.trim()) {
      Alert.alert('Código do pedido', 'Informe o código de um pedido concluído, como JC-19A1AB27.');
      return;
    }

    setLoading(true);
    try {
      const session = mode === 'activate'
        ? await activateClub(whatsapp, orderCode, pin)
        : await loginClub(whatsapp, pin);
      await keyValueStorage.setItem(TOKEN_KEY, session.token);
      setSummary(await loadClubSummary(session.token));
      setPin('');
    } catch (error) {
      Alert.alert('Não foi possível continuar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await keyValueStorage.removeItem(TOKEN_KEY);
    setSummary(null);
    setWhatsapp('');
    setPin('');
  }

  if (!summary) {
    return (
      <Screen>
        <AppHeader compact title="Clube Joedla" showBack showStoreHome />
        <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Ionicons name="star" size={24} color="#D8A45F" /></View>
            <Text style={styles.heroTitle}>Seus pontos e benefícios</Text>
            <Text style={styles.heroText}>Use o mesmo WhatsApp informado nas compras. Não é necessário e-mail.</Text>
          </View>

          <View style={styles.switchRow}>
            <Pressable onPress={() => setMode('login')} style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}>
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Entrar</Text>
            </Pressable>
            <Pressable onPress={() => setMode('activate')} style={[styles.switchButton, mode === 'activate' && styles.switchButtonActive]}>
              <Text style={[styles.switchText, mode === 'activate' && styles.switchTextActive]}>Ativar meu Clube</Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="(79) 99999-9999" keyboardType="phone-pad" />
            {mode === 'activate' ? (
              <Field label="Código de um pedido concluído" value={orderCode} onChangeText={setOrderCode} placeholder="JC-19A1AB27" autoCapitalize="characters" />
            ) : null}
            <Field label={mode === 'activate' ? 'Crie um PIN de 6 números' : 'PIN de acesso'} value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" keyboardType="number-pad" secureTextEntry />
            <Pressable disabled={loading} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}>
              <Text style={styles.primaryButtonText}>{loading ? 'Aguarde...' : mode === 'activate' ? 'Ativar Clube Joedla' : 'Entrar'}</Text>
            </Pressable>
            <Text style={styles.helper}>{mode === 'activate' ? 'O pedido precisa estar concluído e pertencer ao mesmo WhatsApp.' : 'Esqueceu o PIN? Use “Ativar meu Clube” com um pedido concluído para definir um novo PIN.'}</Text>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const openTotal = summary.orders.reduce((sum, order) => sum + Number(order.remaining || 0), 0);
  return (
    <Screen>
      <AppHeader compact title="Clube Joedla" showBack showStoreHome />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}><View><Text style={styles.hello}>Olá, {summary.customer.name}!</Text><Text style={styles.balanceLabel}>Pontos disponíveis</Text></View><View style={styles.coin}><Ionicons name="star" size={20} color="#FFF" /></View></View>
          <Text style={styles.balance}>{summary.points.toLocaleString('pt-BR')}</Text>
          <Text style={styles.balanceSuffix}>pontos</Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric icon="receipt-outline" label="Compras concluídas" value={String(summary.orders.length)} />
          <Metric icon="wallet-outline" label="Em aberto" value={formatCurrency(openTotal)} danger={openTotal > 0} />
        </View>

        <Section title="Meus pedidos concluídos" subtitle="Pagamento e pontos acompanham o que foi realmente recebido pela loja.">
          {summary.orders.length ? summary.orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.rowBetween}><Text style={styles.orderCode}>{order.publicCode}</Text><Text style={order.remaining > 0 ? styles.partial : styles.paid}>{order.remaining > 0 ? 'Parcial' : 'Quitado'}</Text></View>
              <Text style={styles.muted}>{formatDate(order.createdAt)} • Total {formatCurrency(order.total)}</Text>
              <View style={styles.moneyRow}><Text style={styles.paidText}>Pago: {formatCurrency(order.paid)}</Text><Text style={styles.remainingText}>Restante: {formatCurrency(order.remaining)}</Text></View>
            </View>
          )) : <Text style={styles.empty}>Nenhuma compra concluída vinculada a este WhatsApp.</Text>}
        </Section>

        <Section title="Extrato de pontos">
          {summary.ledger.length ? summary.ledger.slice(0, 12).map((entry) => (
            <View key={entry.id} style={styles.ledgerRow}>
              <Text style={entry.points > 0 ? styles.pointsPositive : styles.pointsNegative}>{entry.points > 0 ? '+' : ''}{entry.points}</Text>
              <View style={styles.ledgerCopy}><Text style={styles.ledgerDescription}>{entry.description}</Text><Text style={styles.muted}>{formatDate(entry.createdAt)}</Text></View>
            </View>
          )) : <Text style={styles.empty}>Seus pontos aparecerão aqui conforme os pagamentos forem registrados.</Text>}
        </Section>

        <Section title="Recompensas" subtitle="Produtos disponíveis para troca completa por pontos.">
          {summary.rewards.length ? summary.rewards.map((reward) => (
            <View key={reward.id} style={styles.rewardRow}>
              <ProductImage uri={reward.imageUrl} style={styles.rewardImage} />
              <View style={styles.rewardCopy}><Text style={styles.rewardName}>{reward.name}</Text><Text style={styles.rewardPoints}>{reward.pointsRequired.toLocaleString('pt-BR')} pontos</Text></View>
              <Ionicons name={summary.points >= reward.pointsRequired ? 'checkmark-circle' : 'lock-closed-outline'} size={20} color={summary.points >= reward.pointsRequired ? '#238657' : colors.textMuted} />
            </View>
          )) : <Text style={styles.empty}>A loja ainda não cadastrou recompensas.</Text>}
        </Section>

        <Pressable onPress={() => void signOut()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryButtonText}>Sair do Clube</Text></Pressable>
      </ScrollView>
    </Screen>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...input } = props;
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...input} placeholderTextColor="#A8998C" style={styles.input} /></View>;
}

function Metric({ icon, label, value, danger = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; danger?: boolean }) {
  return <View style={styles.metric}><Ionicons name={icon} size={18} color={danger ? '#B43D38' : colors.primary} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}<View style={styles.sectionBody}>{children}</View></View>;
}

const styles = StyleSheet.create({
  authContent: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { padding: spacing.lg, borderRadius: 20, alignItems: 'center', backgroundColor: '#2A1A12', ...shadow },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(216,164,95,0.16)' },
  heroTitle: { marginTop: spacing.sm, fontFamily: fonts.display, color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroText: { marginTop: 4, color: '#D8C8BA', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  switchRow: { flexDirection: 'row', gap: spacing.sm },
  switchButton: { minHeight: 44, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  switchButtonActive: { backgroundColor: colors.primary }, switchText: { color: colors.textMuted, fontSize: 12, fontWeight: '800', textAlign: 'center' }, switchTextActive: { color: '#FFF' },
  formCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 18, gap: spacing.md, backgroundColor: colors.surface, ...shadow },
  field: { gap: 6 }, fieldLabel: { color: colors.text, fontSize: 12, fontWeight: '800' }, input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, backgroundColor: '#FFF' },
  primaryButton: { minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, primaryButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, secondaryButtonText: { color: colors.primary, fontWeight: '900' },
  helper: { color: colors.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center' }, pressed: { opacity: 0.75 }, disabled: { opacity: 0.5 },
  balanceCard: { padding: spacing.lg, borderRadius: 20, backgroundColor: '#2A1A12', ...shadow }, balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, hello: { color: '#FFF', fontSize: 16, fontWeight: '900' }, balanceLabel: { marginTop: 2, color: '#D8C8BA', fontSize: 11 }, coin: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B16A1F' }, balance: { marginTop: spacing.md, color: '#FFF', fontSize: 38, lineHeight: 42, fontWeight: '900' }, balanceSuffix: { color: '#D8C8BA', fontSize: 11 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, metric: { minWidth: 145, flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 14, gap: 3, backgroundColor: colors.surface }, metricValue: { color: colors.text, fontSize: 18, fontWeight: '900' }, metricLabel: { color: colors.textMuted, fontSize: 10 },
  section: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface }, sectionTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 20, fontWeight: '800' }, sectionSubtitle: { marginTop: 3, color: colors.textMuted, fontSize: 10, lineHeight: 15 }, sectionBody: { marginTop: spacing.md, gap: spacing.sm },
  orderCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, gap: 5, backgroundColor: colors.surfaceWarm }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, orderCode: { color: colors.text, fontSize: 13, fontWeight: '900' }, partial: { color: '#A56519', fontSize: 10, fontWeight: '900' }, paid: { color: '#238657', fontSize: 10, fontWeight: '900' }, muted: { color: colors.textMuted, fontSize: 9 }, moneyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, paidText: { color: '#238657', fontSize: 10, fontWeight: '800' }, remainingText: { color: '#B43D38', fontSize: 10, fontWeight: '800' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pointsPositive: { minWidth: 54, color: '#238657', fontSize: 14, fontWeight: '900' }, pointsNegative: { minWidth: 54, color: '#B43D38', fontSize: 14, fontWeight: '900' }, ledgerCopy: { minWidth: 0, flex: 1 }, ledgerDescription: { color: colors.text, fontSize: 11, fontWeight: '700' },
  rewardRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, rewardImage: { width: 54, height: 54, borderRadius: 10 }, rewardCopy: { minWidth: 0, flex: 1 }, rewardName: { color: colors.text, fontSize: 12, fontWeight: '900' }, rewardPoints: { marginTop: 2, color: colors.primary, fontSize: 10, fontWeight: '800' }, empty: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
});
