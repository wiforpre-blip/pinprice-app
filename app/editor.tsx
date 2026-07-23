import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './editor.styles';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import {
  EditorFloatingControls,
  type FloatingHistoryActionId,
  type FloatingMainActionId,
} from '@/components/editor/EditorFloatingControls';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorPreviewScreen } from '@/components/editor/EditorPreviewScreen';
import { PriceRowEditor } from '@/components/editor/PriceRowEditor';
import { StylePickerPanel } from '@/components/editor/StylePickerPanel';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';
import { useTranslation } from '@/contexts/LanguageContext';
import { useEditorChrome } from '@/hooks/useEditorChrome';
import { useEditorExport } from '@/hooks/useEditorExport';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { getImageUri, useEditorSession } from '@/hooks/useEditorSession';
import { usePriceListEditorState } from '@/hooks/usePriceListEditorState';
import {
  getDefaultTextForType,
  useTagEditorState,
} from '@/hooks/useTagEditorState';
import type { EditorUndoSnapshot } from '@/types/editor';

type EditorParams = {
  imageUri?: string | string[];
};

export default function EditorScreen() {
  const { t } = useTranslation();
  const { imageUri } = useLocalSearchParams<EditorParams>();
  const selectedImageUri = getImageUri(imageUri);
  const {
    closePreview,
    exportAction,
    exportMessage,
    exportRef,
    handlePreviewLayout,
    handleSaveImage,
    handleShareImage,
    isExporting,
    isPreviewing,
    openPreview: openExportPreview,
    previewSize,
  } = useEditorExport({ imageUri: selectedImageUri });
  const {
    canvasRef,
    canvasSize,
    dragTopBoundaryY,
    handleCanvasLayout,
    handleHeaderLayout,
    handleImageLoad,
    headerRef,
    imageRect,
    imageSize,
  } = useEditorLayout();
  const [undoSnapshot, setUndoSnapshot] = useState<EditorUndoSnapshot | null>(null);
  const [hasEditHistory, setHasEditHistory] = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const {
    bindChrome,
    cancelModeSwitch,
    closeMoreMenu,
    closeOverlayMenus,
    closeSettings,
    confirmModeSwitch,
    editorMode,
    handleSelectEditorMode,
    handleUndo,
    isModeSelectorVisible,
    isModeSwitchModalVisible,
    isMoreMenuVisible,
    isSettingsOpen,
    openModeSelector,
    openMoreMenu,
    openSettings,
    pendingEditorMode,
  } = useEditorChrome();
  const {
    activeSizePresetId,
    addTagAtPoint,
    alignFeedbackMessage,
    bottomDropAreaRef,
    cancelDeleteTag,
    clearTagEditorState,
    closeStylePicker,
    commitDraftTag,
    confirmDeleteTag,
    currentLanguageCode,
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
    isStylePickerVisible,
    openStylePicker,
    resetTagsAndChrome,
    restoreTags,
    selectedTag,
    selectedTagId,
    selectedTagIds,
    stylePickerType,
    stylePreviewTag,
    tagSizeById,
    tags,
  } = useTagEditorState({
    closeOverlayMenus,
    editorMode,
    imageRect,
    selectedImageUri,
    setUndoSnapshot,
  });
  const canUndo = undoSnapshot !== null;

  // Draft add sets undoSnapshot early; only latch history after draft is committed/cleared.
  useEffect(() => {
    if (undoSnapshot !== null && !draftTagId) {
      setHasEditHistory(true);
    }
  }, [draftTagId, undoSnapshot]);
  const {
    addMarkerAtPoint,
    cancelDeleteMarker,
    clearPricePanelState,
    confirmDeleteMarker,
    editingMarker,
    editingMarkerId,
    handleCancelMarkerPriceEdit,
    handleEditMarkerPrice,
    handleSaveMarkerPrice,
    handleSelectMarker,
    hasNextMarkerToEdit,
    isMarkerDeleteModalVisible,
    panelMarkers,
    requestDeleteMarker,
    resetMarkersAndChrome,
    restoreMarkers,
    selectedMarkerId,
  } = usePriceListEditorState({
    closeStylePicker,
    deselectTagForMarkerSelect,
    imageRect,
    setUndoSnapshot,
  });
  const canReset = tags.length > 0 || panelMarkers.length > 0;
  const canSelect = tags.length > 0;
  bindChrome({
    clearPricePanelState,
    clearTagEditorState,
    closeStylePicker,
    panelMarkersLength: panelMarkers.length,
    restoreMarkers,
    restoreTags,
    setUndoSnapshot,
    tagsLength: tags.length,
    undoSnapshot,
  });
  const hasContentDirty =
    tags.length > 0 ||
    panelMarkers.length > 0 ||
    Boolean(selectedTagId) ||
    Boolean(draftTagId);
  const {
    cancelFilenameEdit,
    cancelLeaveEditor,
    confirmFilenameEdit,
    confirmLeaveEditor,
    draftFilename,
    filename,
    isEditingFilename,
    isLeaveModalVisible,
    requestLeaveEditor,
    setDraftFilename,
    setIsEditingFilename,
    startFilenameEdit,
  } = useEditorSession({
    closePreview,
    hasContentDirty,
    isExporting,
    isPreviewing,
    selectedImageUri,
  });

  const openPreview = () => {
    if (!selectedImageUri) {
      return;
    }

    commitDraftTag();
    clearTagEditorState();
    setIsEditingFilename(false);
    openExportPreview();
  };

  const handleCanvasPress = (event: GestureResponderEvent) => {
    if (!imageRect) {
      return;
    }

    if (isMultiSelectMode) {
      exitMultiSelectMode();
      return;
    }

    const { locationX, locationY, pageX, pageY } = event.nativeEvent;

    const handlePoint = (touchX: number, touchY: number) => {
      if (editorMode === 'priceList') {
        if (editingMarkerId) {
          handleCancelMarkerPriceEdit();
          return;
        }

        addMarkerAtPoint(touchX, touchY);
        return;
      }

      addTagAtPoint(touchX, touchY);
    };

    if (editorMode !== 'tag' && editorMode !== 'priceList') {
      return;
    }

    if (editorMode === 'tag' && selectedTag) {
      handleCancelTagEdit();
      return;
    }

    if (Number.isFinite(locationX) && Number.isFinite(locationY) && (locationX !== 0 || locationY !== 0)) {
      handlePoint(locationX, locationY);
      return;
    }

    canvasRef.current?.measure((_x, _y, _width, _height, canvasPageX, canvasPageY) => {
      handlePoint(pageX - canvasPageX, pageY - canvasPageY);
    });
  };

  const handleFloatingMainAction = (actionId: FloatingMainActionId) => {
    if (actionId === 'style') {
      if (isMultiSelectMode) {
        return;
      }

      openStylePicker();
      return;
    }

    if (actionId === 'select') {
      if (isMultiSelectMode) {
        handleAlignSelectedTags();
        return;
      }

      if (!canSelect) {
        return;
      }

      enterMultiSelectMode();
      return;
    }

    if (actionId === 'export') {
      openPreview();
    }
  };

  const handleFloatingHistoryAction = (actionId: FloatingHistoryActionId) => {
    if (actionId === 'undo') {
      handleUndo();
      return;
    }

    if (actionId === 'reset') {
      setIsResetModalVisible(true);
    }
  };

  const cancelResetTags = () => {
    setIsResetModalVisible(false);
  };

  const confirmResetTags = () => {
    if (editorMode === 'priceList') {
      resetMarkersAndChrome();
      // Wipe leftover tags without overwriting the markers undo snapshot.
      restoreTags([]);
      clearTagEditorState();
    } else {
      resetTagsAndChrome();
      clearPricePanelState();
    }

    setIsResetModalVisible(false);
  };

  const leaveConfirmModal = (
    <ConfirmOverlay
      body={t('leave.body')}
      cancelLabel={t('leave.cancel')}
      confirmLabel={t('leave.confirm')}
      onCancel={cancelLeaveEditor}
      onConfirm={confirmLeaveEditor}
      title={t('leave.title')}
      visible={isLeaveModalVisible}
    />
  );

  const deleteConfirmModal = (
    <ConfirmOverlay
      body={t('tag.confirmDeleteBody')}
      cancelLabel={t('tag.cancel')}
      confirmLabel={t('tag.delete')}
      confirmVariant="destructive"
      onCancel={cancelDeleteTag}
      onConfirm={confirmDeleteTag}
      title={t('tag.confirmDeleteTitle')}
      visible={isDeleteModalVisible}
    />
  );

  const resetConfirmModal = (
    <ConfirmOverlay
      body={t('editor.resetConfirmBody')}
      cancelLabel={t('tag.cancel')}
      confirmLabel={t('editor.reset')}
      confirmVariant="destructive"
      onCancel={cancelResetTags}
      onConfirm={confirmResetTags}
      title={t('editor.resetConfirmTitle')}
      visible={isResetModalVisible}
    />
  );

  const markerDeleteConfirmModal = (
    <ConfirmOverlay
      body={t('pricePanel.confirmDeleteBody')}
      cancelLabel={t('tag.cancel')}
      confirmLabel={t('tag.delete')}
      confirmVariant="destructive"
      onCancel={cancelDeleteMarker}
      onConfirm={confirmDeleteMarker}
      title={t('pricePanel.confirmDeleteTitle')}
      visible={isMarkerDeleteModalVisible}
    />
  );

  const stylePickerPanel = isStylePickerVisible ? (
    <StylePickerPanel
      activeSizePresetId={activeSizePresetId}
      languageCode={currentLanguageCode}
      onClose={closeStylePicker}
      onSelectSizePreset={handleSelectSizePreset}
      onSelectToolType={handleSelectToolType}
      priceTextFormat={currentPriceTextFormat}
      soldTextFormat={currentSoldTextFormat}
      stylePickerType={stylePickerType}
    />
  ) : null;

  if (isPreviewing && selectedImageUri) {
    return (
      <EditorPreviewScreen
        editorMode={editorMode}
        exportAction={exportAction}
        exportMessage={exportMessage}
        exportRef={exportRef}
        filename={filename}
        imageSize={imageSize}
        imageUri={selectedImageUri}
        isExporting={isExporting}
        leaveConfirmModal={leaveConfirmModal}
        onClosePreview={closePreview}
        onImageLoad={handleImageLoad}
        onPreviewLayout={handlePreviewLayout}
        onSaveImage={handleSaveImage}
        onShareImage={handleShareImage}
        panelMarkers={panelMarkers}
        previewSize={previewSize}
        tags={tags}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {leaveConfirmModal}
      {deleteConfirmModal}
      {resetConfirmModal}
      {markerDeleteConfirmModal}
      <EditorHeader
        draftFilename={draftFilename}
        filename={filename}
        isEditingFilename={isEditingFilename}
        onBack={requestLeaveEditor}
        onCancelFilenameEdit={cancelFilenameEdit}
        onChangeDraftFilename={setDraftFilename}
        onConfirmFilenameEdit={confirmFilenameEdit}
        onLayout={handleHeaderLayout}
        onOpenSettings={openSettings}
        onStartFilenameEdit={startFilenameEdit}
        ref={headerRef}
      />

      <View style={[styles.content, isDraggingTag && styles.contentDragging]}>
        <EditorCanvas
          canvasRef={canvasRef}
          canvasSize={canvasSize}
          draftPreview={draftPreview}
          draftTagId={draftTagId}
          draftText={draftText}
          draftType={draftType}
          dragTopBoundaryY={dragTopBoundaryY}
          draggingTagId={draggingTagId}
          editorMode={editorMode}
          getDefaultTextForType={(type) => getDefaultTextForType(type, t('tag.sold'))}
          groupDragOffset={groupDragOffset}
          groupDragOriginalTagsRef={groupDragOriginalTagsRef}
          imageRect={imageRect}
          imageUri={selectedImageUri}
          isDraggingTag={isDraggingTag}
          isMultiSelectMode={isMultiSelectMode}
          isStylePickerVisible={isStylePickerVisible}
          onCancelTagEdit={handleCancelTagEdit}
          onCanvasLayout={handleCanvasLayout}
          onCanvasPress={handleCanvasPress}
          onDeleteMarker={requestDeleteMarker}
          onDeleteTag={handleDeleteTag}
          onDraftChange={handleDraftChange}
          onEditMarkerPrice={handleEditMarkerPrice}
          onImageLoad={handleImageLoad}
          onLeaveEmpty={requestLeaveEditor}
          onSaveTag={handleSaveTag}
          onSelectMarker={handleSelectMarker}
          onTagDragCancel={handleTagDragCancel}
          onTagDragEnd={handleTagDragEnd}
          onTagDragMove={handleTagDragMove}
          onTagDragOffsetChange={handleTagDragOffsetChange}
          onTagDragStart={handleTagDragStart}
          onTagPress={handleTagPress}
          onTagSizeChange={handleTagSizeChange}
          panelMarkers={panelMarkers}
          selectedMarkerId={selectedMarkerId}
          selectedTag={selectedTag}
          selectedTagId={selectedTagId}
          selectedTagIds={selectedTagIds}
          stylePreviewTag={stylePreviewTag}
          tagSizeById={tagSizeById}
          tags={tags}
        />
      </View>

      <Text style={[styles.placeholder, selectedImageUri && !isStylePickerVisible ? styles.placeholderWithFloatingBar : null]}>
        {selectedImageUri
          ? isMultiSelectMode
            ? t('editor.tapEmptyToExit')
            : editorMode === 'priceList'
              ? t('editor.tapPhotoToAddMarker')
              : t('editor.tapPhotoToAdd')
          : t('editor.choosePhotoToStart')}
      </Text>

      <PriceRowEditor
        confirmLabel={hasNextMarkerToEdit ? t('pricePanel.next') : t('pricePanel.done')}
        marker={editingMarker}
        onCancel={handleCancelMarkerPriceEdit}
        onSave={handleSaveMarkerPrice}
        visible={editorMode === 'priceList' && Boolean(editingMarker)}
      />

      {stylePickerPanel}

      <BottomSheetOverlay onClose={closeMoreMenu} title={t('editor.moreMenuTitle')} visible={isMoreMenuVisible}>
        <Text style={styles.moreMenuPlaceholder}>{t('editor.moreMenuPlaceholder')}</Text>
      </BottomSheetOverlay>

      <SettingsSheet onClose={closeSettings} visible={isSettingsOpen} />

      <EditorFloatingControls
        alignFeedbackMessage={alignFeedbackMessage}
        bottomDropAreaRef={bottomDropAreaRef}
        canReset={canReset}
        canSelect={canSelect}
        canUndo={canUndo}
        editorMode={editorMode}
        hasEditHistory={hasEditHistory}
        isDragOverDelete={isDragOverDelete}
        isDraggingTag={isDraggingTag}
        isMultiSelectGroupDrag={isMultiSelectGroupDrag}
        isMultiSelectMode={isMultiSelectMode}
        isStylePickerVisible={isStylePickerVisible}
        onBottomDropAreaLayout={handleBottomDropAreaLayout}
        onFloatingHistoryAction={handleFloatingHistoryAction}
        onFloatingMainAction={handleFloatingMainAction}
        selectedImageUri={selectedImageUri}
        selectedTagIds={selectedTagIds}
      />
    </SafeAreaView>
  );
}
