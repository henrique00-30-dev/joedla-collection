import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { colors, fonts, shadow, spacing } from '@/src/theme';

export default function PrivacyScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  return (
    <Screen>
      <AppHeader
        compact
        title="Privacidade e segurança"
        showBack
        showStoreHome
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          desktop && styles.contentDesktop,
        ]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TRANSPARÊNCIA</Text>
          <Text style={styles.title}>
            Sua privacidade é prioridade
          </Text>
          <Text style={styles.lead}>
            Coletamos apenas as informações necessárias para atender
            seu pedido com segurança.
          </Text>
        </View>

        <Section
          icon="shield-checkmark-outline"
          title="Seus dados"
          text="Carrinho e favoritos ficam salvos apenas neste aparelho quando você compra como visitante. Dados de contato, endereço e pagamento são utilizados somente para processar e acompanhar a compra."
        />

        <Section
          icon="person-outline"
          title="Compra sem conta"
          text="Você pode navegar e finalizar pedidos sem criar usuário ou senha."
        />

        <Section
          icon="chatbubbles-outline"
          title="Atendimento"
          text="Em caso de dúvida, fale diretamente com a Joedla Collection pelos canais informados na loja."
        />
      </ScrollView>
    </Screen>
  );
}

function Section({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  contentDesktop: {
    maxWidth: 900,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  title: {
    marginTop: spacing.sm,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  lead: {
    marginTop: spacing.md,
    maxWidth: 650,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  copy: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});