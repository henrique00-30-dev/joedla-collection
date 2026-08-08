import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/src/theme';

type AdminToolbarProps = {
  searchValue?: string;
  searchPlaceholder?: string;
  onChangeSearch?: (value: string) => void;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AdminToolbar({
  searchValue,
  searchPlaceholder = 'Pesquisar...',
  onChangeSearch,
  left,
  right,
  style,
}: AdminToolbarProps) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const tablet = width >= 600 && width < 1024;
  const stack = width < 820;
  const showSearch =
    typeof searchValue === 'string' &&
    typeof onChangeSearch === 'function';

  return (
    <View style={[styles.toolbar, tablet && styles.toolbarTablet, phone && styles.toolbarPhone, style]}>
      <View style={[styles.leftArea, stack && styles.areaStacked]}>
        {showSearch ? (
          <View style={[styles.search, stack && styles.searchStacked]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              value={searchValue}
              onChangeText={onChangeSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor="#A99A8E"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            {searchValue ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpar pesquisa"
                hitSlop={8}
                onPress={() => onChangeSearch('')}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {left ? <View style={[styles.leftContent, stack && styles.contentStacked]}>{left}</View> : null}
      </View>
      {right ? <View style={[styles.rightArea, stack && styles.areaStacked]}>{right}</View> : null}
    </View>
  );
}

type AdminToolbarButtonProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminToolbarButton({
  label,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
}: AdminToolbarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={variant === 'secondary' ? '#7D4D1E' : colors.white}
        />
      ) : null}
      <Text
        numberOfLines={2}
        style={[
          styles.buttonText,
          variant === 'primary' && styles.buttonTextPrimary,
          variant === 'danger' && styles.buttonTextPrimary,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

type AdminFilterChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function AdminFilterChip({ label, active = false, onPress }: AdminFilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}>
      <Text
        numberOfLines={2}
        style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: '100%',
    minWidth: 0,
    minHeight: 60,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: '#FFFDFC',
  },
  toolbarTablet: {
    padding: 10,
  },
  toolbarPhone: {
    padding: 8,
  },
  leftArea: {
    minWidth: 0,
    flexBasis: 260,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rightArea: {
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  areaStacked: {
    width: '100%',
    flexBasis: '100%',
    justifyContent: 'flex-start',
  },
  leftContent: {
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contentStacked: {
    width: '100%',
  },
  search: {
    width: '100%',
    minWidth: 0,
    maxWidth: 420,
    minHeight: 42,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8F3ED',
  },
  searchStacked: {
    maxWidth: '100%',
  },
  input: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: '#2C211A',
    fontSize: 11,
    outlineStyle: 'none' as never,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C1AE',
    borderRadius: radii.pill,
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#F7EEE5',
  },
  buttonPrimary: { borderColor: '#9D5F1D', backgroundColor: '#9D5F1D' },
  buttonDanger: { borderColor: colors.danger, backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    minWidth: 0,
    flexShrink: 1,
    color: '#7D4D1E',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  buttonTextPrimary: { color: colors.white },
  filterChip: {
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D8C8B7',
    borderRadius: radii.pill,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFC',
  },
  filterChipActive: { borderColor: '#9D5F1D', backgroundColor: '#F1E1CF' },
  filterChipText: {
    flexShrink: 1,
    color: '#88776B',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  filterChipTextActive: { color: '#7D4D1E' },
  pressed: { opacity: 0.68 },
});
