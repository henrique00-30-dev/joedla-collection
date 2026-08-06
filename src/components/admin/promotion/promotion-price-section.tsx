import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/format';

import { PromotionSectionCard } from './promotion-section-card';

type PromotionPriceSectionProps = {
  open: boolean;
  onToggle: () => void;
  hasSelectedProduct: boolean;
  originalPrice: number;
  promotionalPrice: string;
  discountInput: string;
  discountPercentage: number;
  error?: string;
  priceRef: React.RefObject<TextInput | null>;
  onPromotionalPriceChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
};

export function PromotionPriceSection({
  open,
  onToggle,
  hasSelectedProduct,
  originalPrice,
  promotionalPrice,
  discountInput,
  discountPercentage,
  error,
  priceRef,
  onPromotionalPriceChange,
  onDiscountChange,
}: PromotionPriceSectionProps) {
  return (
    <PromotionSectionCard
      icon="pricetag-outline"
      title="Preço promocional"
      description="Defina o novo valor e acompanhe o desconto calculado."
      open={open}
      onToggle={onToggle}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          Preço normal
        </Text>

        <View style={styles.readonlyField}>
          <Text style={styles.readonlyText}>
            {hasSelectedProduct
              ? formatCurrency(originalPrice)
              : 'Selecione um produto'}
          </Text>
        </View>
      </View>

      <View style={styles.priceEditorRow}>
        <View style={styles.priceEditorField}>
          <Text style={styles.fieldLabel}>
            Preço promocional
          </Text>

          <TextInput
            ref={priceRef}
            value={promotionalPrice}
            onChangeText={onPromotionalPriceChange}
            placeholder="Ex.: 199,90"
            keyboardType="decimal-pad"
            style={[
              styles.input,
              error && styles.inputError,
            ]}
          />
        </View>

        <View style={styles.discountEditorField}>
          <Text style={styles.fieldLabel}>
            Desconto
          </Text>

          <View
            style={[
              styles.percentageInputWrap,
              error && styles.inputError,
            ]}>
            <TextInput
              value={discountInput}
              onChangeText={onDiscountChange}
              placeholder="13"
              keyboardType="number-pad"
              maxLength={2}
              style={styles.percentageInput}
            />

            <Text style={styles.percentageSuffix}>
              %
            </Text>
          </View>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <View style={styles.discountBox}>
        <Ionicons
          name="swap-horizontal-outline"
          size={21}
          color={colors.success}
        />

        <View style={styles.discountBoxCopy}>
          <Text style={styles.discountTitle}>
            Campos sincronizados
          </Text>

          <Text style={styles.discountDescription}>
            Altere o preço ou a porcentagem. O outro campo será
            calculado automaticamente.
          </Text>
        </View>

        <Text style={styles.discountValue}>
          {discountPercentage > 0
            ? `${discountPercentage}%`
            : '—'}
        </Text>
      </View>
    </PromotionSectionCard>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.sm,
  },

  fieldLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  priceEditorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  priceEditorField: {
    minWidth: 220,
    flex: 1,
    gap: spacing.sm,
  },

  discountEditorField: {
    width: 145,
    gap: spacing.sm,
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

  readonlyField: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },

  readonlyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  percentageInputWrap: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },

  percentageInput: {
    minWidth: 0,
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },

  percentageSuffix: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },

  errorText: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 16,
  },

  discountBox: {
    padding: spacing.md,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successSoft,
  },

  discountBoxCopy: {
    flex: 1,
  },

  discountTitle: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },

  discountDescription: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  discountValue: {
    marginTop: 2,
    color: colors.success,
    fontSize: 18,
    fontWeight: '900',
  },
});
