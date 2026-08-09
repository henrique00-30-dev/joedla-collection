import { StyleSheet, Text, TextInput, View } from 'react-native';

import { StructuredField } from '@/src/components/structured-field';
import { spacing } from '@/src/theme';

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
          <StructuredField
            ref={startDateRef}
            kind="date"
            label="Data inicial"
            value={startDate}
            onChangeText={onStartDateChange}
            placeholder="DD/MM/AAAA"
            error={startDateError}
          />
        </View>

        <View style={styles.flexField}>
          <StructuredField
            ref={endDateRef}
            kind="date"
            label="Data final"
            value={endDate}
            onChangeText={onEndDateChange}
            placeholder="DD/MM/AAAA"
            error={endDateError}
          />
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
  },
});
