import type { ScreenPoint, ScreenRect, Size, TagSize } from '@/types/editor';
import type { ImageDisplayRect, PriceTag } from '@/types/tag';

export const FALLBACK_TAG_SIZE: TagSize = { width: 80, height: 32 };
export const DRAG_POSITION_TOLERANCE = 0.0001;
export const EDITOR_ZOOM_MIN = 1;
export const EDITOR_ZOOM_MAX = 3;
export const EDITOR_ZOOM_DEFAULT = 1;

export function clampNormalized(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getSafeTagSize(tagSize?: TagSize) {
  return {
    width: tagSize && tagSize.width > 0 ? tagSize.width : FALLBACK_TAG_SIZE.width,
    height: tagSize && tagSize.height > 0 ? tagSize.height : FALLBACK_TAG_SIZE.height,
  };
}

export function isPointInsideImageRect(x: number, y: number, imageRect: ImageDisplayRect) {
  return x >= imageRect.x && x <= imageRect.x + imageRect.width && y >= imageRect.y && y <= imageRect.y + imageRect.height;
}

export function clampPointToImageRect(x: number, y: number, imageRect: ImageDisplayRect, tagSize?: TagSize) {
  const safeTagSize = getSafeTagSize(tagSize);
  const minX = imageRect.x;
  const minY = imageRect.y;
  const maxX = Math.max(minX, imageRect.x + imageRect.width - safeTagSize.width);
  const maxY = Math.max(minY, imageRect.y + imageRect.height - safeTagSize.height);

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

export function getNormalizedPointFromCanvasPoint(x: number, y: number, imageRect: ImageDisplayRect, tagSize?: TagSize) {
  const clampedPoint = clampPointToImageRect(x, y, imageRect, tagSize);

  return {
    x: clampNormalized((clampedPoint.x - imageRect.x) / imageRect.width),
    y: clampNormalized((clampedPoint.y - imageRect.y) / imageRect.height),
  };
}

export function getContainedImageRect(canvasSize: Size, imageSize: Size | null): ImageDisplayRect | null {
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

export function hasPositionChanged(previousTag: PriceTag, nextX: number, nextY: number) {
  return Math.abs(previousTag.x - nextX) > DRAG_POSITION_TOLERANCE || Math.abs(previousTag.y - nextY) > DRAG_POSITION_TOLERANCE;
}

export function clampGroupPixelOffset(
  dx: number,
  dy: number,
  groupTags: PriceTag[],
  imageRect: ImageDisplayRect,
  tagSizeById: Record<string, TagSize>,
): ScreenPoint {
  if (groupTags.length === 0) {
    return { x: dx, y: dy };
  }

  let minDx = Number.NEGATIVE_INFINITY;
  let maxDx = Number.POSITIVE_INFINITY;
  let minDy = Number.NEGATIVE_INFINITY;
  let maxDy = Number.POSITIVE_INFINITY;

  for (const tag of groupTags) {
    const size = getSafeTagSize(tagSizeById[tag.id]);
    const left = imageRect.x + tag.x * imageRect.width;
    const top = imageRect.y + tag.y * imageRect.height;

    minDx = Math.max(minDx, imageRect.x - left);
    maxDx = Math.min(maxDx, imageRect.x + imageRect.width - size.width - left);
    minDy = Math.max(minDy, imageRect.y - top);
    maxDy = Math.min(maxDy, imageRect.y + imageRect.height - size.height - top);
  }

  if (maxDx < minDx) {
    const pinnedX = (minDx + maxDx) / 2;
    minDx = pinnedX;
    maxDx = pinnedX;
  }

  if (maxDy < minDy) {
    const pinnedY = (minDy + maxDy) / 2;
    minDy = pinnedY;
    maxDy = pinnedY;
  }

  return {
    x: clamp(dx, minDx, maxDx),
    y: clamp(dy, minDy, maxDy),
  };
}

export function isPointInsideRect(point: ScreenPoint, rect: ScreenRect | null) {
  if (!rect) {
    return false;
  }

  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function clampZoomScale(scale: number) {
  if (!Number.isFinite(scale)) {
    return EDITOR_ZOOM_DEFAULT;
  }

  return clamp(scale, EDITOR_ZOOM_MIN, EDITOR_ZOOM_MAX);
}

/** Max pan offset so a center-origin scaled canvas stays within the clip bounds. */
export function getMaxPanOffset(scale: number, canvasSize: Size) {
  const safeScale = clampZoomScale(scale);

  if (safeScale <= EDITOR_ZOOM_MIN || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (canvasSize.width * (safeScale - 1)) / 2,
    y: (canvasSize.height * (safeScale - 1)) / 2,
  };
}

export function clampPanOffset(translateX: number, translateY: number, scale: number, canvasSize: Size): ScreenPoint {
  const maxOffset = getMaxPanOffset(scale, canvasSize);

  return {
    x: clamp(translateX, -maxOffset.x, maxOffset.x),
    y: clamp(translateY, -maxOffset.y, maxOffset.y),
  };
}

/** Convert a screen-space drag delta into canvas-local delta under the current viewport scale. */
export function screenDeltaToCanvasDelta(dx: number, dy: number, viewportScale: number): ScreenPoint {
  const safeScale = viewportScale > 0 && Number.isFinite(viewportScale) ? viewportScale : EDITOR_ZOOM_DEFAULT;

  return {
    x: dx / safeScale,
    y: dy / safeScale,
  };
}

export function formatZoomPercent(scale: number) {
  return `${Math.round(clampZoomScale(scale) * 100)}%`;
}
