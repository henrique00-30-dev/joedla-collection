import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/src/components/app-header';
import { Screen } from '@/src/components/screen';
import { colors, radii, spacing } from '@/src/theme';

const steps = [
  {
    icon: 'search-outline' as const,
    title: '1. Escolha os produtos',
    text: 'Navegue pelas categorias, selecione tamanho, cor e quantidade.',
  },
  {
    icon: 'bag-handle-outline' as const,
    title: '2. Monte o carrinho',
    text: 'Confira os itens e avance para informar seus dados.',
  },
  {
    icon: 'location-outline' as const,
    title: '3. Escolha a entrega',
    text: 'Em Rosário do Catete, a entrega é grátis. Também é possível retirar.',
  },
  {
    icon: 'logo-whatsapp' as const,
    title: '4. Confirme pelo WhatsApp',
    text: 'Envie o pedido para combinar Pix, link de cartão ou outra forma de pagamento.',
  },
];

export default function HowToBuyScreen() {
  return (
    <Screen>
      <AppHeader compact title="Como comprar" showBack />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Comprar na Joedla Collection é simples e não exige cadastro.
        </Text>
        {steps.map((step) => (
          <View key={step.title} style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name={step.icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.text}</Text>
            </View>
          </View>
        ))}
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Outras cidades</Text>
          <Text style={styles.noteText}>
            O valor, a forma e o prazo de entrega são combinados diretamente pelo WhatsApp.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  intro: {
    paddingVertical: spacing.md,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  note: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.medium,
    backgroundColor: colors.warningSoft,
  },
  noteTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  noteText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
