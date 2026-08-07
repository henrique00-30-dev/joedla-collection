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

const steps = [
  {
    icon: 'search-outline' as const,
    number: '01',
    title: 'Escolha os produtos',
    text: 'Navegue pelas categorias, selecione tamanho, cor e quantidade.',
  },
  {
    icon: 'bag-handle-outline' as const,
    number: '02',
    title: 'Monte o carrinho',
    text: 'Confira os itens escolhidos e avance para informar seus dados.',
  },
  {
    icon: 'location-outline' as const,
    number: '03',
    title: 'Escolha a entrega',
    text: 'Em Rosário do Catete, a entrega é grátis. Também é possível retirar.',
  },
  {
    icon: 'logo-whatsapp' as const,
    number: '04',
    title: 'Confirme pelo WhatsApp',
    text: 'Envie o pedido para combinar Pix, link de cartão ou outra forma de pagamento.',
  },
];

export default function HowToBuyScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  return (
    <Screen>
      <AppHeader
        compact
        title="Como comprar"
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
            GUIA DE COMPRA
          </Text>

          <Text style={styles.pageTitle}>
            Comprar é simples
          </Text>

          <Text style={styles.intro}>
            Comprar na Joedla Collection não exige cadastro. Basta
            escolher os produtos e concluir o pedido.
          </Text>
        </View>

        <View
          style={[
            styles.stepsGrid,
            desktop && styles.stepsGridDesktop,
          ]}>
          {steps.map((step) => (
            <View key={step.number} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons
                    name={step.icon}
                    size={24}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.stepNumber}>
                  {step.number}
                </Text>
              </View>

              <View style={styles.text}>
                <Text style={styles.title}>
                  {step.title}
                </Text>

                <Text style={styles.description}>
                  {step.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <View style={styles.noteIcon}>
            <Ionicons
              name="map-outline"
              size={24}
              color={colors.warning}
            />
          </View>

          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>
              Outras cidades
            </Text>

            <Text style={styles.noteText}>
              O valor, a forma e o prazo de entrega são combinados
              diretamente pelo WhatsApp.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },

  contentDesktop: {
    maxWidth: 980,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignSelf: 'center',
  },

  pageHeader: {
    alignItems: 'center',
  },

  eyebrow: {
    color: '#9D6A2F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
  },

  pageTitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
  },

  intro: {
    maxWidth: 680,
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  stepsGrid: {
    gap: spacing.md,
  },

  stepsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  card: {
    minWidth: 280,
    minHeight: 210,
    flex: 1,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 22,
    justifyContent: 'space-between',
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  icon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  stepNumber: {
    color: 'rgba(139,69,28,0.22)',
    fontSize: 28,
    fontWeight: '900',
  },

  text: {
    marginTop: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  description: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  note: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(166,106,63,0.2)',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8EC',
  },

  noteIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningSoft,
  },

  noteCopy: {
    minWidth: 0,
    flex: 1,
  },

  noteTitle: {
    color: colors.warning,
    fontSize: 15,
    fontWeight: '900',
  },

  noteText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});