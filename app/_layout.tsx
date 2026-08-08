import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CustomerAccountBridge } from '@/src/components/customer-account-bridge';
import { StoreProvider } from '@/src/context/store-context';
import { colors } from '@/src/theme';

let webDestructiveAlertPatched = false;

function ensureWebDestructiveAlerts() {
  if (webDestructiveAlertPatched || Platform.OS !== 'web' || typeof window === 'undefined') return;
  webDestructiveAlertPatched = true;

  const originalAlert = Alert.alert.bind(Alert);
  Alert.alert = (title, message, buttons, options) => {
    const destructive = buttons?.find((button) => button.style === 'destructive');
    if (!destructive) {
      originalAlert(title, message, buttons, options);
      return;
    }

    const cancel = buttons?.find((button) => button.style === 'cancel');
    const confirmed = window.confirm([title, message].filter(Boolean).join('\n\n'));
    if (confirmed) destructive.onPress?.();
    else cancel?.onPress?.();
  };
}

ensureWebDestructiveAlerts();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <CustomerAccountBridge />
          <StatusBar style="dark" backgroundColor={colors.background} />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
