import { useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { Image } from 'expo-image';

import { CROP_CORNER_HIT_SIZE } from '@/constants/cropAspectRatios';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { CropCorner } from '@/hooks/useCropSession';
import type { CropHistorySnapshot, CropRect, CropRotationDeg, Size } from '@/types/crop';
import { cloneCropRect, getContainedImageRect } from '@/utils/cropGeometry';

type CropCanvasProps = {
  imageUri: string;
  rotation: CropRotationDeg;
  cropRect: CropRect;
  rotatedSize: Size | null;
  disabled?: boolean;
  beginLiveEdit: () => CropHistorySnapshot;
  commitLiveEdit: (before: CropHistorySnapshot) => void;
  resizeFromCorner: (
    startRect: CropRect,
    corner: CropCorner,
    deltaX: number,
    deltaY: number,
  ) => CropRect;
  moveRect: (startRect: CropRect, deltaX: number, deltaY: number) => CropRect;
};

type DisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Integer pixel hole shared by dim overlays + crop frame (avoids subpixel seams). */
type CropViewBoundary = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function getCropViewBoundary(cropBox: DisplayRect): CropViewBoundary {
  const left = Math.round(cropBox.x);
  const top = Math.round(cropBox.y);
  const right = Math.round(cropBox.x + cropBox.width);
  const bottom = Math.round(cropBox.y + cropBox.height);

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/** Four non-overlapping dim rects inside the image only (letterbox stays stage color). */
function CropDimOverlay({
  imageBounds,
  cropBounds,
}: {
  imageBounds: CropViewBoundary;
  cropBounds: CropViewBoundary;
}) {
  const topHeight = Math.max(0, cropBounds.top - imageBounds.top);
  const bottomHeight = Math.max(0, imageBounds.bottom - cropBounds.bottom);
  const leftWidth = Math.max(0, cropBounds.left - imageBounds.left);
  const rightWidth = Math.max(0, imageBounds.right - cropBounds.right);

  return (
    <>
      {topHeight > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.dim,
            {
              top: imageBounds.top,
              left: imageBounds.left,
              width: imageBounds.width,
              height: topHeight,
            },
          ]}
        />
      ) : null}
      {bottomHeight > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.dim,
            {
              top: cropBounds.bottom,
              left: imageBounds.left,
              width: imageBounds.width,
              height: bottomHeight,
            },
          ]}
        />
      ) : null}
      {leftWidth > 0 && cropBounds.height > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.dim,
            {
              top: cropBounds.top,
              left: imageBounds.left,
              width: leftWidth,
              height: cropBounds.height,
            },
          ]}
        />
      ) : null}
      {rightWidth > 0 && cropBounds.height > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.dim,
            {
              top: cropBounds.top,
              left: cropBounds.right,
              width: rightWidth,
              height: cropBounds.height,
            },
          ]}
        />
      ) : null}
    </>
  );
}

type CornerLatest = {
  imageRect: DisplayRect | null;
  disabled: boolean;
  beginLiveEdit: () => CropHistorySnapshot;
  commitLiveEdit: (before: CropHistorySnapshot) => void;
  resizeFromCorner: CropCanvasProps['resizeFromCorner'];
  setDraggingCrop: (dragging: boolean) => void;
};

function createCornerPanResponder(options: {
  corner: CropCorner;
  latestRef: MutableRefObject<CornerLatest>;
}) {
  const { corner, latestRef } = options;
  let before: CropHistorySnapshot | null = null;
  let startRect: CropRect | null = null;

  return PanResponder.create({
    onStartShouldSetPanResponder: () => !latestRef.current.disabled,
    onMoveShouldSetPanResponder: () => !latestRef.current.disabled,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      latestRef.current.setDraggingCrop(true);
      before = latestRef.current.beginLiveEdit();
      startRect = cloneCropRect(before.cropRect);
    },
    onPanResponderMove: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const { imageRect, resizeFromCorner } = latestRef.current;
      if (!imageRect || !startRect || imageRect.width <= 0 || imageRect.height <= 0) {
        return;
      }

      resizeFromCorner(
        startRect,
        corner,
        gestureState.dx / imageRect.width,
        gestureState.dy / imageRect.height,
      );
    },
    onPanResponderRelease: () => {
      if (before) {
        latestRef.current.commitLiveEdit(before);
      }
      before = null;
      startRect = null;
      latestRef.current.setDraggingCrop(false);
    },
    onPanResponderTerminate: () => {
      if (before) {
        latestRef.current.commitLiveEdit(before);
      }
      before = null;
      startRect = null;
      latestRef.current.setDraggingCrop(false);
    },
  });
}

/**
 * Crop canvas with image, dimmed overlay, crop frame, and 44dp corner hits.
 * Each corner has its own PanResponder so free-crop works repeatedly.
 */
export function CropCanvas({
  imageUri,
  rotation,
  cropRect,
  rotatedSize,
  disabled = false,
  beginLiveEdit,
  commitLiveEdit,
  resizeFromCorner,
  moveRect,
}: CropCanvasProps) {
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);

  const imageRect = useMemo(() => {
    if (!rotatedSize) {
      return null;
    }

    return getContainedImageRect(canvasSize, rotatedSize);
  }, [canvasSize, rotatedSize]);

  const cropBox = useMemo(() => {
    if (!imageRect) {
      return null;
    }

    return {
      x: imageRect.x + cropRect.x * imageRect.width,
      y: imageRect.y + cropRect.y * imageRect.height,
      width: cropRect.width * imageRect.width,
      height: cropRect.height * imageRect.height,
    };
  }, [cropRect, imageRect]);

  const latestRef = useRef({
    imageRect,
    disabled,
    beginLiveEdit,
    commitLiveEdit,
    resizeFromCorner,
    moveRect,
    setDraggingCrop: setIsDraggingCrop,
  });
  latestRef.current = {
    imageRect,
    disabled,
    beginLiveEdit,
    commitLiveEdit,
    resizeFromCorner,
    moveRect,
    setDraggingCrop: setIsDraggingCrop,
  };

  const bodyDragRef = useRef<{
    before: CropHistorySnapshot | null;
    startRect: CropRect | null;
  }>({ before: null, startRect: null });

  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latestRef.current.disabled,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        !latestRef.current.disabled && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        latestRef.current.setDraggingCrop(true);
        const before = latestRef.current.beginLiveEdit();
        bodyDragRef.current = {
          before,
          startRect: cloneCropRect(before.cropRect),
        };
      },
      onPanResponderMove: (_event, gestureState) => {
        const { imageRect: rect, moveRect: move } = latestRef.current;
        const drag = bodyDragRef.current;
        if (!rect || !drag.startRect || rect.width <= 0 || rect.height <= 0) {
          return;
        }

        move(drag.startRect, gestureState.dx / rect.width, gestureState.dy / rect.height);
      },
      onPanResponderRelease: () => {
        if (bodyDragRef.current.before) {
          latestRef.current.commitLiveEdit(bodyDragRef.current.before);
        }
        bodyDragRef.current = { before: null, startRect: null };
        latestRef.current.setDraggingCrop(false);
      },
      onPanResponderTerminate: () => {
        if (bodyDragRef.current.before) {
          latestRef.current.commitLiveEdit(bodyDragRef.current.before);
        }
        bodyDragRef.current = { before: null, startRect: null };
        latestRef.current.setDraggingCrop(false);
      },
    }),
  ).current;

  const cornerPanResponders = useRef({
    tl: createCornerPanResponder({ corner: 'tl', latestRef }),
    tr: createCornerPanResponder({ corner: 'tr', latestRef }),
    bl: createCornerPanResponder({ corner: 'bl', latestRef }),
    br: createCornerPanResponder({ corner: 'br', latestRef }),
  }).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const isSwap = rotation === 90 || rotation === 270;
  const imageLayout = useMemo(() => {
    if (!imageRect) {
      return null;
    }

    const imgW = isSwap ? imageRect.height : imageRect.width;
    const imgH = isSwap ? imageRect.width : imageRect.height;

    return {
      left: imageRect.x + (imageRect.width - imgW) / 2,
      top: imageRect.y + (imageRect.height - imgH) / 2,
      width: imgW,
      height: imgH,
    };
  }, [imageRect, isSwap]);

  const viewBoundary = useMemo(() => {
    if (!cropBox) {
      return null;
    }

    return getCropViewBoundary(cropBox);
  }, [cropBox]);

  const imageBoundary = useMemo(() => {
    if (!imageRect) {
      return null;
    }

    return getCropViewBoundary(imageRect);
  }, [imageRect]);

  const cornerPositions = useMemo(() => {
    if (!viewBoundary) {
      return null;
    }

    const half = CROP_CORNER_HIT_SIZE / 2;
    const { left, top, right, bottom } = viewBoundary;

    return {
      tl: { left: left - half, top: top - half },
      tr: { left: right - half, top: top - half },
      bl: { left: left - half, top: bottom - half },
      br: { left: right - half, top: bottom - half },
    };
  }, [viewBoundary]);

  return (
    <View style={styles.canvas} onLayout={handleLayout}>
      {imageLayout ? (
        <Image
          contentFit="fill"
          pointerEvents="none"
          source={{ uri: imageUri }}
          style={[
            styles.image,
            {
              left: imageLayout.left,
              top: imageLayout.top,
              width: imageLayout.width,
              height: imageLayout.height,
              transform: [{ rotate: `${rotation}deg` }],
            },
          ]}
        />
      ) : null}

      {imageRect && imageBoundary && viewBoundary ? (
        <>
          {!isDraggingCrop ? (
            <CropDimOverlay cropBounds={viewBoundary} imageBounds={imageBoundary} />
          ) : null}

          <View
            collapsable={false}
            {...bodyPanResponder.panHandlers}
            style={[
              styles.cropFrame,
              {
                left: viewBoundary.left,
                top: viewBoundary.top,
                width: viewBoundary.width,
                height: viewBoundary.height,
              },
            ]}
          />

          {cornerPositions
            ? (['tl', 'tr', 'bl', 'br'] as CropCorner[]).map((corner) => (
                <View
                  collapsable={false}
                  key={corner}
                  {...cornerPanResponders[corner].panHandlers}
                  style={[
                    styles.cornerHit,
                    {
                      left: cornerPositions[corner].left,
                      top: cornerPositions[corner].top,
                    },
                  ]}>
                  <View pointerEvents="none" style={styles.cornerVisual} />
                </View>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: theme.colors.photoStageBackground,
    // Keep handles hittable near edges; image stays inside via absolute layout.
    overflow: 'visible',
  },
  image: {
    position: 'absolute',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.white,
    backgroundColor: 'transparent',
  },
  cornerHit: {
    position: 'absolute',
    width: CROP_CORNER_HIT_SIZE,
    height: CROP_CORNER_HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    backgroundColor: 'transparent',
  },
  cornerVisual: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.accent,
  },
});
