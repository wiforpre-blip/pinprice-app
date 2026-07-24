import * as FileSystem from 'expo-file-system/legacy';

import { buildExportFilename } from '@/utils/exportFilename';

const EXPORT_CACHE_DIR = 'pinprice-exports';

/**
 * Copies a captured export temp file into cache under the user-facing filename
 * so MediaLibrary / Sharing can pick up that display name where the OS allows it.
 */
export async function prepareNamedExportUri(capturedUri: string, rawFilename: string): Promise<string> {
  const cacheRoot = FileSystem.cacheDirectory;

  if (!cacheRoot) {
    return capturedUri;
  }

  const safeName = buildExportFilename(rawFilename);
  const directory = `${cacheRoot}${EXPORT_CACHE_DIR}/`;
  const destinationUri = `${directory}${safeName}`;

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({ from: capturedUri, to: destinationUri });

  return destinationUri;
}
