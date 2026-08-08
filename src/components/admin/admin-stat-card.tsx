import { Ionicons } from '@expo/vector-icons';
import {
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { colors, shadow, spacing } from '@/src/theme';

type AdminStatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminStatCard({
  icon,
  label,
  value,
  helper,
  tone = 'default',
  compact = false,
  style,
}: AdminStatCardProps) {
  const toneStyle = getToneStyle(tone);

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        style,
      ]}>
      <View style={styles.top}>
        <View
          style={[
            styles.icon,
            compact && styles.iconCompact,
            { backgroundColor: toneStyle.soft },
          ]}>
          <Ionicons
            name={icon}
            size={compact ? 16 : 19}
            color={toneStyle.main}
          />
        </View>

        <View
          style={[
            styles.toneDot,
            { backgroundColor: toneStyle.main },
          ]}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.value,
          compact && styles.valueCompact,
        ]}>
        {value}
      </Text>

      <Text style={styles.label}>
        {label}
      </Text>

      {helper ? (
        <Text
          numberOfLines={2}
          style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function getToneStyle(
  tone: AdminStatCardProps['tone'],
) {
  switch (tone) {
    case 'success':
      return {
        main: colors.success,
        soft: colors.successSoft,
      };

    case 'warning':
      return {
        main: colors.warning,
        soft: colors.warningSoft,
      };

    case 'danger':
      return {
        main: colors.danger,
        soft: colors.dangerSoft,
      };

    case 'info':
      return {
        main: colors.info,
        soft: colors.infoSoft,
      };

    default:
      return {
        main: '#9D5F1D',
        soft: '#F6ECE0',
      };
  }
}

const styles = StyleSheet.create({
  card: {
    minWidth: 170,
    minHeight: 122,
    flexGrow: 1,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 14,
    backgroundColor: '#FFFDFC',
    ...shadow,
  },

  cardCompact: {
    minHeight: 104,
    padding: spacing.md,
    borderRadius: 12,
  },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  toneDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  value: {
    marginTop: spacing.lg,
    color: '#2C211A',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },

  valueCompact: {
    marginTop: spacing.md,
    fontSize: 18,
    lineHeight: 22,
  },

  label: {
    marginTop: 2,
    color: '#493A30',
    fontSize: 11,
    fontWeight: '800',
  },

  helper: {
    marginTop: 3,
    color: '#88776B',
    fontSize: 9,
    lineHeight: 13,
  },
});