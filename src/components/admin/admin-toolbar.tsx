import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
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
  const showSearch =
    typeof searchValue === 'string' &&
    typeof onChangeSearch === 'function';

  return (
    <View style={[styles.toolbar, style]}>
      <View style={styles.leftArea}>
        {showSearch ? (
          <View style={styles.search}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.textMuted}
            />

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
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}>
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {left ? (
          <View style={styles.leftContent}>
            {left}
          </View>
        ) : null}
      </View>

      {right ? (
        <View style={styles.rightArea}>
          {right}
        </View>
      ) : null}
    </View>
  );
}

type AdminToolbarButtonProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function AdminToolbarButton({
  label,
  icon,
  onPress,
  variant = 'secondary',
  disabled = false,
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
      ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={
            variant === 'secondary'
              ? '#7D4D1E'
              : colors.white
          }
        />
      ) : null}

      <Text
        style={[
          styles.buttonText,
          variant === 'primary' &&
            styles.buttonTextPrimary,
          variant === 'danger' &&
            styles.buttonTextPrimary,
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

export function AdminFilterChip({
  label,
  active = false,
  onPress,
}: AdminFilterChipProps) {
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
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    minHeight: 54,
    padding: spacing.sm,
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

  leftArea: {
    minWidth: 220,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  search: {
    minWidth: 220,
    maxWidth: 420,
    minHeight: 38,
    flex: 1,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8F3ED',
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
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C1AE',
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#F7EEE5',
  },

  buttonPrimary: {
    borderColor: '#9D5F1D',
    backgroundColor: '#9D5F1D',
  },

  buttonDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  buttonText: {
    color: '#7D4D1E',
    fontSize: 10,
    fontWeight: '900',
  },

  buttonTextPrimary: {
    color: colors.white,
  },

  filterChip: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D8C8B7',
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFC',
  },

  filterChipActive: {
    borderColor: '#9D5F1D',
    backgroundColor: '#F1E1CF',
  },

  filterChipText: {
    color: '#88776B',
    fontSize: 9,
    fontWeight: '800',
  },

  filterChipTextActive: {
    color: '#7D4D1E',
  },

  pressed: {
    opacity: 0.68,
  },
});