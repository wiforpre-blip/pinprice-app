import type { CropAspectId } from '@/types/crop';

export type CropAspectPreset = {
  id: Exclude<CropAspectId, 'free'>;
  /** null = use source image aspect (original). */
  ratio: number | null;
  labelKey: string;
  subLabelKey: string | null;
  recommended?: boolean;
};

export const CROP_ASPECT_PRESETS: CropAspectPreset[] = [
  {
    id: 'original',
    ratio: null,
    labelKey: 'crop.aspect.original',
    subLabelKey: 'crop.aspect.originalSub',
  },
  {
    id: '1:1',
    ratio: 1,
    labelKey: 'crop.aspect.square',
    subLabelKey: 'crop.aspect.squareSub',
  },
  {
    id: '4:5',
    ratio: 4 / 5,
    labelKey: 'crop.aspect.portrait',
    subLabelKey: 'crop.aspect.portraitSub',
    recommended: true,
  },
  {
    id: '9:16',
    ratio: 9 / 16,
    labelKey: 'crop.aspect.story',
    subLabelKey: 'crop.aspect.storySub',
  },
];

export const CROP_HISTORY_LIMIT = 20;
export const CROP_CORNER_HIT_SIZE = 44;
/** Inset around crop canvas — clears rotate (44+12) and keeps corner hits inside the screen. */
export const CROP_CANVAS_INSET = CROP_CORNER_HIT_SIZE + 12;
export const CROP_MIN_NORMALIZED_SIZE = 0.08;
