import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';

const BRAND_LOGO = require('../../assets/images/splash-icon.png');

const DEFAULT_MIN_DURATION_MS = 900;
const FADE_OUT_MS = 280;
/**
 * splash-icon.png has large baked-in black padding, so the Image frame must
 * fill most of the screen for the logo artwork to read ~50%+ visually.
 */
const LOGO_WIDTH_RATIO = 0.92;
const LOGO_HEIGHT_RATIO = 0.72;

type AppSplashProps = {
  minDurationMs?: number;
  onFinish: () => void;
  onReady?: () => void;
};

export function AppSplash({
  minDurationMs = DEFAULT_MIN_DURATION_MS,
  onFinish,
  onReady,
}: AppSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const readySentRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const logoWidth = width * LOGO_WIDTH_RATIO;
  const logoHeight = height * LOGO_HEIGHT_RATIO;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [minDurationMs, onFinish, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => {
        if (readySentRef.current) {
          return;
        }
        readySentRef.current = true;
        onReady?.();
      }}
      pointerEvents="auto"
      style={[styles.root, { opacity }]}>
      <Image
        accessible={false}
        contentFit="contain"
        source={BRAND_LOGO}
        style={{ width: logoWidth, height: logoHeight }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
});
