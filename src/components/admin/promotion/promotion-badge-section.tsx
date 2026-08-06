import { Ionicons } from '@expo/vector-icons';
import type { RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  PromotionBadgePosition,
  PromotionBadgeShape,
  PromotionBadgeSize,
} from '@/src/components/admin/promotion-preview';
import type { CampaignBadgeTone } from '@/src/features/marketing/types';
import { colors, radii, spacing } from '@/src/theme';

import { PromotionSectionCard } from './promotion-section-card';

const BADGE_TONES: {
  value: CampaignBadgeTone;
  label: string;
  color: string;
}[] = [
  { value: 'wine', label: 'Vinho', color: '#6F243A' },
  { value: 'caramel', label: 'Caramelo', color: '#A66A3F' },
  { value: 'dark', label: 'Escuro', color: '#2C2522' },
  { value: 'success', label: 'Verde', color: '#2D6A4F' },
  { value: 'attention', label: 'Atenção', color: '#A44A1F' },
];

type PromotionBadgeSectionProps = {
  open: boolean;
  onToggle: () => void;
  showBadge: boolean;
  badgeLabel: string;
  badgeTone: CampaignBadgeTone;
  badgePosition: PromotionBadgePosition;
  badgeSize: PromotionBadgeSize;
  badgeShape: PromotionBadgeShape;
  error?: string;
  badgeLabelRef: RefObject<TextInput | null>;
  onShowBadgeChange: (value: boolean) => void;
  onBadgeLabelChange: (value: string) => void;
  onBadgeToneChange: (value: CampaignBadgeTone) => void;
  onBadgePositionChange: (value: PromotionBadgePosition) => void;
  onBadgeSizeChange: (value: PromotionBadgeSize) => void;
  onBadgeShapeChange: (value: PromotionBadgeShape) => void;
};

export function PromotionBadgeSection({
  open,
  onToggle,
  showBadge,
  badgeLabel,
  badgeTone,
  badgePosition,
  badgeSize,
  badgeShape,
  error,
  badgeLabelRef,
  onShowBadgeChange,
  onBadgeLabelChange,
  onBadgeToneChange,
  onBadgePositionChange,
  onBadgeSizeChange,
  onBadgeShapeChange,
}: PromotionBadgeSectionProps) {
  return (
    <PromotionSectionCard
      icon="color-palette-outline"
      title="Selo promocional"
      description="Personalize a identificação exibida sobre o produto."
      open={open}
      onToggle={onToggle}>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>
            Exibir selo
          </Text>

          <Text style={styles.switchDescription}>
            O selo aparece nos cards e na página do produto.
          </Text>
        </View>

        <Switch
          value={showBadge}
          onValueChange={onShowBadgeChange}
          trackColor={{
            false: colors.border,
            true: colors.primarySoft,
          }}
          thumbColor={
            showBadge ? colors.primary : colors.textMuted
          }
        />
      </View>

      {showBadge ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Texto do selo
            </Text>

            <TextInput
              ref={badgeLabelRef}
              value={badgeLabel}
              onChangeText={onBadgeLabelChange}
              maxLength={24}
              placeholder="Promoção"
              style={[
                styles.input,
                error && styles.inputError,
              ]}
            />

            <Text style={styles.characterCount}>
              {badgeLabel.length}/24
            </Text>

            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>
            Cor do selo
          </Text>

          <View style={styles.toneGrid}>
            {BADGE_TONES.map((tone) => {
              const selected = tone.value === badgeTone;

              return (
                <Pressable
                  key={tone.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    onBadgeToneChange(tone.value)
                  }
                  style={({ pressed }) => [
                    styles.toneOption,
                    selected && styles.toneOptionSelected,
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.toneDot,
                      { backgroundColor: tone.color },
                    ]}
                  />

                  <Text
                    style={[
                      styles.toneLabel,
                      selected && styles.toneLabelSelected,
                    ]}>
                    {tone.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.visualDivider} />

          <View style={styles.visualControlGroup}>
            <Text style={styles.fieldLabel}>
              Posição do selo
            </Text>

            <View style={styles.positionGrid}>
              <VisualOption
                icon="arrow-up-outline"
                label="Superior esquerda"
                selected={badgePosition === 'top-left'}
                onPress={() =>
                  onBadgePositionChange('top-left')
                }
              />

              <VisualOption
                icon="arrow-up-outline"
                label="Superior direita"
                selected={badgePosition === 'top-right'}
                onPress={() =>
                  onBadgePositionChange('top-right')
                }
              />

              <VisualOption
                icon="arrow-down-outline"
                label="Inferior esquerda"
                selected={badgePosition === 'bottom-left'}
                onPress={() =>
                  onBadgePositionChange('bottom-left')
                }
              />

              <VisualOption
                icon="arrow-down-outline"
                label="Inferior direita"
                selected={badgePosition === 'bottom-right'}
                onPress={() =>
                  onBadgePositionChange('bottom-right')
                }
              />
            </View>
          </View>

          <View style={styles.visualControlGroup}>
            <Text style={styles.fieldLabel}>
              Tamanho
            </Text>

            <View style={styles.segmentedControl}>
              <SegmentOption
                label="Pequeno"
                selected={badgeSize === 'small'}
                onPress={() => onBadgeSizeChange('small')}
              />
              <SegmentOption
                label="Médio"
                selected={badgeSize === 'medium'}
                onPress={() => onBadgeSizeChange('medium')}
              />
              <SegmentOption
                label="Grande"
                selected={badgeSize === 'large'}
                onPress={() => onBadgeSizeChange('large')}
              />
            </View>
          </View>

          <View style={styles.visualControlGroup}>
            <Text style={styles.fieldLabel}>
              Formato
            </Text>

            <View style={styles.segmentedControl}>
              <SegmentOption
                label="Pílula"
                selected={badgeShape === 'pill'}
                onPress={() => onBadgeShapeChange('pill')}
              />
              <SegmentOption
                label="Arredondado"
                selected={badgeShape === 'rounded'}
                onPress={() =>
                  onBadgeShapeChange('rounded')
                }
              />
              <SegmentOption
                label="Reto"
                selected={badgeShape === 'square'}
                onPress={() => onBadgeShapeChange('square')}
              />
            </View>
          </View>

          <View style={styles.previewNotice}>
            <Ionicons
              name="eye-outline"
              size={18}
              color={colors.info}
            />

            <Text style={styles.previewNoticeText}>
              Estas opções alteram a pré-visualização em tempo
              real. A persistência no banco será ligada na próxima
              etapa.
            </Text>
          </View>
        </>
      ) : null}
    </PromotionSectionCard>
  );
}

function VisualOption({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.visualOption,
        selected && styles.visualOptionSelected,
        pressed && styles.pressed,
      ]}>
      <Ionicons
        name={icon}
        size={18}
        color={selected ? colors.primary : colors.textMuted}
      />

      <Text
        style={[
          styles.visualOptionText,
          selected && styles.visualOptionTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SegmentOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentOption,
        selected && styles.segmentOptionSelected,
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.segmentOptionText,
          selected && styles.segmentOptionTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  switchCopy: {
    flex: 1,
  },

  switchTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  switchDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  fieldGroup: {
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

  characterCount: {
    alignSelf: 'flex-end',
    color: colors.textMuted,
    fontSize: 10,
  },

  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  toneOption: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  toneOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceWarm,
  },

  toneDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },

  toneLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },

  toneLabelSelected: {
    color: colors.text,
  },

  visualDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  visualControlGroup: {
    gap: spacing.sm,
  },

  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  visualOption: {
    minWidth: 180,
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },

  visualOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceWarm,
  },

  visualOptionText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },

  visualOptionTextSelected: {
    color: colors.text,
  },

  segmentedControl: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    flexDirection: 'row',
    backgroundColor: colors.surface,
  },

  segmentOption: {
    minHeight: 42,
    flex: 1,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentOptionSelected: {
    backgroundColor: colors.primary,
  },

  segmentOptionText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },

  segmentOptionTextSelected: {
    color: colors.white,
  },

  previewNotice: {
    padding: spacing.md,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
  },

  previewNoticeText: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    lineHeight: 17,
  },

  pressed: {
    opacity: 0.72,
  },
});
