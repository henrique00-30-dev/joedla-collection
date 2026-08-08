import { PropsWithChildren } from 'react';
import { Platform, StyleProp, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}>;

const MOBILE_TAB_BAR_SPACE = 70;

export function Screen({ children, style, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const { width } = useWindowDimensions();
  const needsBottomProtection =
    Platform.OS !== 'web' && edges.includes('bottom') && width < 900;

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.screen,
        needsBottomProtection && styles.withMobileTabBarSpace,
        style,
      ]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
  },
  withMobileTabBarSpace: {
    paddingBottom: MOBILE_TAB_BAR_SPACE,
  },
});
