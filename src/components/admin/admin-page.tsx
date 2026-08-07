import { ReactNode } from 'react';
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    ViewStyle,
} from 'react-native';

import { fonts, spacing } from '@/src/theme';

type AdminPageProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
};

export function AdminPage({
  title,
  description,
  eyebrow,
  actions,
  children,
  maxWidth = 1320,
  contentStyle,
  scroll = true,
}: AdminPageProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;

  const content = (
    <View
      style={[
        styles.content,
        { maxWidth },
        compact && styles.contentCompact,
        contentStyle,
      ]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          {eyebrow ? (
            <Text style={styles.eyebrow}>
              {eyebrow}
            </Text>
          ) : null}

          <Text style={styles.title}>
            {title}
          </Text>

          {description ? (
            <Text style={styles.description}>
              {description}
            </Text>
          ) : null}
        </View>

        {actions ? (
          <View style={styles.actions}>
            {actions}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {children}
      </View>
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.screen}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0EA',
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    width: '100%',
    padding: 16,
    paddingBottom: 40,
    alignSelf: 'center',
  },

  contentCompact: {
    padding: 12,
    paddingBottom: spacing.xxl,
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  headerCopy: {
    minWidth: 220,
    flex: 1,
  },

  eyebrow: {
    marginBottom: 4,
    color: '#9D5F1D',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  title: {
    fontFamily: fonts.display,
    color: '#2C211A',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
  },

  description: {
    maxWidth: 680,
    marginTop: 4,
    color: '#88776B',
    fontSize: 10,
    lineHeight: 16,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  body: {
    marginTop: 16,
    gap: spacing.md,
  },
});