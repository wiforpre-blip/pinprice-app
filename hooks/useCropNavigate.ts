import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  bakeCroppedImage,
  commitCropBakeSession,
  discardCropBakeSession,
} from '@/services/imageManipulator.service';
import type { CropRect, CropRotationDeg, Size } from '@/types/crop';

type UseCropNavigateOptions = {
  /** EXIF-flattened working URI used for preview + bake. */
  imageUri: string | null;
  sourceSize: Size | null;
  draftId: string | null;
  filename: string | null;
  rotation: CropRotationDeg;
  cropRect: CropRect;
  isIdentity: boolean;
};

export function useCropNavigate({
  imageUri,
  sourceSize,
  draftId,
  filename,
  rotation,
  cropRect,
  isIdentity,
}: UseCropNavigateOptions) {
  const router = useRouter();
  const [isBaking, setIsBaking] = useState(false);
  const [bakeError, setBakeError] = useState<string | null>(null);

  const goToEditor = useCallback(
    (nextImageUri: string, hydrateDraft: boolean) => {
      const params: {
        imageUri: string;
        draftId?: string;
        filename?: string;
        hydrateDraft: string;
      } = {
        imageUri: encodeURIComponent(nextImageUri),
        hydrateDraft: hydrateDraft ? 'true' : 'false',
      };

      if (draftId) {
        params.draftId = draftId;
      }

      if (filename) {
        params.filename = encodeURIComponent(filename);
      }

      commitCropBakeSession(nextImageUri);
      // push so editor Back returns to /crop (crop stays mounted with state).
      router.push({
        pathname: '/editor',
        params,
      });
    },
    [draftId, filename, router],
  );

  const handleBack = useCallback(() => {
    void discardCropBakeSession().finally(() => {
      if (router.canGoBack()) {
        router.back();
        return;
      }

      router.replace('/');
    });
  }, [router]);

  const handleNext = useCallback(async () => {
    if (!imageUri || isBaking) {
      return;
    }

    setBakeError(null);

    if (isIdentity) {
      goToEditor(imageUri, true);
      return;
    }

    if (!sourceSize) {
      setBakeError('crop.bakeError');
      return;
    }

    setIsBaking(true);

    try {
      const bakedUri = await bakeCroppedImage({
        sourceUri: imageUri,
        sourceSize,
        rotation,
        cropRect,
      });

      goToEditor(bakedUri, false);
    } catch {
      setBakeError('crop.bakeError');
    } finally {
      setIsBaking(false);
    }
  }, [cropRect, goToEditor, imageUri, isBaking, isIdentity, rotation, sourceSize]);

  return {
    bakeError,
    clearBakeError: () => setBakeError(null),
    handleBack,
    handleNext,
    isBaking,
  };
}
