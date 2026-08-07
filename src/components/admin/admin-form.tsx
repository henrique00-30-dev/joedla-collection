import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/src/theme';

type AdminFormSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AdminFormSection({ title, description, children, style }: AdminFormSectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title || description ? (
        <View style={styles.sectionHeader}>
          {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
          {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
        </View>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

type AdminFormGridProps = { children: ReactNode; style?: StyleProp<ViewStyle> };

export function AdminFormGrid({ children, style }: AdminFormGridProps) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

type AdminFieldProps = TextInputProps & {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

export function AdminField({
  label,
  helper,
  error,
  required = false,
  icon,
  containerStyle,
  fullWidth = false,
  multiline,
  editable = true,
  style,
  ...inputProps
}: AdminFieldProps) {
  return (
    <View style={[styles.field, fullWidth && styles.fullWidth, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.required}>Obrigatório</Text> : null}
      </View>

      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          error && styles.inputWrapError,
          !editable && styles.inputWrapDisabled,
        ]}>
        {icon ? <Ionicons name={icon} size={16} color={error ? colors.danger : colors.textMuted} /> : null}
        <TextInput
          {...inputProps}
          editable={editable}
          multiline={multiline}
          placeholderTextColor="#AA9B90"
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

type AdminSelectOption = { label: string; value: string };
type AdminSelectProps = {
  label: string;
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AdminSelect({
  label,
  value,
  options,
  onChange,
  helper,
  error,
  required = false,
  fullWidth = false,
  containerStyle,
}: AdminSelectProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  function selectNext() {
    if (!options.length) return;
    const currentIndex = options.findIndex((option) => option.value === value);
    const nextIndex = currentIndex < 0 || currentIndex === options.length - 1 ? 0 : currentIndex + 1;
    onChange(options[nextIndex].value);
  }

  return (
    <View style={[styles.field, fullWidth && styles.fullWidth, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.required}>Obrigatório</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? ''}`}
        onPress={selectNext}
        style={({ pressed }) => [styles.select, error && styles.inputWrapError, pressed && styles.pressed]}>
        <Text style={styles.selectText}>{selected?.label ?? 'Selecionar'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

type AdminSwitchFieldProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminSwitchField({ label, description, value, onChange, icon, disabled = false, style }: AdminSwitchFieldProps) {
  return (
    <View style={[styles.switchField, disabled && styles.switchFieldDisabled, style]}>
      <View style={styles.switchMain}>
        {icon ? <View style={styles.switchIcon}><Ionicons name={icon} size={18} color="#9D5F1D" /></View> : null}
        <View style={styles.switchCopy}>
          <Text style={styles.switchLabel}>{label}</Text>
          {description ? <Text style={styles.switchDescription}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: '#D8CCC0', true: '#C99A63' }}
        thumbColor={value ? '#8B541B' : '#F7F1EB'}
      />
    </View>
  );
}

type AdminChoiceProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

export function AdminChoice({ label, description, selected, onPress, icon, disabled = false }: AdminChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        disabled && styles.choiceDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      {icon ? (
        <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
          <Ionicons name={icon} size={18} color={selected ? colors.white : '#9D5F1D'} />
        </View>
      ) : null}
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {description ? <Text style={styles.choiceDescription}>{description}</Text> : null}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? '#9D5F1D' : '#AA9B90'} />
    </Pressable>
  );
}

type AdminFormActionsProps = { children: ReactNode; style?: StyleProp<ViewStyle> };

export function AdminFormActions({ children, style }: AdminFormActionsProps) {
  return <View style={[styles.formActions, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { padding: spacing.lg, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 14, backgroundColor: '#FFFDFC' },
  sectionHeader: { marginBottom: spacing.lg },
  sectionTitle: { color: '#2C211A', fontSize: 15, fontWeight: '900' },
  sectionDescription: { maxWidth: 720, marginTop: 4, color: '#88776B', fontSize: 10, lineHeight: 16 },
  sectionBody: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { minWidth: 220, flexBasis: '47%', flexGrow: 1 },
  fullWidth: { width: '100%', minWidth: 0, flexBasis: 'auto', flexGrow: 0, flexShrink: 0 },
  labelRow: { minHeight: 22, marginBottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: '#493A30', fontSize: 10, fontWeight: '900' },
  required: { color: '#9D5F1D', fontSize: 7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { minHeight: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FCF9F6' },
  inputWrapMultiline: { minHeight: 110, alignItems: 'flex-start', paddingVertical: spacing.sm },
  inputWrapError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  inputWrapDisabled: { opacity: 0.55, backgroundColor: '#F2ECE6' },
  input: { minWidth: 0, flex: 1, paddingVertical: 0, color: '#2C211A', fontSize: 11, outlineStyle: 'none' as never },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  helper: { marginTop: 4, color: '#88776B', fontSize: 8, lineHeight: 12 },
  error: { marginTop: 4, color: colors.danger, fontSize: 8, lineHeight: 12, fontWeight: '700' },
  select: { minHeight: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#D8C8B7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: '#FCF9F6' },
  selectText: { minWidth: 0, flex: 1, color: '#2C211A', fontSize: 11 },
  switchField: { minHeight: 68, padding: spacing.md, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: '#FCF9F6' },
  switchFieldDisabled: { opacity: 0.5 },
  switchMain: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECE0' },
  switchCopy: { minWidth: 0, flex: 1 },
  switchLabel: { color: '#2C211A', fontSize: 11, fontWeight: '900' },
  switchDescription: { marginTop: 3, color: '#88776B', fontSize: 9, lineHeight: 13 },
  choice: { minHeight: 66, padding: spacing.md, borderWidth: 1, borderColor: '#DED2C7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#FFFDFC' },
  choiceSelected: { borderColor: '#9D5F1D', backgroundColor: '#FBF1E6' },
  choiceDisabled: { opacity: 0.5 },
  choiceIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECE0' },
  choiceIconSelected: { backgroundColor: '#9D5F1D' },
  choiceCopy: { minWidth: 0, flex: 1 },
  choiceLabel: { color: '#2C211A', fontSize: 11, fontWeight: '900' },
  choiceDescription: { marginTop: 3, color: '#88776B', fontSize: 9, lineHeight: 13 },
  formActions: { marginTop: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: '#E9DFD6', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
  pressed: { opacity: 0.72 },
});
