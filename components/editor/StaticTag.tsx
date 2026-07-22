import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

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
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          minHeight: tagStyle.minHeight,
          maxWidth: tagStyle.maxWidth,
          paddingHorizontal: tagStyle.paddingHorizontal,
          paddingVertical: tagStyle.paddingVertical,
          left: clampedPoint.x,
          top: clampedPoint.y,
        },
      ]}>
      <Text numberOfLines={2} style={[styles.staticTagText, { color: tagStyle.color, fontSize: tagStyle.fontSize, lineHeight: tagStyle.lineHeight }]}>
        {tag.text}
      </Text>
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
  staticTagText: {
    ...theme.typography.tag,
    textAlign: 'center',
  },
});
