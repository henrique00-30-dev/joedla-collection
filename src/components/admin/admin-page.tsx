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
  const phone = width < 600;
  const tablet = width >= 600 && width < 1024;
  const stackedHeader = width < 1024;

  const content = (
    <View
      style={[
        styles.content,
        { maxWidth },
        tablet && styles.contentTablet,
        phone && styles.contentPhone,
        contentStyle,
      ]}>
      <View style={[styles.header, stackedHeader && styles.headerStacked]}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={[styles.title, phone && styles.titlePhone]}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>

        {actions ? (
          <View style={[styles.actions, stackedHeader && styles.actionsStacked]}>
            {actions}
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>
    </View>
  );

  if (!scroll) {
    return <View style={styles.screen}>{content}</View>;
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
    minWidth: 0,
    backgroundColor: '#F4F0EA',
  },
  scrollContent: {
    minWidth: 0,
    flexGrow: 1,
  },
  content: {
    width: '100%',
    minWidth: 0,
    padding: 20,
    paddingBottom: 48,
    alignSelf: 'center',
  },
  contentTablet: {
    paddingHorizontal: 18,
  },
  contentPhone: {
    padding: 12,
    paddingBottom: spacing.xxl,
  },
  header: {
    width: '100%',
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  headerCopy: {
    width: '100%',
    minWidth: 0,
    flexBasis: 260,
    flexGrow: 1,
    flexShrink: 1,
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
  titlePhone: {
    fontSize: 20,
    lineHeight: 25,
  },
  description: {
    width: '100%',
    maxWidth: 680,
    marginTop: 4,
    color: '#88776B',
    fontSize: 10,
    lineHeight: 16,
  },
  actions: {
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionsStacked: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  body: {
    minWidth: 0,
    width: '100%',
    marginTop: 20,
    gap: 20,
  },
});
