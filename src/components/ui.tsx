import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/src/theme';
import { OrderStatus } from '@/src/types';
import { orderStatusLabel } from '@/src/utils/format';

type ButtonProps = PropsWithChildren<{
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}>;

export function Button({
  children,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
}: ButtonProps) {
  const isDisabled = loading || disabled;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={variant === 'primary' ? colors.white : colors.primary}
            />
          ) : null}
          <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
};

export function Field({ label, error, multiline, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.field, multiline && styles.fieldMultiline, style]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function QuantityStepper({
  value,
  onChange,
  maximum = 99,
}: {
  value: number;
  onChange: (value: number) => void;
  maximum?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel="Diminuir quantidade"
        disabled={value <= 1}
        onPress={() => onChange(value - 1)}
        style={styles.stepperButton}>
        <Ionicons
          name="remove"
          size={18}
          color={value <= 1 ? colors.border : colors.text}
        />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityLabel="Aumentar quantidade"
        disabled={value >= maximum}
        onPress={() => onChange(value + 1)}
        style={styles.stepperButton}>
        <Ionicons
          name="add"
          size={18}
          color={value >= maximum ? colors.border : colors.text}
        />
      </Pressable>
    </View>
  );
}

const statusStyles: Record<
  OrderStatus,
  { backgroundColor: string; color: string }
> = {
  pending: { backgroundColor: colors.warningSoft, color: colors.warning },
  confirmed: { backgroundColor: colors.infoSoft, color: colors.info },
  preparing: { backgroundColor: colors.surfaceWarm, color: colors.primary },
  ready: { backgroundColor: colors.successSoft, color: colors.success },
  out_for_delivery: { backgroundColor: colors.infoSoft, color: colors.info },
  completed: { backgroundColor: colors.successSoft, color: colors.success },
  cancelled: { backgroundColor: colors.dangerSoft, color: colors.danger },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const statusStyle = statusStyles[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
      <Text style={[styles.statusText, { color: statusStyle.color }]}>
        {orderStatusLabel[status]}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Button onPress={onAction} style={styles.emptyButton}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  button_danger: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buttonText_primary: {
    color: colors.white,
  },
  buttonText_secondary: {
    color: colors.primary,
  },
  buttonText_danger: {
    color: colors.danger,
  },
  buttonText_ghost: {
    color: colors.primary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  field: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  fieldMultiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
  },
  stepper: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.small,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 30,
    color: colors.text,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  empty: {
    flex: 1,
    minHeight: 380,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWarm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyMessage: {
    maxWidth: 320,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    minWidth: 180,
    marginTop: spacing.sm,
  },
});
