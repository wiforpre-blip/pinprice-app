import type { ImageDisplayRect } from '@/types/tag';

export type Size = {
  width: number;
  height: number;
};

export type PricePanelCompositionLayout = {
  chartHeight: number;
  imageAreaSize: Size;
  imageRect: ImageDisplayRect | null;
};

export const DEFAULT_CHART_HEIGHT_RATIO = 0.28;
export const DEFAULT_MIN_CHART_HEIGHT = 88;
export const DEFAULT_MAX_CHART_HEIGHT_RATIO = 0.34;
/** Used when composition size is not measured yet but the chart must still be visible. */
export const FALLBACK_CHART_HEIGHT = DEFAULT_MIN_CHART_HEIGHT;

function getContainedImageRect(canvasSize: Size, imageSize: Size | null): ImageDisplayRect | null {
  if (!imageSize || canvasSize.width <= 0 || canvasSize.height <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
    return null;
  }

  const canvasRatio = canvasSize.width / canvasSize.height;
  const imageRatio = imageSize.width / imageSize.height;

  if (imageRatio > canvasRatio) {
    const height = canvasSize.width / imageRatio;

    return {
      x: 0,
      y: (canvasSize.height - height) / 2,
      width: canvasSize.width,
      height,
    };
  }

  const width = canvasSize.height * imageRatio;

  return {
    x: (canvasSize.width - width) / 2,
    y: 0,
    width,
    height: canvasSize.height,
  };
}

/**
 * Shared layout for Price List composition (editor + future export).
 * Image area is top; chart is a fixed-height bottom strip so composition stays stable.
 */
export function getPricePanelCompositionLayout(
  compositionSize: Size,
  imageSize: Size | null,
  options?: {
    chartHeightRatio?: number;
    hasChart?: boolean;
    maxChartHeightRatio?: number;
    minChartHeight?: number;
  },
): PricePanelCompositionLayout {
  const hasChart = options?.hasChart ?? true;
  const chartHeightRatio = options?.chartHeightRatio ?? DEFAULT_CHART_HEIGHT_RATIO;
  const minChartHeight = options?.minChartHeight ?? DEFAULT_MIN_CHART_HEIGHT;
  const maxChartHeightRatio = options?.maxChartHeightRatio ?? DEFAULT_MAX_CHART_HEIGHT_RATIO;

  if (compositionSize.width <= 0 || compositionSize.height <= 0) {
    if (hasChart) {
      return {
        chartHeight: FALLBACK_CHART_HEIGHT,
        imageAreaSize: { width: 0, height: 0 },
        imageRect: null,
      };
    }

    return {
      chartHeight: 0,
      imageAreaSize: { width: 0, height: 0 },
      imageRect: null,
    };
  }

  if (!hasChart) {
    const imageAreaSize = { width: compositionSize.width, height: compositionSize.height };

    return {
      chartHeight: 0,
      imageAreaSize,
      imageRect: getContainedImageRect(imageAreaSize, imageSize),
    };
  }

  const maxChartHeight = compositionSize.height * maxChartHeightRatio;
  const preferredChartHeight = compositionSize.height * chartHeightRatio;
  // Never exceed available max, but keep at least a readable strip when space allows.
  const chartHeight = Math.max(
    Math.min(minChartHeight, maxChartHeight),
    Math.min(maxChartHeight, preferredChartHeight),
  );
  const safeChartHeight = chartHeight > 0 ? chartHeight : Math.min(FALLBACK_CHART_HEIGHT, compositionSize.height);
  const imageAreaSize = {
    width: compositionSize.width,
    height: Math.max(0, compositionSize.height - safeChartHeight),
  };

  return {
    chartHeight: safeChartHeight,
    imageAreaSize,
    imageRect: getContainedImageRect(imageAreaSize, imageSize),
  };
}
