import { Image, type ImageLoadEventData } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { TagEditor } from '@/components/editor/TagEditor';
import { TagOverlay } from '@/components/editor/TagOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { ImageDisplayRect, PriceTag, TagType } from '@/types/tag';

type EditorParams = {
  imageUri?: string | string[];
};

type Size = {
  width: number;
  height: number;
};

type TagSize = {
  width: number;
  height: number;
};

type ExportAction = 'save' | 'share';

const DEFAULT_PRICE_TEXT = 'THB ';
const DEFAULT_SOLD_TEXT = 'SOLD';
const FALLBACK_TAG_SIZE: TagSize = { width: 80, height: 32 };
const FALLBACK_FILENAME = 'Untitled';
const DRAG_POSITION_TOLERANCE = 0.0001;
const ACTION_ITEMS = [
  { label: 'Add', icon: 'add-circle-outline' },
  { label: 'Style', icon: 'palette' },
  { label: 'Undo', icon: 'undo' },
  { label: 'Preview', icon: 'visibility' },
] as const;

function getDefaultTextForType(type: TagType) {
  return type === 'sold' ? DEFAULT_SOLD_TEXT : DEFAULT_PRICE_TEXT;
}

function getSafeTagText(text: string, type: TagType) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return getDefaultTextForType(type);
  }

  return type === 'price' && trimmedText === DEFAULT_PRICE_TEXT.trim() ? DEFAULT_PRICE_TEXT : trimmedText;
}

function getImageUri(imageUri: EditorParams['imageUri']) {
  const rawUri = Array.isArray(imageUri) ? imageUri[0] : imageUri;

  if (!rawUri) {
    return null;
  }

  try {
    return decodeURIComponent(rawUri);
  } catch {
    return rawUri;
  }
}

function getFilenameFromUri(uri: string | null) {
  if (!uri) {
    return FALLBACK_FILENAME;
  }

  const cleanUri = uri.split(/[?#]/)[0];
  const filename = cleanUri.split('/').filter(Boolean).pop();

  return filename?.trim() || FALLBACK_FILENAME;
}

function clampNormalized(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSafeTagSize(tagSize?: TagSize) {
  return {
    width: tagSize && tagSize.width > 0 ? tagSize.width : FALLBACK_TAG_SIZE.width,
    height: tagSize && tagSize.height > 0 ? tagSize.height : FALLBACK_TAG_SIZE.height,
  };
}

function isPointInsideImageRect(x: number, y: number, imageRect: ImageDisplayRect) {
  return x >= imageRect.x && x <= imageRect.x + imageRect.width && y >= imageRect.y && y <= imageRect.y + imageRect.height;
}

function clampPointToImageRect(x: number, y: number, imageRect: ImageDisplayRect, tagSize?: TagSize) {
  const safeTagSize = getSafeTagSize(tagSize);
  const minX = imageRect.x;
  const minY = imageRect.y;
  const maxX = Math.max(minX, imageRect.x + imageRect.width - safeTagSize.width);
  const maxY = Math.max(minY, imageRect.y + imageRect.height - safeTagSize.height);

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

function getNormalizedPointFromCanvasPoint(x: number, y: number, imageRect: ImageDisplayRect, tagSize?: TagSize) {
  const clampedPoint = clampPointToImageRect(x, y, imageRect, tagSize);

  return {
    x: clampNormalized((clampedPoint.x - imageRect.x) / imageRect.width),
    y: clampNormalized((clampedPoint.y - imageRect.y) / imageRect.height),
  };
}

function getContainedImageRect(canvasSize: Size, imageSize: Size | null): ImageDisplayRect | null {
  if (!imageSize || canvasSize.width <= 0 || canvasSize.height <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
    return null;
  }

  const canvasRatio = canvasSize.width / canvasSize.height;
  const imageRatio = imageSize.width / imageSize.height;

  if (imageRatio > canvasRatio) {
    const height = canvasSize.width / imageRatio;

    return {
      x: 0,
      y: (canvasSize.height - height) / 2,
      width: canvasSize.width,
      height,
    };
  }

  const width = canvasSize.height * imageRatio;

  return {
    x: (canvasSize.width - width) / 2,
    y: 0,
    width,
    height: canvasSize.height,
  };
}

function createPriceTag(x: number, y: number): PriceTag {
  return {
    id: `tag-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    type: 'price',
    text: DEFAULT_PRICE_TEXT,
    x,
    y,
  };
}

function cloneTags(tags: PriceTag[]) {
  return tags.map((tag) => ({ ...tag }));
}

function hasPositionChanged(previousTag: PriceTag, nextX: number, nextY: number) {
  return Math.abs(previousTag.x - nextX) > DRAG_POSITION_TOLERANCE || Math.abs(previousTag.y - nextY) > DRAG_POSITION_TOLERANCE;
}

type StaticTagProps = {
  imageRect: ImageDisplayRect;
  tag: PriceTag;
};

function StaticTag({ imageRect, tag }: StaticTagProps) {
  const tagStyle = theme.tags[tag.type];
  const [tagSize, setTagSize] = useState<TagSize>(FALLBACK_TAG_SIZE);
  const rawLeft = imageRect.x + tag.x * imageRect.width;
  const rawTop = imageRect.y + tag.y * imageRect.height;
  const clampedPoint = clampPointToImageRect(rawLeft, rawTop, imageRect, tagSize);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width <= 0 || height <= 0) {
      return;
    }

    setTagSize({ width, height });
  };

  return (
    <View
      pointerEvents="none"
      onLayout={handleLayout}
      style={[
        styles.staticTag,
        {
          backgroundColor: tagStyle.backgroundColor,
          borderColor: tagStyle.borderColor,
          left: clampedPoint.x,
          top: clampedPoint.y,
        },
      ]}>
      <Text numberOfLines={2} style={[styles.staticTagText, { color: tagStyle.color }]}>
        {tag.text}
      </Text>
    </View>
  );
}

type ExportPreviewProps = {
  imageSize: Size | null;
  imageUri: string;
  onImageLoad: (event: ImageLoadEventData) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  previewSize: Size;
  tags: PriceTag[];
};

const ExportPreview = forwardRef<View, ExportPreviewProps>(function ExportPreview(
  { imageSize, imageUri, onImageLoad, onLayout, previewSize, tags },
  ref,
) {
  const previewImageRect = useMemo(() => getContainedImageRect(previewSize, imageSize), [imageSize, previewSize]);

  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={styles.exportCanvas}>
      <Image source={{ uri: imageUri }} style={styles.image} contentFit="contain" onLoad={onImageLoad} />
      {previewImageRect ? tags.map((tag) => <StaticTag imageRect={previewImageRect} key={tag.id} tag={tag} />) : null}
    </View>
  );
});

export default function EditorScreen() {
  const canvasRef = useRef<View>(null);
  const exportRef = useRef<View>(null);
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<EditorParams>();
  const selectedImageUri = getImageUri(imageUri);
  const initialFilename = useMemo(() => getFilenameFromUri(selectedImageUri), [selectedImageUri]);
  const [tags, setTags] = useState<PriceTag[]>([]);
  const [filename, setFilename] = useState(initialFilename);
  const [draftFilename, setDraftFilename] = useState(initialFilename);
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [draftTagId, setDraftTagId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState(DEFAULT_PRICE_TEXT);
  const [draftType, setDraftType] = useState<TagType>('price');
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<PriceTag[] | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSize, setPreviewSize] = useState<Size>({ width: 0, height: 0 });
  const [exportAction, setExportAction] = useState<ExportAction | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const imageRect = useMemo(() => getContainedImageRect(canvasSize, imageSize), [canvasSize, imageSize]);
  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
  const canUndo = undoSnapshot !== null;
  const isExporting = exportAction !== null;

  useEffect(() => {
    setFilename(initialFilename);
    setDraftFilename(initialFilename);
    setIsEditingFilename(false);
  }, [initialFilename]);

  const goHome = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  const startFilenameEdit = () => {
    setDraftFilename(filename);
    setIsEditingFilename(true);
  };

  const cancelFilenameEdit = () => {
    setDraftFilename(filename);
    setIsEditingFilename(false);
  };

  const confirmFilenameEdit = () => {
    const nextFilename = draftFilename.trim();

    setFilename(nextFilename || FALLBACK_FILENAME);
    setDraftFilename(nextFilename || FALLBACK_FILENAME);
    setIsEditingFilename(false);
  };

  const handlePlaceholderAction = () => {};

  const commitDraftTag = () => {
    if (!selectedTag) {
      return;
    }

    const safeText = getSafeTagText(draftText, draftType);

    setTags((currentTags) =>
      currentTags.map((tag) => (tag.id === selectedTag.id ? { ...tag, text: safeText, type: draftType } : tag)),
    );
  };

  const clearTagEditorState = () => {
    setSelectedTagId(null);
    setDraftTagId(null);
    setDraftText(DEFAULT_PRICE_TEXT);
    setDraftType('price');
    setDraggingTagId(null);
  };

  const handleUndo = () => {
    if (!undoSnapshot) {
      return;
    }

    setTags(cloneTags(undoSnapshot));
    setUndoSnapshot(null);
    clearTagEditorState();
  };

  const openPreview = () => {
    if (!selectedImageUri) {
      return;
    }

    commitDraftTag();
    clearTagEditorState();
    setIsEditingFilename(false);
    setExportMessage(null);
    setIsPreviewing(true);
  };

  const closePreview = () => {
    if (isExporting) {
      return;
    }

    setExportMessage(null);
    setIsPreviewing(false);
  };

  const handleCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setCanvasSize({ width, height });
  };

  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setPreviewSize({ width, height });
  };

  const handleImageLoad = (event: ImageLoadEventData) => {
    if (!Number.isFinite(event.source.width) || !Number.isFinite(event.source.height)) {
      return;
    }

    setImageSize({
      width: event.source.width,
      height: event.source.height,
    });
  };

  const handleCanvasPress = (event: GestureResponderEvent) => {
    if (!imageRect) {
      return;
    }

    if (selectedTag) {
      handleCancelTagEdit();
      return;
    }

    const { locationX, locationY, pageX, pageY } = event.nativeEvent;

    const addTagAtPoint = (touchX: number, touchY: number) => {
      if (!isPointInsideImageRect(touchX, touchY, imageRect)) {
        return;
      }

      const { x, y } = getNormalizedPointFromCanvasPoint(touchX, touchY, imageRect);
      const newTag = createPriceTag(x, y);

      setTags((currentTags) => {
        setUndoSnapshot(cloneTags(currentTags));
        return [...currentTags, newTag];
      });
      setSelectedTagId(newTag.id);
      setDraftTagId(newTag.id);
      setDraftText(newTag.text);
      setDraftType(newTag.type);
    };

    if (Number.isFinite(locationX) && Number.isFinite(locationY) && (locationX !== 0 || locationY !== 0)) {
      addTagAtPoint(locationX, locationY);
      return;
    }

    canvasRef.current?.measure((_x, _y, _width, _height, canvasPageX, canvasPageY) => {
      addTagAtPoint(pageX - canvasPageX, pageY - canvasPageY);
    });
  };

  const handleTagPress = (tag: PriceTag) => {
    setSelectedTagId(tag.id);
    setDraggingTagId(null);
    setDraftTagId(null);
    setDraftText(tag.text);
    setDraftType(tag.type);
  };

  const handleTagDragStart = (tag: PriceTag) => {
    setDraggingTagId(tag.id);

    if (draftTagId && draftTagId !== tag.id) {
      setTags((currentTags) => currentTags.filter((currentTag) => currentTag.id !== draftTagId));
      setUndoSnapshot(null);
      setDraftTagId(null);
    }
  };

  const handleTagDragEnd = (tagId: string, canvasX: number, canvasY: number, tagSize: TagSize) => {
    if (!imageRect) {
      setDraggingTagId(null);
      return;
    }

    const { x, y } = getNormalizedPointFromCanvasPoint(canvasX, canvasY, imageRect, tagSize);

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === tagId);

      if (!previousTag || !hasPositionChanged(previousTag, x, y)) {
        return currentTags;
      }

      setUndoSnapshot(cloneTags(currentTags));
      return currentTags.map((tag) => (tag.id === tagId ? { ...tag, x, y } : tag));
    });
    setDraggingTagId(null);
  };

  const handleTagDragCancel = () => {
    setDraggingTagId(null);
  };

  const handleSaveTag = (tagId: string, text: string, type: TagType) => {
    const safeText = getSafeTagText(text, type);

    setTags((currentTags) => {
      const previousTag = currentTags.find((tag) => tag.id === tagId);

      if (!previousTag || (previousTag.text === safeText && previousTag.type === type)) {
        return currentTags;
      }

      if (draftTagId !== tagId) {
        setUndoSnapshot(cloneTags(currentTags));
      }

      return currentTags.map((tag) => (tag.id === tagId ? { ...tag, text: safeText, type } : tag));
    });
    clearTagEditorState();
  };

  const handleDeleteTag = (tagId: string) => {
    setTags((currentTags) => {
      if (!currentTags.some((tag) => tag.id === tagId)) {
        return currentTags;
      }

      setUndoSnapshot(cloneTags(currentTags));
      return currentTags.filter((tag) => tag.id !== tagId);
    });
    clearTagEditorState();
  };

  const handleCancelTagEdit = () => {
    if (draftTagId) {
      setTags((currentTags) => currentTags.filter((tag) => tag.id !== draftTagId));
      setUndoSnapshot(null);
    }

    clearTagEditorState();
  };

  const captureExportView = async () => {
    if (!exportRef.current) {
      throw new Error('Export view is not ready.');
    }

    return captureRef(exportRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  };

  const handleSaveImage = async () => {
    if (isExporting) {
      return;
    }

    setExportAction('save');
    setExportMessage(null);

    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);

      if (!permission.granted) {
        setExportMessage('Please allow photo access to save.');
        return;
      }

      const exportedUri = await captureExportView();
      await MediaLibrary.saveToLibraryAsync(exportedUri);
      setExportMessage('Saved to gallery.');
    } catch {
      setExportMessage('Save failed. Please try again.');
    } finally {
      setExportAction(null);
    }
  };

  const handleShareImage = async () => {
    if (isExporting) {
      return;
    }

    setExportAction('share');
    setExportMessage(null);

    try {
      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        setExportMessage('Sharing is not available here.');
        return;
      }

      const exportedUri = await captureExportView();
      await Sharing.shareAsync(exportedUri, {
        dialogTitle: 'Share tagged photo',
        mimeType: 'image/png',
      });
    } catch {
      setExportMessage('Share failed. Please try again.');
    } finally {
      setExportAction(null);
    }
  };

  const handleBottomAction = (label: (typeof ACTION_ITEMS)[number]['label']) => {
    if (label === 'Undo') {
      handleUndo();
      return;
    }

    if (label === 'Preview') {
      openPreview();
      return;
    }

    handlePlaceholderAction();
  };

  if (isPreviewing && selectedImageUri) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.previewTopBar}>
          <Pressable accessibilityRole="button" disabled={isExporting} onPress={closePreview} style={styles.backButton}>
            <Text style={[styles.backButtonText, isExporting && styles.disabledText]}>Edit</Text>
          </Pressable>

          <View style={styles.filenameArea}>
            <Text numberOfLines={1} style={styles.filenameText}>
              {filename}
            </Text>
          </View>

          <View style={styles.previewTopSpacer} />
        </View>

        <View style={styles.previewContent}>
          <ExportPreview
            ref={exportRef}
            imageSize={imageSize}
            imageUri={selectedImageUri}
            onImageLoad={handleImageLoad}
            onLayout={handlePreviewLayout}
            previewSize={previewSize}
            tags={tags}
          />
        </View>

        {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}

        <View style={styles.previewActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={isExporting ? { disabled: true } : undefined}
            disabled={isExporting}
            onPress={handleSaveImage}
            style={[styles.previewActionButton, styles.previewPrimaryAction, isExporting && styles.bottomActionDisabled]}>
            <MaterialIcons color={theme.buttons.primary.color} name="save-alt" size={22} />
            <Text style={styles.previewPrimaryActionText}>{exportAction === 'save' ? 'Saving...' : 'Save Image'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={isExporting ? { disabled: true } : undefined}
            disabled={isExporting}
            onPress={handleShareImage}
            style={[styles.previewActionButton, styles.previewSecondaryAction, isExporting && styles.bottomActionDisabled]}>
            <MaterialIcons color={theme.buttons.secondary.color} name="ios-share" size={22} />
            <Text style={styles.previewSecondaryActionText}>{exportAction === 'share' ? 'Sharing...' : 'Share'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={goHome} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.filenameArea}>
          {isEditingFilename ? (
            <View style={styles.filenameEditor}>
              <TextInput
                accessibilityLabel="Edit filename"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setDraftFilename}
                returnKeyType="done"
                onSubmitEditing={confirmFilenameEdit}
                selectTextOnFocus
                style={styles.filenameInput}
                value={draftFilename}
              />
              <Pressable accessibilityLabel="Cancel filename edit" accessibilityRole="button" onPress={cancelFilenameEdit} style={styles.iconButton}>
                <MaterialIcons color={theme.colors.sold} name="close" size={20} />
              </Pressable>
              <Pressable accessibilityLabel="Confirm filename edit" accessibilityRole="button" onPress={confirmFilenameEdit} style={styles.iconButton}>
                <MaterialIcons color={theme.colors.success} name="check" size={20} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Edit filename" onPress={startFilenameEdit} style={styles.filenameButton}>
              <Text numberOfLines={1} style={styles.filenameText}>
                {filename}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Preview before saving" onPress={openPreview} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {selectedImageUri ? (
          <View ref={canvasRef} style={styles.canvas} onLayout={handleCanvasLayout}>
            <Image source={{ uri: selectedImageUri }} style={styles.image} contentFit="contain" onLoad={handleImageLoad} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selectedTag ? 'Close tag editor' : 'Add price tag'}
              onPress={handleCanvasPress}
              style={styles.tapLayer}
            />
            {imageRect
              ? tags.map((tag) => (
                  <TagOverlay
                    imageRect={imageRect}
                    isSelected={tag.id === selectedTagId}
                    key={tag.id}
                    onDragCancel={handleTagDragCancel}
                    onDragEnd={handleTagDragEnd}
                    onDragStart={handleTagDragStart}
                    onPress={handleTagPress}
                    tag={tag}
                    textOverride={tag.id === selectedTagId ? draftText.trim() || getDefaultTextForType(draftType) : undefined}
                    typeOverride={tag.id === selectedTagId ? draftType : undefined}
                  />
                ))
              : null}
            {imageRect ? (
              <TagEditor
                canvasSize={canvasSize}
                defaultText={DEFAULT_PRICE_TEXT}
                imageRect={imageRect}
                isNewTag={Boolean(draftTagId)}
                onCancel={handleCancelTagEdit}
                onDelete={handleDeleteTag}
                onDraftTextChange={setDraftText}
                onDraftTypeChange={setDraftType}
                onSave={handleSaveTag}
                tag={selectedTag}
                visible={Boolean(selectedTag) && draggingTagId !== selectedTagId}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No image selected</Text>
            <Pressable accessibilityRole="button" onPress={goHome} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Back Home</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.placeholder}>{selectedImageUri ? 'Tap the photo to add a price tag' : 'Choose a photo to start tagging'}</Text>

      <View style={styles.bottomBar}>
        {ACTION_ITEMS.map((item) => {
          const isUndoAction = item.label === 'Undo';
          const isDisabled = isUndoAction && !canUndo;

          return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isDisabled ? { disabled: true } : undefined}
            disabled={isDisabled}
            key={item.label}
            onPress={() => handleBottomAction(item.label)}
            style={[styles.bottomAction, isDisabled && styles.bottomActionDisabled]}>
            <MaterialIcons color={isDisabled ? theme.colors.textMuted : theme.buttons.secondary.color} name={item.icon} size={22} />
            <Text style={[styles.bottomActionText, isDisabled && styles.bottomActionTextDisabled]}>{item.label}</Text>
          </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    minHeight: 44,
    width: 72,
    justifyContent: 'center',
  },
  backButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  filenameArea: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  filenameButton: {
    minHeight: 44,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  filenameText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  filenameEditor: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  filenameInput: {
    minHeight: 40,
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.caption,
  },
  iconButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  saveButton: {
    minHeight: 44,
    width: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoMockBackground,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  exportCanvas: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.photoMockBackground,
  },
  staticTag: {
    position: 'absolute',
    zIndex: 2,
    minHeight: 32,
    maxWidth: 180,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.tag,
  },
  staticTagText: {
    ...theme.typography.tag,
    textAlign: 'center',
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
  placeholder: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  bottomAction: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
    paddingHorizontal: theme.spacing.xs,
  },
  bottomActionText: {
    ...theme.typography.caption,
    color: theme.buttons.secondary.color,
  },
  bottomActionDisabled: {
    opacity: 0.45,
  },
  bottomActionTextDisabled: {
    color: theme.colors.textMuted,
  },
  previewTopBar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  previewTopSpacer: {
    width: 72,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  exportMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  previewActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  previewActionButton: {
    minHeight: theme.buttons.height,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  previewPrimaryAction: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  previewPrimaryActionText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
  previewSecondaryAction: {
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
  },
  previewSecondaryActionText: {
    ...theme.typography.button,
    color: theme.buttons.secondary.color,
  },
});
