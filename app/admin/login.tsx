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
import { useStore } from '@/src/context/store-context';
import { colors, radii, spacing } from '@/src/theme';
import { isValidEmail, normalizeEmail } from '@/src/utils/fields';

export default function AdminLoginScreen() {
  const { loginAdmin, adminLoading, isAdmin, cloudEnabled } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAdmin) router.replace('/admin');
  }, [isAdmin]);

  async function handleLogin() {
    if (!isValidEmail(email) || !password || password.length > 128) {
      Alert.alert('Revise os dados', 'Informe um e-mail válido e a senha.');
      return;
    }

    try {
      await loginAdmin(normalizeEmail(email), password);
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
      <AppHeader compact title="Área administrativa" showBack showStoreHome />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator>
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
            <View style={styles.connectionCard}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
              <View style={styles.connectionText}>
                <Text style={styles.connectionTitle}>Conexão online indisponível</Text>
                <Text style={styles.connectionDescription}>
                  O painel permanece bloqueado até a conexão segura com o banco ser restaurada.
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
              maxLength={254}
            />
            <Field
              label="Senha"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Digite a senha"
              secureTextEntry
              value={password}
              maxLength={128}
            />
            <Button disabled={!cloudEnabled} loading={adminLoading} onPress={handleLogin}>
              Entrar no painel
            </Button>
          </View>
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
  connectionCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
  },
  connectionText: {
    flex: 1,
    gap: 4,
  },
  connectionTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  connectionDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
});
