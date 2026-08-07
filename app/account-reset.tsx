import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { customerSupabase } from '@/src/lib/supabase';
import { colors, radii, shadow, spacing } from '@/src/theme';

function validPassword(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function currentBrowserUrl(): string | null {
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  return null;
}

export default function AccountResetScreen() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void prepareRecoverySession();
  }, []);

  async function prepareRecoverySession() {
    if (!customerSupabase) {
      setErrorMessage('A conexão da loja não está configurada.');
      return;
    }

    try {
      const browserUrl = currentBrowserUrl();
      const initialUrl = browserUrl ?? await Linking.getInitialURL();
      if (!initialUrl) throw new Error('Link de recuperação inválido.');

      const parsed = new URL(initialUrl);
      const query = parsed.searchParams;
      const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));

      const authError =
        query.get('error_description') ??
        fragment.get('error_description') ??
        query.get('error') ??
        fragment.get('error');
      if (authError) {
        throw new Error('Este link de recuperação expirou ou já foi utilizado. Solicite um novo link.');
      }

      const code = query.get('code');
      const accessToken = fragment.get('access_token') ?? query.get('access_token');
      const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token');
      const type = fragment.get('type') ?? query.get('type');

      if (code) {
        const { error } = await customerSupabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (accessToken && refreshToken && (!type || type === 'recovery')) {
        const { error } = await customerSupabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
      } else {
        const { data, error } = await customerSupabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          throw new Error('Este link de recuperação é inválido ou expirou. Solicite um novo link.');
        }
      }

      const { data: userData, error: userError } = await customerSupabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Não foi possível validar sua recuperação. Solicite um novo link.');
      }

      setReady(true);
      setErrorMessage('');
    } catch (error) {
      console.error('account recovery validation failed', error);
      setReady(false);
      setErrorMessage(
        error instanceof Error && /expir|inválid|utilizado|validar/i.test(error.message)
          ? error.message
          : 'Não foi possível validar este link. Solicite um novo e tente novamente.',
      );
    }
  }

  async function savePassword() {
    setErrorMessage('');

    if (!validPassword(password)) {
      setErrorMessage('A nova senha precisa ter no mínimo 8 caracteres, com pelo menos 1 letra e 1 número.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As duas senhas precisam ser iguais.');
      return;
    }
    if (!customerSupabase) {
      setErrorMessage('A conexão da loja não está configurada.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await customerSupabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmPassword('');
      await customerSupabase.auth.signOut({ scope: 'local' });
      router.replace('/account');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível definir a nova senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader compact title="Recuperar acesso" showStoreHome />
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Defina sua nova senha</Text>
          <Text style={styles.subtitle}>
            Este link confirma que você tem acesso ao e-mail da conta. Depois de salvar, entre normalmente com e-mail e senha.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {ready ? (
            <>
              <Field
                label="Nova senha — mínimo 8 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={72}
                placeholder="Digite a nova senha"
              />
              <Text style={styles.requirement}>
                Obrigatório: pelo menos 8 caracteres, contendo no mínimo 1 letra e 1 número.
              </Text>
              <Field
                label="Confirmar nova senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={72}
                placeholder="Digite novamente"
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primary} />
                <Text style={styles.link}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</Text>
              </Pressable>
              <Button loading={loading} onPress={() => void savePassword()}>
                Salvar nova senha
              </Button>
            </>
          ) : null}

          <Button variant="secondary" onPress={() => router.replace('/account')}>
            Voltar para Minha conta
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.large,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  requirement: {
    marginTop: -spacing.sm,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  showPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.medium,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    minWidth: 0,
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
});
