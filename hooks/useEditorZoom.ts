import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Size } from '@/types/editor';
import {
  EDITOR_ZOOM_DEFAULT,
  EDITOR_ZOOM_MAX,
  EDITOR_ZOOM_MIN,
  clampPanOffset,
  clampZoomScale,
} from '@/utils/editorGeometry';

/** Delay before clearing suppressTap after a real pinch ends (blocks ghost taps). */
const SUPPRESS_TAP_CLEAR_MS = 120;

function clampWorklet(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Canvas-local press point (same space as former Pressable locationX/Y). */
export type CanvasTapPoint = {
  locationX: number;
  locationY: number;
  pageX: number;
  pageY: number;
};

type UseEditorZoomOptions = {
  canvasSize: Size;
  imageUri: string | null;
  /** Single-finger tap on empty zoom surface (create tag / dismiss). */
  onCanvasTap?: (point: CanvasTapPoint) => void;
};

export function useEditorZoom({ canvasSize, imageUri, onCanvasTap }: UseEditorZoomOptions) {
  const [zoomScale, setZoomScale] = useState(EDITOR_ZOOM_DEFAULT);
  const suppressTapClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressTapRef = useRef(false);
  const onCanvasTapRef = useRef(onCanvasTap);
  onCanvasTapRef.current = onCanvasTap;

  const scale = useSharedValue(EDITOR_ZOOM_DEFAULT);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(EDITOR_ZOOM_DEFAULT);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);
  const canvasWidth = useSharedValue(canvasSize.width);
  const canvasHeight = useSharedValue(canvasSize.height);

  useEffect(() => {
    canvasWidth.value = canvasSize.width;
    canvasHeight.value = canvasSize.height;
  }, [canvasHeight, canvasSize.height, canvasSize.width, canvasWidth]);

  const clearSuppressTapTimer = useCallback(() => {
    if (suppressTapClearTimerRef.current != null) {
      clearTimeout(suppressTapClearTimerRef.current);
      suppressTapClearTimerRef.current = null;
    }
  }, []);

  const armSuppressTap = useCallback(() => {
    clearSuppressTapTimer();
    suppressTapRef.current = true;
  }, [clearSuppressTapTimer]);

  const scheduleClearSuppressTap = useCallback(() => {
    if (!suppressTapRef.current) {
      return;
    }

    clearSuppressTapTimer();
    suppressTapClearTimerRef.current = setTimeout(() => {
      suppressTapRef.current = false;
      suppressTapClearTimerRef.current = null;
    }, SUPPRESS_TAP_CLEAR_MS);
  }, [clearSuppressTapTimer]);

  const syncZoomScale = useCallback((nextScale: number) => {
    setZoomScale(clampZoomScale(nextScale));
  }, []);

  const dispatchCanvasTap = useCallback((locationX: number, locationY: number, pageX: number, pageY: number) => {
    if (suppressTapRef.current) {
      return;
    }

    onCanvasTapRef.current?.({ locationX, locationY, pageX, pageY });
  }, []);

  const resetZoom = useCallback(() => {
    clearSuppressTapTimer();
    suppressTapRef.current = false;
    scale.value = EDITOR_ZOOM_DEFAULT;
    translateX.value = 0;
    translateY.value = 0;
    startScale.value = EDITOR_ZOOM_DEFAULT;
    startTranslateX.value = 0;
    startTranslateY.value = 0;
    setZoomScale(EDITOR_ZOOM_DEFAULT);
  }, [clearSuppressTapTimer, scale, startScale, startTranslateX, startTranslateY, translateX, translateY]);

  useEffect(() => {
    resetZoom();
  }, [imageUri, resetZoom]);

  useEffect(() => {
    return () => {
      clearSuppressTapTimer();
    };
  }, [clearSuppressTapTimer]);

  const zoomGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        // Arm suppress only when pinch activates (not onBegin — that fires on one finger).
        runOnJS(armSuppressTap)();
        startScale.value = scale.value;
        startTranslateX.value = translateX.value;
        startTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        'worklet';
        const nextScale = clampWorklet(startScale.value * event.scale, EDITOR_ZOOM_MIN, EDITOR_ZOOM_MAX);
        scale.value = nextScale;

        const maxX = (canvasWidth.value * (nextScale - 1)) / 2;
        const maxY = (canvasHeight.value * (nextScale - 1)) / 2;
        translateX.value = clampWorklet(translateX.value, -maxX, maxX);
        translateY.value = clampWorklet(translateY.value, -maxY, maxY);
        runOnJS(syncZoomScale)(nextScale);
      })
      .onFinalize(() => {
        'worklet';
        startScale.value = scale.value;

        if (scale.value <= EDITOR_ZOOM_MIN) {
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          startTranslateX.value = 0;
          startTranslateY.value = 0;
          runOnJS(syncZoomScale)(EDITOR_ZOOM_DEFAULT);
        }

        runOnJS(scheduleClearSuppressTap)();
      });

    // Pan: empty surface only (under tags). No-op at 100%.
    const pan = Gesture.Pan()
      .maxPointers(1)
      .minDistance(6)
      .onBegin(() => {
        'worklet';
        startTranslateX.value = translateX.value;
        startTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        'worklet';
        if (scale.value <= EDITOR_ZOOM_MIN) {
          return;
        }

        const maxX = (canvasWidth.value * (scale.value - 1)) / 2;
        const maxY = (canvasHeight.value * (scale.value - 1)) / 2;
        translateX.value = clampWorklet(startTranslateX.value + event.translationX, -maxX, maxX);
        translateY.value = clampWorklet(startTranslateY.value + event.translationY, -maxY, maxY);
      })
      .onEnd(() => {
        'worklet';
        startTranslateX.value = translateX.value;
        startTranslateY.value = translateY.value;
      });

    // Local x/y = canvas space inside the transformed viewport.
    const tap = Gesture.Tap()
      .maxDuration(250)
      .maxDistance(10)
      .onEnd((event) => {
        'worklet';
        runOnJS(dispatchCanvasTap)(event.x, event.y, event.absoluteX, event.absoluteY);
      });

    return Gesture.Simultaneous(pinch, Gesture.Race(tap, pan));
  }, [
    armSuppressTap,
    canvasHeight,
    canvasWidth,
    dispatchCanvasTap,
    scale,
    scheduleClearSuppressTap,
    startScale,
    startTranslateX,
    startTranslateY,
    syncZoomScale,
    translateX,
    translateY,
  ]);

  const zoomAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (zoomScale <= EDITOR_ZOOM_MIN) {
      return;
    }

    const next = clampPanOffset(translateX.value, translateY.value, zoomScale, canvasSize);
    translateX.value = next.x;
    translateY.value = next.y;
    startTranslateX.value = next.x;
    startTranslateY.value = next.y;
  }, [canvasSize, startTranslateX, startTranslateY, translateX, translateY, zoomScale]);

  return {
    resetZoom,
    zoomAnimatedStyle,
    zoomGesture,
    zoomScale,
  };
}
