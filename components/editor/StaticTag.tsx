import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { TagOutlinedText } from '@/components/editor/TagOutlinedText';
import { getResolvedTagPreset, getTagTextShadowStyle, getTagViewShadowStyle, resolveTagMaxWidth, TAG_BODY_MAX_LINES } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { TagSize } from '@/types/editor';
import type { ImageDisplayRect, PriceTag } from '@/types/tag';
import { FALLBACK_TAG_SIZE, clampPointToImageRect } from '@/utils/editorGeometry';

type StaticTagProps = {
  /** Anchor point for tag.x / tag.y — style preview uses center so chips sit mid-image. */
  anchor?: 'topLeft' | 'center';
  imageRect: ImageDisplayRect;
  tag: PriceTag;
};

export function StaticTag({ anchor = 'topLeft', imageRect, tag }: StaticTagProps) {
  const tagStyle = getResolvedTagPreset(tag);
  const isPlainSoldIcon = tag.type === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = tag.type === 'sold' && tag.soldTextFormat === 'icon';
  const isFlatTag = isPlainSoldIcon || tagStyle.isFlat;
  const isCircle = tagStyle.shape === 'circle' && tagStyle.fixedSize != null;
  const [tagSize, setTagSize] = useState<TagSize>(() =>
    isCircle && tagStyle.fixedSize != null
      ? { width: tagStyle.fixedSize, height: tagStyle.fixedSize }
      : { width: FALLBACK_TAG_SIZE.width, height: Math.max(FALLBACK_TAG_SIZE.height, tagStyle.minHeight) },
  );
  const rawLeft = imageRect.x + tag.x * imageRect.width;
  const rawTop = imageRect.y + tag.y * imageRect.height;
  const anchoredLeft = anchor === 'center' ? rawLeft - tagSize.width / 2 : rawLeft;
  const anchoredTop = anchor === 'center' ? rawTop - tagSize.height / 2 : rawTop;
  const clampedPoint = clampPointToImageRect(anchoredLeft, anchoredTop, imageRect, tagSize);
  const roomToRight = Math.max(0, imageRect.x + imageRect.width - clampedPoint.x);
  const displayMaxWidth = Math.min(resolveTagMaxWidth(tag, imageRect.width), roomToRight);
  const isTextTag = tag.type === 'text';
  const bodyMaxLines = isCircle || tag.type === 'quantity' ? 1 : isTextTag ? undefined : TAG_BODY_MAX_LINES;
  const isQuantity = tag.type === 'quantity';
  const roomBelow = Math.max(tagStyle.minHeight, imageRect.y + imageRect.height - clampedPoint.y);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    setTagSize({ width, height });
  };

  return (
    <View
      pointerEvents="none"
      onLayout={handleLayout}
      style={[
        styles.staticTag,
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
          maxWidth: displayMaxWidth,
          // Language: floor width to the capsule size so short codes stay pill-shaped at every size.
          ...(tag.type === 'language' ? { minWidth: displayMaxWidth } : null),
          // Match TagOverlay: non-circle tags keep overflow visible so multiline / Thai / halo
          // are not clipped after save. Circles stay clipped to the disc.
          overflow: (isCircle ? 'hidden' : 'visible') as 'hidden' | 'visible',
          ...(isTextTag ? { maxHeight: roomBelow } : null),
          paddingHorizontal: tagStyle.paddingHorizontal,
          paddingVertical: tagStyle.paddingVertical,
          alignItems: isQuantity ? 'flex-start' : 'center',
          left: clampedPoint.x,
          top: clampedPoint.y,
          // Keep export elevation below free-tier watermark (elevation 100).
          ...getTagViewShadowStyle(isFlatTag ? null : tagStyle.viewShadow),
          ...(tagStyle.rotateDeg !== 0 ? { transform: [{ rotate: `${tagStyle.rotateDeg}deg` as const }] } : null),
        },
      ]}>
      {isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon color={tagStyle.color} size={tagStyle.fontSize} thicknessScale={2} />
      ) : (
        <TagOutlinedText
          color={tagStyle.color}
          numberOfLines={bodyMaxLines}
          outline={tagStyle.textOutline}
          style={[
            styles.staticTagText,
            isQuantity && styles.staticTagTextStart,
            // Outlined styles must not carry textShadow — it multiplies across stroke copies.
            tagStyle.textOutline ? null : getTagTextShadowStyle(tagStyle.textShadow),
            {
              fontSize: tagStyle.fontSize,
              lineHeight: tagStyle.lineHeight,
              fontWeight: tagStyle.fontWeight,
              fontStyle: tagStyle.fontStyle,
              ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
            },
          ]}>
          {tag.text}
        </TagOutlinedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  staticTag: {
    position: 'absolute',
    zIndex: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticTagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
  staticTagTextStart: {
    textAlign: 'left',
  },
});
