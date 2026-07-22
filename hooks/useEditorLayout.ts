import { type ImageLoadEventData } from 'expo-image';
import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';

import type { Size } from '@/types/editor';
import { getContainedImageRect } from '@/utils/editorGeometry';

export function useEditorLayout() {
  const headerRef = useRef<View>(null);
  const canvasRef = useRef<View>(null);
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [dragTopBoundaryY, setDragTopBoundaryY] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const imageRect = useMemo(() => getContainedImageRect(canvasSize, imageSize), [canvasSize, imageSize]);

  const updateDragTopBoundary = () => {
    requestAnimationFrame(() => {
      headerRef.current?.measure((_headerX, _headerY, _headerWidth, headerHeight, _headerPageX, headerPageY) => {
        canvasRef.current?.measure((_canvasX, _canvasY, _canvasWidth, _canvasHeight, _canvasPageX, canvasPageY) => {
          setDragTopBoundaryY(headerPageY + headerHeight - canvasPageY);
        });
      });
    });
  };

  const handleHeaderLayout = () => {
    updateDragTopBoundary();
  };

  const handleCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setCanvasSize({ width, height });
    updateDragTopBoundary();
  };

  const handleImageLoad = (event: ImageLoadEventData) => {
    if (!Number.isFinite(event.source.width) || !Number.isFinite(event.source.height)) {
      return;
    }

    setImageSize({
      width: event.source.width,
      height: event.source.height,
    });
  };

  return {
    canvasRef,
    canvasSize,
    dragTopBoundaryY,
    handleCanvasLayout,
    handleHeaderLayout,
    handleImageLoad,
    headerRef,
    imageRect,
    imageSize,
  };
}
