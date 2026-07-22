import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import {
  DEFAULT_TAG_SIZE_PRESET_ID,
  DEFAULT_TAG_STYLE_BY_TYPE,
  TAG_STYLE_PRESETS,
  getStylePresetForType,
} from '@/constants/tagPresets';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, EditorUndoSnapshot, ScreenPoint, ScreenRect, TagSize } from '@/types/editor';
import type { ImageDisplayRect, PriceTag, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';
import {
  DRAG_POSITION_TOLERANCE,
  clampNormalized,
  getNormalizedPointFromCanvasPoint,
  hasPositionChanged,
  isPointInsideImageRect,
  isPointInsideRect,
} from '@/utils/editorGeometry';

export const DEFAULT_PRICE_TEXT = 'THB ';
export const DEFAULT_SOLD_TEXT = 'SOLD';

const ALIGN_MAX_Y_SPAN = 0.12;
const ALIGN_FEEDBACK_MS = 2500;

export function getDefaultTextForType(type: TagType) {
  return type === 'sold' ? DEFAULT_SOLD_TEXT : DEFAULT_PRICE_TEXT;
}

function getSafeTagText(text: string, type: TagType) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return getDefaultTextForType(type);
  }

  return type === 'price' && trimmedText === DEFAULT_PRICE_TEXT.trim() ? DEFAULT_PRICE_TEXT : trimmedText;
}

function createPriceTag(x: number, y: number, stylePresetId: TagStylePresetId, sizePresetId: TagSizePresetId): PriceTag {
  const type = TAG_STYLE_PRESETS[stylePresetId].type;

  return {
    id: `tag-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    type,
    text: getDefaultTextForType(type),
    x,
    y,
    stylePresetId,
    sizePresetId,
  };
}

function cloneTags(tags: PriceTag[]) {
  return tags.map((tag) => ({ ...tag }));
}

type UseTagEditorStateOptions = {
  closeOverlayMenus: () => void;
  editorMode: EditorPricingMode;
  imageRect: ImageDisplayRect | null;
  selectedImageUri: string | null;
  setUndoSnapshot: Dispatch<SetStateAction<EditorUndoSnapshot | null>>;
};

export function useTagEditorState({
  closeOverlayMenus,
  editorMode,
  imageRect,
  selectedImageUri,
  setUndoSnapshot,
}: UseTagEditorStateOptions) {
  const { t } = useTranslation();
  const bottomDropAreaRef = useRef<View>(null);
  const groupDragOriginalTagsRef = useRef<PriceTag[] | null>(null);
  const alignFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [dragOriginalTag, setDragOriginalTag] = useState<PriceTag | null>(null);
  const [dragPoint, setDragPoint] = useState<ScreenPoint | null>(null);
  const [deleteDropZoneRect, setDeleteDropZoneRect] = useState<ScreenRect | null>(null);
  const [deleteCandidateTagId, setDeleteCandidateTagId] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isStylePickerVisible, setIsStylePickerVisible] = useState(false);
  const [currentToolType, setCurrentToolType] = useState<TagType>('price');
  const [currentStylePresetByType, setCurrentStylePresetByType] = useState<Record<TagType, TagStylePresetId>>({
    ...DEFAULT_TAG_STYLE_BY_TYPE,
  });
  const [currentSizePresetId, setCurrentSizePresetId] = useState<TagSizePresetId>(DEFAULT_TAG_SIZE_PRESET_ID);

  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
  const isDraggingTag = draggingTagId !== null;
  const isMultiSelectGroupDrag =
    isMultiSelectMode && draggingTagId !== null && selectedTagIds.length >= 2 && selectedTagIds.includes(draggingTagId);
  const isDragOverDelete = !isMultiSelectGroupDrag && dragPoint ? isPointInsideRect(dragPoint, deleteDropZoneRect) : false;

  useEffect(() => {
    return () => {
      if (alignFeedbackTimerRef.current) {
        clearTimeout(alignFeedbackTimerRef.current);
      }
    };
  }, []);

  const clearTagEditorState = () => {
    setSelectedTagId(null);
    setDraftTagId(null);
    setDraftText(DEFAULT_PRICE_TEXT);
    setDraftType('price');
    setDraggingTagId(null);
    setDragOriginalTag(null);
    setDragPoint(null);
    setIsStylePickerVisible(false);
  };

  const closeStylePicker = () => {
    setIsStylePickerVisible(false);
  };

  const commitDraftTag = () => {
    if (!selectedTag) {
      return;
    }

    const safeText = getSafeTagText(draftText, draftType);

    setTags((currentTags) =>
      currentTags.map((tag) =>
        tag.id === selectedTag.id
          ? { ...tag, text: safeText, type: draftType, stylePresetId: getStylePresetForType(draftType, tag.stylePresetId) }
          : tag,
      ),
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

    if (!isPointInsideImageRect(touchX, touchY, imageRect)) {
      return;
    }

    const { x, y } = getNormalizedPointFromCanvasPoint(touchX, touchY, imageRect);
    const newTag = createPriceTag(x, y, currentStylePresetByType[currentToolType], currentSizePresetId);

    setTags((currentTags) => {
      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      return [...currentTags, newTag];
    });
    setSelectedTagId(newTag.id);
    setDraftTagId(newTag.id);
    setDraftText(newTag.text);
    setDraftType(newTag.type);
    setIsStylePickerVisible(false);
  };

  const handleTagPress = (tag: PriceTag) => {
    if (isMultiSelectMode) {
      setSelectedTagIds((currentIds) =>
        currentIds.includes(tag.id) ? currentIds.filter((id) => id !== tag.id) : [...currentIds, tag.id],
      );
      return;
    }

    setSelectedTagId(tag.id);
    setDraggingTagId(null);
    setDraftTagId(null);
    setDraftText(tag.text);
    setDraftType(tag.type);
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
      setUndoSnapshot(null);
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

    if (!isGroupMove && isPointInsideRect(releasePoint, deleteDropZoneRect)) {
      setDeleteCandidateTagId(tagId);
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

        setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
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

      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
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

  const handleSaveTag = (tagId: string, text: string, type: TagType) => {
    const safeText = getSafeTagText(text, type);

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === tagId);

      if (!previousTag) {
        return currentTags;
      }

      const nextStylePresetId = getStylePresetForType(type, previousTag.stylePresetId);
      const hasChanged = previousTag.text !== safeText || previousTag.type !== type || previousTag.stylePresetId !== nextStylePresetId;

      if (!hasChanged) {
        return currentTags;
      }

      if (draftTagId !== tagId) {
        setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      }

      return currentTags.map((tag) => (tag.id === tagId ? { ...tag, text: safeText, type, stylePresetId: nextStylePresetId } : tag));
    });
    clearTagEditorState();
  };

  const handleSelectToolType = (type: TagType) => {
    setCurrentToolType(type);
  };

  const handleSelectStylePreset = (stylePresetId: TagStylePresetId) => {
    const preset = TAG_STYLE_PRESETS[stylePresetId];

    if (preset.type !== currentToolType) {
      return;
    }

    setCurrentStylePresetByType((currentPresets) => ({ ...currentPresets, [currentToolType]: stylePresetId }));

    if (!selectedTag || selectedTag.type !== currentToolType) {
      return;
    }

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === selectedTag.id);

      if (!previousTag || previousTag.stylePresetId === stylePresetId) {
        return currentTags;
      }

      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, stylePresetId } : tag));
    });
  };

  const handleSelectSizePreset = (sizePresetId: TagSizePresetId) => {
    setCurrentSizePresetId(sizePresetId);

    if (!selectedTag || selectedTag.type !== currentToolType) {
      return;
    }

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === selectedTag.id);

      if (
        !previousTag ||
        previousTag.sizePresetId === sizePresetId ||
        (!previousTag.sizePresetId && sizePresetId === DEFAULT_TAG_SIZE_PRESET_ID)
      ) {
        return currentTags;
      }

      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, sizePresetId } : tag));
    });
  };

  const handleDeleteTag = (tagId: string) => {
    setTags((currentTags) => {
      if (!currentTags.some((tag) => tag.id === tagId)) {
        return currentTags;
      }

      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.filter((tag) => tag.id !== tagId);
    });
    clearTagEditorState();
  };

  const cancelDeleteTag = () => {
    if (dragOriginalTag) {
      setTags((currentTags) => currentTags.map((tag) => (tag.id === dragOriginalTag.id ? { ...dragOriginalTag } : tag)));
    }

    setIsDeleteModalVisible(false);
    setDeleteCandidateTagId(null);
    setDragOriginalTag(null);
  };

  const confirmDeleteTag = () => {
    if (deleteCandidateTagId) {
      handleDeleteTag(deleteCandidateTagId);
    }

    setIsDeleteModalVisible(false);
    setDeleteCandidateTagId(null);
    setDragOriginalTag(null);
  };

  const handleBottomDropAreaLayout = () => {
    requestAnimationFrame(() => {
      bottomDropAreaRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        setDeleteDropZoneRect({ x: pageX, y: pageY, width, height });
      });
    });
  };

  const handleCancelTagEdit = () => {
    if (draftTagId) {
      setTags((currentTags) => currentTags.filter((tag) => tag.id !== draftTagId));
      setUndoSnapshot(null);
    }

    clearTagEditorState();
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
    if (!selectedImageUri || editorMode !== 'tag') {
      return;
    }

    handleCancelTagEdit();
    setIsStylePickerVisible(false);
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

      setUndoSnapshot({ mode: 'tag', tags: cloneTags(currentTags) });
      return currentTags.map((tag) => (selectedIdSet.has(tag.id) ? { ...tag, y: averageY } : tag));
    });
  };

  const deselectTagForMarkerSelect = () => {
    setSelectedTagId(null);
    setDraftTagId(null);
    setIsStylePickerVisible(false);
  };

  const restoreTags = (nextTags: PriceTag[]) => {
    setTags(cloneTags(nextTags));
  };

  const stylePickerType = currentToolType;
  const activeStylePresetId =
    selectedTag && selectedTag.type === stylePickerType
      ? getStylePresetForType(stylePickerType, selectedTag.stylePresetId)
      : currentStylePresetByType[stylePickerType];
  const activeSizePresetId =
    selectedTag && selectedTag.type === stylePickerType ? (selectedTag.sizePresetId ?? currentSizePresetId) : currentSizePresetId;
  const stylePreviewTag: PriceTag = {
    id: 'style-preview',
    type: stylePickerType,
    text: stylePickerType === 'sold' ? DEFAULT_SOLD_TEXT : 'THB 10,000',
    x: 0.5,
    y: 0.18,
    stylePresetId: activeStylePresetId,
    sizePresetId: activeSizePresetId,
  };

  return {
    activeSizePresetId,
    activeStylePresetId,
    addTagAtPoint,
    alignFeedbackMessage,
    bottomDropAreaRef,
    cancelDeleteTag,
    clearTagEditorState,
    closeStylePicker,
    commitDraftTag,
    confirmDeleteTag,
    deselectTagForMarkerSelect,
    draftTagId,
    draftText,
    draftType,
    draggingTagId,
    enterMultiSelectMode,
    exitMultiSelectMode,
    groupDragOffset,
    groupDragOriginalTagsRef,
    handleAlignSelectedTags,
    handleBottomDropAreaLayout,
    handleCancelTagEdit,
    handleDeleteTag,
    handleSaveTag,
    handleSelectSizePreset,
    handleSelectStylePreset,
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
    isStylePickerVisible,
    openStylePicker,
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
  };
}
