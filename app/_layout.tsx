import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { requireNativeModule } from 'expo-modules-core';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { LogBox, StyleSheet } from 'react-native';

import { AppSplash } from '@/components/ui/AppSplash';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { initializePurchases } from '@/services/purchase.service';

/**
 * Expo SDK 54 DEV wraps the app with withDevTools → useKeepAwake, which does not
 * catch activate failures. On Android, activate rejects when Activity is missing
 * during reload/splash ("Unable to activate keep awake"). Production omits withDevTools.
 */
if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);

  try {
    const keepAwake = requireNativeModule('ExpoKeepAwake') as {
      activate: (tag: string) => Promise<void>;
    };
    const originalActivate = keepAwake.activate.bind(keepAwake);
    keepAwake.activate = async (tag: string) => {
      try {
        await originalActivate(tag);
      } catch {
        // Ignore CurrentActivityNotFound / ActivateKeepAwakeException.
      }
    };
  } catch {
    // Keep-awake native module unavailable in this runtime.
  }
}

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Native splash may already be hidden in some reload paths.
});

export default function RootLayout() {
  const [showAppSplash, setShowAppSplash] = useState(true);

  useEffect(() => {
    void initializePurchases();
  }, []);

  const handleNativeSplashReady = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {
      // Ignore if already hidden.
    });
  }, []);

  useEffect(() => {
    // Fallback if AppSplash onLayout never fires (should be rare).
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowAppSplash(false);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={DefaultTheme}>
        <LanguageProvider>
          <CurrencyProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="crop" options={{ headerShown: false }} />
              <Stack.Screen name="editor" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={showAppSplash ? 'light' : 'auto'} />
            {showAppSplash ? (
              <AppSplash onFinish={handleSplashFinish} onReady={handleNativeSplashReady} />
            ) : null}
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
