import { Image, type ImageLoadEventData } from 'expo-image';
import { forwardRef, useMemo } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ExportWatermark } from '@/components/editor/ExportWatermark';
import { PanelMarker } from '@/components/editor/PanelMarker';
import { PriceListComposition } from '@/components/editor/PriceListComposition';
import { PricePanel } from '@/components/editor/PricePanel';
import { StaticTag } from '@/components/editor/StaticTag';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, Size } from '@/types/editor';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';
import { getContainedImageRect } from '@/utils/editorGeometry';
import { getPricePanelCompositionLayout } from '@/utils/pricePanelLayout';

type ExportPreviewProps = {
  editorMode: EditorPricingMode;
  imageSize: Size | null;
  imageUri: string;
  onImageLoad: (event: ImageLoadEventData) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  panelMarkers: PanelMarkerType[];
  previewSize: Size;
  /** Must come from shouldRenderWatermark(tier) — never hardcode true. */
  showWatermark: boolean;
  tags: PriceTag[];
};

const noopMarkerAction = (_markerId: string) => {};

export const ExportPreview = forwardRef<View, ExportPreviewProps>(function ExportPreview(
  {
    editorMode,
    imageSize,
    imageUri,
    onImageLoad,
    onLayout,
    panelMarkers,
    previewSize,
    showWatermark,
    tags,
  },
  ref,
) {
  const { t } = useTranslation();
  const showPriceChart = panelMarkers.length > 0;

  const previewImageRect = useMemo(() => getContainedImageRect(previewSize, imageSize), [imageSize, previewSize]);

  const priceListImageRect = useMemo(
    () => getPricePanelCompositionLayout(previewSize, imageSize, { hasChart: showPriceChart }).imageRect,
    [imageSize, previewSize, showPriceChart],
  );

  if (editorMode === 'priceList') {
    return (
      <View ref={ref} collapsable={false} onLayout={onLayout} style={styles.exportCompositionHost}>
        <PriceListComposition
          chart={
            <PricePanel
              markers={panelMarkers}
              onDeleteMarker={noopMarkerAction}
              onEditMarker={noopMarkerAction}
              placeholder={t('pricePanel.enterPrice')}
              selectedMarkerId={null}
            />
          }
          showChart={showPriceChart}>
          <View style={styles.imageCanvas}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
            {priceListImageRect
              ? panelMarkers.map((marker, index) => (
                  <PanelMarker
                    imageRect={priceListImageRect}
                    isSelected={false}
                    key={marker.id}
                    marker={marker}
                    number={index + 1}
                    onPress={noopMarkerAction}
                  />
                ))
              : null}
            {showWatermark && priceListImageRect ? <ExportWatermark imageRect={priceListImageRect} /> : null}
          </View>
        </PriceListComposition>
      </View>
    );
  }

  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={styles.exportCanvas}>
      <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
      {previewImageRect ? tags.map((tag) => <StaticTag imageRect={previewImageRect} key={tag.id} tag={tag} />) : null}
      {showWatermark && previewImageRect ? <ExportWatermark imageRect={previewImageRect} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  exportCompositionHost: {
    flex: 1,
    overflow: 'hidden',
  },
  exportCanvas: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoMockBackground,
  },
  imageCanvas: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors.photoMockBackground,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
