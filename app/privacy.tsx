import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { colors, radii, spacing } from '@/src/theme';

export default function PrivacyScreen() {
  return (
    <Screen>
      <AppHeader compact title="Privacidade e segurança" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Seus dados são usados somente para atender seu pedido.</Text>
          <Text style={styles.text}>
            Carrinho e favoritos ficam salvos apenas neste aparelho quando você compra como visitante. Dados de contato, endereço e pagamento são enviados somente para processar e acompanhar a compra.
          </Text>
          <Text style={styles.subtitle}>Compra sem conta</Text>
          <Text style={styles.text}>Você pode navegar e finalizar pedidos sem criar usuário ou senha.</Text>
          <Text style={styles.subtitle}>Atendimento</Text>
          <Text style={styles.text}>Em caso de dúvida, fale diretamente com a Joedla Collection pelos canais informados na loja.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, padding: spacing.lg, alignSelf: 'center' },
  card: { padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.large, gap: spacing.md, backgroundColor: colors.surface },
  title: { color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '900' },
  subtitle: { marginTop: spacing.sm, color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, lineHeight: 22 },
});
