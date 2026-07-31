import { CROP_ASPECT_PRESETS, CROP_MIN_NORMALIZED_SIZE } from '@/constants/cropAspectRatios';
import type {
  CropAspectId,
  CropHistorySnapshot,
  CropPixelRect,
  CropRect,
  CropRotationDeg,
  Size,
} from '@/types/crop';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRotation(degrees: number): CropRotationDeg {
  const normalized = ((degrees % 360) + 360) % 360;

  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }

  return 0;
}

/** Image pixel size after a discrete 90°-step rotation. */
export function getRotatedImageSize(imageSize: Size, rotation: CropRotationDeg): Size {
  if (rotation === 90 || rotation === 270) {
    return { width: imageSize.height, height: imageSize.width };
  }

  return { width: imageSize.width, height: imageSize.height };
}

export function createFullCropRect(): CropRect {
  return { x: 0, y: 0, width: 1, height: 1 };
}

export function cloneCropRect(rect: CropRect): CropRect {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

export function isFullCropRect(rect: CropRect, epsilon = 0.001): boolean {
  return (
    Math.abs(rect.x) <= epsilon &&
    Math.abs(rect.y) <= epsilon &&
    Math.abs(rect.width - 1) <= epsilon &&
    Math.abs(rect.height - 1) <= epsilon
  );
}

export function isIdentityCropState(snapshot: CropHistorySnapshot): boolean {
  return snapshot.rotation === 0 && isFullCropRect(snapshot.cropRect);
}

function getPresetRatio(aspectId: CropAspectId, imageAspect: number): number | null {
  if (aspectId === 'free' || aspectId === 'original') {
    return null;
  }

  const preset = CROP_ASPECT_PRESETS.find((item) => item.id === aspectId);
  return preset?.ratio ?? imageAspect;
}

/**
 * Largest centered crop rect for a locked aspect ratio inside [0,1]².
 * `targetRatio` is width/height of the crop in image space.
 */
export function createAspectCropRect(imageSize: Size, aspectId: CropAspectId): CropRect {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return createFullCropRect();
  }

  const imageAspect = imageSize.width / imageSize.height;
  const targetRatio = getPresetRatio(aspectId, imageAspect);

  if (targetRatio == null || aspectId === 'original') {
    return createFullCropRect();
  }

  // Crop box aspect in normalized space must account for non-square images:
  // normalized width/height map to pixels via imageSize.
  // Want: (normW * imgW) / (normH * imgH) = targetRatio
  // => normW / normH = targetRatio * imgH / imgW = targetRatio / imageAspect
  const normalizedTarget = targetRatio / imageAspect;

  let width: number;
  let height: number;

  if (normalizedTarget >= 1) {
    width = 1;
    height = width / normalizedTarget;
  } else {
    height = 1;
    width = height * normalizedTarget;
  }

  width = clamp(width, CROP_MIN_NORMALIZED_SIZE, 1);
  height = clamp(height, CROP_MIN_NORMALIZED_SIZE, 1);

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

export function clampCropRect(rect: CropRect): CropRect {
  const width = clamp(rect.width, CROP_MIN_NORMALIZED_SIZE, 1);
  const height = clamp(rect.height, CROP_MIN_NORMALIZED_SIZE, 1);
  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);

  return { x, y, width, height };
}

export type CropCorner = 'tl' | 'tr' | 'bl' | 'br';

/** Resize crop rect from a corner drag in normalized image space (free aspect). */
export function resizeCropRectFromCorner(
  startRect: CropRect,
  corner: CropCorner,
  normalizedDeltaX: number,
  normalizedDeltaY: number,
): CropRect {
  let { x, y, width, height } = startRect;

  switch (corner) {
    case 'tl': {
      const nextX = clamp(x + normalizedDeltaX, 0, x + width - CROP_MIN_NORMALIZED_SIZE);
      const nextY = clamp(y + normalizedDeltaY, 0, y + height - CROP_MIN_NORMALIZED_SIZE);
      width = x + width - nextX;
      height = y + height - nextY;
      x = nextX;
      y = nextY;
      break;
    }
    case 'tr': {
      const nextY = clamp(y + normalizedDeltaY, 0, y + height - CROP_MIN_NORMALIZED_SIZE);
      width = clamp(width + normalizedDeltaX, CROP_MIN_NORMALIZED_SIZE, 1 - x);
      height = y + height - nextY;
      y = nextY;
      break;
    }
    case 'bl': {
      const nextX = clamp(x + normalizedDeltaX, 0, x + width - CROP_MIN_NORMALIZED_SIZE);
      width = x + width - nextX;
      height = clamp(height + normalizedDeltaY, CROP_MIN_NORMALIZED_SIZE, 1 - y);
      x = nextX;
      break;
    }
    case 'br': {
      width = clamp(width + normalizedDeltaX, CROP_MIN_NORMALIZED_SIZE, 1 - x);
      height = clamp(height + normalizedDeltaY, CROP_MIN_NORMALIZED_SIZE, 1 - y);
      break;
    }
  }

  return clampCropRect({ x, y, width, height });
}

export function moveCropRect(startRect: CropRect, normalizedDeltaX: number, normalizedDeltaY: number): CropRect {
  return clampCropRect({
    x: startRect.x + normalizedDeltaX,
    y: startRect.y + normalizedDeltaY,
    width: startRect.width,
    height: startRect.height,
  });
}

/**
 * Contain-fit the (possibly rotated) image into the canvas.
 * Returns the display rect in canvas coordinates.
 */
export function getContainedImageRect(canvasSize: Size, imageSize: Size): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (canvasSize.width <= 0 || canvasSize.height <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
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

/** Convert normalized crop (on rotated image) to integer pixel crop for manipulator. */
export function normalizedCropToPixelRect(rect: CropRect, rotatedSize: Size): CropPixelRect {
  const maxW = Math.max(1, Math.floor(rotatedSize.width));
  const maxH = Math.max(1, Math.floor(rotatedSize.height));

  let originX = Math.round(rect.x * rotatedSize.width);
  let originY = Math.round(rect.y * rotatedSize.height);
  let width = Math.round(rect.width * rotatedSize.width);
  let height = Math.round(rect.height * rotatedSize.height);

  originX = clamp(originX, 0, maxW - 1);
  originY = clamp(originY, 0, maxH - 1);
  width = clamp(width, 1, maxW - originX);
  height = clamp(height, 1, maxH - originY);

  return { originX, originY, width, height };
}

export function createInitialCropSnapshot(): CropHistorySnapshot {
  return {
    rotation: 0,
    aspectId: 'original',
    cropRect: createFullCropRect(),
  };
}
