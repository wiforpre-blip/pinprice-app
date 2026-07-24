import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { WATERMARK_STYLE } from '@/constants/watermark';
import { useTranslation } from '@/contexts/LanguageContext';
import type { ImageDisplayRect } from '@/types/tag';
import { getWatermarkLayout, getWatermarkText } from '@/utils/watermark';

type ExportWatermarkProps = {
  /** Contained image bounds inside the export canvas — watermark sits on this rect. */
  imageRect: ImageDisplayRect;
};

/**
 * Compact free-tier watermark rendered inside the export capture tree.
 * Anchored to the bottom-right of the displayed image, not the letterbox canvas.
 */
export function ExportWatermark({ imageRect }: ExportWatermarkProps) {
  const { language, t } = useTranslation();
  const layout = useMemo(
    () => getWatermarkLayout({ width: imageRect.width, height: imageRect.height }),
    [imageRect.height, imageRect.width],
  );
  const translated = t('export.watermark');
  const label = translated === 'export.watermark' ? getWatermarkText(language) : translated;

  if (!layout) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.imageFrame,
        {
          left: imageRect.x,
          top: imageRect.y,
          width: imageRect.width,
          height: imageRect.height,
        },
      ]}>
      <View
        style={[
          styles.anchor,
          {
            bottom: layout.margin,
            right: layout.margin,
          },
        ]}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: WATERMARK_STYLE.backgroundColor,
              borderRadius: layout.borderRadius,
              gap: layout.gap,
              paddingHorizontal: layout.paddingHorizontal,
              paddingVertical: layout.paddingVertical,
            },
          ]}>
          <MaterialIcons color={WATERMARK_STYLE.textColor} name="local-offer" size={layout.iconSize} />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: WATERMARK_STYLE.textColor,
                fontSize: layout.fontSize,
                lineHeight: layout.fontSize * 1.2,
              },
            ]}>
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageFrame: {
    position: 'absolute',
    zIndex: 10,
  },
  anchor: {
    position: 'absolute',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  label: {
    fontWeight: '600',
    flexShrink: 1,
  },
});
