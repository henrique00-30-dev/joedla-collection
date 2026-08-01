import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { Button, Field } from '@/src/components/ui';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from '@/src/data/demo';
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';

export default function AdminLoginScreen() {
  const { loginAdmin, adminLoading, isAdmin, cloudEnabled } = useStore();
  const [email, setEmail] = useState(cloudEnabled ? '' : DEMO_ADMIN_EMAIL);
  const [password, setPassword] = useState(cloudEnabled ? '' : DEMO_ADMIN_PASSWORD);

  useEffect(() => {
    if (isAdmin) router.replace('/admin');
  }, [isAdmin]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Preencha os dados', 'Informe o e-mail e a senha.');
      return;
    }

    try {
      await loginAdmin(email, password);
      router.replace('/admin');
    } catch (error) {
      Alert.alert(
        'Acesso não autorizado',
        error instanceof Error ? error.message : 'Confira os dados e tente novamente.',
      );
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader compact title="Área administrativa" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Image
            source={require('@/assets/images/joedla-logo.png')}
            contentFit="contain"
            style={styles.logo}
          />
          <Text style={styles.title}>Acesso da loja</Text>
          <Text style={styles.subtitle}>
            Entre para cadastrar produtos, controlar estoque e acompanhar pedidos.
          </Text>

          {!cloudEnabled ? (
            <View style={styles.demoCard}>
              <Ionicons name="flask-outline" size={22} color={colors.warning} />
              <View style={styles.demoText}>
                <Text style={styles.demoTitle}>Modo demonstração</Text>
                <Text style={styles.demoDescription}>
                  Os dados de teste já estão preenchidos. Depois, a conexão online substituirá este acesso.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.form}>
            <Field
              label="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="E-mail da administradora"
              value={email}
            />
            <Field
              label="Senha"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Digite a senha"
              secureTextEntry
              value={password}
            />
            <Button loading={adminLoading} onPress={handleLogin}>
              Entrar no painel
            </Button>
          </View>

          {!cloudEnabled ? (
            <View style={styles.credentials}>
              <Text style={styles.credentialsTitle}>Acesso de teste</Text>
              <Text style={styles.credentialsText}>E-mail: {DEMO_ADMIN_EMAIL}</Text>
              <Text style={styles.credentialsText}>Senha: {DEMO_ADMIN_PASSWORD}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'stretch',
  },
  logo: {
    width: 210,
    height: 170,
    alignSelf: 'center',
  },
  title: {
    marginTop: -8,
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    maxWidth: 340,
    marginTop: spacing.sm,
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  demoCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
  },
  demoText: {
    flex: 1,
    gap: 4,
  },
  demoTitle: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900',
  },
  demoDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  credentials: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    gap: 4,
    backgroundColor: colors.surface,
  },
  credentialsTitle: {
    marginBottom: 3,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  credentialsText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
