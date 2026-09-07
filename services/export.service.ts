import * as FileSystem from 'expo-file-system/legacy';

import { buildExportFilename } from '@/utils/exportFilename';

const EXPORT_CACHE_DIR = 'pinprice-exports';
const MAX_COPY_INDEX = 999;

/**
 * Deletes a view-shot / export temp file after it was handed to the OS (gallery
 * or share sheet) or when an export attempt fails. Only touches files this
 * module created — draft assets live in documentDirectory and are never passed
 * here.
 */
export async function deleteExportTempFile(uri: string | null | undefined): Promise<void> {
  if (!uri) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup; OS cache may still purge it later.
  }
}

/**
 * Copies a captured export temp file into cache under the user-facing filename
 * so MediaLibrary / Sharing can pick up that display name where the OS allows it.
 * The view-shot temp file is deleted right after the copy succeeds.
 * copyIndex 0 → name.ext; 1 → name (1).ext. If that path already exists, bumps up.
 */
export async function prepareNamedExportUri(
  capturedUri: string,
  rawFilename: string,
  copyIndex: number = 0,
  extension: 'png' | 'jpg' = 'png',
): Promise<string> {
  const cacheRoot = FileSystem.cacheDirectory;

  if (!cacheRoot) {
    return capturedUri;
  }

  const directory = `${cacheRoot}${EXPORT_CACHE_DIR}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  let nextIndex = Math.max(0, Math.floor(copyIndex));
  let destinationUri = `${directory}${buildExportFilename(rawFilename, extension, nextIndex)}`;

  while (nextIndex <= MAX_COPY_INDEX) {
    const info = await FileSystem.getInfoAsync(destinationUri);

    if (!info.exists) {
      break;
    }

    nextIndex += 1;
    destinationUri = `${directory}${buildExportFilename(rawFilename, extension, nextIndex)}`;
  }

  await FileSystem.copyAsync({ from: capturedUri, to: destinationUri });

  if (capturedUri !== destinationUri) {
    await deleteExportTempFile(capturedUri);
  }

  return destinationUri;
}
