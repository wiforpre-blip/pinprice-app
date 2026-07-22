import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { getResolvedTagPreset } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';

type TagOverlayProps = {
  dragEnabled?: boolean;
  externalDragOffset?: DragPoint | null;
  isSelected?: boolean;
  minDragY?: number;
  tag: PriceTag;
  textOverride?: string;
  typeOverride?: TagType;
  imageRect: ImageDisplayRect;
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
const LONG_PRESS_DELAY_MS = 260;
const ZERO_OFFSET = { x: 0, y: 0 };
const FALLBACK_TAG_SIZE: TagSize = { width: 80, height: 32 };

export function TagOverlay({
  dragEnabled = true,
  externalDragOffset = null,
  isSelected = false,
  minDragY,
  tag,
  textOverride,
  typeOverride,
  imageRect,
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(ZERO_OFFSET);
  const [tagSize, setTagSize] = useState<TagSize>(FALLBACK_TAG_SIZE);
  const startPointRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagRef = useRef(tag);
  const imageRectRef = useRef(imageRect);
  const minDragYRef = useRef(minDragY);
  const tagSizeRef = useRef(tagSize);
  const dragEnabledRef = useRef(dragEnabled);
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

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) {
      return;
    }

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const getBoundedDragOffset = (dx: number, dy: number) => {
    const customClamp = clampDragOffsetRef.current;

    if (customClamp) {
      return customClamp(dx, dy);
    }

    const minY = minDragYRef.current;

    if (typeof minY !== 'number' || !Number.isFinite(minY)) {
      return { x: dx, y: dy };
    }

    const nextY = Math.max(startPointRef.current.y + dy, minY);

    return {
      x: dx,
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
      onPanResponderGrant: (event) => {
        const currentTag = tagRef.current;
        const currentImageRect = imageRectRef.current;

        startPointRef.current = {
          x: currentImageRect.x + currentTag.x * currentImageRect.width,
          y: currentImageRect.y + currentTag.y * currentImageRect.height,
        };
        hasDraggedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
        clearLongPressTimer();

        if (!dragEnabledRef.current) {
          return;
        }

        longPressTimerRef.current = setTimeout(() => {
          startDrag();
          callbacksRef.current.onDragMove({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
        }, LONG_PRESS_DELAY_MS);
      },
      onPanResponderMove: (event, gestureState) => {
        if (!dragEnabledRef.current) {
          return;
        }

        const hasMovedEnough = Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD;

        if (!hasMovedEnough) {
          return;
        }

        clearLongPressTimer();
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
        clearLongPressTimer();

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
        clearLongPressTimer();
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
        isDragging && styles.draggingTag,
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          minHeight: tagStyle.minHeight,
          maxWidth: tagStyle.maxWidth,
          paddingHorizontal: tagStyle.paddingHorizontal,
          paddingVertical: tagStyle.paddingVertical,
          left,
          top,
          transform: [{ translateX: activeOffset.x }, { translateY: activeOffset.y }],
        },
      ]}>
      {isSelected ? <View pointerEvents="none" style={[styles.selectedArea, { borderColor: tagStyle.borderColor, backgroundColor: tagStyle.borderColor }]} /> : null}
      <Text numberOfLines={2} style={[styles.tagText, { color: tagStyle.color, fontSize: tagStyle.fontSize, lineHeight: tagStyle.lineHeight }]}>
        {displayText}
      </Text>
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
  draggingTag: {
    opacity: 0.92,
    zIndex: 3,
  },
  selectedArea: {
    position: 'absolute',
    top: -theme.spacing.xs,
    right: -theme.spacing.xs,
    bottom: -theme.spacing.xs,
    left: -theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.tags.price.borderColor,
    backgroundColor: theme.tags.price.borderColor,
    opacity: 0.12,
  },
  tagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
});
