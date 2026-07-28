/**
 * Export watermark copy and visual ratios.
 * Sizes are resolved at render time from the export canvas dimensions.
 */
export const WATERMARK_TEXT = {
  en: 'PinPrice',
  th: 'PinPrice',
} as const;

export const WATERMARK_STYLE = {
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  textColor: '#FFFFFF',
  /** Font size as a fraction of min(canvas width, height). */
  fontSizeRatio: 0.028,
  iconSizeRatio: 0.032,
  paddingHorizontalRatio: 0.02,
  paddingVerticalRatio: 0.01,
  marginRatio: 0.018,
  borderRadiusRatio: 0.01,
  gapRatio: 0.008,
  minFontSize: 9,
  maxFontSize: 16,
  minIconSize: 10,
  maxIconSize: 18,
  minPaddingHorizontal: 6,
  minPaddingVertical: 4,
  minMargin: 8,
  minBorderRadius: 4,
  minGap: 4,
} as const;
