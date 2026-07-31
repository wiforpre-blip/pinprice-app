/** Aspect preset or free crop after corner drag. */
export type CropAspectId = 'original' | '1:1' | '4:5' | '9:16' | 'free';

/** Discrete image rotation used by the pre-crop screen. */
export type CropRotationDeg = 0 | 90 | 180 | 270;

/**
 * Normalized crop rectangle relative to the *rotated* image bounds (0–1).
 * x/y = top-left; width/height = size.
 */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropHistorySnapshot = {
  rotation: CropRotationDeg;
  aspectId: CropAspectId;
  cropRect: CropRect;
};

export type CropPixelRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};
