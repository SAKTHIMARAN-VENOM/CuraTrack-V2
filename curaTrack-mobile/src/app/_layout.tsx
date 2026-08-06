import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';

// Prevent auto hiding before app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen immediately after layout mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen
            name="passport"
            options={{
              headerShown: true,
              title: 'Patient Passport',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="telemedicine"
            options={{
              headerShown: false,
              title: 'Telemedicine',
            }}
          />
          <Stack.Screen
            name="call/[roomId]"
            options={{
              headerShown: false,
              title: 'Video Call',
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
