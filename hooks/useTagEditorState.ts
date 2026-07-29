import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  DEFAULT_TAG_SIZE_PRESET_ID,
  DEFAULT_TAG_STYLE_BY_TYPE,
  estimatePlacementTagSize,
  getStylePresetForType,
  SOLD_STYLE_PRESET_ORDER,
} from '@/constants/tagPresets';
import {
  DEFAULT_CONDITION_TEXT,
  DEFAULT_CONDITION_VALUE,
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_PRICE_TEXT,
  DEFAULT_QUANTITY,
  DEFAULT_SOLD_TEXT,
  DEFAULT_SOLD_TEXT_FORMAT,
  DEFAULT_TEXT_TAG,
  SOLD_ICON_TEXT,
  TAG_CONDITION_VALUE_CYCLE,
  TAG_LANGUAGE_CODE_CYCLE,
  TEXT_STYLE_PRESET_CYCLE,
  getLargerSizePreset,
  getNextCycleValue,
  getSmallerSizePreset,
  isInfoTagType,
  toPickerSizePreset,
} from '@/constants/tagDefaults';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, EditorUndoSnapshot, ScreenPoint, ScreenRect, TagSize } from '@/types/editor';
import type {
  ImageDisplayRect,
  PriceTag,
  PriceTextFormat,
  SoldTextFormat,
  TagConditionValue,
  TagEditorDraftPreview,
  TagEditorSaveUpdates,
  TagLanguageCode,
  TagSizePresetId,
  TagStylePresetId,
  TagType,
} from '@/types/tag';
import {
  DRAG_POSITION_TOLERANCE,
  clampNormalized,
  getNormalizedPointFromCanvasPoint,
  hasPositionChanged,
  isPointInsideRect,
  isPointNearImageRect,
} from '@/utils/editorGeometry';
import { clampPriceTextFormat, extractPriceDigits, formatPriceDisplay, getPriceTextFormatsForCurrency } from '@/utils/priceText';

export {
  DEFAULT_CONDITION_TEXT,
  DEFAULT_CONDITION_VALUE,
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_PRICE_TEXT,
  DEFAULT_QUANTITY,
  DEFAULT_SOLD_TEXT,
  DEFAULT_TEXT_TAG,
  SOLD_ICON_TEXT,
} from '@/constants/tagDefaults';

const ALIGN_MAX_Y_SPAN = 0.12;
const ALIGN_FEEDBACK_MS = 2500;

export function getDefaultTextForType(type: TagType, soldLabel: string = DEFAULT_SOLD_TEXT) {
  switch (type) {
    case 'sold':
      return soldLabel;
    case 'text':
      return DEFAULT_TEXT_TAG;
    case 'condition':
      return DEFAULT_CONDITION_TEXT;
    case 'quantity':
      return `x${DEFAULT_QUANTITY}`;
    case 'language':
      return DEFAULT_LANGUAGE_CODE;
    case 'price':
      return DEFAULT_PRICE_TEXT;
  }
}

function getSafeTagText(text: string, type: TagType, soldLabel: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return getDefaultTextForType(type, soldLabel);
  }

  return trimmedText;
}

/** New drafts that are still blank may be discarded on outside tap; typed tags stay. */
function isNewDraftEmpty(
  tag: PriceTag,
  draftPreview: TagEditorDraftPreview | null,
  draftText: string,
  liveText?: string,
) {
  const text = (liveText || draftPreview?.text || draftText).trim();

  switch (tag.type) {
    case 'price':
      return extractPriceDigits(text).length === 0;
    case 'text':
      return text.length === 0;
    case 'sold':
    case 'quantity':
    case 'condition':
    case 'language':
      return false;
  }
}

function buildSaveUpdatesFromDraft(
  tag: PriceTag,
  draftPreview: TagEditorDraftPreview | null,
  draftText: string,
  liveText?: string,
): TagEditorSaveUpdates {
  const text = liveText || draftPreview?.text || draftText;
  const updates: TagEditorSaveUpdates = {
    text,
    stylePresetId: draftPreview?.stylePresetId ?? tag.stylePresetId,
    sizePresetId: draftPreview?.sizePresetId ?? tag.sizePresetId,
  };

  if (tag.type === 'price') {
    updates.priceTextFormat = draftPreview?.priceTextFormat ?? tag.priceTextFormat;
  }

  if (tag.type === 'sold') {
    updates.soldTextFormat = draftPreview?.soldTextFormat ?? tag.soldTextFormat;
  }

  if (tag.type === 'condition') {
    updates.condition = draftPreview?.condition ?? tag.condition;
  }

  if (tag.type === 'language') {
    updates.languageCode = draftPreview?.languageCode ?? tag.languageCode;
  }

  if (tag.type === 'quantity') {
    const digits = extractPriceDigits(text);
    updates.quantity = digits ? Number(digits) : (tag.quantity ?? DEFAULT_QUANTITY);
  }

  return updates;
}

type CreateTagOptions = {
  priceTextFormat: PriceTextFormat;
  soldTextFormat: SoldTextFormat;
  languageCode: TagLanguageCode;
  condition: TagConditionValue;
};

function createPriceTag(
  x: number,
  y: number,
  type: TagType,
  stylePresetId: TagStylePresetId,
  sizePresetId: TagSizePresetId,
  soldLabel: string,
  options: CreateTagOptions,
): PriceTag {
  const resolvedStylePresetId = getStylePresetForType(type, stylePresetId);
  const id = `tag-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  switch (type) {
    case 'price':
      return {
        id,
        type,
        text: getDefaultTextForType(type, soldLabel),
        x,
        y,
        stylePresetId: resolvedStylePresetId,
        sizePresetId,
        priceTextFormat: options.priceTextFormat,
      };
    case 'sold': {
      const soldTextFormat = options.soldTextFormat;
      const soldStylePresetId = soldTextFormat === 'icon_plain' ? 'sold-icon-plain' : resolvedStylePresetId;

      return {
        id,
        type,
        text: soldTextFormat === 'text' ? soldLabel : SOLD_ICON_TEXT,
        x,
        y,
        stylePresetId: soldStylePresetId,
        sizePresetId,
        soldTextFormat,
      };
    }
    case 'text':
      return {
        id,
        type,
        text: getDefaultTextForType(type, soldLabel),
        x,
        y,
        stylePresetId: resolvedStylePresetId,
        sizePresetId,
      };
    case 'quantity':
      return {
        id,
        type,
        text: getDefaultTextForType(type, soldLabel),
        x,
        y,
        stylePresetId: resolvedStylePresetId,
        sizePresetId,
        quantity: DEFAULT_QUANTITY,
      };
    case 'condition':
      return {
        id,
        type,
        text: options.condition,
        x,
        y,
        stylePresetId: resolvedStylePresetId,
        sizePresetId,
        condition: options.condition,
      };
    case 'language':
      return {
        id,
        type,
        text: options.languageCode,
        x,
        y,
        stylePresetId: resolvedStylePresetId,
        sizePresetId,
        languageCode: options.languageCode,
      };
  }
}

function cloneTags(tags: PriceTag[]) {
  return tags.map((tag) => ({ ...tag }));
}

type UseTagEditorStateOptions = {
  closeOverlayMenus: () => void;
  confirmPendingDraftHistory: () => void;
  discardPendingDraftHistory: () => void;
  editorMode: EditorPricingMode;
  imageRect: ImageDisplayRect | null;
  pushHistory: (snapshot: EditorUndoSnapshot, options?: { asPendingDraft?: boolean }) => void;
  selectedImageUri: string | null;
};

export function useTagEditorState({
  closeOverlayMenus,
  confirmPendingDraftHistory,
  discardPendingDraftHistory,
  editorMode,
  imageRect,
  pushHistory,
  selectedImageUri,
}: UseTagEditorStateOptions) {
  const { language, t } = useTranslation();
  const { currency } = useCurrency();
  const bottomDropAreaRef = useRef<View>(null);
  const groupDragOriginalTagsRef = useRef<PriceTag[] | null>(null);
  const alignFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest inline text without setState — used by dismiss/save when syncOnly draft updates. */
  const liveDraftTextRef = useRef('');

  const [tags, setTags] = useState<PriceTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [groupDragOffset, setGroupDragOffset] = useState<ScreenPoint>({ x: 0, y: 0 });
  const [tagSizeById, setTagSizeById] = useState<Record<string, TagSize>>({});
  const [alignFeedbackMessage, setAlignFeedbackMessage] = useState<string | null>(null);
  const [draftTagId, setDraftTagId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState(DEFAULT_PRICE_TEXT);
  const [draftType, setDraftType] = useState<TagType>('price');
  const [draftPreview, setDraftPreview] = useState<TagEditorDraftPreview | null>(null);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [dragOriginalTag, setDragOriginalTag] = useState<PriceTag | null>(null);
  const [dragPoint, setDragPoint] = useState<ScreenPoint | null>(null);
  const [deleteDropZoneRect, setDeleteDropZoneRect] = useState<ScreenRect | null>(null);
  const [deleteCandidateTagIds, setDeleteCandidateTagIds] = useState<string[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isStylePickerVisible, setIsStylePickerVisible] = useState(false);
  const [isPendingPlacement, setIsPendingPlacement] = useState(false);
  const [currentToolType, setCurrentToolType] = useState<TagType>('price');
  const [currentStylePresetByType, setCurrentStylePresetByType] = useState<Record<TagType, TagStylePresetId>>({
    ...DEFAULT_TAG_STYLE_BY_TYPE,
  });
  const [sizePresetOverrideByType, setSizePresetOverrideByType] = useState<Partial<Record<TagType, TagSizePresetId>>>({});
  const [currentSizePresetId, setCurrentSizePresetId] = useState<TagSizePresetId>(DEFAULT_TAG_SIZE_PRESET_ID);
  const [currentPriceTextFormat, setCurrentPriceTextFormat] = useState<PriceTextFormat>('symbol');
  const [currentSoldTextFormat, setCurrentSoldTextFormat] = useState<SoldTextFormat>(DEFAULT_SOLD_TEXT_FORMAT);
  const [currentLanguageCode, setCurrentLanguageCode] = useState<TagLanguageCode>(DEFAULT_LANGUAGE_CODE);
  const [currentConditionValue, setCurrentConditionValue] = useState<TagConditionValue>(DEFAULT_CONDITION_VALUE);

  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
  const isDraggingTag = draggingTagId !== null;
  const isMultiSelectGroupDrag =
    isMultiSelectMode && draggingTagId !== null && selectedTagIds.length >= 2 && selectedTagIds.includes(draggingTagId);
  const isDragOverDelete = dragPoint ? isPointInsideRect(dragPoint, deleteDropZoneRect) : false;

  useEffect(() => {
    return () => {
      if (alignFeedbackTimerRef.current) {
        clearTimeout(alignFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCurrentPriceTextFormat((current) => clampPriceTextFormat(currency, current));
  }, [currency]);

  // Draft add pushes early with asPendingDraft; confirm once the draft is kept.
  useEffect(() => {
    if (!draftTagId) {
      confirmPendingDraftHistory();
    }
  }, [confirmPendingDraftHistory, draftTagId]);

  const clearTagEditorState = () => {
    setSelectedTagId(null);
    setDraftTagId(null);
    setDraftText(DEFAULT_PRICE_TEXT);
    setDraftType('price');
    setDraftPreview(null);
    liveDraftTextRef.current = '';
    setDraggingTagId(null);
    setDragOriginalTag(null);
    setDragPoint(null);
    setIsStylePickerVisible(false);
    setIsPendingPlacement(false);
  };

  const handleDraftChange = (preview: TagEditorDraftPreview, options?: { syncOnly?: boolean }) => {
    liveDraftTextRef.current = preview.text;

    // Keystroke path: keep dismiss/save text current without setState (avoids full editor re-render).
    if (options?.syncOnly) {
      return;
    }

    setDraftText((current) => (current === preview.text ? current : preview.text));
    setDraftPreview((current) => {
      if (
        current &&
        current.text === preview.text &&
        current.stylePresetId === preview.stylePresetId &&
        current.sizePresetId === preview.sizePresetId &&
        current.priceTextFormat === preview.priceTextFormat &&
        current.soldTextFormat === preview.soldTextFormat &&
        current.condition === preview.condition &&
        current.languageCode === preview.languageCode
      ) {
        return current;
      }

      return preview;
    });
  };

  const closeStylePicker = () => {
    setIsStylePickerVisible(false);
  };

  /** User closed the style sheet after picking — enter sticky pending-placement mode. */
  const finishStylePicker = () => {
    setIsStylePickerVisible(false);

    if (editorMode !== 'tag' || !selectedImageUri) {
      return;
    }

    setSelectedTagId(null);
    setDraftTagId(null);
    setDraftPreview(null);
    setIsPendingPlacement(true);
  };

  const cancelPendingPlacement = () => {
    setIsPendingPlacement(false);
  };

  const commitDraftTag = () => {
    if (!selectedTag) {
      return;
    }

    const soldLabel = t('tag.sold');
    const safeText = getSafeTagText(liveDraftTextRef.current || draftText, selectedTag.type, soldLabel);

    setTags((currentTags) =>
      currentTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, text: safeText } : tag)),
    );
  };

  const openStylePicker = () => {
    if (!selectedImageUri || editorMode !== 'tag') {
      return;
    }

    closeOverlayMenus();
    commitDraftTag();
    if (selectedTag) {
      setCurrentToolType(selectedTag.type);
    }
    setDraftTagId(null);
    setIsStylePickerVisible(true);
  };

  const addTagAtPoint = (touchX: number, touchY: number) => {
    if (!imageRect) {
      return;
    }

    // Allow near-edge taps (incl. slight letterbox miss) then soft-clamp into the photo.
    if (!isPointNearImageRect(touchX, touchY, imageRect)) {
      return;
    }

    const soldLabel = t('tag.sold');
    const sizePresetId =
      sizePresetOverrideByType[currentToolType] ??
      (isInfoTagType(currentToolType) ? getSmallerSizePreset(currentSizePresetId) : currentSizePresetId);
    // Clamp with a realistic chip size so wide tags do not hang past the right edge.
    const placementSize = estimatePlacementTagSize(currentToolType, sizePresetId, imageRect.width);
    const { x, y } = getNormalizedPointFromCanvasPoint(touchX, touchY, imageRect, placementSize);
    const newTag = createPriceTag(
      x,
      y,
      currentToolType,
      currentStylePresetByType[currentToolType],
      sizePresetId,
      soldLabel,
      {
        priceTextFormat: clampPriceTextFormat(currency, currentPriceTextFormat),
        soldTextFormat: currentSoldTextFormat,
        languageCode: currentLanguageCode,
        condition: currentConditionValue,
      },
    );

    setTags((currentTags) => {
      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) }, { asPendingDraft: true });
      return [...currentTags, newTag];
    });
    setSelectedTagId(newTag.id);
    setDraftTagId(newTag.id);
    setDraftText(newTag.text);
    setDraftType(newTag.type);
    setDraftPreview(null);
    liveDraftTextRef.current = newTag.text;
    setIsStylePickerVisible(false);
    setIsPendingPlacement(false);
  };

  const handleTagPress = (tag: PriceTag) => {
    if (isMultiSelectMode) {
      setSelectedTagIds((currentIds) =>
        currentIds.includes(tag.id) ? currentIds.filter((id) => id !== tag.id) : [...currentIds, tag.id],
      );
      return;
    }

    if (selectedTag && selectedTag.id !== tag.id) {
      handleDismissTagEdit();
    }

    setSelectedTagId(tag.id);
    setDraggingTagId(null);
    setDraftTagId(null);
    setDraftText(tag.text);
    setDraftType(tag.type);
    setDraftPreview(null);
    setIsStylePickerVisible(false);
  };

  const handleTagSizeChange = (tagId: string, size: TagSize) => {
    setTagSizeById((currentSizes) => {
      const previousSize = currentSizes[tagId];

      if (previousSize && previousSize.width === size.width && previousSize.height === size.height) {
        return currentSizes;
      }

      return { ...currentSizes, [tagId]: size };
    });
  };

  const handleTagDragStart = (tag: PriceTag) => {
    setDraggingTagId(tag.id);
    setDragOriginalTag({ ...tag });
    setDragPoint(null);
    setIsStylePickerVisible(false);
    setGroupDragOffset({ x: 0, y: 0 });

    if (isMultiSelectMode && selectedTagIds.includes(tag.id)) {
      groupDragOriginalTagsRef.current = cloneTags(tags.filter((currentTag) => selectedTagIds.includes(currentTag.id)));
    } else {
      groupDragOriginalTagsRef.current = null;
    }

    if (draftTagId && draftTagId !== tag.id) {
      setTags((currentTags) => currentTags.filter((currentTag) => currentTag.id !== draftTagId));
      discardPendingDraftHistory();
      setDraftTagId(null);
    }
  };

  const handleTagDragMove = (point: ScreenPoint) => {
    setDragPoint(point);
  };

  const handleTagDragOffsetChange = (offset: ScreenPoint) => {
    setGroupDragOffset(offset);
  };

  const handleTagDragEnd = (tagId: string, canvasX: number, canvasY: number, tagSize: TagSize, releasePoint: ScreenPoint) => {
    const groupOriginals = groupDragOriginalTagsRef.current;
    const isGroupMove =
      isMultiSelectMode && groupOriginals !== null && groupOriginals.length >= 2 && selectedTagIds.includes(tagId);

    if (isPointInsideRect(releasePoint, deleteDropZoneRect)) {
      const idsToDelete =
        isGroupMove && groupOriginals ? groupOriginals.map((tag) => tag.id) : [tagId];
      setDeleteCandidateTagIds(idsToDelete);
      setIsDeleteModalVisible(true);
      setDraggingTagId(null);
      setDragPoint(null);
      setGroupDragOffset({ x: 0, y: 0 });
      groupDragOriginalTagsRef.current = null;
      return;
    }

    if (!imageRect) {
      setDraggingTagId(null);
      setDragPoint(null);
      setGroupDragOffset({ x: 0, y: 0 });
      groupDragOriginalTagsRef.current = null;
      return;
    }

    if (isGroupMove && groupOriginals) {
      const primaryOriginal = groupOriginals.find((tag) => tag.id === tagId);

      if (!primaryOriginal) {
        setDraggingTagId(null);
        setDragOriginalTag(null);
        setDragPoint(null);
        setGroupDragOffset({ x: 0, y: 0 });
        groupDragOriginalTagsRef.current = null;
        return;
      }

      const dx = canvasX - (imageRect.x + primaryOriginal.x * imageRect.width);
      const dy = canvasY - (imageRect.y + primaryOriginal.y * imageRect.height);
      const groupIdSet = new Set(groupOriginals.map((tag) => tag.id));

      setTags((currentTags) => {
        let didChange = false;
        const nextTags = currentTags.map((tag) => {
          if (!groupIdSet.has(tag.id)) {
            return tag;
          }

          const original = groupOriginals.find((groupTag) => groupTag.id === tag.id) ?? tag;
          const nextX = clampNormalized(original.x + dx / imageRect.width);
          const nextY = clampNormalized(original.y + dy / imageRect.height);

          if (hasPositionChanged(tag, nextX, nextY)) {
            didChange = true;
          }

          return { ...tag, x: nextX, y: nextY };
        });

        if (!didChange) {
          return currentTags;
        }

        pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
        return nextTags;
      });

      setDraggingTagId(null);
      setDragOriginalTag(null);
      setDragPoint(null);
      setGroupDragOffset({ x: 0, y: 0 });
      groupDragOriginalTagsRef.current = null;
      return;
    }

    const { x, y } = getNormalizedPointFromCanvasPoint(canvasX, canvasY, imageRect, tagSize);

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === tagId);

      if (!previousTag || !hasPositionChanged(previousTag, x, y)) {
        return currentTags;
      }

      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (tag.id === tagId ? { ...tag, x, y } : tag));
    });
    setDraggingTagId(null);
    setDragOriginalTag(null);
    setDragPoint(null);
    setGroupDragOffset({ x: 0, y: 0 });
    groupDragOriginalTagsRef.current = null;
  };

  const handleTagDragCancel = () => {
    setDraggingTagId(null);
    setDragOriginalTag(null);
    setDragPoint(null);
    setGroupDragOffset({ x: 0, y: 0 });
    groupDragOriginalTagsRef.current = null;
  };

  const handleSaveTag = (tagId: string, updates: TagEditorSaveUpdates) => {
    const soldLabel = t('tag.sold');

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === tagId);

      if (!previousTag) {
        return currentTags;
      }

      const nextStylePresetId =
        previousTag.type === 'sold' && (updates.soldTextFormat ?? previousTag.soldTextFormat) === 'icon_plain'
          ? 'sold-icon-plain'
          : getStylePresetForType(
              previousTag.type,
              updates.stylePresetId === 'sold-icon-plain' ? undefined : (updates.stylePresetId ?? previousTag.stylePresetId),
            );
      const safeText = getSafeTagText(updates.text, previousTag.type, soldLabel);
      const nextSizePresetId = updates.sizePresetId ?? previousTag.sizePresetId;
      const nextTag: PriceTag = {
        ...previousTag,
        text: safeText,
        stylePresetId: nextStylePresetId,
        sizePresetId: nextSizePresetId,
        priceTextFormat:
          previousTag.type === 'price'
            ? clampPriceTextFormat(currency, updates.priceTextFormat ?? previousTag.priceTextFormat)
            : previousTag.priceTextFormat,
        soldTextFormat: previousTag.type === 'sold' ? (updates.soldTextFormat ?? previousTag.soldTextFormat ?? 'text') : previousTag.soldTextFormat,
        quantity: previousTag.type === 'quantity' ? (updates.quantity ?? previousTag.quantity ?? DEFAULT_QUANTITY) : previousTag.quantity,
        condition: previousTag.type === 'condition' ? (updates.condition ?? previousTag.condition ?? DEFAULT_CONDITION_VALUE) : previousTag.condition,
        languageCode:
          previousTag.type === 'language' ? (updates.languageCode ?? previousTag.languageCode ?? DEFAULT_LANGUAGE_CODE) : previousTag.languageCode,
      };

      const hasChanged =
        previousTag.text !== nextTag.text ||
        previousTag.stylePresetId !== nextTag.stylePresetId ||
        previousTag.sizePresetId !== nextTag.sizePresetId ||
        previousTag.priceTextFormat !== nextTag.priceTextFormat ||
        previousTag.soldTextFormat !== nextTag.soldTextFormat ||
        previousTag.quantity !== nextTag.quantity ||
        previousTag.condition !== nextTag.condition ||
        previousTag.languageCode !== nextTag.languageCode;

      if (!hasChanged) {
        return currentTags;
      }

      if (draftTagId !== tagId) {
        pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      }

      setCurrentStylePresetByType((currentPresets) => ({
        ...currentPresets,
        [previousTag.type]: nextStylePresetId,
      }));

      if (nextSizePresetId) {
        setSizePresetOverrideByType((currentSizes) => ({
          ...currentSizes,
          [previousTag.type]: nextSizePresetId,
        }));
      }

      if (previousTag.type === 'price' && nextTag.priceTextFormat) {
        setCurrentPriceTextFormat(nextTag.priceTextFormat);
      }

      if (previousTag.type === 'sold' && nextTag.soldTextFormat) {
        setCurrentSoldTextFormat(nextTag.soldTextFormat);
      }

      if (previousTag.type === 'language' && nextTag.languageCode) {
        setCurrentLanguageCode(nextTag.languageCode);
      }

      if (previousTag.type === 'condition' && nextTag.condition) {
        setCurrentConditionValue(nextTag.condition);
      }

      return currentTags.map((tag) => (tag.id === tagId ? nextTag : tag));
    });
    clearTagEditorState();
  };

  const handleSelectToolType = (type: TagType) => {
    if (type === currentToolType) {
      if (type === 'price') {
        const formats = getPriceTextFormatsForCurrency(currency);
        setCurrentPriceTextFormat((current) => getNextCycleValue(formats, clampPriceTextFormat(currency, current)));
        return;
      }

      if (type === 'sold') {
        const currentId =
          currentSoldTextFormat === 'icon_plain'
            ? 'sold-icon-plain'
            : getStylePresetForType('sold', currentStylePresetByType.sold);
        const nextId = getNextCycleValue([...SOLD_STYLE_PRESET_ORDER], currentId);
        setCurrentStylePresetByType((currentPresets) => ({
          ...currentPresets,
          sold: nextId,
        }));
        setCurrentSoldTextFormat(nextId === 'sold-icon-plain' ? 'icon_plain' : 'text');
        return;
      }

      if (type === 'text') {
        setCurrentStylePresetByType((currentPresets) => {
          const currentId = getStylePresetForType('text', currentPresets.text);
          return {
            ...currentPresets,
            text: getNextCycleValue(TEXT_STYLE_PRESET_CYCLE, currentId),
          };
        });
        return;
      }

      if (type === 'language') {
        setCurrentLanguageCode((current) => getNextCycleValue(TAG_LANGUAGE_CODE_CYCLE, current));
        return;
      }

      if (type === 'condition') {
        setCurrentConditionValue((current) => getNextCycleValue(TAG_CONDITION_VALUE_CYCLE, current));
        return;
      }
    }

    setCurrentToolType(type);
  };

  const handleSelectSizePreset = (sizePresetId: TagSizePresetId) => {
    setCurrentSizePresetId(sizePresetId);
    const resolvedSizeForTool = isInfoTagType(currentToolType) ? getSmallerSizePreset(sizePresetId) : sizePresetId;
    setSizePresetOverrideByType((currentSizes) => ({
      ...currentSizes,
      [currentToolType]: resolvedSizeForTool,
    }));

    if (!selectedTag || selectedTag.type !== currentToolType) {
      return;
    }

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === selectedTag.id);

      if (
        !previousTag ||
        previousTag.sizePresetId === resolvedSizeForTool ||
        (!previousTag.sizePresetId && resolvedSizeForTool === DEFAULT_TAG_SIZE_PRESET_ID)
      ) {
        return currentTags;
      }

      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, sizePresetId: resolvedSizeForTool } : tag));
    });
  };

  const handleDeleteTags = (tagIds: string[]) => {
    const idSet = new Set(tagIds);

    if (idSet.size === 0) {
      return;
    }

    setTags((currentTags) => {
      if (!currentTags.some((tag) => idSet.has(tag.id))) {
        return currentTags;
      }

      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.filter((tag) => !idSet.has(tag.id));
    });
    setSelectedTagIds((currentIds) => {
      const nextIds = currentIds.filter((id) => !idSet.has(id));

      if (nextIds.length === 0) {
        setIsMultiSelectMode(false);
      }

      return nextIds;
    });
    clearTagEditorState();
  };

  const handleDeleteTag = (tagId: string) => {
    handleDeleteTags([tagId]);
  };

  const cancelDeleteTag = () => {
    if (dragOriginalTag && deleteCandidateTagIds.length <= 1) {
      setTags((currentTags) => currentTags.map((tag) => (tag.id === dragOriginalTag.id ? { ...dragOriginalTag } : tag)));
    }

    setIsDeleteModalVisible(false);
    setDeleteCandidateTagIds([]);
    setDragOriginalTag(null);
  };

  const confirmDeleteTag = () => {
    if (deleteCandidateTagIds.length > 0) {
      handleDeleteTags(deleteCandidateTagIds);
    }

    setIsDeleteModalVisible(false);
    setDeleteCandidateTagIds([]);
    setDragOriginalTag(null);
  };

  const handleBottomDropAreaLayout = () => {
    requestAnimationFrame(() => {
      bottomDropAreaRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        const nextRect = { x: pageX, y: pageY, width, height };
        setDeleteDropZoneRect(nextRect);
      });
    });
  };

  const handleCancelTagEdit = () => {
    if (draftTagId) {
      setTags((currentTags) => currentTags.filter((tag) => tag.id !== draftTagId));
      discardPendingDraftHistory();
    }

    clearTagEditorState();
  };

  /**
   * Outside tap / switch-away: keep intentional work.
   * - New blank price/text draft → cancel (same as ×)
   * - New draft with valid content, or edit of existing tag → save then close
   * Does not create a new tag; caller must return before addTagAtPoint.
   */
  const handleDismissTagEdit = () => {
    if (!selectedTag) {
      clearTagEditorState();
      return;
    }

    const isNewDraft = draftTagId === selectedTag.id;

    if (isNewDraft && isNewDraftEmpty(selectedTag, draftPreview, draftText, liveDraftTextRef.current)) {
      handleCancelTagEdit();
      return;
    }

    handleSaveTag(
      selectedTag.id,
      buildSaveUpdatesFromDraft(selectedTag, draftPreview, draftText, liveDraftTextRef.current),
    );
  };

  const clearAlignFeedback = () => {
    if (alignFeedbackTimerRef.current) {
      clearTimeout(alignFeedbackTimerRef.current);
      alignFeedbackTimerRef.current = null;
    }

    setAlignFeedbackMessage(null);
  };

  const showAlignFeedback = (message: string) => {
    clearAlignFeedback();
    setAlignFeedbackMessage(message);
    alignFeedbackTimerRef.current = setTimeout(() => {
      setAlignFeedbackMessage(null);
      alignFeedbackTimerRef.current = null;
    }, ALIGN_FEEDBACK_MS);
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedTagIds([]);
    setGroupDragOffset({ x: 0, y: 0 });
    groupDragOriginalTagsRef.current = null;
    clearAlignFeedback();
  };

  const enterMultiSelectMode = () => {
    if (!selectedImageUri || editorMode !== 'tag' || tags.length === 0) {
      return;
    }

    handleCancelTagEdit();
    setIsStylePickerVisible(false);
    setIsPendingPlacement(false);
    closeOverlayMenus();
    clearAlignFeedback();
    setGroupDragOffset({ x: 0, y: 0 });
    groupDragOriginalTagsRef.current = null;
    setSelectedTagIds([]);
    setIsMultiSelectMode(true);
  };

  const handleAlignSelectedTags = () => {
    if (!isMultiSelectMode || selectedTagIds.length < 2) {
      return;
    }

    const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

    if (selectedTags.length < 2) {
      return;
    }

    const ys = selectedTags.map((tag) => tag.y);
    const span = Math.max(...ys) - Math.min(...ys);

    if (span > ALIGN_MAX_Y_SPAN) {
      showAlignFeedback(t('editor.alignTooFar'));
      return;
    }

    const averageY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
    const selectedIdSet = new Set(selectedTagIds);

    setTags((currentTags) => {
      const hasAnyChange = currentTags.some((tag) => selectedIdSet.has(tag.id) && Math.abs(tag.y - averageY) > DRAG_POSITION_TOLERANCE);

      if (!hasAnyChange) {
        return currentTags;
      }

      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (selectedIdSet.has(tag.id) ? { ...tag, y: averageY } : tag));
    });

    // Stay in multi-select so the seller can keep group-dragging; exit only via empty canvas tap.
  };

  const deselectTagForMarkerSelect = () => {
    setSelectedTagId(null);
    setDraftTagId(null);
    setIsStylePickerVisible(false);
    setIsPendingPlacement(false);
  };

  const restoreTags = (nextTags: PriceTag[]) => {
    setTags(cloneTags(nextTags));
  };

  const resetTagsAndChrome = () => {
    setTags((currentTags) => {
      pushHistory({ mode: 'tag', tags: cloneTags(currentTags) });
      return [];
    });
    setSelectedTagId(null);
    setDraftTagId(null);
    setDraftText(DEFAULT_PRICE_TEXT);
    setDraftType('price');
    setDraggingTagId(null);
    setDragOriginalTag(null);
    setDragPoint(null);
    setIsStylePickerVisible(false);
    setIsPendingPlacement(false);
    setIsDeleteModalVisible(false);
    setDeleteCandidateTagIds([]);
    setTagSizeById({});
    setIsMultiSelectMode(false);
    setSelectedTagIds([]);
    setGroupDragOffset({ x: 0, y: 0 });
    groupDragOriginalTagsRef.current = null;
    clearAlignFeedback();
  };

  const stylePickerType = currentToolType;
  const activeStylePresetId =
    selectedTag && selectedTag.type === stylePickerType
      ? getStylePresetForType(stylePickerType, selectedTag.stylePresetId)
      : currentStylePresetByType[stylePickerType];
  // Info tags store a stepped-down size for render; map back up so picker chips match the tap.
  const storedActiveSize =
    selectedTag && selectedTag.type === stylePickerType
      ? selectedTag.sizePresetId
      : sizePresetOverrideByType[stylePickerType];
  const activeSizePresetId = toPickerSizePreset(
    storedActiveSize != null && isInfoTagType(stylePickerType)
      ? getLargerSizePreset(storedActiveSize)
      : (storedActiveSize ?? currentSizePresetId),
  );
  const soldLabel = t('tag.sold');
  const stylePreviewText = (() => {
    switch (stylePickerType) {
      case 'sold':
        return currentSoldTextFormat === 'text' ? soldLabel : SOLD_ICON_TEXT;
      case 'text':
        return language === 'th' ? 'ข้อความ' : 'Text';
      case 'condition':
        return currentConditionValue;
      case 'quantity':
        return 'x4';
      case 'language':
        return currentLanguageCode;
      case 'price':
        return formatPriceDisplay('1000', currentPriceTextFormat, currency, language) || '฿1,000';
    }
  })();
  const stylePreviewSizeId =
    (selectedTag && selectedTag.type === stylePickerType ? selectedTag.sizePresetId : undefined) ??
    sizePresetOverrideByType[stylePickerType] ??
    (isInfoTagType(stylePickerType) ? getSmallerSizePreset(currentSizePresetId) : currentSizePresetId);
  const soldStylePresetId =
    currentSoldTextFormat === 'icon_plain'
      ? 'sold-icon-plain'
      : getStylePresetForType('sold', currentStylePresetByType.sold);
  const stylePreviewTag: PriceTag = {
    id: 'style-preview',
    type: stylePickerType,
    text: stylePreviewText,
    x: 0.5,
    y: 0.5,
    stylePresetId:
      stylePickerType === 'sold'
        ? soldStylePresetId
        : stylePickerType === 'text'
          ? getStylePresetForType('text', currentStylePresetByType.text)
          : activeStylePresetId,
    sizePresetId: stylePreviewSizeId,
    priceTextFormat: stylePickerType === 'price' ? currentPriceTextFormat : undefined,
    soldTextFormat: stylePickerType === 'sold' ? currentSoldTextFormat : undefined,
    condition: stylePickerType === 'condition' ? currentConditionValue : undefined,
    languageCode: stylePickerType === 'language' ? currentLanguageCode : undefined,
  };

  return {
    activeSizePresetId,
    addTagAtPoint,
    alignFeedbackMessage,
    bottomDropAreaRef,
    cancelDeleteTag,
    cancelPendingPlacement,
    clearTagEditorState,
    closeStylePicker,
    finishStylePicker,
    commitDraftTag,
    confirmDeleteTag,
    deleteCandidateTagIds,
    currentLanguageCode,
    currentConditionValue,
    currentPriceTextFormat,
    currentSoldTextFormat,
    deselectTagForMarkerSelect,
    draftTagId,
    draftText,
    draftType,
    draftPreview,
    draggingTagId,
    enterMultiSelectMode,
    exitMultiSelectMode,
    groupDragOffset,
    groupDragOriginalTagsRef,
    handleAlignSelectedTags,
    handleBottomDropAreaLayout,
    handleCancelTagEdit,
    handleDismissTagEdit,
    handleDeleteTag,
    handleDraftChange,
    handleSaveTag,
    handleSelectSizePreset,
    handleSelectToolType,
    handleTagDragCancel,
    handleTagDragEnd,
    handleTagDragMove,
    handleTagDragOffsetChange,
    handleTagDragStart,
    handleTagPress,
    handleTagSizeChange,
    isDeleteModalVisible,
    isDragOverDelete,
    isDraggingTag,
    isMultiSelectGroupDrag,
    isMultiSelectMode,
    isPendingPlacement,
    isStylePickerVisible,
    openStylePicker,
    resetTagsAndChrome,
    restoreTags,
    selectedTag,
    selectedTagId,
    selectedTagIds,
    setDraftText,
    setDraftType,
    stylePickerType,
    stylePreviewTag,
    tagSizeById,
    tags,
    textStylePresetId: getStylePresetForType('text', currentStylePresetByType.text),
    soldStylePresetId,
  };
}
