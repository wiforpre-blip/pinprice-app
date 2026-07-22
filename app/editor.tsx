import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './editor.styles';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { EditorFloatingControls, type FloatingMainActionId } from '@/components/editor/EditorFloatingControls';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorPreviewScreen } from '@/components/editor/EditorPreviewScreen';
import { EditorSettingsSheet } from '@/components/editor/EditorSettingsSheet';
import { PriceRowEditor } from '@/components/editor/PriceRowEditor';
import { StylePickerPanel } from '@/components/editor/StylePickerPanel';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';
import { useTranslation } from '@/contexts/LanguageContext';
import { useEditorChrome } from '@/hooks/useEditorChrome';
import { useEditorExport } from '@/hooks/useEditorExport';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { getImageUri, useEditorSession } from '@/hooks/useEditorSession';
import { usePriceListEditorState } from '@/hooks/usePriceListEditorState';
import {
  DEFAULT_PRICE_TEXT,
  getDefaultTextForType,
  useTagEditorState,
} from '@/hooks/useTagEditorState';
import type { EditorUndoSnapshot } from '@/types/editor';

type EditorParams = {
  imageUri?: string | string[];
};

const APP_VERSION = '1.0.0';

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
  const {
    bindChrome,
    canUndo,
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
  } = useTagEditorState({
    closeOverlayMenus,
    editorMode,
    imageRect,
    selectedImageUri,
    setUndoSnapshot,
  });
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
    restoreMarkers,
    selectedMarkerId,
  } = usePriceListEditorState({
    closeStylePicker,
    deselectTagForMarkerSelect,
    imageRect,
    setUndoSnapshot,
  });
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

      enterMultiSelectMode();
      return;
    }

    if (actionId === 'export') {
      openPreview();
    }
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
      activeStylePresetId={activeStylePresetId}
      onClose={closeStylePicker}
      onSelectSizePreset={handleSelectSizePreset}
      onSelectStylePreset={handleSelectStylePreset}
      onSelectToolType={handleSelectToolType}
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

      <View style={styles.content}>
        <EditorCanvas
          canvasRef={canvasRef}
          canvasSize={canvasSize}
          defaultPriceText={DEFAULT_PRICE_TEXT}
          draftTagId={draftTagId}
          draftText={draftText}
          draftType={draftType}
          dragTopBoundaryY={dragTopBoundaryY}
          draggingTagId={draggingTagId}
          editorMode={editorMode}
          getDefaultTextForType={getDefaultTextForType}
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
          onDraftTextChange={setDraftText}
          onDraftTypeChange={setDraftType}
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
          ? editorMode === 'priceList'
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

      <EditorSettingsSheet appVersion={APP_VERSION} onClose={closeSettings} visible={isSettingsOpen} />

      <EditorFloatingControls
        alignFeedbackMessage={alignFeedbackMessage}
        bottomDropAreaRef={bottomDropAreaRef}
        editorMode={editorMode}
        isDragOverDelete={isDragOverDelete}
        isDraggingTag={isDraggingTag}
        isMultiSelectGroupDrag={isMultiSelectGroupDrag}
        isMultiSelectMode={isMultiSelectMode}
        isStylePickerVisible={isStylePickerVisible}
        onBottomDropAreaLayout={handleBottomDropAreaLayout}
        onFloatingMainAction={handleFloatingMainAction}
        selectedImageUri={selectedImageUri}
        selectedTagIds={selectedTagIds}
      />
    </SafeAreaView>
  );
}
