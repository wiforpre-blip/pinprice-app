import { Image, type ImageLoadEventData } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ComposedGesture, GestureType } from 'react-native-gesture-handler';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { EditorZoomViewport } from '@/components/editor/EditorZoomViewport';
import { PanelMarker } from '@/components/editor/PanelMarker';
import { PriceListComposition } from '@/components/editor/PriceListComposition';
import { PricePanel } from '@/components/editor/PricePanel';
import { StaticTag } from '@/components/editor/StaticTag';
import { TagEditor, TYPES_WITH_INLINE_INPUT } from '@/components/editor/TagEditor';
import { TagOverlay, type TagInlineEdit } from '@/components/editor/TagOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, ScreenPoint, Size, TagSize } from '@/types/editor';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { ImageDisplayRect, PriceTag, TagEditorDraftPreview, TagEditorSaveUpdates, TagType } from '@/types/tag';
import { clampGroupPixelOffset } from '@/utils/editorGeometry';

type EditorCanvasProps = {
  canvasRef: RefObject<View | null>;
  canvasSize: Size;
  draftPreview: TagEditorDraftPreview | null;
  draftTagId: string | null;
  draftText: string;
  draftType: TagType;
  dragTopBoundaryY: number | null;
  draggingTagId: string | null;
  editorMode: EditorPricingMode;
  getDefaultTextForType: (type: TagType) => string;
  groupDragOffset: ScreenPoint;
  groupDragOriginalTagsRef: RefObject<PriceTag[] | null>;
  imageRect: ImageDisplayRect | null;
  imageUri: string | null;
  isDraggingTag: boolean;
  isMultiSelectMode: boolean;
  isStylePickerVisible: boolean;
  isZoomMode: boolean;
  onCancelTagEdit: () => void;
  onCanvasLayout: (event: LayoutChangeEvent) => void;
  /** Keyboard lift applied to canvas content — coach highlight must subtract this from tag Y. */
  onKeyboardCanvasLiftChange?: (liftY: number) => void;
  onCanvasPress: (event: GestureResponderEvent) => void;
  onDeleteMarker: (markerId: string) => void;
  onDeleteTag: (tagId: string) => void;
  onDraftChange: (preview: TagEditorDraftPreview, options?: { syncOnly?: boolean }) => void;
  onEditMarkerPrice: (markerId: string) => void;
  onImageLoad: (event: ImageLoadEventData) => void;
  onLeaveEmpty: () => void;
  onSaveTag: (tagId: string, updates: TagEditorSaveUpdates) => void;
  onSaveButtonLayout?: () => void;
  saveButtonRef?: RefObject<View | null>;
  onSelectMarker: (markerId: string) => void;
  onTagDragCancel: () => void;
  onTagDragEnd: (tagId: string, canvasX: number, canvasY: number, tagSize: TagSize, releasePoint: ScreenPoint) => void;
  onTagDragMove: (point: ScreenPoint) => void;
  onTagDragOffsetChange: (offset: ScreenPoint) => void;
  onTagDragStart: (tag: PriceTag) => void;
  onTagPress: (tag: PriceTag) => void;
  onTagSizeChange: (tagId: string, size: TagSize) => void;
  panelMarkers: PanelMarkerType[];
  selectedMarkerId: string | null;
  selectedTag: PriceTag | null;
  selectedTagId: string | null;
  selectedTagIds: string[];
  stylePreviewTag: PriceTag;
  tagSizeById: Record<string, TagSize>;
  tags: PriceTag[];
  viewportScale: number;
  zoomAnimatedStyle: AnimatedStyle<ViewStyle>;
  zoomGesture: ComposedGesture | GestureType;
};

export function EditorCanvas({
  canvasRef,
  canvasSize,
  draftPreview,
  draftTagId,
  draftText,
  draftType,
  dragTopBoundaryY,
  draggingTagId,
  editorMode,
  getDefaultTextForType,
  groupDragOffset,
  groupDragOriginalTagsRef,
  imageRect,
  imageUri,
  isDraggingTag,
  isMultiSelectMode,
  isStylePickerVisible,
  isZoomMode,
  onCancelTagEdit,
  onCanvasLayout,
  onKeyboardCanvasLiftChange,
  onCanvasPress,
  onDeleteMarker,
  onDeleteTag,
  onDraftChange,
  onEditMarkerPrice,
  onImageLoad,
  onLeaveEmpty,
  onSaveTag,
  onSaveButtonLayout,
  saveButtonRef,
  onSelectMarker,
  onTagDragCancel,
  onTagDragEnd,
  onTagDragMove,
  onTagDragOffsetChange,
  onTagDragStart,
  onTagPress,
  onTagSizeChange,
  panelMarkers,
  selectedMarkerId,
  selectedTag,
  selectedTagId,
  selectedTagIds,
  stylePreviewTag,
  tagSizeById,
  tags,
  viewportScale,
  zoomAnimatedStyle,
  zoomGesture,
}: EditorCanvasProps) {
  const { t } = useTranslation();
  const tagInlineInputRef = useRef<TextInput>(null);
  const [inlineEdit, setInlineEdit] = useState<TagInlineEdit | null>(null);
  const [keyboardCanvasLift, setKeyboardCanvasLift] = useState(0);
  const handleCanvasLiftChange = useCallback(
    (liftY: number) => {
      const nextLift = liftY > 0 ? liftY : 0;
      setKeyboardCanvasLift(nextLift);
      onKeyboardCanvasLiftChange?.(nextLift);
    },
    [onKeyboardCanvasLiftChange],
  );

  useEffect(() => {
    return () => {
      onKeyboardCanvasLiftChange?.(0);
    };
  }, [onKeyboardCanvasLiftChange]);

  const isTagEditorVisible =
    Boolean(selectedTag) && !isZoomMode && !isMultiSelectMode && draggingTagId !== selectedTagId && !isStylePickerVisible;
  const selectedSupportsInlineEdit =
    isTagEditorVisible && selectedTag != null && TYPES_WITH_INLINE_INPUT.includes(selectedTag.type);
  const activeInlineEdit = selectedSupportsInlineEdit ? inlineEdit : null;

  useEffect(() => {
    if (!selectedSupportsInlineEdit) {
      setInlineEdit(null);
    }
  }, [selectedSupportsInlineEdit]);

  if (!imageUri) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{t('editor.noImageSelected')}</Text>
        <Pressable accessibilityRole="button" onPress={onLeaveEmpty} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>{t('editor.backHome')}</Text>
        </Pressable>
      </View>
    );
  }

  if (editorMode === 'priceList') {
    return (
      <View style={styles.compositionHost}>
        <PriceListComposition
          chart={
            <PricePanel
              markers={panelMarkers}
              onDeleteMarker={onDeleteMarker}
              onEditMarker={onEditMarkerPrice}
              placeholder={t('pricePanel.enterPrice')}
              selectedMarkerId={selectedMarkerId}
            />
          }
          showChart={panelMarkers.length > 0}>
          <View collapsable={false} ref={canvasRef} style={styles.imageCanvas} onLayout={onCanvasLayout}>
            <EditorZoomViewport
              isZoomMode={isZoomMode}
              zoomAnimatedStyle={zoomAnimatedStyle}
              zoomGesture={zoomGesture}>
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
              {isZoomMode ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('editor.addPriceTag')}
                  onPress={onCanvasPress}
                  style={styles.tapLayer}
                />
              )}
              {imageRect
                ? panelMarkers.map((marker, index) => (
                    <PanelMarker
                      imageRect={imageRect}
                      isSelected={marker.id === selectedMarkerId}
                      key={marker.id}
                      marker={marker}
                      number={index + 1}
                      onPress={onSelectMarker}
                    />
                  ))
                : null}
            </EditorZoomViewport>
          </View>
        </PriceListComposition>
      </View>
    );
  }

  return (
    <View style={styles.canvasHost}>
      <View collapsable={false} ref={canvasRef} style={[styles.canvas, isDraggingTag && styles.draggingCanvas]} onLayout={onCanvasLayout}>
        <View
          style={[
            styles.canvasContent,
            keyboardCanvasLift > 0 ? { transform: [{ translateY: -keyboardCanvasLift }] } : null,
          ]}>
          <EditorZoomViewport
            allowOverflow={isDraggingTag}
            isZoomMode={isZoomMode}
            zoomAnimatedStyle={zoomAnimatedStyle}
            zoomGesture={zoomGesture}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
            {isZoomMode ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isMultiSelectMode
                    ? t('editor.exitMultiSelect')
                    : selectedTag
                      ? t('editor.closeTagEditor')
                      : t('editor.addPriceTag')
                }
                onPress={onCanvasPress}
                style={styles.tapLayer}
              />
            )}
            {imageRect
              ? tags.map((tag) => {
                  const isTagSelected = isMultiSelectMode ? selectedTagIds.includes(tag.id) : tag.id === selectedTagId;
                  const canDragTag = !isMultiSelectMode || isTagSelected;
                  const isSiblingInGroupDrag =
                    isMultiSelectMode &&
                    draggingTagId !== null &&
                    draggingTagId !== tag.id &&
                    selectedTagIds.includes(tag.id) &&
                    selectedTagIds.includes(draggingTagId);

                  const isInlineEditingSelected = tag.id === selectedTagId && activeInlineEdit != null;

                  return (
                    <TagOverlay
                      ref={isInlineEditingSelected ? tagInlineInputRef : undefined}
                      clampDragOffset={
                        isMultiSelectMode && isTagSelected
                          ? (dx, dy) =>
                              clampGroupPixelOffset(
                                dx,
                                dy,
                                groupDragOriginalTagsRef.current ?? tags.filter((currentTag) => selectedTagIds.includes(currentTag.id)),
                                imageRect,
                                tagSizeById,
                              )
                          : undefined
                      }
                      dragEnabled={canDragTag && !isInlineEditingSelected}
                      externalDragOffset={isSiblingInGroupDrag ? groupDragOffset : null}
                      imageRect={imageRect}
                      inlineEdit={isInlineEditingSelected ? activeInlineEdit : null}
                      isSelected={isTagSelected}
                      key={tag.id}
                      minDragY={dragTopBoundaryY ?? undefined}
                      onDragCancel={onTagDragCancel}
                      onDragEnd={onTagDragEnd}
                      onDragMove={onTagDragMove}
                      onDragOffsetChange={isMultiSelectMode && isTagSelected ? onTagDragOffsetChange : undefined}
                      onDragStart={onTagDragStart}
                      onPress={onTagPress}
                      onSizeChange={onTagSizeChange}
                      tag={
                        tag.id === selectedTagId && draftPreview
                          ? {
                              ...tag,
                              text: draftPreview.text || tag.text,
                              stylePresetId: draftPreview.stylePresetId ?? tag.stylePresetId,
                              sizePresetId: draftPreview.sizePresetId ?? tag.sizePresetId,
                              priceTextFormat: draftPreview.priceTextFormat ?? tag.priceTextFormat,
                              soldTextFormat: draftPreview.soldTextFormat ?? tag.soldTextFormat,
                              condition: draftPreview.condition ?? tag.condition,
                              languageCode: draftPreview.languageCode ?? tag.languageCode,
                            }
                          : tag
                      }
                      textOverride={
                        isInlineEditingSelected
                          ? undefined
                          : tag.id === selectedTagId
                            ? (draftPreview?.text ?? draftText).trim() || getDefaultTextForType(draftType)
                            : undefined
                      }
                      typeOverride={tag.id === selectedTagId ? draftType : undefined}
                      viewportScale={viewportScale}
                    />
                  );
                })
              : null}
            {imageRect && isStylePickerVisible ? (
              <StaticTag anchor="center" imageRect={imageRect} tag={stylePreviewTag} />
            ) : null}
          </EditorZoomViewport>
        </View>
      </View>
      {imageRect ? (
        <View pointerEvents="box-none" style={styles.tagEditorLayer}>
          <TagEditor
            canvasSize={canvasSize}
            imageRect={imageRect}
            inputRef={tagInlineInputRef}
            isNewTag={Boolean(draftTagId)}
            onCancel={onCancelTagEdit}
            onCanvasLiftChange={handleCanvasLiftChange}
            onDraftChange={onDraftChange}
            onInlineEditChange={setInlineEdit}
            onSave={onSaveTag}
            onSaveButtonLayout={onSaveButtonLayout}
            saveButtonRef={saveButtonRef}
            tag={selectedTag}
            visible={isTagEditorVisible}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compositionHost: {
    flex: 1,
  },
  canvasHost: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoMockBackground,
  },
  canvasContent: {
    flex: 1,
  },
  tagEditorLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  imageCanvas: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors.photoMockBackground,
  },
  draggingCanvas: {
    overflow: 'visible',
    // Keep the active drag surface above siblings inside content; parent content
    // also elevates above the floating delete drop zone while dragging.
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: theme.buttons.height,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyButtonText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
});
