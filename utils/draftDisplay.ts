import type { EditorDraft } from '@/types/draft';
import type { Language } from '@/types/settings';

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_LIKE = /^[0-9a-f]{16,}$/i;
const DRAFT_ID_LIKE = /^draft_[a-z0-9]+/i;
const FALLBACK_NAMES = new Set(['untitled', 'image', 'photo', 'img']);

/**
 * Formats a draft updatedAt ISO timestamp for Home Recent rows.
 */
export function formatDraftUpdatedAt(iso: string, language: Language): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[a-zA-Z0-9]{1,5}$/, '').trim();
}

function isInternalOrOpaqueName(basename: string): boolean {
  const normalized = basename.trim();

  if (!normalized) {
    return true;
  }

  if (FALLBACK_NAMES.has(normalized.toLowerCase())) {
    return true;
  }

  if (UUID_LIKE.test(normalized) || HEX_ID_LIKE.test(normalized) || DRAFT_ID_LIKE.test(normalized)) {
    return true;
  }

  // Camera / picker style opaque codes, e.g. IMG_20240101_123456 or long numeric ids.
  if (/^(IMG|DSC|PXL|MVIMG)[_-]?\d{6,}/i.test(normalized)) {
    return true;
  }

  if (/^\d{10,}$/.test(normalized)) {
    return true;
  }

  return false;
}

function shortenReadableFilename(basename: string): string {
  if (basename.length <= 18) {
    return basename;
  }

  return `${basename.slice(0, 8)}…${basename.slice(-6)}`;
}

/**
 * User-facing title for a Recent draft row.
 * Prefers a friendly filename; falls back to date/time or a shortened name
 * instead of raw UUIDs / internal ids.
 */
export function formatDraftDisplayTitle(draft: EditorDraft, language: Language): string {
  const leaf = draft.filename.trim().split(/[/\\]/).filter(Boolean).pop() ?? '';
  const basename = stripExtension(leaf);

  if (basename && !isInternalOrOpaqueName(basename)) {
    return basename;
  }

  const dateLabel = formatDraftUpdatedAt(draft.updatedAt, language);
  if (dateLabel) {
    return dateLabel;
  }

  if (basename) {
    return shortenReadableFilename(basename);
  }

  return language === 'th' ? 'ไม่มีชื่อ' : 'Untitled';
}
