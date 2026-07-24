import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import type { EditorDraft, UpsertEditorDraftInput } from '@/types/draft';
import type { EditorPricingMode } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

const DRAFTS_STORAGE_KEY = 'pinprice.editor.drafts';
const DRAFTS_DIR_NAME = 'pinprice-drafts';
export const MAX_EDITOR_DRAFTS = 5;

const VALID_EDITOR_MODES: EditorPricingMode[] = ['tag', 'priceList'];

function createDraftId() {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDraftsDirectory(): string | null {
  const root = FileSystem.documentDirectory;

  if (!root) {
    return null;
  }

  return `${root}${DRAFTS_DIR_NAME}/`;
}

function getExtensionFromUri(uri: string) {
  const cleanUri = uri.split(/[?#]/)[0] ?? uri;
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();

  if (!ext || ext.length > 5) {
    return 'jpg';
  }

  return ext;
}

function isEditorMode(value: unknown): value is EditorPricingMode {
  return typeof value === 'string' && VALID_EDITOR_MODES.includes(value as EditorPricingMode);
}

function isPriceTag(value: unknown): value is PriceTag {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const tag = value as Partial<PriceTag>;

  return (
    typeof tag.id === 'string' &&
    typeof tag.type === 'string' &&
    typeof tag.text === 'string' &&
    typeof tag.x === 'number' &&
    typeof tag.y === 'number'
  );
}

function isPanelMarker(value: unknown): value is PanelMarker {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const marker = value as Partial<PanelMarker>;

  return (
    typeof marker.id === 'string' &&
    typeof marker.priceText === 'string' &&
    typeof marker.x === 'number' &&
    typeof marker.y === 'number'
  );
}

function parseEditorDraft(value: unknown): EditorDraft | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const draft = value as Partial<EditorDraft>;

  if (
    typeof draft.id !== 'string' ||
    typeof draft.filename !== 'string' ||
    typeof draft.imageUri !== 'string' ||
    !isEditorMode(draft.editorMode) ||
    typeof draft.createdAt !== 'string' ||
    typeof draft.updatedAt !== 'string' ||
    !Array.isArray(draft.tags) ||
    !Array.isArray(draft.panelMarkers) ||
    !draft.tags.every(isPriceTag) ||
    !draft.panelMarkers.every(isPanelMarker)
  ) {
    return null;
  }

  return {
    id: draft.id,
    filename: draft.filename.trim() || 'Untitled',
    imageUri: draft.imageUri,
    editorMode: draft.editorMode,
    tags: draft.tags.map((tag) => ({ ...tag })),
    panelMarkers: draft.panelMarkers.map((marker) => ({ ...marker })),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

async function readDraftsFromStorage(): Promise<EditorDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(parseEditorDraft)
      .filter((draft): draft is EditorDraft => draft !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

async function writeDraftsToStorage(drafts: EditorDraft[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

async function ensureDraftsDirectory(): Promise<string | null> {
  const directory = getDraftsDirectory();

  if (!directory) {
    return null;
  }

  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

async function deleteDraftImage(imageUri: string | undefined): Promise<void> {
  if (!imageUri) {
    return;
  }

  try {
    await FileSystem.deleteAsync(imageUri, { idempotent: true });
  } catch {
    // Best-effort cleanup; missing files are fine.
  }
}

/**
 * Copies the live editor source image into an app-owned documentDirectory path
 * so drafts survive picker/cache URI expiry.
 */
async function persistDraftImage(sourceImageUri: string, draftId: string): Promise<string | null> {
  const directory = await ensureDraftsDirectory();

  if (!directory) {
    return null;
  }

  const extension = getExtensionFromUri(sourceImageUri);
  const destinationUri = `${directory}${draftId}.${extension}`;

  if (sourceImageUri === destinationUri) {
    const info = await FileSystem.getInfoAsync(destinationUri);
    return info.exists ? destinationUri : null;
  }

  try {
    await FileSystem.deleteAsync(destinationUri, { idempotent: true });
    await FileSystem.copyAsync({ from: sourceImageUri, to: destinationUri });
    return destinationUri;
  } catch {
    return null;
  }
}

export async function listEditorDrafts(): Promise<EditorDraft[]> {
  return readDraftsFromStorage();
}

export async function getEditorDraft(id: string): Promise<EditorDraft | null> {
  const drafts = await readDraftsFromStorage();
  return drafts.find((draft) => draft.id === id) ?? null;
}

export async function isDraftImageAvailable(imageUri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(imageUri);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Upserts a draft after a successful save/share.
 * Caps the list at MAX_EDITOR_DRAFTS and deletes pruned image files.
 * Failures are swallowed so export UX is never blocked.
 */
export async function upsertEditorDraft(input: UpsertEditorDraftInput): Promise<EditorDraft | null> {
  try {
    const now = new Date().toISOString();
    const existingDrafts = await readDraftsFromStorage();
    const existing = input.id ? existingDrafts.find((draft) => draft.id === input.id) : undefined;
    const draftId = existing?.id ?? createDraftId();
    const persistedImageUri = await persistDraftImage(input.sourceImageUri, draftId);

    if (!persistedImageUri) {
      return null;
    }

    // If the previous copy used a different extension/path, remove the orphan.
    if (existing?.imageUri && existing.imageUri !== persistedImageUri) {
      await deleteDraftImage(existing.imageUri);
    }

    const nextDraft: EditorDraft = {
      id: draftId,
      filename: input.filename.trim() || 'Untitled',
      imageUri: persistedImageUri,
      editorMode: input.editorMode,
      tags: input.tags.map((tag) => ({ ...tag })),
      panelMarkers: input.panelMarkers.map((marker) => ({ ...marker })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const withoutCurrent = existingDrafts.filter((draft) => draft.id !== draftId);
    const nextDrafts = [nextDraft, ...withoutCurrent]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_EDITOR_DRAFTS);

    const keptIds = new Set(nextDrafts.map((draft) => draft.id));
    const pruned = withoutCurrent.filter((draft) => !keptIds.has(draft.id));

    await Promise.all(pruned.map((draft) => deleteDraftImage(draft.imageUri)));
    await writeDraftsToStorage(nextDrafts);

    return nextDraft;
  } catch {
    return null;
  }
}

export async function removeEditorDraft(id: string): Promise<void> {
  try {
    const drafts = await readDraftsFromStorage();
    const target = drafts.find((draft) => draft.id === id);

    if (!target) {
      return;
    }

    await deleteDraftImage(target.imageUri);
    await writeDraftsToStorage(drafts.filter((draft) => draft.id !== id));
  } catch {
    // Preference/storage failures should not block UI.
  }
}
