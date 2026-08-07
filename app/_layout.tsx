import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CustomerAccountBridge } from '@/src/components/customer-account-bridge';
import { StoreProvider } from '@/src/context/store-context';
import { ThemeProvider, useThemeMode } from '@/src/context/theme-context';
import { colors } from '@/src/theme';

function AppNavigator() {
  const { resolvedTheme } = useThemeMode();

  return (
    <StoreProvider>
      <CustomerAccountBridge />
      <StatusBar
        style={resolvedTheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="how-to-buy" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="account" />
        <Stack.Screen name="account-settings" />
        <Stack.Screen name="admin/login" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/products" />
        <Stack.Screen name="admin/categories" />
        <Stack.Screen name="admin/analytics" />
        <Stack.Screen name="admin/notices" />
        <Stack.Screen name="admin/product-form" />
        <Stack.Screen name="admin/orders" />
        <Stack.Screen name="admin/order/[id]" />
        <Stack.Screen name="admin/settings" />
        <Stack.Screen name="admin/appearance" />
        <Stack.Screen name="admin/campaigns" />
        <Stack.Screen name="admin/campaign/[id]" />
        <Stack.Screen name="admin/promotions" />
        <Stack.Screen name="admin/promotion/[id]" />
        <Stack.Screen name="admin/community" />
      </Stack>
    </StoreProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
