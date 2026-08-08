import { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const phone = width < 600;

  return (
    <View style={[styles.section, style]}>
      <View style={[styles.header, phone && styles.headerPhone]}>
        <View style={[styles.copy, phone && styles.copyPhone]}>
          <Text style={styles.title}>{title}</Text>

          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>

        {action ? (
          <View style={[styles.action, phone && styles.actionPhone]}>
            {action}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    gap: spacing.md,
  },
  header: {
    width: '100%',
    minWidth: 0,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  headerPhone: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  copy: {
    minWidth: 0,
    flexBasis: 220,
    flexGrow: 1,
    flexShrink: 1,
  },
  copyPhone: {
    width: '100%',
    flexBasis: 'auto',
    flexGrow: 0,
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
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionPhone: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  body: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    gap: spacing.md,
  },
});
