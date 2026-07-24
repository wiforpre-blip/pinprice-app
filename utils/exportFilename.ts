const FALLBACK_BASENAME = 'Untitled';
const DEFAULT_EXTENSION = 'png';
const MAX_BASENAME_LENGTH = 80;

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Builds a gallery-safe export filename with a forced image extension.
 * Strips path segments, illegal characters, and any prior extension.
 */
export function buildExportFilename(rawName: string, extension: string = DEFAULT_EXTENSION): string {
  const trimmed = rawName.trim();
  const leaf = trimmed.split(/[/\\]/).filter(Boolean).pop() ?? '';
  const withoutExtension = leaf.replace(/\.[^./\\]+$/, '').trim();
  const sanitized = withoutExtension
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();
  const basename = (sanitized || FALLBACK_BASENAME).slice(0, MAX_BASENAME_LENGTH);
  const normalizedExtension = extension.replace(/^\./, '').toLowerCase() || DEFAULT_EXTENSION;

  return `${basename}.${normalizedExtension}`;
}
