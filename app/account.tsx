import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field, StatusBadge } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { loadCloudCustomerOrders } from '@/src/services/cloud';
import { colors, radii, spacing } from '@/src/theme';
import { Order } from '@/src/types';
import { formatCurrency, formatDate } from '@/src/utils/format';
import { digitsOnly, isValidEmail, normalizeEmail } from '@/src/utils/fields';

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void refreshAccount();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void refreshAccount();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function refreshAccount() {
    if (!supabase) return;
    setLoading(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      if (!currentUser) {
        setOrders([]);
        setIsAdminSession(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
      const admin = profile?.role === 'admin';
      setIsAdminSession(admin);
      setOrders(admin ? [] : await loadCloudCustomerOrders());
    } catch (error) {
      Alert.alert('Não foi possível abrir a conta', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function sendAccess() {
    if (!supabase || !isValidEmail(email)) {
      Alert.alert('E-mail inválido', 'Informe um endereço de e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizeEmail(email),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'https://www.joedla-collection.com.br/account',
        },
      });
      if (error) throw error;
      setCodeSent(true);
      Alert.alert('Acesso enviado', 'Confira seu e-mail. Use o link recebido ou digite o código de 6 números.');
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!supabase || digitsOnly(token).length !== 6) {
      Alert.alert('Código incompleto', 'Digite os 6 números recebidos por e-mail.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: digitsOnly(token), type: 'email' });
      if (error) throw error;
      await refreshAccount();
    } catch (error) {
      Alert.alert('Código inválido', error instanceof Error ? error.message : 'Solicite um novo código.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      Alert.alert('Não foi possível sair', error.message);
      return;
    }
    setUser(null);
    setOrders([]);
  }

  return (
    <Screen>
      <AppHeader compact title="Minha conta" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.optionalCard}>
          <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          <View style={styles.optionalCopy}>
            <Text style={styles.optionalTitle}>A conta é opcional</Text>
            <Text style={styles.optionalText}>Você continua podendo navegar, usar o carrinho e comprar sem cadastro.</Text>
          </View>
        </View>

        {!user ? (
          <View style={styles.card}>
            <Text style={styles.title}>Entrar sem senha</Text>
            <Text style={styles.text}>Enviaremos um acesso único para seu e-mail.</Text>
            <Field label="Seu e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@exemplo.com" maxLength={254} />
            {codeSent ? (
              <Field label="Código de 6 números" value={token} onChangeText={(value) => setToken(digitsOnly(value, 6))} keyboardType="number-pad" placeholder="000000" maxLength={6} />
            ) : null}
            {codeSent ? <Button loading={loading} onPress={verifyCode}>Confirmar código</Button> : null}
            <Button variant={codeSent ? 'secondary' : 'primary'} loading={loading} onPress={sendAccess}>
              {codeSent ? 'Enviar novo acesso' : 'Enviar acesso por e-mail'}
            </Button>
          </View>
        ) : isAdminSession ? (
          <View style={styles.card}>
            <Text style={styles.title}>Sessão administrativa ativa</Text>
            <Text style={styles.text}>Esta conta está reservada para administrar a loja. Use o painel para continuar.</Text>
          </View>
        ) : (
          <>
            <View style={styles.accountHeader}>
              <View>
                <Text style={styles.title}>Olá!</Text>
                <Text style={styles.text}>{user.email}</Text>
              </View>
              <Button variant="secondary" onPress={signOut}>Sair</Button>
            </View>
            <Text style={styles.sectionTitle}>Histórico de compras</Text>
            {orders.length ? orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderRow}>
                  <View><Text style={styles.orderCode}>{order.publicCode}</Text><Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text></View>
                  <StatusBadge status={order.status} />
                </View>
                <Text style={styles.orderItems}>{order.items.map((item) => `${item.quantity}x ${item.productName}`).join(', ')}</Text>
                <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
              </View>
            )) : <Text style={styles.empty}>Nenhum pedido vinculado a esta conta ainda.</Text>}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, padding: spacing.lg, paddingBottom: spacing.xxl, alignSelf: 'center', gap: spacing.lg },
  optionalCard: { padding: spacing.lg, borderRadius: radii.large, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceWarm },
  optionalCopy: { flex: 1 },
  optionalTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  optionalText: { marginTop: 3, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  card: { padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, gap: spacing.lg, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  text: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  accountHeader: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.surface },
  sectionTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' },
  orderCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.medium, gap: spacing.md, backgroundColor: colors.surface },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  orderCode: { color: colors.text, fontSize: 15, fontWeight: '900' },
  orderDate: { marginTop: 2, color: colors.textMuted, fontSize: 10 },
  orderItems: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  orderTotal: { color: colors.primary, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  empty: { paddingVertical: 44, color: colors.textMuted, textAlign: 'center' },
});
