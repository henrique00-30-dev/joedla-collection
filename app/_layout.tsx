import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { StoreProvider } from '@/src/context/store-context';
import { colors } from '@/src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="category/[slug]" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="order-success" options={{ gestureEnabled: false }} />
            <Stack.Screen name="favorites" />
            <Stack.Screen name="how-to-buy" />
            <Stack.Screen name="admin/login" />
            <Stack.Screen name="admin/index" />
            <Stack.Screen name="admin/products" />
            <Stack.Screen name="admin/categories" />
            <Stack.Screen name="admin/analytics" />
            <Stack.Screen name="admin/product-form" />
            <Stack.Screen name="admin/orders" />
            <Stack.Screen name="admin/order/[id]" />
            <Stack.Screen name="admin/settings" />
          </Stack>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
