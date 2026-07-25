import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { getResolvedTagPreset, getTagTextShadowStyle } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';
import { EDITOR_ZOOM_DEFAULT, FALLBACK_TAG_SIZE, screenDeltaToCanvasDelta } from '@/utils/editorGeometry';

type TagOverlayProps = {
  dragEnabled?: boolean;
  externalDragOffset?: DragPoint | null;
  isSelected?: boolean;
  minDragY?: number;
  tag: PriceTag;
  textOverride?: string;
  typeOverride?: TagType;
  imageRect: ImageDisplayRect;
  /** Current editor viewport scale (1–3). Drag deltas are converted to canvas-local space. */
  viewportScale?: number;
  clampDragOffset?: (dx: number, dy: number) => DragPoint;
  onDragCancel: () => void;
  onDragEnd: (tagId: string, canvasX: number, canvasY: number, tagSize: TagSize, releasePoint: DragPoint) => void;
  onDragMove: (point: DragPoint) => void;
  onDragOffsetChange?: (offset: DragPoint) => void;
  onDragStart: (tag: PriceTag) => void;
  onPress: (tag: PriceTag) => void;
  onSizeChange?: (tagId: string, size: TagSize) => void;
};

type DragPoint = {
  x: number;
  y: number;
};

type TagSize = {
  width: number;
  height: number;
};

const DRAG_THRESHOLD = 6;
const ZERO_OFFSET = { x: 0, y: 0 };

export function TagOverlay({
  dragEnabled = true,
  externalDragOffset = null,
  isSelected = false,
  minDragY,
  tag,
  textOverride,
  typeOverride,
  imageRect,
  viewportScale = EDITOR_ZOOM_DEFAULT,
  clampDragOffset,
  onDragCancel,
  onDragEnd,
  onDragMove,
  onDragOffsetChange,
  onDragStart,
  onPress,
  onSizeChange,
}: TagOverlayProps) {
  const displayType = typeOverride ?? tag.type;
  const tagStyle = getResolvedTagPreset(tag, displayType);
  const displayText = textOverride ?? tag.text;
  const isPlainSoldIcon = displayType === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = displayType === 'sold' && tag.soldTextFormat === 'icon';
  const isFlatTag = isPlainSoldIcon || tagStyle.isFlat;
  const isCircle = tagStyle.shape === 'circle' && tagStyle.fixedSize != null;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(ZERO_OFFSET);
  const [tagSize, setTagSize] = useState<TagSize>(FALLBACK_TAG_SIZE);
  const startPointRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const tagRef = useRef(tag);
  const imageRectRef = useRef(imageRect);
  const minDragYRef = useRef(minDragY);
  const tagSizeRef = useRef(tagSize);
  const dragEnabledRef = useRef(dragEnabled);
  const viewportScaleRef = useRef(viewportScale);
  const clampDragOffsetRef = useRef(clampDragOffset);
  const callbacksRef = useRef({
    onDragCancel,
    onDragEnd,
    onDragMove,
    onDragOffsetChange,
    onDragStart,
    onPress,
    onSizeChange,
  });

  tagRef.current = tag;
  imageRectRef.current = imageRect;
  minDragYRef.current = minDragY;
  tagSizeRef.current = tagSize;
  dragEnabledRef.current = dragEnabled;
  viewportScaleRef.current = viewportScale;
  clampDragOffsetRef.current = clampDragOffset;
  callbacksRef.current = {
    onDragCancel,
    onDragEnd,
    onDragMove,
    onDragOffsetChange,
    onDragStart,
    onPress,
    onSizeChange,
  };

  const getBoundedDragOffset = (dx: number, dy: number) => {
    const localDelta = screenDeltaToCanvasDelta(dx, dy, viewportScaleRef.current);
    const customClamp = clampDragOffsetRef.current;

    if (customClamp) {
      return customClamp(localDelta.x, localDelta.y);
    }

    const minY = minDragYRef.current;

    if (typeof minY !== 'number' || !Number.isFinite(minY)) {
      return localDelta;
    }

    const nextY = Math.max(startPointRef.current.y + localDelta.y, minY);

    return {
      x: localDelta.x,
      y: nextY - startPointRef.current.y,
    };
  };

  const startDrag = () => {
    if (!dragEnabledRef.current || hasDraggedRef.current) {
      return;
    }

    hasDraggedRef.current = true;
    setIsDragging(true);
    callbacksRef.current.onDragStart(tagRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        dragEnabledRef.current && (Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD),
      onPanResponderGrant: () => {
        const currentTag = tagRef.current;
        const currentImageRect = imageRectRef.current;

        startPointRef.current = {
          x: currentImageRect.x + currentTag.x * currentImageRect.width,
          y: currentImageRect.y + currentTag.y * currentImageRect.height,
        };
        hasDraggedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
      },
      onPanResponderMove: (event, gestureState) => {
        if (!dragEnabledRef.current) {
          return;
        }

        const hasMovedEnough = Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD;

        if (!hasMovedEnough) {
          return;
        }

        startDrag();
        const boundedOffset = getBoundedDragOffset(gestureState.dx, gestureState.dy);

        setDragOffset({
          x: boundedOffset.x,
          y: boundedOffset.y,
        });
        callbacksRef.current.onDragOffsetChange?.(boundedOffset);
        callbacksRef.current.onDragMove({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
      },
      onPanResponderRelease: (event, gestureState) => {
        if (!hasDraggedRef.current) {
          callbacksRef.current.onPress(tagRef.current);
        } else {
          const boundedOffset = getBoundedDragOffset(gestureState.dx, gestureState.dy);
          const releaseCanvasPoint = {
            x: startPointRef.current.x + boundedOffset.x,
            y: startPointRef.current.y + boundedOffset.y,
          };

          callbacksRef.current.onDragEnd(tagRef.current.id, releaseCanvasPoint.x, releaseCanvasPoint.y, tagSizeRef.current, {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          });
        }

        hasDraggedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
      },
      onPanResponderTerminate: () => {
        hasDraggedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
        callbacksRef.current.onDragCancel();
      },
    }),
  ).current;

  const left = imageRect.x + tag.x * imageRect.width;
  const top = imageRect.y + tag.y * imageRect.height;
  const activeOffset = isDragging ? dragOffset : externalDragOffset ?? ZERO_OFFSET;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    const nextSize = { width, height };
    setTagSize(nextSize);
    callbacksRef.current.onSizeChange?.(tagRef.current.id, nextSize);
  };

  return (
    <View
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Edit ${displayText} tag`}
      onLayout={handleLayout}
      style={[
        styles.tag,
        isSelected && styles.selectedTag,
        isDragging && styles.draggingTag,
        isFlatTag && styles.flatTag,
        isCircle && {
          width: tagStyle.fixedSize!,
          height: tagStyle.fixedSize!,
          borderRadius: tagStyle.fixedSize! / 2,
          overflow: 'hidden' as const,
        },
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          borderWidth: isFlatTag ? 0 : isCircle ? 2 : 1,
          minHeight: tagStyle.minHeight,
          maxWidth: tagStyle.maxWidth,
          paddingHorizontal: tagStyle.paddingHorizontal,
          paddingVertical: tagStyle.paddingVertical,
          left,
          top,
          transform: [{ translateX: activeOffset.x }, { translateY: activeOffset.y }],
        },
      ]}>
      {isSelected ? (
        <>
          <View pointerEvents="none" style={[styles.selectedRingOuter, isCircle && styles.circleSelectedRing]} />
          <View pointerEvents="none" style={[styles.selectedRingInner, isCircle && styles.circleSelectedRing]} />
        </>
      ) : null}
      {isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon color={tagStyle.color} size={tagStyle.fontSize} thicknessScale={2} />
      ) : (
        <Text
          numberOfLines={isCircle ? 1 : 2}
          style={[
            styles.tagText,
            getTagTextShadowStyle(tagStyle.textShadow),
            {
              color: tagStyle.color,
              fontSize: tagStyle.fontSize,
              lineHeight: tagStyle.lineHeight,
              fontWeight: tagStyle.fontWeight,
              fontStyle: tagStyle.fontStyle,
            },
          ]}>
          {displayText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.tag,
  },
  flatTag: {
    shadowOpacity: 0,
    elevation: 0,
    shadowRadius: 0,
  },
  selectedTag: {
    zIndex: 4,
    elevation: 8,
  },
  draggingTag: {
    opacity: 0.92,
    zIndex: 5,
    elevation: 12,
  },
  selectedRingOuter: {
    position: 'absolute',
    top: -(theme.spacing.sm + 1),
    right: -(theme.spacing.sm + 1),
    bottom: -(theme.spacing.sm + 1),
    left: -(theme.spacing.sm + 1),
    borderRadius: theme.radius.md,
    borderWidth: 3,
    borderColor: theme.colors.selectionRingOuter,
  },
  selectedRingInner: {
    position: 'absolute',
    top: -theme.spacing.sm,
    right: -theme.spacing.sm,
    bottom: -theme.spacing.sm,
    left: -theme.spacing.sm,
    borderRadius: theme.radius.md - 1,
    borderWidth: 2,
    borderColor: theme.colors.selectionRingInner,
  },
  circleSelectedRing: {
    borderRadius: 999,
  },
  tagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
});
