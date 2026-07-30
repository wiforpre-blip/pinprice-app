import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector, type ComposedGesture, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

type EditorZoomViewportProps = {
  children: ReactNode;
  /** When true, allow drag overflow (e.g. delete drop zone). */
  allowOverflow?: boolean;
  canvasPressAccessibilityLabel: string;
  zoomAnimatedStyle: AnimatedStyle<ViewStyle>;
  zoomGesture: ComposedGesture | GestureType;
};

/**
 * Viewport zoom/pan wrapper. Does not alter tag/marker normalized positions.
 * Gesture surface (zIndex 1) hosts pinch/pan/tap; tags/markers stay above (zIndex 2+).
 */
export function EditorZoomViewport({
  allowOverflow = false,
  canvasPressAccessibilityLabel,
  children,
  zoomAnimatedStyle,
  zoomGesture,
}: EditorZoomViewportProps) {
  return (
    <View style={[styles.clip, allowOverflow && styles.clipOverflow]}>
      <Animated.View style={[styles.viewport, zoomAnimatedStyle]}>
        <GestureDetector gesture={zoomGesture}>
          <Animated.View
            accessibilityLabel={canvasPressAccessibilityLabel}
            accessibilityRole="button"
            collapsable={false}
            style={styles.gestureLayer}
          />
        </GestureDetector>
        {children}
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
    // Explicit transparent hit target — some Android builds skip views with no background.
    backgroundColor: 'transparent',
  },
});
