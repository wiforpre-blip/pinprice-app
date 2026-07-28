const FALLBACK_BASENAME = 'Untitled';
const DEFAULT_EXTENSION = 'png';
const MAX_BASENAME_LENGTH = 80;

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Builds a gallery-safe export filename with a forced image extension.
 * Strips path segments, illegal characters, and any prior extension.
 * When copyIndex > 0, appends " (n)" before the extension (Untitled (1).png).
 */
export function buildExportFilename(
  rawName: string,
  extension: string = DEFAULT_EXTENSION,
  copyIndex: number = 0,
): string {
  const trimmed = rawName.trim();
  const leaf = trimmed.split(/[/\\]/).filter(Boolean).pop() ?? '';
  const withoutExtension = leaf.replace(/\.[^./\\]+$/, '').trim();
  const sanitized = withoutExtension
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const copySuffix = copyIndex > 0 ? ` (${copyIndex})` : '';
  const maxBasenameLength = Math.max(1, MAX_BASENAME_LENGTH - copySuffix.length);
  const basename = (sanitized || FALLBACK_BASENAME).slice(0, maxBasenameLength);
  const normalizedExtension = extension.replace(/^\./, '').toLowerCase() || DEFAULT_EXTENSION;

  return `${basename}${copySuffix}.${normalizedExtension}`;
}

/** Stable key for counting duplicate exports of the same display name. */
export function getExportBasenameKey(rawName: string): string {
  const trimmed = rawName.trim();
  const leaf = trimmed.split(/[/\\]/).filter(Boolean).pop() ?? '';
  const withoutExtension = leaf.replace(/\.[^./\\]+$/, '').trim();
  const sanitized = withoutExtension
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || FALLBACK_BASENAME;
}
