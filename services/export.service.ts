import * as FileSystem from 'expo-file-system/legacy';

import { buildExportFilename } from '@/utils/exportFilename';

const EXPORT_CACHE_DIR = 'pinprice-exports';
const MAX_COPY_INDEX = 999;

/**
 * Copies a captured export temp file into cache under the user-facing filename
 * so MediaLibrary / Sharing can pick up that display name where the OS allows it.
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

  return destinationUri;
}
