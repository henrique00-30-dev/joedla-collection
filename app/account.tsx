import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field, StatusBadge } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { loadCloudCustomerOrders } from '@/src/services/cloud';
import { colors, fonts, radii, shadow, spacing } from '@/src/theme';
import { Order } from '@/src/types';
import {
  digitsOnly,
  isValidEmail,
  normalizeEmail,
} from '@/src/utils/fields';
import { formatCurrency, formatDate } from '@/src/utils/format';

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    void refreshAccount();

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          void refreshAccount();
        }
      },
    );

    return () => data.subscription.unsubscribe();
  }, []);

  async function refreshAccount() {
    if (!supabase) {
      return;
    }

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      const admin = profile?.role === 'admin';

      setIsAdminSession(admin);
      setOrders(
        admin ? [] : await loadCloudCustomerOrders(),
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível abrir a conta',
        error instanceof Error
          ? error.message
          : 'Tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendAccess() {
    if (!supabase || !isValidEmail(email)) {
      Alert.alert(
        'E-mail inválido',
        'Informe um endereço de e-mail válido.',
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizeEmail(email),
        options: {
          shouldCreateUser: true,
          emailRedirectTo:
            'https://www.joedla-collection.com.br/account',
        },
      });

      if (error) {
        throw error;
      }

      setCodeSent(true);

      Alert.alert(
        'Acesso enviado',
        'Confira seu e-mail. Use o link recebido ou digite o código de 6 números.',
      );
    } catch (error) {
      Alert.alert(
        'Não foi possível enviar',
        error instanceof Error
          ? error.message
          : 'Tente novamente em instantes.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!supabase || digitsOnly(token).length !== 6) {
      Alert.alert(
        'Código incompleto',
        'Digite os 6 números recebidos por e-mail.',
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizeEmail(email),
        token: digitsOnly(token),
        type: 'email',
      });

      if (error) {
        throw error;
      }

      await refreshAccount();
    } catch (error) {
      Alert.alert(
        'Código inválido',
        error instanceof Error
          ? error.message
          : 'Solicite um novo código.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut({
      scope: 'local',
    });

    if (error) {
      Alert.alert('Não foi possível sair', error.message);
      return;
    }

    setUser(null);
    setOrders([]);
  }

  return (
    <Screen>
      <AppHeader
        compact
        title="Minha conta"
        showBack
        showStoreHome
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          desktop && styles.contentDesktop,
        ]}
        showsVerticalScrollIndicator>
        <View style={styles.pageHeader}>
          <Text style={styles.eyebrow}>
            ÁREA DO CLIENTE
          </Text>

          <Text style={styles.pageTitle}>
            Sua conta Joedla
          </Text>

          <Text style={styles.pageSubtitle}>
            Acompanhe pedidos, consulte seu histórico e acesse
            a loja sem precisar criar uma senha.
          </Text>
        </View>

        <View style={styles.optionalCard}>
          <View style={styles.optionalIcon}>
            <Ionicons
              name="person-circle-outline"
              size={26}
              color={colors.primary}
            />
          </View>

          <View style={styles.optionalCopy}>
            <Text style={styles.optionalTitle}>
              A conta é opcional
            </Text>

            <Text style={styles.optionalText}>
              Você continua podendo navegar, usar o carrinho e
              comprar sem cadastro.
            </Text>
          </View>
        </View>

        {!user ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="mail-unread-outline"
                  size={23}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardHeaderCopy}>
                <Text style={styles.title}>
                  Entrar sem senha
                </Text>

                <Text style={styles.text}>
                  Enviaremos um acesso único para seu e-mail.
                </Text>
              </View>
            </View>

            <Field
              label="Seu e-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@exemplo.com"
              maxLength={254}
            />

            {codeSent ? (
              <Field
                label="Código de 6 números"
                value={token}
                onChangeText={(value) =>
                  setToken(digitsOnly(value, 6))
                }
                keyboardType="number-pad"
                placeholder="000000"
                maxLength={6}
              />
            ) : null}

            {codeSent ? (
              <Button
                loading={loading}
                onPress={verifyCode}>
                Confirmar código
              </Button>
            ) : null}

            <Button
              variant={codeSent ? 'secondary' : 'primary'}
              loading={loading}
              onPress={sendAccess}>
              {codeSent
                ? 'Enviar novo acesso'
                : 'Enviar acesso por e-mail'}
            </Button>
          </View>
        ) : isAdminSession ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={23}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardHeaderCopy}>
                <Text style={styles.title}>
                  Sessão administrativa ativa
                </Text>

                <Text style={styles.text}>
                  Esta conta está reservada para administrar a
                  loja. Use o painel para continuar.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.accountHeader}>
              <View style={styles.accountIdentity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.email?.[0] ?? 'J').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.accountCopy}>
                  <Text style={styles.title}>Olá!</Text>
                  <Text style={styles.text}>
                    {user.email}
                  </Text>
                </View>
              </View>

              <Button
                variant="secondary"
                onPress={signOut}>
                Sair
              </Button>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Histórico de compras
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Consulte seus pedidos vinculados a esta conta.
                </Text>
              </View>

              <View style={styles.orderCount}>
                <Text style={styles.orderCountValue}>
                  {orders.length}
                </Text>

                <Text style={styles.orderCountLabel}>
                  {orders.length === 1 ? 'pedido' : 'pedidos'}
                </Text>
              </View>
            </View>

            {orders.length ? (
              orders.map((order) => (
                <View
                  key={order.id}
                  style={styles.orderCard}>
                  <View style={styles.orderRow}>
                    <View>
                      <Text style={styles.orderCode}>
                        {order.publicCode}
                      </Text>

                      <Text style={styles.orderDate}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>

                    <StatusBadge status={order.status} />
                  </View>

                  <Text style={styles.orderItems}>
                    {order.items
                      .map(
                        (item) =>
                          `${item.quantity}x ${item.productName}`,
                      )
                      .join(', ')}
                  </Text>

                  <View style={styles.orderFooter}>
                    <Text style={styles.orderTotalLabel}>
                      Total
                    </Text>

                    <Text style={styles.orderTotal}>
                      {formatCurrency(order.total)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="receipt-outline"
                  size={36}
                  color={colors.textMuted}
                />

                <Text style={styles.emptyTitle}>
                  Nenhum pedido ainda
                </Text>

                <Text style={styles.empty}>
                  Nenhum pedido vinculado a esta conta ainda.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignSelf: 'center',
    gap: spacing.lg,
  },

  contentDesktop: {
    maxWidth: 860,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },

  pageHeader: {
    marginBottom: spacing.sm,
  },

  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  pageTitle: {
    marginTop: spacing.xs,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },

  pageSubtitle: {
    maxWidth: 620,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  optionalCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(157,106,47,0.16)',
    borderRadius: radii.large,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8EC',
  },

  optionalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  optionalCopy: {
    flex: 1,
  },

  optionalTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  optionalText: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
  },

  card: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    gap: spacing.lg,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  cardHeaderCopy: {
    minWidth: 0,
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  text: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  accountHeader: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  accountIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B451C',
  },

  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },

  accountCopy: {
    minWidth: 0,
    flex: 1,
  },

  sectionHeader: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  sectionTitle: {
    fontFamily: fonts.display,
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  orderCount: {
    minWidth: 80,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  orderCountValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  orderCountLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 9,
  },

  orderCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 18,
    gap: spacing.md,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  orderCode: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  orderDate: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },

  orderItems: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  orderFooter: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  orderTotalLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },

  orderTotal: {
    color: '#8B451C',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyCard: {
    minHeight: 220,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  emptyTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  empty: {
    maxWidth: 380,
    marginTop: spacing.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});