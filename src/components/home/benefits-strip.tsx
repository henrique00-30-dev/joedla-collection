import { Ionicons } from '@expo/vector-icons';
import {
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { colors, radii, shadow, spacing } from '@/src/theme';

type BenefitItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

const BENEFITS: BenefitItem[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Compra segura',
    text: 'Atendimento direto com a loja',
  },
  {
    icon: 'card-outline',
    title: 'Pagamento facilitado',
    text: 'Pix, link de pagamento e WhatsApp',
  },
  {
    icon: 'sparkles-outline',
    title: 'Seleção especial',
    text: 'Peças escolhidas com cuidado',
  },
  {
    icon: 'logo-whatsapp',
    title: 'Suporte próximo',
    text: 'Dúvidas respondidas no WhatsApp',
  },
];

export function BenefitsStrip() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  if (!desktop) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mobileContent}>
        {BENEFITS.map((benefit) => (
          <Benefit key={benefit.title} {...benefit} compact />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.desktopStrip}>
      {BENEFITS.map((benefit, index) => (
        <View
          key={benefit.title}
          style={styles.desktopItemWrap}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <Benefit {...benefit} />
        </View>
      ))}
    </View>
  );
}

function Benefit({
  icon,
  title,
  text,
  compact = false,
}: BenefitItem & {
  compact?: boolean;
}) {
  return (
    <View style={[styles.benefit, compact && styles.benefitCompact]}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>

        <Text numberOfLines={2} style={styles.text}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopStrip: {
    minHeight: 92,
    marginTop: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  desktopItemWrap: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
  },

  divider: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  mobileContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  benefit: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  benefitCompact: {
    width: 260,
    flex: undefined,
    borderWidth: 1,
    borderColor: 'rgba(111,76,56,0.12)',
    borderRadius: radii.large,
    backgroundColor: '#FFFEFC',
    ...shadow,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  copy: {
    minWidth: 0,
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  text: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },
});