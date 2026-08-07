import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { shadow, spacing } from '@/src/theme';

type AdminCardProps = {
  title?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
  children?: ReactNode;
  onPress?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AdminCard({
  title,
  description,
  icon,
  action,
  children,
  onPress,
  compact = false,
  style,
}: AdminCardProps) {
  const content = (
    <>
      {title || description || icon || action ? (
        <View style={styles.header}>
          <View style={styles.headerMain}>
            {icon ? (
              <View
                style={[
                  styles.icon,
                  compact && styles.iconCompact,
                ]}>
                <Ionicons
                  name={icon}
                  size={compact ? 16 : 19}
                  color="#9D5F1D"
                />
              </View>
            ) : null}

            <View style={styles.copy}>
              {title ? (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.title,
                    compact && styles.titleCompact,
                  ]}>
                  {title}
                </Text>
              ) : null}

              {description ? (
                <Text
                  numberOfLines={3}
                  style={styles.description}>
                  {description}
                </Text>
              ) : null}
            </View>
          </View>

          {action ? (
            <View style={styles.action}>
              {action}
            </View>
          ) : null}
        </View>
      ) : null}

      {children ? (
        <View
          style={[
            styles.body,
            compact && styles.bodyCompact,
          ]}>
          {children}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          style,
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        style,
      ]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#DED2C7',
    borderRadius: 14,
    backgroundColor: '#FFFDFC',
    ...shadow,
  },

  cardCompact: {
    padding: spacing.md,
    borderRadius: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  headerMain: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6ECE0',
  },

  iconCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  copy: {
    minWidth: 0,
    flex: 1,
  },

  title: {
    color: '#2C211A',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },

  titleCompact: {
    fontSize: 12,
    lineHeight: 17,
  },

  description: {
    marginTop: 3,
    color: '#88776B',
    fontSize: 10,
    lineHeight: 15,
  },

  action: {
    flexShrink: 0,
  },

  body: {
    marginTop: spacing.lg,
  },

  bodyCompact: {
    marginTop: spacing.md,
  },

  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.995 }],
  },
});