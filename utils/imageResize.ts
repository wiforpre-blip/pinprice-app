export type ImageResizeTarget = { width: number } | { height: number };

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Resize parameter that keeps the longer edge at `maxLongEdge`.
 *
 * Returns only the axis that is currently the long edge so the image keeps its
 * aspect ratio (used before a decode whose EXIF orientation may still swap
 * axes; callers verify the output and correct if needed). Returns null when no
 * downscale is needed — this function never upscales.
 */
export function getMaxLongEdgeResize(
  width: number,
  height: number,
  maxLongEdge: number,
): ImageResizeTarget | null {
  if (!isPositiveFinite(width) || !isPositiveFinite(height) || !isPositiveFinite(maxLongEdge)) {
    return null;
  }

  if (Math.max(width, height) <= maxLongEdge) {
    return null;
  }

  if (width >= height) {
    return { width: maxLongEdge };
  }

  return { height: maxLongEdge };
}

/**
 * Exact target size that keeps the longer edge at `maxLongEdge` while
 * preserving aspect ratio. Returns null when no downscale is needed — this
 * function never upscales. Only use when the input dimensions are the final
 * (already orientation-flattened) dimensions.
 */
export function getMaxLongEdgeTargetSize(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } | null {
  if (!isPositiveFinite(width) || !isPositiveFinite(height) || !isPositiveFinite(maxLongEdge)) {
    return null;
  }

  const longEdge = Math.max(width, height);

  if (longEdge <= maxLongEdge) {
    return null;
  }

  const scale = maxLongEdge / longEdge;

  return {
    width: Math.max(1, Math.min(maxLongEdge, Math.round(width * scale))),
    height: Math.max(1, Math.min(maxLongEdge, Math.round(height * scale))),
  };
}
