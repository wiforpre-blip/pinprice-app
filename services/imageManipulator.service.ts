import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image as NativeImage } from 'react-native';

import { CROP_CACHE_DIR_NAME, CROP_CACHE_FILE_PREFIX } from '@/constants/cropCache';
import { WORKING_IMAGE_MAX_LONG_EDGE_PX } from '@/constants/imagePolicy';
import type { CropPixelRect, CropRect, CropRotationDeg, Size } from '@/types/crop';
import { isFullCropRect, normalizedCropToPixelRect } from '@/utils/cropGeometry';
import { getMaxLongEdgeResize, getMaxLongEdgeTargetSize } from '@/utils/imageResize';

type BakeCroppedImageInput = {
  sourceUri: string;
  /** Bitmap size of sourceUri from prepareCropSourceImage (pre-rotation). */
  sourceSize: Size;
  rotation: CropRotationDeg;
  cropRect: CropRect;
};

type PreparedCropSource = {
  uri: string;
  width: number;
  height: number;
};

let previousBakedUri: string | null = null;
let lastHandedOffUri: string | null = null;
let preparedSourceUri: string | null = null;
let sessionSourceUri: string | null = null;

function getCropCacheDirectory(): string | null {
  const root = FileSystem.cacheDirectory;

  if (!root) {
    return null;
  }

  return `${root}${CROP_CACHE_DIR_NAME}/`;
}

function isManagedCropCacheUri(uri: string): boolean {
  const directory = getCropCacheDirectory();

  if (!directory) {
    return false;
  }

  return uri.startsWith(directory) && uri.includes(CROP_CACHE_FILE_PREFIX);
}

async function ensureCropCacheDirectory(): Promise<string | null> {
  const directory = getCropCacheDirectory();

  if (!directory) {
    return null;
  }

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

async function deleteManagedUri(uri: string | null | undefined) {
  if (!uri || !isManagedCropCacheUri(uri)) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Ignore cleanup failures — never block bake/nav.
  }
}

async function deleteTempUri(uri: string | null | undefined, protect: Set<string>) {
  if (!uri || protect.has(uri) || isManagedCropCacheUri(uri)) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

async function copyToCropCache(tempUri: string, prefix: string): Promise<string> {
  const directory = await ensureCropCacheDirectory();

  if (!directory) {
    return tempUri;
  }

  const destinationUri = `${directory}${prefix}${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: destinationUri });

  if (tempUri !== destinationUri && !isManagedCropCacheUri(tempUri)) {
    try {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch {
      // Best-effort temp cleanup.
    }
  }

  return destinationUri;
}

/**
 * Reads only the image header (no full bitmap decode) for the long-edge
 * downsample decision.
 */
function getImageHeaderSize(uri: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    NativeImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Unable to read image header size')),
    );
  });
}

async function deleteUriBestEffort(uri: string | null | undefined) {
  if (!uri) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup.
  }
}

/**
 * Flatten EXIF orientation into pixels and keep the long edge at or under the
 * product resolution cap (see WORKING_IMAGE_MAX_LONG_EDGE_PX). Sources already
 * at or under the cap are never upscaled.
 *
 * The header is read first so the downsample can fold into the single
 * decode/encode pass that already flattens EXIF — this keeps a full-resolution
 * decode to exactly once per source image.
 */
export async function prepareCropSourceImage(sourceUri: string): Promise<PreparedCropSource> {
  let headerSize: Size | null = null;

  try {
    headerSize = await getImageHeaderSize(sourceUri);
  } catch {
    headerSize = null;
  }

  let outputUri: string;
  let outputWidth = 0;
  let outputHeight = 0;

  if (headerSize) {
    const singleAxis = getMaxLongEdgeResize(
      headerSize.width,
      headerSize.height,
      WORKING_IMAGE_MAX_LONG_EDGE_PX,
    );

    if (singleAxis) {
      const resized = await ImageManipulator.manipulateAsync(sourceUri, [{ resize: singleAxis }], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      if (Math.max(resized.width, resized.height) <= WORKING_IMAGE_MAX_LONG_EDGE_PX) {
        outputUri = resized.uri;
        outputWidth = resized.width;
        outputHeight = resized.height;
      } else {
        // EXIF rotated the axes relative to the header guess. The oversized
        // intermediate is already small, so the correction pass is cheap.
        const exact = getMaxLongEdgeTargetSize(
          resized.width,
          resized.height,
          WORKING_IMAGE_MAX_LONG_EDGE_PX,
        );
        const corrected = await ImageManipulator.manipulateAsync(
          resized.uri,
          [{ resize: exact ?? singleAxis }],
          {
            compress: 1,
            format: ImageManipulator.SaveFormat.JPEG,
          },
        );
        await deleteUriBestEffort(resized.uri);
        outputUri = corrected.uri;
        outputWidth = corrected.width;
        outputHeight = corrected.height;
      }
    } else {
      const flattened = await ImageManipulator.manipulateAsync(sourceUri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      outputUri = flattened.uri;
      outputWidth = flattened.width;
      outputHeight = flattened.height;
    }
  } else {
    // Could not read a header (unusual URI). Keep the previous single flatten
    // pass so behaviour is unchanged for those sources.
    const flattened = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    outputUri = flattened.uri;
    outputWidth = flattened.width;
    outputHeight = flattened.height;
  }

  const uri = await copyToCropCache(outputUri, `${CROP_CACHE_FILE_PREFIX}src_`);

  if (preparedSourceUri && preparedSourceUri !== uri) {
    await deleteManagedUri(preparedSourceUri);
  }

  preparedSourceUri = uri;
  sessionSourceUri = uri;

  return {
    uri,
    width: outputWidth,
    height: outputHeight,
  };
}

/**
 * Begin a crop session. Clears any prior in-session bake pointer when the source changes.
 */
export function beginCropBakeSession(sourceUri: string) {
  if (sessionSourceUri && sessionSourceUri !== sourceUri) {
    void deleteManagedUri(previousBakedUri);
    previousBakedUri = null;
  }

  sessionSourceUri = sourceUri;
}

/**
 * Delete in-session leftovers when leaving crop back to home.
 */
export async function discardCropBakeSession() {
  const handed = lastHandedOffUri;
  await deleteManagedUri(previousBakedUri);
  await deleteManagedUri(handed);

  if (preparedSourceUri && preparedSourceUri !== handed) {
    await deleteManagedUri(preparedSourceUri);
  }

  previousBakedUri = null;
  lastHandedOffUri = null;
  preparedSourceUri = null;
  sessionSourceUri = null;
}

/**
 * Hand a URI to the editor. Keeps the file; remembers managed URIs so a later
 * rebake from crop (after editor unmounts via back) can delete the old file.
 */
export function commitCropBakeSession(handedOffUri: string) {
  if (isManagedCropCacheUri(handedOffUri)) {
    lastHandedOffUri = handedOffUri;
  }

  previousBakedUri = null;
}

/**
 * Rotate then crop using manipulator-reported bitmap sizes after each step.
 * Deletes the previous in-session bake and any prior handed-off bake when replaced.
 */
export async function bakeCroppedImage(input: BakeCroppedImageInput): Promise<string> {
  const { sourceUri, sourceSize, rotation, cropRect } = input;

  beginCropBakeSession(sourceUri);

  let workingUri = sourceUri;
  let workingSize: Size = sourceSize;
  const temps: string[] = [];

  if (rotation !== 0) {
    const rotated = await ImageManipulator.manipulateAsync(
      workingUri,
      [{ rotate: rotation }],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    workingUri = rotated.uri;
    workingSize = { width: rotated.width, height: rotated.height };
    temps.push(rotated.uri);
  }

  if (workingSize.width <= 0 || workingSize.height <= 0) {
    throw new Error('Invalid image size for crop bake');
  }

  let outputUri = workingUri;

  if (!isFullCropRect(cropRect)) {
    const pixelCrop: CropPixelRect = normalizedCropToPixelRect(cropRect, workingSize);

    const cropped = await ImageManipulator.manipulateAsync(
      workingUri,
      [
        {
          crop: {
            originX: pixelCrop.originX,
            originY: pixelCrop.originY,
            width: pixelCrop.width,
            height: pixelCrop.height,
          },
        },
      ],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    outputUri = cropped.uri;
    temps.push(cropped.uri);
  } else if (rotation === 0) {
    // Identity-like full frame without rotation — caller should skip bake.
    return sourceUri;
  }

  const cachedUri = await copyToCropCache(outputUri, CROP_CACHE_FILE_PREFIX);
  const protect = new Set<string>([cachedUri, sourceUri]);

  for (const tempUri of temps) {
    await deleteTempUri(tempUri, protect);
  }

  if (previousBakedUri && previousBakedUri !== cachedUri && previousBakedUri !== sourceUri) {
    await deleteManagedUri(previousBakedUri);
  }

  if (lastHandedOffUri && lastHandedOffUri !== cachedUri && lastHandedOffUri !== sourceUri) {
    await deleteManagedUri(lastHandedOffUri);
    lastHandedOffUri = null;
  }

  previousBakedUri = cachedUri;
  return cachedUri;
}
