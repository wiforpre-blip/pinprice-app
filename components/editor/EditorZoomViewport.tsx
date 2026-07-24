import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

type EditorZoomViewportProps = {
  children: ReactNode;
  /** When true, allow drag overflow (e.g. delete drop zone). */
  allowOverflow?: boolean;
  isZoomMode: boolean;
  zoomAnimatedStyle: AnimatedStyle<ViewStyle>;
  zoomGesture: ComposedGesture | GestureType;
};

/**
 * Viewport-only zoom/pan wrapper. Does not alter tag/marker normalized positions.
 * Pinch/pan sit on a background layer (zIndex 1) so tag overlays (zIndex 2+) stay interactive.
 */
export function EditorZoomViewport({
  allowOverflow = false,
  children,
  isZoomMode,
  zoomAnimatedStyle,
  zoomGesture,
}: EditorZoomViewportProps) {
  return (
    <View style={[styles.clip, allowOverflow && styles.clipOverflow]}>
      <Animated.View style={[styles.viewport, zoomAnimatedStyle]}>
        {children}
        {isZoomMode ? (
          <GestureDetector gesture={zoomGesture}>
            <Animated.View
              accessibilityLabel="Zoom and pan surface"
              collapsable={false}
              pointerEvents="auto"
              style={styles.gestureLayer}
            />
          </GestureDetector>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  clipOverflow: {
    overflow: 'visible',
  },
  viewport: {
    ...StyleSheet.absoluteFillObject,
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    elevation: 1,
  },
});
