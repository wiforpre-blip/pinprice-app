import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { getResolvedTagPreset } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { TagSize } from '@/types/editor';
import type { ImageDisplayRect, PriceTag } from '@/types/tag';
import { FALLBACK_TAG_SIZE, clampPointToImageRect } from '@/utils/editorGeometry';

type StaticTagProps = {
  imageRect: ImageDisplayRect;
  tag: PriceTag;
};

export function StaticTag({ imageRect, tag }: StaticTagProps) {
  const tagStyle = getResolvedTagPreset(tag);
  const isPlainSoldIcon = tag.type === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = tag.type === 'sold' && tag.soldTextFormat === 'icon';
  const [tagSize, setTagSize] = useState<TagSize>(FALLBACK_TAG_SIZE);
  const rawLeft = imageRect.x + tag.x * imageRect.width;
  const rawTop = imageRect.y + tag.y * imageRect.height;
  const clampedPoint = clampPointToImageRect(rawLeft, rawTop, imageRect, tagSize);

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
        isPlainSoldIcon && styles.plainSoldTag,
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          borderWidth: isPlainSoldIcon ? 0 : 1,
          minHeight: tagStyle.minHeight,
          maxWidth: tagStyle.maxWidth,
          paddingHorizontal: tagStyle.paddingHorizontal,
          paddingVertical: tagStyle.paddingVertical,
          left: clampedPoint.x,
          top: clampedPoint.y,
        },
      ]}>
      {isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon color={tagStyle.color} size={tagStyle.fontSize} thicknessScale={2} />
      ) : (
        <Text numberOfLines={2} style={[styles.staticTagText, { color: tagStyle.color, fontSize: tagStyle.fontSize, lineHeight: tagStyle.lineHeight }]}>
          {tag.text}
        </Text>
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
    ...theme.shadows.tag,
  },
  plainSoldTag: {
    shadowOpacity: 0,
    elevation: 0,
    shadowRadius: 0,
  },
  staticTagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
});
