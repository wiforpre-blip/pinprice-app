import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { LanguageProvider } from '@/contexts/LanguageContext';

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <LanguageProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="editor" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </LanguageProvider>
    </ThemeProvider>
  );
}
