import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditorCanvas } from '@/components/editor/EditorCanvas';
import {
  EDITOR_FLOATING_MAIN_BAR_HEIGHT,
  EditorFloatingControls,
  type FloatingHistoryActionId,
  type FloatingMainActionId,
} from '@/components/editor/EditorFloatingControls';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorPreviewScreen } from '@/components/editor/EditorPreviewScreen';
import { EditorTip, getTipPlacement } from '@/components/editor/EditorTip';
import { PriceRowEditor } from '@/components/editor/PriceRowEditor';
import { StylePickerPanel } from '@/components/editor/StylePickerPanel';
import { styles } from '@/components/editor/editor.styles';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

import { useEditorChrome } from '@/hooks/useEditorChrome';
import { useEditorDraftHydration } from '@/hooks/useEditorDraftHydration';
import { useEditorExport } from '@/hooks/useEditorExport';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { getDraftId, getImageUri, useEditorSession } from '@/hooks/useEditorSession';
import { useEditorTips } from '@/hooks/useEditorTips';
import { useEditorZoom } from '@/hooks/useEditorZoom';
import { usePriceListEditorState } from '@/hooks/usePriceListEditorState';
import {
  getDefaultTextForType,
  useTagEditorState,
} from '@/hooks/useTagEditorState';

import type { EditorDraftSnapshot } from '@/types/draft';
import { createCurrentHistorySnapshot } from '@/utils/editorHistory';
import { formatZoomPercent } from '@/utils/editorGeometry';

type EditorParams = {
  draftId?: string | string[];
  imageUri?: string | string[];
};

export default function EditorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draftId, imageUri } = useLocalSearchParams<EditorParams>();
  const selectedImageUri = getImageUri(imageUri);
  const selectedDraftId = getDraftId(draftId);
  // Reserve space for the main floating bar only — history row stays absolute and must not resize imageRect.
  const contentBottomPadding = selectedImageUri
    ? EDITOR_FLOATING_MAIN_BAR_HEIGHT + theme.spacing.lg + insets.bottom
    : theme.spacing.sm;
  const draftSnapshotRef = useRef<EditorDraftSnapshot | null>(null);
  const notifyExportSuccessRef = useRef<() => void>(() => {});
  const getDraftSnapshot = useCallback(() => draftSnapshotRef.current, []);
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
    showWatermark,
  } = useEditorExport({
    getDraftSnapshot,
    imageUri: selectedImageUri,
    initialDraftId: selectedDraftId,
    onExportSuccess: () => {
      notifyExportSuccessRef.current();
    },
  });
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
  const [hasEditHistory, setHasEditHistory] = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const {
    bindChrome,
    canRedo,
    canUndo,
    closeMoreMenu,
    closeOverlayMenus,
    closeSettings,
    confirmPendingDraftHistory,
    discardPendingDraftHistory,
    editorMode,
    handleRedo,
    handleUndo,
    hydrateEditorMode,
    isMoreMenuVisible,
    isSettingsOpen,
    openSettings,
    pushHistory,
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
    textStylePresetId,
  } = useTagEditorState({
    closeOverlayMenus,
    confirmPendingDraftHistory,
    discardPendingDraftHistory,
    editorMode,
    imageRect,
    pushHistory,
    selectedImageUri,
  });

  // Draft add pushes early; only latch history chrome after draft is committed/cleared.
  useEffect(() => {
    if ((canUndo || canRedo) && !draftTagId) {
      setHasEditHistory(true);
    }
  }, [canRedo, canUndo, draftTagId]);
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
    pushHistory,
  });
  const canReset = tags.length > 0 || panelMarkers.length > 0;
  const canSelect = tags.length > 0;
  bindChrome({
    clearPricePanelState,
    clearTagEditorState,
    closeStylePicker,
    getCurrentSnapshot: () => createCurrentHistorySnapshot(editorMode, tags, panelMarkers),
    panelMarkersLength: panelMarkers.length,
    restoreMarkers,
    restoreTags,
    tagsLength: tags.length,
  });
  const hasContentDirty =
    tags.length > 0 ||
    panelMarkers.length > 0 ||
    Boolean(selectedTagId) ||
    Boolean(draftTagId);
  const {
    applyRestoredFilename,
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

  useEditorDraftHydration({
    draftId: selectedDraftId,
    onHydrate: (draft) => {
      applyRestoredFilename(draft.filename);
      hydrateEditorMode(draft.editorMode);
      restoreTags(draft.tags);
      restoreMarkers(draft.panelMarkers);
    },
  });

  draftSnapshotRef.current = {
    editorMode,
    filename,
    panelMarkers,
    tags,
  };

  const openPreview = () => {
    if (!selectedImageUri) {
      return;
    }

    commitDraftTag();
    clearTagEditorState();
    setIsEditingFilename(false);
    openExportPreview();
  };

  const handleZoomBackgroundTap = useCallback(() => {
    if (isMultiSelectMode) {
      exitMultiSelectMode();
      return;
    }

    if (editorMode === 'tag' && selectedTag) {
      handleCancelTagEdit();
      return;
    }

    if (editorMode === 'priceList' && editingMarkerId) {
      handleCancelMarkerPriceEdit();
    }
  }, [
    editorMode,
    editingMarkerId,
    exitMultiSelectMode,
    handleCancelMarkerPriceEdit,
    handleCancelTagEdit,
    isMultiSelectMode,
    selectedTag,
  ]);

  const { isZoomMode, resetZoom, toggleZoomMode, zoomAnimatedStyle, zoomGesture, zoomScale } = useEditorZoom({
    canvasSize,
    imageUri: selectedImageUri,
    onBackgroundTap: handleZoomBackgroundTap,
  });

  const isTagEditorOpen =
    Boolean(selectedTag) &&
    !isZoomMode &&
    !isMultiSelectMode &&
    draggingTagId !== selectedTagId &&
    !isStylePickerVisible;

  const hasConfirmModal =
    isLeaveModalVisible || isDeleteModalVisible || isResetModalVisible || isMarkerDeleteModalVisible;

  const { activeTipId, dismissActiveTip, notifyExportSuccess, notifyTagDragCompleted } = useEditorTips({
    editorMode,
    hasConfirmModal,
    hasImage: Boolean(selectedImageUri),
    isDraggingTag,
    isExporting,
    isPreviewing,
    isStylePickerVisible,
    isTagEditorOpen,
    isZoomMode,
    tagCount: tags.length,
  });

  notifyExportSuccessRef.current = notifyExportSuccess;

  const handleTagDragEndWithTip = useCallback(
    (
      tagId: string,
      canvasX: number,
      canvasY: number,
      tagSize: Parameters<typeof handleTagDragEnd>[3],
      releasePoint: Parameters<typeof handleTagDragEnd>[4],
    ) => {
      handleTagDragEnd(tagId, canvasX, canvasY, tagSize, releasePoint);
      notifyTagDragCompleted();
    },
    [handleTagDragEnd, notifyTagDragCompleted],
  );

  const handleCanvasPress = (event: GestureResponderEvent) => {
    if (!imageRect) {
      return;
    }

    if (isMultiSelectMode) {
      exitMultiSelectMode();
      return;
    }

    if (editorMode === 'tag' && selectedTag) {
      handleCancelTagEdit();
      return;
    }

    // Zoom mode: never add tags/markers from empty-canvas taps.
    if (isZoomMode) {
      if (editorMode === 'priceList' && editingMarkerId) {
        handleCancelMarkerPriceEdit();
      }

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

    if (actionId === 'zoom') {
      if (!selectedImageUri) {
        return;
      }

      // Close edit popup when entering/leaving Zoom so tap-to-edit does not fire by accident.
      // Multi-select selection state is left alone.
      if (!isMultiSelectMode) {
        handleCancelTagEdit();
      }

      toggleZoomMode();
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

    if (actionId === 'redo') {
      handleRedo();
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

    resetZoom();
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
      textStylePresetId={textStylePresetId}
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
        onSaveImage={() => {
          void handleSaveImage(filename);
        }}
        onShareImage={() => {
          void handleShareImage(filename);
        }}
        panelMarkers={panelMarkers}
        previewSize={previewSize}
        showWatermark={showWatermark}
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

      <Text style={styles.placeholder}>
        {selectedImageUri
          ? isZoomMode
            ? t('editor.zoomHint')
            : isMultiSelectMode
              ? t('editor.tapEmptyToExit')
              : editorMode === 'priceList'
                ? t('editor.tapPhotoToAddMarker')
                : t('editor.tapPhotoToAdd')
          : t('editor.choosePhotoToStart')}
      </Text>

      <View
        style={[
          styles.content,
          { paddingBottom: contentBottomPadding },
          isDraggingTag && styles.contentDragging,
        ]}>
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
          isZoomMode={isZoomMode}
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
          onTagDragEnd={handleTagDragEndWithTip}
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
          viewportScale={zoomScale}
          zoomAnimatedStyle={zoomAnimatedStyle}
          zoomGesture={zoomGesture}
        />
      </View>

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

      {activeTipId ? (
        <EditorTip
          onDismiss={dismissActiveTip}
          placement={getTipPlacement(activeTipId)}
          tipId={activeTipId}
        />
      ) : null}

      <EditorFloatingControls
        alignFeedbackMessage={alignFeedbackMessage}
        bottomDropAreaRef={bottomDropAreaRef}
        canRedo={canRedo}
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
        isZoomMode={isZoomMode}
        onBottomDropAreaLayout={handleBottomDropAreaLayout}
        onFloatingHistoryAction={handleFloatingHistoryAction}
        onFloatingMainAction={handleFloatingMainAction}
        selectedImageUri={selectedImageUri}
        selectedTagIds={selectedTagIds}
        zoomScaleLabel={isZoomMode || zoomScale !== 1 ? formatZoomPercent(zoomScale) : null}
      />
    </SafeAreaView>
  );
}
