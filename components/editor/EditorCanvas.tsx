import { Image, type ImageLoadEventData } from 'expo-image';
import type { RefObject } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { PanelMarker } from '@/components/editor/PanelMarker';
import { PriceListComposition } from '@/components/editor/PriceListComposition';
import { PricePanel } from '@/components/editor/PricePanel';
import { StaticTag } from '@/components/editor/StaticTag';
import { TagEditor } from '@/components/editor/TagEditor';
import { TagOverlay } from '@/components/editor/TagOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, ScreenPoint, Size, TagSize } from '@/types/editor';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';
import { clampGroupPixelOffset } from '@/utils/editorGeometry';

type EditorCanvasProps = {
  canvasRef: RefObject<View | null>;
  canvasSize: Size;
  defaultPriceText: string;
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
  onCancelTagEdit: () => void;
  onCanvasLayout: (event: LayoutChangeEvent) => void;
  onCanvasPress: (event: GestureResponderEvent) => void;
  onDeleteMarker: (markerId: string) => void;
  onDeleteTag: (tagId: string) => void;
  onDraftTextChange: (text: string) => void;
  onDraftTypeChange: (type: TagType) => void;
  onEditMarkerPrice: (markerId: string) => void;
  onImageLoad: (event: ImageLoadEventData) => void;
  onLeaveEmpty: () => void;
  onSaveTag: (tagId: string, text: string, type: TagType) => void;
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
};

export function EditorCanvas({
  canvasRef,
  canvasSize,
  defaultPriceText,
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
  onCancelTagEdit,
  onCanvasLayout,
  onCanvasPress,
  onDeleteMarker,
  onDeleteTag,
  onDraftTextChange,
  onDraftTypeChange,
  onEditMarkerPrice,
  onImageLoad,
  onLeaveEmpty,
  onSaveTag,
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
}: EditorCanvasProps) {
  const { t } = useTranslation();

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
          <View ref={canvasRef} style={styles.imageCanvas} onLayout={onCanvasLayout}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('editor.addPriceTag')}
              onPress={onCanvasPress}
              style={styles.tapLayer}
            />
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
          </View>
        </PriceListComposition>
      </View>
    );
  }

  return (
    <View ref={canvasRef} style={[styles.canvas, isDraggingTag && styles.draggingCanvas]} onLayout={onCanvasLayout}>
      <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
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

            return (
              <TagOverlay
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
                dragEnabled={canDragTag}
                externalDragOffset={isSiblingInGroupDrag ? groupDragOffset : null}
                imageRect={imageRect}
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
                tag={tag}
                textOverride={tag.id === selectedTagId ? draftText.trim() || getDefaultTextForType(draftType) : undefined}
                typeOverride={tag.id === selectedTagId ? draftType : undefined}
              />
            );
          })
        : null}
      {imageRect && isStylePickerVisible ? <StaticTag imageRect={imageRect} tag={stylePreviewTag} /> : null}
      {imageRect ? (
        <TagEditor
          canvasSize={canvasSize}
          defaultText={defaultPriceText}
          imageRect={imageRect}
          isNewTag={Boolean(draftTagId)}
          onCancel={onCancelTagEdit}
          onDelete={onDeleteTag}
          onDraftTextChange={onDraftTextChange}
          onDraftTypeChange={onDraftTypeChange}
          onSave={onSaveTag}
          tag={selectedTag}
          visible={Boolean(selectedTag) && !isMultiSelectMode && draggingTagId !== selectedTagId && !isStylePickerVisible}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compositionHost: {
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
  imageCanvas: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors.photoMockBackground,
  },
  draggingCanvas: {
    overflow: 'visible',
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
