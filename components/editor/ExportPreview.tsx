import { Image, type ImageLoadEventData } from 'expo-image';
import { forwardRef, useMemo } from 'react';
import { LayoutChangeEvent, PixelRatio, StyleSheet, View } from 'react-native';

import { ExportWatermark } from '@/components/editor/ExportWatermark';
import { PanelMarker } from '@/components/editor/PanelMarker';
import { PriceListComposition } from '@/components/editor/PriceListComposition';
import { PricePanel } from '@/components/editor/PricePanel';
import { StaticTag } from '@/components/editor/StaticTag';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, Size } from '@/types/editor';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { ImageDisplayRect, PriceTag } from '@/types/tag';
import { getContainedImageRect } from '@/utils/editorGeometry';
import { getPricePanelCompositionLayout } from '@/utils/pricePanelLayout';

type ExportPreviewProps = {
  editorMode: EditorPricingMode;
  /** Full-res capture image load state for save/share guard. */
  onCaptureImageLoad?: (loaded: boolean) => void;
  imageSize: Size | null;
  imageUri: string;
  onImageLoad: (event: ImageLoadEventData) => void;
  /** Host (available preview area) layout — used to fit the on-screen preview only. */
  onLayout: (event: LayoutChangeEvent) => void;
  panelMarkers: PanelMarkerType[];
  /** Available preview area size (not the capture view). */
  previewSize: Size;
  /** Must come from shouldRenderWatermark(tier) — never hardcode true. */
  showWatermark: boolean;
  tags: PriceTag[];
};

const noopMarkerAction = (_markerId: string) => {};

function toFullBleedRect(size: Size): ImageDisplayRect {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

/**
 * Layout size in dp so view-shot's device-pixel capture ≈ source image pixels.
 * Output is still forced to imageSize via captureRef width/height.
 */
function getCaptureLayoutSize(imageSize: Size): Size {
  const pixelRatio = PixelRatio.get();
  return {
    width: imageSize.width / pixelRatio,
    height: imageSize.height / pixelRatio,
  };
}

export const ExportPreview = forwardRef<View, ExportPreviewProps>(function ExportPreview(
  {
    editorMode,
    onCaptureImageLoad,
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

  const priceListImageRect = useMemo(
    () => getPricePanelCompositionLayout(previewSize, imageSize, { hasChart: showPriceChart }).imageRect,
    [imageSize, previewSize, showPriceChart],
  );

  // On-screen preview frame only — never used as the capture target size.
  const previewDisplaySize = useMemo(() => {
    const fitted = getContainedImageRect(previewSize, imageSize);
    if (!fitted) {
      return null;
    }
    return { width: fitted.width, height: fitted.height };
  }, [imageSize, previewSize]);

  const previewImageRect = useMemo(
    () => (previewDisplaySize ? toFullBleedRect(previewDisplaySize) : null),
    [previewDisplaySize],
  );

  const captureLayoutSize = useMemo(
    () => (imageSize && imageSize.width > 0 && imageSize.height > 0 ? getCaptureLayoutSize(imageSize) : null),
    [imageSize],
  );

  // Tags/watermark are laid out in preview-display coords then scaled onto the capture canvas
  // so absolute font/border sizes match what the seller sees on preview.
  const captureOverlay = useMemo(() => {
    if (!captureLayoutSize || !previewDisplaySize || previewDisplaySize.width <= 0) {
      return null;
    }

    const scale = captureLayoutSize.width / previewDisplaySize.width;

    return {
      imageRect: toFullBleedRect(previewDisplaySize),
      scale,
      style: {
        height: previewDisplaySize.height,
        left: (captureLayoutSize.width - previewDisplaySize.width) / 2,
        top: (captureLayoutSize.height - previewDisplaySize.height) / 2,
        transform: [{ scale }],
        width: previewDisplaySize.width,
      },
    };
  }, [captureLayoutSize, previewDisplaySize]);

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
    <View style={styles.root}>
      <View style={styles.exportChrome}>
        <View onLayout={onLayout} style={styles.exportHost}>
          {previewDisplaySize && previewImageRect ? (
            <View style={[styles.previewCanvas, { width: previewDisplaySize.width, height: previewDisplaySize.height }]}>
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="fill" onLoad={onImageLoad} />
              {tags.map((tag) => (
                <StaticTag imageRect={previewImageRect} key={tag.id} tag={tag} />
              ))}
              {showWatermark ? <ExportWatermark imageRect={previewImageRect} /> : null}
            </View>
          ) : null}
        </View>
      </View>

      {captureLayoutSize && captureOverlay ? (
        <View
          ref={ref}
          collapsable={false}
          pointerEvents="none"
          style={[styles.exportCaptureRoot, { width: captureLayoutSize.width, height: captureLayoutSize.height }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="fill"
            onLoad={() => onCaptureImageLoad?.(true)}
            onError={() => onCaptureImageLoad?.(false)}
          />
          <View pointerEvents="none" style={[styles.captureOverlay, captureOverlay.style]}>
            {tags.map((tag) => (
              <StaticTag imageRect={captureOverlay.imageRect} key={`export-${tag.id}`} tag={tag} />
            ))}
            {showWatermark ? <ExportWatermark imageRect={captureOverlay.imageRect} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  exportCompositionHost: {
    flex: 1,
    overflow: 'hidden',
  },
  /** Preview frame only — not captured. */
  exportChrome: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoMockBackground,
  },
  /** Measures available area; letterbox around the preview frame stays here. */
  exportHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewCanvas: {
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  /**
   * Full-resolution capture target (sibling of preview chrome).
   * Kept in-tree and laid out, but moved off-screen so preview UI does not change.
   */
  exportCaptureRoot: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  captureOverlay: {
    position: 'absolute',
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
