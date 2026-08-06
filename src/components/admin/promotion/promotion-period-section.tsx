import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';

import { PromotionSectionCard } from './promotion-section-card';

type PromotionPeriodSectionProps = {
  open: boolean;
  onToggle: () => void;
  startDate: string;
  endDate: string;
  startDateError?: string;
  endDateError?: string;
  startDateRef: React.RefObject<TextInput | null>;
  endDateRef: React.RefObject<TextInput | null>;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function PromotionPeriodSection({
  open,
  onToggle,
  startDate,
  endDate,
  startDateError,
  endDateError,
  startDateRef,
  endDateRef,
  onStartDateChange,
  onEndDateChange,
}: PromotionPeriodSectionProps) {
  return (
    <PromotionSectionCard
      icon="calendar-outline"
      title="Período"
      description="As datas são opcionais. Sem datas, a promoção fica ativa continuamente."
      open={open}
      onToggle={onToggle}>
      <View style={styles.twoColumns}>
        <View style={styles.flexField}>
          <Text style={styles.fieldLabel}>
            Data inicial
          </Text>

          <TextInput
            ref={startDateRef}
            value={startDate}
            onChangeText={onStartDateChange}
            placeholder="dd/mm/aaaa"
            keyboardType="numeric"
            style={[
              styles.input,
              startDateError && styles.inputError,
            ]}
          />

          {startDateError ? (
            <Text style={styles.errorText}>
              {startDateError}
            </Text>
          ) : null}
        </View>

        <View style={styles.flexField}>
          <Text style={styles.fieldLabel}>
            Data final
          </Text>

          <TextInput
            ref={endDateRef}
            value={endDate}
            onChangeText={onEndDateChange}
            placeholder="dd/mm/aaaa"
            keyboardType="numeric"
            style={[
              styles.input,
              endDateError && styles.inputError,
            ]}
          />

          {endDateError ? (
            <Text style={styles.errorText}>
              {endDateError}
            </Text>
          ) : null}
        </View>
      </View>
    </PromotionSectionCard>
  );
}

const styles = StyleSheet.create({
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  flexField: {
    minWidth: 220,
    flex: 1,
    gap: spacing.sm,
  },

  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 14,
  },

  inputError: {
    borderColor: colors.danger,
  },

  errorText: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },
});
