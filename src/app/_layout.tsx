import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { ToastProvider } from '@/components/toast';
import { ErrorState } from '@/components/ui';
import { API_ORIGIN, ApiError } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only network/server hiccups, not auth or validation errors.
      retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
    },
  },
});

function RootNavigator() {
  const { user, restoring, offline, retry } = useAuth();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    BebasNeue_400Regular,
  });
  const ready = fontsLoaded && !restoring;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // Server unreachable on launch: the saved session may still be valid, so don't show the login screen.
  if (offline && !user)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ErrorState message={`Can't reach the server at ${API_ORIGIN}. Check your connection and try again.`} onRetry={retry} />
      </View>
    );

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="booking/[id]" />
        <Stack.Screen name="booking/form" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="invoice/[id]" />
        <Stack.Screen name="customers" />
        <Stack.Screen name="enquiries" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
