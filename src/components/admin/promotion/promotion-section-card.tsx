import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing } from '@/src/theme';

type PromotionSectionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export function PromotionSectionCard({
  icon,
  title,
  description,
  open,
  onToggle,
  children,
}: PromotionSectionCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Recolher' : 'Expandir'} ${title}`}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.pressed,
        ]}>
        <View style={styles.headerMain}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={icon}
              size={21}
              color={colors.primary}
            />
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>
              {title}
            </Text>

            <Text style={styles.description}>
              {description}
            </Text>
          </View>
        </View>

        <View style={styles.chevron}>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.content}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    ...shadow,
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  headerMain: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    fontSize: 18,
    fontWeight: '900',
  },

  description: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  chevron: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  content: {
    marginTop: spacing.lg,
    gap: spacing.lg,
  },

  pressed: {
    opacity: 0.72,
  },
});