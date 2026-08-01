import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { TagOutlinedText } from '@/components/editor/TagOutlinedText';
import { QUANTITY_MAX_DIGITS } from '@/constants/tagDefaults';
import {
  getResolvedTagPreset,
  getTagTextShadowStyle,
  getTagViewShadowStyle,
  resolveQuantityDigitsFieldWidth,
  resolveQuantityTagWidth,
  resolveTagMaxWidth,
  resolveTextTagDefaultWidth,
  TAG_BODY_MAX_LINES,
} from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';
import { clampPointToImageRect, EDITOR_ZOOM_DEFAULT, FALLBACK_TAG_SIZE, screenDeltaToCanvasDelta } from '@/utils/editorGeometry';
import { extractPriceDigits } from '@/utils/priceText';

export type TagInlineEdit = {
  value: string;
  /** Return the accepted value to keep local input in sync (e.g. after sanitize). */
  onChangeText: (text: string) => void | string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  prefix?: string;
  selection?: TextInputSelection;
  onFocus?: () => void;
  /** Return false to ignore the key (best-effort; platform support varies). */
  onKeyPress?: (key: string) => boolean;
  onSelectionChange?: (selection: TextInputSelection) => void;
};

type TagOverlayProps = {
  dragEnabled?: boolean;
  externalDragOffset?: DragPoint | null;
  inlineEdit?: TagInlineEdit | null;
  isSelected?: boolean;
  minDragY?: number;
  tag: PriceTag;
  textOverride?: string;
  typeOverride?: TagType;
  imageRect: ImageDisplayRect;
  /** Current editor viewport scale (1–3). Drag deltas are converted to canvas-local space. */
  viewportScale?: number;
  /**
   * Temporary visual Y shift for draft preview only (negative = up).
   * Cleared while dragging so finger tracking uses real tag.x/y.
   */
  visualOffsetY?: number;
  clampDragOffset?: (dx: number, dy: number) => DragPoint;
  onDragCancel: () => void;
  onDragEnd: (tagId: string, canvasX: number, canvasY: number, tagSize: TagSize, releasePoint: DragPoint) => void;
  onDragMove: (point: DragPoint) => void;
  onDragOffsetChange?: (offset: DragPoint) => void;
  onDragStart: (tag: PriceTag) => void;
  onLongPress?: (tag: PriceTag) => void;
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

type TextInputSelection = {
  start: number;
  end: number;
};

const DRAG_THRESHOLD = 6;
/** Cancel pending long-press / treat as drag intent once finger moves this far. */
const LONG_PRESS_MOVE_THRESHOLD = 10;
const LONG_PRESS_MS = 400;
const LONG_PRESS_VIBRATE_MS = 12;
const MULTILINE_INPUT_VERTICAL_PAD = 6;
const ZERO_OFFSET = { x: 0, y: 0 };

/**
 * Sync width estimate for text-tag chips (same frame as onChangeText).
 * Slightly overestimates so the chip grows before native multiline wraps.
 */
function estimateTextTagChipWidth(
  text: string,
  fontSize: number,
  paddingHorizontal: number,
  defaultWidth: number,
  maxWidth: number,
) {
  const lines = text.length === 0 ? [''] : text.split('\n');
  let longest = 0;

  for (const line of lines) {
    let lineWidth = 0;
    for (const char of line) {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 0x007f) {
        lineWidth += fontSize * (char === ' ' || char === '\t' ? 0.35 : 0.65);
      } else if (code >= 0x0e00 && code <= 0x0e7f) {
        // Thai — slight overestimate so chip grows before native wrap.
        lineWidth += fontSize * 0.9;
      } else {
        lineWidth += fontSize * 1.0;
      }
    }
    longest = Math.max(longest, lineWidth);
  }

  // Extra glyph of slack so the next keypress rarely wraps at the old width.
  const contentWidth = Math.ceil(longest + fontSize * 0.25 + paddingHorizontal * 2);
  return Math.min(maxWidth, Math.max(defaultWidth, contentWidth));
}

export const TagOverlay = forwardRef<TextInput, TagOverlayProps>(function TagOverlay(
  {
    dragEnabled = true,
    externalDragOffset = null,
    inlineEdit = null,
    isSelected = false,
    minDragY,
    tag,
    textOverride,
    typeOverride,
    imageRect,
    viewportScale = EDITOR_ZOOM_DEFAULT,
    visualOffsetY = 0,
    clampDragOffset,
    onDragCancel,
    onDragEnd,
    onDragMove,
    onDragOffsetChange,
    onDragStart,
    onLongPress,
    onPress,
    onSizeChange,
  },
  ref
) {
  const displayType = typeOverride ?? tag.type;
  const tagStyle = getResolvedTagPreset(tag, displayType);
  const displayText = textOverride ?? tag.text;
  const isPlainSoldIcon = displayType === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = displayType === 'sold' && tag.soldTextFormat === 'icon';
  const isFlatTag = isPlainSoldIcon || tagStyle.isFlat;
  const isCircle = tagStyle.shape === 'circle' && tagStyle.fixedSize != null;
  const isInlineEditing = inlineEdit != null && !isPlainSoldIcon && !isBadgeSoldIcon;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(ZERO_OFFSET);
  const [tagSize, setTagSize] = useState<TagSize>(FALLBACK_TAG_SIZE);
  // Local value so typing updates the native field immediately (no wait for parent publish effect).
  const [localInputValue, setLocalInputValue] = useState(inlineEdit?.value ?? '');
  /** Live chip width while editing text — updated in the same frame as onChangeText (grow-before-wrap). */
  const [textContentWidth, setTextContentWidth] = useState<number | null>(null);
  /** Live quantity chip width while editing — grows 1→3 digits with keystrokes. */
  const [quantityContentWidth, setQuantityContentWidth] = useState<number | null>(null);
  const tagViewRef = useRef<View>(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const hasLongPressedRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    onLongPress,
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
    onLongPress,
    onPress,
    onSizeChange,
  };

  // Sync from parent when edit opens or parent corrects value — set width in the same update path.
  useEffect(() => {
    if (inlineEdit == null) {
      return;
    }

    setLocalInputValue(inlineEdit.value);
  }, [inlineEdit?.value, isInlineEditing]);

  // Seed / clear chip width for text editing (grow-before-wrap uses sync estimate on each keystroke).
  useEffect(() => {
    if (!isInlineEditing || displayType !== 'text') {
      setTextContentWidth(null);
      return;
    }

    const defaultWidth = resolveTextTagDefaultWidth(imageRect.width);
    const seeded = estimateTextTagChipWidth(
      inlineEdit?.value ?? '',
      tagStyle.fontSize,
      tagStyle.paddingHorizontal,
      defaultWidth,
      imageRect.width,
    );
    setTextContentWidth(seeded);
  }, [
    displayType,
    imageRect.width,
    inlineEdit?.value,
    isInlineEditing,
    tagStyle.fontSize,
    tagStyle.paddingHorizontal,
  ]);

  // Seed / clear quantity chip width (1-digit default; expands as digits are typed).
  useEffect(() => {
    if (!isInlineEditing || displayType !== 'quantity') {
      setQuantityContentWidth(null);
      return;
    }

    const maxAllowed = resolveQuantityTagWidth(
      QUANTITY_MAX_DIGITS,
      tagStyle.fontSize,
      tagStyle.paddingHorizontal,
      tagStyle.maxWidth,
      tagStyle.minHeight,
    );
    const seeded = resolveQuantityTagWidth(
      inlineEdit?.value ?? '1',
      tagStyle.fontSize,
      tagStyle.paddingHorizontal,
      maxAllowed,
      tagStyle.minHeight,
    );
    setQuantityContentWidth(seeded);
  }, [
    displayType,
    inlineEdit?.value,
    isInlineEditing,
    tagStyle.fontSize,
    tagStyle.maxWidth,
    tagStyle.minHeight,
    tagStyle.paddingHorizontal,
  ]);

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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startDrag = () => {
    if (!dragEnabledRef.current || hasDraggedRef.current || hasLongPressedRef.current) {
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
        !hasLongPressedRef.current &&
        dragEnabledRef.current &&
        (Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD),
      onPanResponderGrant: () => {
        const currentTag = tagRef.current;
        const currentImageRect = imageRectRef.current;

        startPointRef.current = {
          x: currentImageRect.x + currentTag.x * currentImageRect.width,
          y: currentImageRect.y + currentTag.y * currentImageRect.height,
        };
        hasDraggedRef.current = false;
        hasLongPressedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          longPressTimerRef.current = null;
          if (hasDraggedRef.current) {
            return;
          }

          hasLongPressedRef.current = true;
          Vibration.vibrate(LONG_PRESS_VIBRATE_MS);
          callbacksRef.current.onLongPress?.(tagRef.current);
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (event, gestureState) => {
        if (hasLongPressedRef.current) {
          return;
        }

        const moveDistance = Math.max(Math.abs(gestureState.dx), Math.abs(gestureState.dy));

        if (moveDistance > LONG_PRESS_MOVE_THRESHOLD) {
          clearLongPressTimer();
        }

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

        if (hasLongPressedRef.current) {
          hasLongPressedRef.current = false;
          hasDraggedRef.current = false;
          setIsDragging(false);
          setDragOffset(ZERO_OFFSET);
          return;
        }

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
        hasLongPressedRef.current = false;
        hasDraggedRef.current = false;
        setIsDragging(false);
        setDragOffset(ZERO_OFFSET);
        callbacksRef.current.onDragCancel();
      },
    }),
  ).current;

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  const rawLeft = imageRect.x + tag.x * imageRect.width;
  const rawTop = imageRect.y + tag.y * imageRect.height;
  // Avoid re-clamping while typing — size changes would shift the chip and make the first glyph jump.
  const leftTop = isInlineEditing
    ? { x: rawLeft, y: rawTop }
    : clampPointToImageRect(rawLeft, rawTop, imageRect, tagSize);
  const left = leftTop.x;
  const top = leftTop.y;
  const activeOffset = isDragging ? dragOffset : externalDragOffset ?? ZERO_OFFSET;
  // Draft preview only: lift above keyboard/dock without changing tag.x/y. Drop while dragging.
  const previewOffsetY = isDragging || !Number.isFinite(visualOffsetY) ? 0 : visualOffsetY;
  // Cap by remaining space to the right so tags never hang past the photo edge.
  const roomToRight = Math.max(0, imageRect.x + imageRect.width - left);
  const isTextTag = displayType === 'text';
  // Text: max = full image (≤ roomToRight). Default create width stays ~49% of image.
  const textDefaultWidth = Math.min(resolveTextTagDefaultWidth(imageRect.width), roomToRight);
  const displayMaxWidth = Math.min(resolveTagMaxWidth(tag, imageRect.width, typeOverride), roomToRight);
  // Text tags: no fixed line cap — grow with content until the image bottom.
  // Other body tags keep TAG_BODY_MAX_LINES; circle/quantity stay single-line.
  const bodyMaxLines = isCircle || displayType === 'quantity' ? 1 : isTextTag ? undefined : TAG_BODY_MAX_LINES;
  const isQuantity = displayType === 'quantity';
  const isCompactInline = isInlineEditing && (isQuantity || displayType === 'price');
  // Remaining image height from tag top — hard cap so the chip never hangs past the photo.
  const roomBelow = Math.max(tagStyle.minHeight, imageRect.y + imageRect.height - top);
  const multilineInputMaxHeight =
    isInlineEditing && inlineEdit?.multiline
      ? Math.max(tagStyle.lineHeight + MULTILINE_INPUT_VERTICAL_PAD, roomBelow - tagStyle.paddingVertical * 2)
      : undefined;
  const singleLineInputMinHeight = Math.max(
    tagStyle.minHeight - tagStyle.paddingVertical * 2,
    tagStyle.lineHeight,
  );
  const inlineHostMinHeight = tagStyle.minHeight;
  // Quantity: start at 1 digit, expand to 2–3 as the user types (same grow-with-content idea as text).
  const quantityDigitSource = isQuantity
    ? localInputValue || extractPriceDigits(displayText) || '1'
    : '1';
  const quantityDigitsWidth = isQuantity
    ? resolveQuantityDigitsFieldWidth(quantityDigitSource, tagStyle.fontSize)
    : 0;
  const quantityMaxAllowed = isQuantity
    ? Math.min(
        resolveQuantityTagWidth(
          QUANTITY_MAX_DIGITS,
          tagStyle.fontSize,
          tagStyle.paddingHorizontal,
          tagStyle.maxWidth,
          tagStyle.minHeight,
        ),
        roomToRight,
      )
    : 0;
  const quantityEditWidth =
    isQuantity && isInlineEditing
      ? Math.min(
          quantityMaxAllowed,
          quantityContentWidth ??
            resolveQuantityTagWidth(
              quantityDigitSource,
              tagStyle.fontSize,
              tagStyle.paddingHorizontal,
              quantityMaxAllowed,
              tagStyle.minHeight,
            ),
        )
      : undefined;
  const tagMaxWidth = isInlineEditing && isQuantity ? quantityMaxAllowed : displayMaxWidth;
  // Text edit: chip + TextInput share the same width (center-aligned). Grow via sync estimate.
  const textEditWidth =
    isTextTag && isInlineEditing
      ? Math.min(displayMaxWidth, Math.max(textDefaultWidth, textContentWidth ?? textDefaultWidth))
      : undefined;
  const contentTextAlign = isQuantity ? ('left' as const) : ('center' as const);
  // TextInput cannot use multi-layer outline — approximate stroke with a tight black halo while typing.
  const editOutlineShadow =
    tagStyle.textOutline != null
      ? getTagTextShadowStyle({
          color: tagStyle.textOutline.color,
          offset: { width: 0, height: 0 },
          radius: Math.max(3, tagStyle.textOutline.width + 1),
        })
      : getTagTextShadowStyle(tagStyle.textShadow);
  const textStyle = [
    styles.tagText,
    isQuantity ? styles.tagTextStart : null,
    {
      color: tagStyle.color,
      fontSize: tagStyle.fontSize,
      lineHeight: tagStyle.lineHeight,
      fontWeight: tagStyle.fontWeight,
      fontStyle: tagStyle.fontStyle,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
  ];
  const displayTextStyle = [
    styles.tagText,
    isQuantity ? styles.tagTextStart : null,
    // Outlined styles must not carry textShadow — it multiplies across stroke copies.
    tagStyle.textOutline ? null : getTagTextShadowStyle(tagStyle.textShadow),
    {
      fontSize: tagStyle.fontSize,
      // Keep line box >= preset so bold/Thai/comma glyphs are not clipped after save.
      lineHeight: tagStyle.lineHeight,
      fontWeight: tagStyle.fontWeight,
      fontStyle: tagStyle.fontStyle,
      ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    },
  ];
  const editTextStyle = [...textStyle, editOutlineShadow];

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
      ref={tagViewRef}
      {...(isInlineEditing ? undefined : panResponder.panHandlers)}
      accessible={!isInlineEditing}
      accessibilityRole={isInlineEditing ? undefined : 'button'}
      accessibilityLabel={isInlineEditing ? undefined : `Edit ${displayText} tag`}
      onLayout={handleLayout}
      style={[
        styles.tag,
        isCircle && {
          width: tagStyle.fixedSize!,
          height: tagStyle.fixedSize!,
        },
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          borderWidth: isCircle ? Math.max(tagStyle.borderWidth, 2) : tagStyle.borderWidth,
          borderRadius: isCircle && tagStyle.fixedSize != null ? tagStyle.fixedSize / 2 : tagStyle.borderRadius,
          minHeight: tagStyle.minHeight,
          maxWidth: tagMaxWidth,
          // Language: floor width to the capsule size so short codes stay pill-shaped at every size.
          ...(displayType === 'language' ? { minWidth: tagMaxWidth } : null),
          ...(textEditWidth != null ? { width: textEditWidth } : null),
          ...(quantityEditWidth != null ? { width: quantityEditWidth } : null),
          // Android defaults to overflow:hidden and clips descenders / Thai marks / outline halo.
          // Circles stay clipped to the disc (rings need visible when selected).
          // Text tags must stay visible too — while selected/editing, overflow:visible already let
          // multiline paint past maxHeight; after save, switching to hidden clipped Enter lines.
          overflow: (isCircle && !isSelected ? 'hidden' : 'visible') as 'visible' | 'hidden',
          // Soft cap so the chip layout does not claim space past the photo bottom.
          // Overflow stays visible so glyphs/lines inside that budget are not cut unexpectedly.
          ...(isTextTag ? { maxHeight: roomBelow } : null),
          // Zero outer padding while editing so TextInput host fills the full tag hit area.
          paddingHorizontal: isInlineEditing ? 0 : tagStyle.paddingHorizontal,
          paddingVertical: isInlineEditing ? 0 : tagStyle.paddingVertical,
          alignItems: isQuantity ? 'flex-start' : 'center',
          left,
          top,
          transform: [
            { translateX: activeOffset.x },
            { translateY: activeOffset.y + previewOffsetY },
            ...(tagStyle.rotateDeg !== 0 ? [{ rotate: `${tagStyle.rotateDeg}deg` as const }] : []),
          ],
          ...getTagViewShadowStyle(isFlatTag ? null : tagStyle.viewShadow),
        },
        // Flat/transparent tags must not get elevation — Android draws a rectangular
        // shadow under the transparent bounds (very visible on sold red cross).
        isSelected && styles.selectedTag,
        isSelected && isFlatTag && styles.selectedFlatTag,
        isDragging && styles.draggingTag,
        isDragging && isFlatTag && styles.draggingFlatTag,
      ]}>
      {isSelected ? (
        <View
          pointerEvents="none"
          style={[
            styles.selectedRing,
            isPlainSoldIcon || isCircle
              ? styles.circleSelectedRing
              : {
                  borderRadius: Math.max(theme.radius.md, tagStyle.borderRadius + theme.spacing.sm),
                },
          ]}
        />
      ) : null}
      {isInlineEditing && inlineEdit ? (
        <View
          style={[
            styles.inlineEditHost,
            isCompactInline ? styles.inlineEditHostCompact : styles.inlineEditHostStretch,
            isQuantity && styles.inlineEditHostQuantity,
            {
              minHeight: inlineHostMinHeight,
              paddingHorizontal: tagStyle.paddingHorizontal,
              paddingVertical: tagStyle.paddingVertical,
            },
          ]}>
          {inlineEdit.prefix ? (
            <Text pointerEvents="none" style={[editTextStyle, styles.inlinePrefix]}>
              {inlineEdit.prefix}
            </Text>
          ) : null}
          <TextInput
            ref={ref}
            autoCorrect={false}
            autoFocus={inlineEdit.autoFocus ?? true}
            blurOnSubmit={false}
            keyboardType={inlineEdit.keyboardType}
            maxLength={inlineEdit.maxLength}
            multiline={inlineEdit.multiline}
            // Omit numberOfLines when multiline so Android can auto-grow from 1 line up to maxHeight.
            numberOfLines={inlineEdit.multiline ? undefined : 1}
            onChangeText={(nextText) => {
              const accepted = inlineEdit.onChangeText(nextText);
              const nextValue = typeof accepted === 'string' ? accepted : nextText;
              // Grow chip + input together (same width). setNativeProps applies width before re-render
              // to reduce wrap-then-expand when the glyph is already in the native field.
              if (isTextTag) {
                const nextWidth = estimateTextTagChipWidth(
                  nextValue,
                  tagStyle.fontSize,
                  tagStyle.paddingHorizontal,
                  textDefaultWidth,
                  displayMaxWidth,
                );
                tagViewRef.current?.setNativeProps({ style: { width: nextWidth } });
                setTextContentWidth(nextWidth);
              }
              if (isQuantity) {
                const nextWidth = resolveQuantityTagWidth(
                  nextValue,
                  tagStyle.fontSize,
                  tagStyle.paddingHorizontal,
                  quantityMaxAllowed,
                  tagStyle.minHeight,
                );
                tagViewRef.current?.setNativeProps({ style: { width: nextWidth } });
                setQuantityContentWidth(nextWidth);
              }
              setLocalInputValue(nextValue);
            }}
            onFocus={inlineEdit.onFocus}
            onKeyPress={
              inlineEdit.onKeyPress
                ? (event) => {
                    if (inlineEdit.onKeyPress?.(event.nativeEvent.key) === false) {
                      event.preventDefault?.();
                    }
                  }
                : undefined
            }
            placeholder={inlineEdit.placeholder}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType={inlineEdit.multiline ? 'default' : 'done'}
            // Allow scroll only when content hits the image-height cap; otherwise grow freely.
            scrollEnabled={inlineEdit.multiline ? true : undefined}
            selection={inlineEdit.selection}
            showSoftInputOnFocus
            underlineColorAndroid="transparent"
            style={[
              styles.inlineInput,
              editTextStyle,
              inlineEdit.multiline && styles.inlineInputMultiline,
              // Avoid flex:1 on multiline — it locks height to the host and blocks Android auto-grow.
              isCompactInline
                ? styles.inlineInputCompact
                : inlineEdit.multiline
                  ? styles.inlineInputMultilineStretch
                  : styles.inlineInputStretch,
              {
                minHeight: singleLineInputMinHeight,
                ...(inlineEdit.multiline
                  ? {
                      maxHeight: multilineInputMaxHeight,
                    }
                  : null),
                minWidth:
                  isQuantity
                    ? quantityDigitsWidth
                    : displayType === 'price'
                      ? Math.ceil(tagStyle.fontSize * 3.2)
                      : undefined,
                ...(isQuantity
                  ? {
                      width: quantityDigitsWidth,
                    }
                  : null),
              },
            ]}
            textAlign={contentTextAlign}
            textAlignVertical={inlineEdit.multiline ? 'top' : 'center'}
            onSelectionChange={
              inlineEdit.onSelectionChange
                ? (event) => inlineEdit.onSelectionChange?.(event.nativeEvent.selection)
                : undefined
            }
            value={localInputValue}
          />
        </View>
      ) : isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon color={tagStyle.color} size={tagStyle.fontSize} thicknessScale={2} />
      ) : (
        <TagOutlinedText
          color={tagStyle.color}
          numberOfLines={bodyMaxLines}
          outline={tagStyle.textOutline}
          style={displayTextStyle}>
          {displayText}
        </TagOutlinedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTag: {
    zIndex: 4,
    elevation: 8,
  },
  selectedFlatTag: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  draggingTag: {
    opacity: 0.92,
    zIndex: 5,
    elevation: 12,
  },
  draggingFlatTag: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  selectedRing: {
    position: 'absolute',
    top: -theme.spacing.sm,
    right: -theme.spacing.sm,
    bottom: -theme.spacing.sm,
    left: -theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.selectionRing,
  },
  circleSelectedRing: {
    borderRadius: 999,
  },
  tagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
  tagTextStart: {
    textAlign: 'left',
  },
  inlineEditHost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditHostCompact: {
    alignSelf: 'center',
  },
  inlineEditHostQuantity: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    width: '100%',
  },
  inlineEditHostStretch: {
    alignSelf: 'stretch',
    width: '100%',
  },
  inlinePrefix: {
    flexGrow: 0,
    flexShrink: 0,
  },
  inlineInput: {
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  inlineInputCompact: {
    flexGrow: 0,
    flexShrink: 0,
  },
  inlineInputStretch: {
    flex: 1,
  },
  // Width fills host; height comes from content (auto-grow) up to maxHeight.
  inlineInputMultilineStretch: {
    alignSelf: 'stretch',
    width: '100%',
  },
  inlineInputMultiline: {
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
  },
});
