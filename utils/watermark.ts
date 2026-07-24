import { WATERMARK_STYLE, WATERMARK_TEXT } from '@/constants/watermark';
import type { Size } from '@/types/editor';
import type { Language } from '@/types/settings';

/**
 * Free tier shows the watermark; unlocked / Pro skips it.
 * Always call this before rendering the export watermark.
 */
export function shouldRenderWatermark(isUnlocked: boolean): boolean {
  return !isUnlocked;
}

/**
 * Resolves watermark copy from the app language.
 * Unknown / missing locale defaults to English.
 */
export function getWatermarkText(language: Language | string | null | undefined): string {
  if (language === 'th') {
    return WATERMARK_TEXT.th;
  }

  return WATERMARK_TEXT.en;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type WatermarkLayout = {
  borderRadius: number;
  fontSize: number;
  gap: number;
  iconSize: number;
  margin: number;
  paddingHorizontal: number;
  paddingVertical: number;
};

/**
 * Scales watermark chrome from the displayed image size (not fixed screen pixels).
 */
export function getWatermarkLayout(imageSize: Size): WatermarkLayout | null {
  const minSide = Math.min(imageSize.width, imageSize.height);

  if (minSide <= 0) {
    return null;
  }

  const {
    borderRadiusRatio,
    fontSizeRatio,
    gapRatio,
    iconSizeRatio,
    marginRatio,
    maxFontSize,
    maxIconSize,
    minBorderRadius,
    minFontSize,
    minGap,
    minIconSize,
    minMargin,
    minPaddingHorizontal,
    minPaddingVertical,
    paddingHorizontalRatio,
    paddingVerticalRatio,
  } = WATERMARK_STYLE;

  return {
    borderRadius: Math.max(minBorderRadius, minSide * borderRadiusRatio),
    fontSize: clamp(minSide * fontSizeRatio, minFontSize, maxFontSize),
    gap: Math.max(minGap, minSide * gapRatio),
    iconSize: clamp(minSide * iconSizeRatio, minIconSize, maxIconSize),
    margin: Math.max(minMargin, minSide * marginRatio),
    paddingHorizontal: Math.max(minPaddingHorizontal, minSide * paddingHorizontalRatio),
    paddingVertical: Math.max(minPaddingVertical, minSide * paddingVerticalRatio),
  };
}
