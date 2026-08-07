import { ReactNode } from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { spacing } from '@/src/theme';

type AdminSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AdminSection({
  title,
  description,
  action,
  children,
  style,
}: AdminSectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {title}
          </Text>

          {description ? (
            <Text style={styles.description}>
              {description}
            </Text>
          ) : null}
        </View>

        {action ? (
          <View style={styles.action}>
            {action}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },

  header: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },

  copy: {
    flex: 1,
    minWidth: 220,
  },

  title: {
    color: '#2C211A',
    fontSize: 18,
    fontWeight: '900',
  },

  description: {
    marginTop: 4,
    color: '#88776B',
    fontSize: 11,
    lineHeight: 17,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  body: {
    gap: spacing.md,
  },
});