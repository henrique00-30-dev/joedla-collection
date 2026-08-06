import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';

type PromotionEditorActionsProps = {
  saving: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function PromotionEditorActions({
  saving,
  loading,
  onCancel,
  onSave,
}: PromotionEditorActionsProps) {
  const disabled = saving || loading;

  return (
    <View style={styles.footerActions}>
      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={onCancel}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.cancelButtonText}>
          Cancelar
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveButton,
          disabled && styles.disabledButton,
          pressed && styles.pressed,
        ]}>
        <Ionicons
          name="checkmark-outline"
          size={20}
          color={colors.white}
        />

        <Text style={styles.saveButtonText}>
          {saving ? 'Salvando...' : 'Salvar promoção'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  cancelButton: {
    minHeight: 46,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  cancelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  saveButton: {
    minHeight: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.72,
  },
});
