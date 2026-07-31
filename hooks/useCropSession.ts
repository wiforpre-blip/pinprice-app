import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CROP_HISTORY_LIMIT } from '@/constants/cropAspectRatios';
import type { CropAspectId, CropHistorySnapshot, CropRect, CropRotationDeg, Size } from '@/types/crop';
import {
  cloneCropRect,
  createAspectCropRect,
  createFullCropRect,
  createInitialCropSnapshot,
  getRotatedImageSize,
  isIdentityCropState,
  moveCropRect,
  normalizeRotation,
  resizeCropRectFromCorner,
  type CropCorner,
} from '@/utils/cropGeometry';
import {
  beginCropBakeSession,
  prepareCropSourceImage,
} from '@/services/imageManipulator.service';

export type { CropCorner };

type UseCropSessionOptions = {
  imageUri: string | null;
};

function trimStack(stack: CropHistorySnapshot[]) {
  if (stack.length <= CROP_HISTORY_LIMIT) {
    return stack;
  }

  return stack.slice(stack.length - CROP_HISTORY_LIMIT);
}

function snapshotsEqual(a: CropHistorySnapshot, b: CropHistorySnapshot) {
  return (
    a.rotation === b.rotation &&
    a.aspectId === b.aspectId &&
    a.cropRect.x === b.cropRect.x &&
    a.cropRect.y === b.cropRect.y &&
    a.cropRect.width === b.cropRect.width &&
    a.cropRect.height === b.cropRect.height
  );
}

export function useCropSession({ imageUri }: UseCropSessionOptions) {
  const initial = useMemo(() => createInitialCropSnapshot(), []);
  const [rotation, setRotation] = useState<CropRotationDeg>(initial.rotation);
  const [aspectId, setAspectId] = useState<CropAspectId>(initial.aspectId);
  const [cropRect, setCropRect] = useState<CropRect>(initial.cropRect);
  const [sourceSize, setSourceSize] = useState<Size | null>(null);
  /** EXIF-flattened URI shared by preview + bake. */
  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [undoStack, setUndoStack] = useState<CropHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CropHistorySnapshot[]>([]);
  const [imageLoadError, setImageLoadError] = useState(false);

  const stateRef = useRef<CropHistorySnapshot>(initial);
  stateRef.current = { rotation, aspectId, cropRect };

  useEffect(() => {
    if (!imageUri) {
      setSourceSize(null);
      setWorkingUri(null);
      setImageLoadError(false);
      setIsPreparing(false);
      return;
    }

    let cancelled = false;
    setIsPreparing(true);
    setImageLoadError(false);
    setWorkingUri(null);
    setSourceSize(null);

    void prepareCropSourceImage(imageUri)
      .then((prepared) => {
        if (cancelled) {
          return;
        }

        beginCropBakeSession(prepared.uri);
        setWorkingUri(prepared.uri);
        setSourceSize({ width: prepared.width, height: prepared.height });
        setIsPreparing(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setImageLoadError(true);
        setWorkingUri(null);
        setSourceSize(null);
        setIsPreparing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const pushHistory = useCallback((before: CropHistorySnapshot) => {
    setUndoStack((current) => trimStack([...current, before]));
    setRedoStack([]);
  }, []);

  const applySnapshot = useCallback((snapshot: CropHistorySnapshot) => {
    setRotation(snapshot.rotation);
    setAspectId(snapshot.aspectId);
    setCropRect(cloneCropRect(snapshot.cropRect));
  }, []);

  const rotatedSize = useMemo(() => {
    if (!sourceSize) {
      return null;
    }

    return getRotatedImageSize(sourceSize, rotation);
  }, [rotation, sourceSize]);

  const isIdentity = useMemo(
    () => isIdentityCropState({ rotation, aspectId, cropRect }),
    [aspectId, cropRect, rotation],
  );

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const canReset = !isIdentity || aspectId !== 'original';

  const selectAspect = useCallback(
    (nextAspectId: Exclude<CropAspectId, 'free'>) => {
      if (!rotatedSize) {
        return;
      }

      const before = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };
      const nextRect = createAspectCropRect(rotatedSize, nextAspectId);
      const next: CropHistorySnapshot = {
        rotation: before.rotation,
        aspectId: nextAspectId,
        cropRect: nextRect,
      };

      if (snapshotsEqual(before, next)) {
        return;
      }

      pushHistory(before);
      applySnapshot(next);
    },
    [applySnapshot, pushHistory, rotatedSize],
  );

  const rotateBy = useCallback(
    (delta: 90 | -90) => {
      const before = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };
      const nextRotation = normalizeRotation(before.rotation + delta);
      const nextAspect: CropAspectId = before.aspectId === 'free' ? 'original' : before.aspectId;
      const sizeAfter = sourceSize ? getRotatedImageSize(sourceSize, nextRotation) : null;
      const nextRect = sizeAfter ? createAspectCropRect(sizeAfter, nextAspect) : createFullCropRect();

      pushHistory(before);
      applySnapshot({
        rotation: nextRotation,
        aspectId: nextAspect,
        cropRect: nextRect,
      });
    },
    [applySnapshot, pushHistory, sourceSize],
  );

  const resetRotation = useCallback(() => {
    if (stateRef.current.rotation === 0) {
      return;
    }

    const before = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };
    const nextAspect: CropAspectId = before.aspectId === 'free' ? 'original' : before.aspectId;
    const sizeAfter = sourceSize ? getRotatedImageSize(sourceSize, 0) : null;
    const nextRect = sizeAfter ? createAspectCropRect(sizeAfter, nextAspect) : createFullCropRect();

    pushHistory(before);
    applySnapshot({
      rotation: 0,
      aspectId: nextAspect,
      cropRect: nextRect,
    });
  }, [applySnapshot, pushHistory, sourceSize]);

  const beginLiveEdit = useCallback(() => {
    return { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };
  }, []);

  const updateCropRectLive = useCallback((nextRect: CropRect, nextAspectId: CropAspectId = 'free') => {
    setAspectId(nextAspectId);
    setCropRect(nextRect);
  }, []);

  const commitLiveEdit = useCallback(
    (before: CropHistorySnapshot) => {
      const after = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };

      if (snapshotsEqual(before, after)) {
        return;
      }

      pushHistory(before);
    },
    [pushHistory],
  );

  const resizeFromCorner = useCallback(
    (startRect: CropRect, corner: CropCorner, deltaX: number, deltaY: number) => {
      const next = resizeCropRectFromCorner(startRect, corner, deltaX, deltaY);
      updateCropRectLive(next, 'free');
      return next;
    },
    [updateCropRectLive],
  );

  const moveRect = useCallback(
    (startRect: CropRect, deltaX: number, deltaY: number) => {
      const next = moveCropRect(startRect, deltaX, deltaY);
      updateCropRectLive(next, stateRef.current.aspectId === 'free' ? 'free' : stateRef.current.aspectId);
      return next;
    },
    [updateCropRectLive],
  );

  const undo = useCallback(() => {
    setUndoStack((currentUndo) => {
      if (currentUndo.length === 0) {
        return currentUndo;
      }

      const previous = currentUndo[currentUndo.length - 1];
      const present = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };

      setRedoStack((currentRedo) => trimStack([...currentRedo, present]));
      applySnapshot(previous);
      return currentUndo.slice(0, -1);
    });
  }, [applySnapshot]);

  const redo = useCallback(() => {
    setRedoStack((currentRedo) => {
      if (currentRedo.length === 0) {
        return currentRedo;
      }

      const next = currentRedo[currentRedo.length - 1];
      const present = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };

      setUndoStack((currentUndo) => trimStack([...currentUndo, present]));
      applySnapshot(next);
      return currentRedo.slice(0, -1);
    });
  }, [applySnapshot]);

  const reset = useCallback(() => {
    const before = { ...stateRef.current, cropRect: cloneCropRect(stateRef.current.cropRect) };
    const next = createInitialCropSnapshot();

    if (snapshotsEqual(before, next)) {
      return;
    }

    pushHistory(before);
    applySnapshot(next);
  }, [applySnapshot, pushHistory]);

  return {
    aspectId,
    beginLiveEdit,
    canRedo,
    canReset,
    canUndo,
    commitLiveEdit,
    cropRect,
    imageLoadError,
    isIdentity,
    isPreparing,
    moveRect,
    redo,
    reset,
    resetRotation,
    resizeFromCorner,
    rotateBy,
    rotatedSize,
    rotation,
    selectAspect,
    sourceSize,
    undo,
    updateCropRectLive,
    workingUri,
  };
}
