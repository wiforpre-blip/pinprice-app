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

function clampWorklet(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

type UseEditorZoomOptions = {
  canvasSize: Size;
  imageUri: string | null;
  /** Tap on empty zoom surface (close editor / exit multi-select). Never adds tags. */
  onBackgroundTap?: () => void;
};

export function useEditorZoom({ canvasSize, imageUri, onBackgroundTap }: UseEditorZoomOptions) {
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(EDITOR_ZOOM_DEFAULT);
  const onBackgroundTapRef = useRef(onBackgroundTap);
  onBackgroundTapRef.current = onBackgroundTap;

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

  const syncZoomScale = useCallback((nextScale: number) => {
    setZoomScale(clampZoomScale(nextScale));
  }, []);

  const handleBackgroundTap = useCallback(() => {
    onBackgroundTapRef.current?.();
  }, []);

  const resetZoom = useCallback(() => {
    scale.value = EDITOR_ZOOM_DEFAULT;
    translateX.value = 0;
    translateY.value = 0;
    startScale.value = EDITOR_ZOOM_DEFAULT;
    startTranslateX.value = 0;
    startTranslateY.value = 0;
    setZoomScale(EDITOR_ZOOM_DEFAULT);
    setIsZoomMode(false);
  }, [scale, startScale, startTranslateX, startTranslateY, translateX, translateY]);

  useEffect(() => {
    resetZoom();
  }, [imageUri, resetZoom]);

  const toggleZoomMode = useCallback(() => {
    setIsZoomMode((current) => !current);
  }, []);

  const zoomGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .enabled(isZoomMode)
      .onBegin(() => {
        'worklet';
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
      .onEnd(() => {
        'worklet';
        startScale.value = scale.value;

        if (scale.value <= EDITOR_ZOOM_MIN) {
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          startTranslateX.value = 0;
          startTranslateY.value = 0;
          runOnJS(syncZoomScale)(EDITOR_ZOOM_DEFAULT);
        }
      });

    const pan = Gesture.Pan()
      .enabled(isZoomMode)
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

    const tap = Gesture.Tap()
      .enabled(isZoomMode)
      .onEnd(() => {
        'worklet';
        runOnJS(handleBackgroundTap)();
      });

    return Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap));
  }, [
    canvasHeight,
    canvasWidth,
    handleBackgroundTap,
    isZoomMode,
    scale,
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
    isZoomMode,
    resetZoom,
    toggleZoomMode,
    zoomAnimatedStyle,
    zoomGesture,
    zoomScale,
  };
}
