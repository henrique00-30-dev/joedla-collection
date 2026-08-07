import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { ProductGrid } from '@/src/components/product-grid';
import { Screen } from '@/src/components/screen';
import { Button, Field, StatusBadge } from '@/src/components/ui';
import { useStore } from '@/src/context/store-context';
import { customerSupabase } from '@/src/lib/supabase';
import {
  CustomerNotification,
  CustomerProfile,
  loadCustomerNotifications,
  loadCustomerProfile,
  loadCustomerUser,
  loadLoyaltySummary,
  loadMyQuestions,
  loadMyReviews,
  loadRecentlyViewedProductIds,
  markNotificationRead,
  ProductQuestion,
  ProductReview,
  registerCustomer,
  saveCustomerProfile,
  signInCustomer,
  signOutCustomer,
} from '@/src/services/customer';
import { loadCloudCustomerOrders } from '@/src/services/cloud';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import type { Order } from '@/src/types';
import { formatCurrency, formatDate } from '@/src/utils/format';

const REGISTER_TIMEOUT_MS = 15000;

function digitsOnly(value: string) {
  return value.replace(/\D/g, '').slice(0, 11);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('O cadastro demorou mais que o esperado. Tente novamente.')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function AccountScreen() {
  const { products } = useStore();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerWhatsapp, setRegisterWhatsapp] = useState('');
  const [registerError, setRegisterError] = useState('');

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [points, setPoints] = useState(0);

  const recentProducts = useMemo(
    () => recentIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as typeof products,
    [products, recentIds],
  );

  useEffect(() => {
    void refresh();
    if (!customerSupabase) return;
    const { data } = customerSupabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const current = await loadCustomerUser();
      setUser(current);
      if (!current || !customerSupabase) {
        setProfile(null);
        setOrders([]);
        setNotifications([]);
        setReviews([]);
        setQuestions([]);
        setRecentIds([]);
        setPoints(0);
        return;
      }

      const [nextProfile, nextOrders, nextNotifications, nextReviews, nextQuestions, nextRecent, loyalty] =
        await Promise.all([
          loadCustomerProfile(),
          loadCloudCustomerOrders(customerSupabase),
          loadCustomerNotifications(),
          loadMyReviews(),
          loadMyQuestions(),
          loadRecentlyViewedProductIds(),
          loadLoyaltySummary(),
        ]);
      setProfile(nextProfile);
      setOrders(nextOrders);
      setNotifications(nextNotifications);
      setReviews(nextReviews);
      setQuestions(nextQuestions);
      setRecentIds(nextRecent);
      setPoints(loyalty.points);
    } catch (error) {
      Alert.alert('Minha conta', error instanceof Error ? error.message : 'Não foi possível carregar sua conta.');
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert('Dados incompletos', 'Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await signInCustomer(email, password);
      setPassword('');
      await refresh();
    } catch (error) {
      Alert.alert('Não foi possível entrar', error instanceof Error ? error.message : 'Confira seus dados.');
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setRegisterError('');

    if (registerName.trim().length < 3 || !email.trim()) {
      const message = 'Informe seu nome completo e um e-mail válido.';
      setRegisterError(message);
      Alert.alert('Dados incompletos', message);
      return;
    }

    const phoneDigits = digitsOnly(registerWhatsapp);
    if (phoneDigits.length !== 11) {
      const message = 'Informe 11 dígitos no WhatsApp, incluindo o DDD. Ex.: 79999999999.';
      setRegisterError(message);
      Alert.alert('WhatsApp inválido', message);
      return;
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      const message = 'A senha precisa ter no mínimo 8 caracteres, com pelo menos 1 letra e 1 número.';
      setRegisterError(message);
      Alert.alert('Senha inválida', message);
      return;
    }

    setLoading(true);
    try {
      await withTimeout(
        registerCustomer({
          fullName: registerName.trim(),
          email: email.trim(),
          password,
          whatsapp: phoneDigits,
        }),
        REGISTER_TIMEOUT_MS,
      );
      setPassword('');
      setRegisterError('');
      await refresh();
      Alert.alert('Conta criada', 'Seu cadastro está pronto e você já está conectado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente.';
      setRegisterError(message);
      Alert.alert('Não foi possível criar a conta', message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile || profile.fullName.trim().length < 3) {
      Alert.alert('Nome inválido', 'Informe seu nome completo.');
      return;
    }
    setLoading(true);
    try {
      await saveCustomerProfile({
        fullName: profile.fullName,
        whatsapp: profile.whatsapp,
        birthDate: profile.birthDate,
        marketingConsent: profile.marketingConsent,
      });
      await refresh();
      Alert.alert('Dados atualizados', 'Suas informações foram salvas.');
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await signOutCustomer();
      setUser(null);
      await refresh();
    } catch (error) {
      Alert.alert('Não foi possível sair', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  async function readNotification(notification: CustomerNotification) {
    if (!notification.readAt) await markNotificationRead(notification.id);
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    const productId = typeof notification.payload?.productId === 'string' ? notification.payload.productId : null;
    if (productId) router.push({ pathname: '/product/[id]', params: { id: productId } });
  }

  return (
    <Screen>
      <AppHeader compact title="Minha conta" showBack showStoreHome />
      <ScrollView
        contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}
        showsVerticalScrollIndicator>
        <View>
          <Text style={styles.eyebrow}>ÁREA DO CLIENTE</Text>
          <Text style={styles.pageTitle}>Minha conta</Text>
          <Text style={styles.pageSubtitle}>
            Seus pedidos, avaliações, favoritos, pontos e avisos ficam vinculados com segurança ao seu cadastro.
          </Text>
        </View>

        {!user ? (
          <View style={[styles.card, desktop && styles.authCard]}>
            <View style={styles.modeRow}>
              <Pressable onPress={() => { setMode('login'); setRegisterError(''); }} style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}>
                <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Entrar</Text>
              </Pressable>
              <Pressable onPress={() => { setMode('register'); setRegisterError(''); }} style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}>
                <Text style={[styles.modeText, mode === 'register' && styles.modeTextActive]}>Criar conta</Text>
              </Pressable>
            </View>

            {mode === 'register' ? (
              <>
                <Field label="Nome completo" value={registerName} onChangeText={setRegisterName} placeholder="Seu nome" maxLength={120} />
                <Field
                  label="WhatsApp — obrigatório: 11 dígitos com DDD"
                  value={registerWhatsapp}
                  onChangeText={(value) => setRegisterWhatsapp(digitsOnly(value))}
                  keyboardType="phone-pad"
                  placeholder="79999999999"
                  maxLength={11}
                />
                <Text style={styles.requirementText}>
                  Digite somente números: 2 do DDD + 9 do celular. Ex.: 79999999999.
                </Text>
              </>
            ) : null}

            <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@exemplo.com" maxLength={254} />
            <Field
              label={mode === 'register' ? 'Senha — mínimo 8 caracteres' : 'Senha'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Sua senha'}
              maxLength={72}
            />
            {mode === 'register' ? (
              <Text style={styles.requirementText}>
                Obrigatório: pelo menos 8 caracteres, contendo no mínimo 1 letra e 1 número.
              </Text>
            ) : null}
            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primary} />
              <Text style={styles.link}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</Text>
            </Pressable>

            {mode === 'register' && registerError ? (
              <View style={styles.formErrorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.formErrorText}>{registerError}</Text>
              </View>
            ) : null}

            <Button loading={loading} onPress={mode === 'login' ? login : register}>
              {mode === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'}
            </Button>

            <View style={styles.securityBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
              <Text style={styles.securityText}>
                O acesso usa sessão segura e senha. Não é necessário clicar em links recebidos por e-mail para entrar.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.accountTop}>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(profile?.fullName?.[0] ?? user.email?.[0] ?? 'J').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{profile?.fullName || 'Cliente Joedla'}</Text>
                  <Text style={styles.muted}>{user.email}</Text>
                </View>
              </View>
              <Button variant="secondary" onPress={logout}>Sair</Button>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard icon="bag-check-outline" label="Pedidos" value={String(orders.length)} />
              <SummaryCard icon="star-outline" label="Avaliações" value={String(reviews.length)} />
              <SummaryCard icon="gift-outline" label="Pontos" value={String(points)} />
              <SummaryCard icon="notifications-outline" label="Avisos" value={String(notifications.filter((item) => !item.readAt).length)} />
            </View>

            {profile ? (
              <View style={styles.card}>
                <SectionTitle icon="person-outline" title="Meus dados" subtitle="Dados usados para identificar sua conta e facilitar suas compras." />
                <Field label="Nome completo" value={profile.fullName} onChangeText={(value) => setProfile({ ...profile, fullName: value })} maxLength={120} />
                <Field label="WhatsApp" value={profile.whatsapp} onChangeText={(value) => setProfile({ ...profile, whatsapp: value })} keyboardType="phone-pad" maxLength={30} />
                <Field label="Data de nascimento (AAAA-MM-DD)" value={profile.birthDate} onChangeText={(value) => setProfile({ ...profile, birthDate: value })} placeholder="1990-01-31" maxLength={10} />
                <View style={styles.consentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.consentTitle}>Quero receber promoções</Text>
                    <Text style={styles.muted}>Consentimento separado do cadastro e registrável no histórico.</Text>
                  </View>
                  <Switch value={profile.marketingConsent} onValueChange={(value) => setProfile({ ...profile, marketingConsent: value })} />
                </View>
                <Button loading={loading} onPress={saveProfile}>Salvar meus dados</Button>
              </View>
            ) : null}

            <View style={styles.card}>
              <SectionTitle icon="receipt-outline" title="Histórico de pedidos" subtitle="Pedidos vinculados à sua conta." />
              {!orders.length ? <Text style={styles.empty}>Nenhum pedido vinculado ainda.</Text> : orders.slice(0, 8).map((order) => (
                <View key={order.id} style={styles.listCard}>
                  <View style={styles.listTop}>
                    <View>
                      <Text style={styles.itemTitle}>{order.publicCode}</Text>
                      <Text style={styles.muted}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <StatusBadge status={order.status} />
                  </View>
                  <Text style={styles.itemText}>{order.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</Text>
                  <Text style={styles.price}>{formatCurrency(order.total)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <SectionTitle icon="star-outline" title="Minhas avaliações" subtitle="Todo comentário fica identificado e passa por moderação." />
              {!reviews.length ? <Text style={styles.empty}>Você ainda não enviou avaliações.</Text> : reviews.map((review) => (
                <View key={review.id} style={styles.listCard}>
                  <View style={styles.listTop}>
                    <Text style={styles.itemTitle}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    <Text style={[styles.status, review.status === 'approved' ? styles.approved : review.status === 'rejected' ? styles.rejected : styles.pending]}>
                      {review.status === 'approved' ? 'Aprovada' : review.status === 'rejected' ? 'Rejeitada' : 'Aguardando aprovação'}
                    </Text>
                  </View>
                  <Text style={styles.itemText}>{review.comment}</Text>
                  {review.moderationNote ? <Text style={styles.muted}>Observação: {review.moderationNote}</Text> : null}
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <SectionTitle icon="chatbubble-ellipses-outline" title="Minhas perguntas" subtitle="Perguntas enviadas nas páginas dos produtos." />
              {!questions.length ? <Text style={styles.empty}>Você ainda não fez perguntas.</Text> : questions.map((question) => (
                <View key={question.id} style={styles.listCard}>
                  <Text style={styles.itemTitle}>{question.question}</Text>
                  <Text style={styles.muted}>{question.status === 'published' ? 'Publicada' : question.status === 'rejected' ? 'Não publicada' : 'Aguardando resposta'}</Text>
                  {question.answer ? <Text style={styles.answer}>Loja: {question.answer}</Text> : null}
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <SectionTitle icon="notifications-outline" title="Notificações" subtitle="Estoque, fidelidade, cupons e outras atualizações da loja." />
              {!notifications.length ? <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text> : notifications.slice(0, 10).map((notification) => (
                <Pressable key={notification.id} onPress={() => void readNotification(notification)} style={[styles.listCard, !notification.readAt && styles.unread]}>
                  <Text style={styles.itemTitle}>{notification.title}</Text>
                  <Text style={styles.itemText}>{notification.message}</Text>
                  <Text style={styles.muted}>{formatDate(notification.createdAt)}</Text>
                </Pressable>
              ))}
            </View>

            {recentProducts.length ? (
              <View style={styles.card}>
                <SectionTitle icon="time-outline" title="Vistos recentemente" subtitle="Continue de onde parou." />
                <ProductGrid products={recentProducts.slice(0, 4)} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SummaryCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  contentDesktop: { maxWidth: 1080, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl },
  eyebrow: { color: '#9D6A2F', fontSize: 10, fontWeight: '900', letterSpacing: 2.2 },
  pageTitle: { marginTop: spacing.xs, fontFamily: fonts.display, color: colors.text, fontSize: 30, fontWeight: '800' },
  pageSubtitle: { marginTop: spacing.sm, maxWidth: 720, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radii.large, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  authCard: { maxWidth: 620, width: '100%', alignSelf: 'center' },
  modeRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.medium, padding: 4 },
  modeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radii.small },
  modeButtonActive: { backgroundColor: colors.surface },
  modeText: { color: colors.textMuted, fontWeight: '700' },
  modeTextActive: { color: colors.primary },
  requirementText: { marginTop: -spacing.sm, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  showPassword: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs },
  link: { color: colors.primary, fontWeight: '700' },
  formErrorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.medium, backgroundColor: colors.dangerSoft },
  formErrorText: { minWidth: 0, flex: 1, color: colors.danger, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  securityBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: radii.medium, backgroundColor: colors.successSoft },
  securityText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  accountTop: { backgroundColor: colors.surface, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceWarm },
  avatarText: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  summaryCard: { minWidth: 145, flexGrow: 1, flexBasis: 160, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, padding: spacing.lg, gap: spacing.xs },
  summaryValue: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  consentTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  listCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.background },
  unread: { borderColor: colors.primary, backgroundColor: colors.surfaceWarm },
  listTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  itemTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  itemText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  price: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  status: { fontSize: 11, fontWeight: '800' },
  approved: { color: colors.success },
  rejected: { color: colors.danger },
  pending: { color: colors.warning },
  answer: { color: colors.text, backgroundColor: colors.surfaceWarm, borderRadius: radii.small, padding: spacing.sm, fontSize: 13, lineHeight: 19 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});