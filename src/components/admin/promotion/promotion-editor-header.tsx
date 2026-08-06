import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';

type PromotionEditorHeaderProps = {
  isNew: boolean;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
};

export function PromotionEditorHeader({
  isNew,
  enabled,
  onEnabledChange,
}: PromotionEditorHeaderProps) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        <Text style={styles.pageTitle}>
          {isNew
            ? 'Criar promoção individual'
            : 'Editar promoção individual'}
        </Text>

        <Text style={styles.pageSubtitle}>
          Configure o preço, o período e o selo sem precisar criar
          uma campanha visual.
        </Text>
      </View>

      <View style={styles.statusControl}>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>
            Promoção ativa
          </Text>

          <Text style={styles.statusDescription}>
            Controla a aplicação do preço no site.
          </Text>
        </View>

        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{
            false: colors.border,
            true: colors.primarySoft,
          }}
          thumbColor={
            enabled ? colors.primary : colors.textMuted
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  pageHeaderCopy: {
    minWidth: 260,
    flex: 1,
  },

  pageTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },

  pageSubtitle: {
    marginTop: spacing.xs,
    maxWidth: 700,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },

  statusControl: {
    minWidth: 280,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },

  statusCopy: {
    flex: 1,
  },

  statusTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  statusDescription: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
});
