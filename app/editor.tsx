import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Keyboard, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { EditorCoachMark } from '@/components/editor/EditorCoachMark';
import {
  EDITOR_FLOATING_MAIN_BAR_HEIGHT,
  EditorFloatingControls,
  type FloatingHistoryActionId,
  type FloatingMainActionId,
} from '@/components/editor/EditorFloatingControls';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorPreviewScreen } from '@/components/editor/EditorPreviewScreen';
import { PendingPlacementChip } from '@/components/editor/PendingPlacementChip';
import { PriceRowEditor } from '@/components/editor/PriceRowEditor';
import { StylePickerPanel } from '@/components/editor/StylePickerPanel';
import { styles } from '@/components/editor/editor.styles';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

import { useEditorChrome } from '@/hooks/useEditorChrome';
import { useEditorCoach } from '@/hooks/useEditorCoach';
import { useEditorDraftHydration } from '@/hooks/useEditorDraftHydration';
import { useEditorExport } from '@/hooks/useEditorExport';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { getDraftId, getFilenameParam, getImageUri, useEditorSession } from '@/hooks/useEditorSession';
import { useEditorZoom } from '@/hooks/useEditorZoom';
import { usePriceListEditorState } from '@/hooks/usePriceListEditorState';
import {
  getDefaultTextForType,
  useTagEditorState,
} from '@/hooks/useTagEditorState';

import type { EditorDraftSnapshot } from '@/types/draft';
import { formatZoomPercent, getSafeTagSize } from '@/utils/editorGeometry';
import { createCurrentHistorySnapshot } from '@/utils/editorHistory';

type EditorParams = {
  draftId?: string | string[];
  filename?: string | string[];
  imageUri?: string | string[];
};

const STYLE_SHEET_ENTER_MS = 280;
const STYLE_SHEET_EXIT_MS = 220;

export default function EditorScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draftId, filename: filenameParam, imageUri } = useLocalSearchParams<EditorParams>();
  const selectedImageUri = getImageUri(imageUri);
  const selectedDraftId = getDraftId(draftId);
  const routeFilename = getFilenameParam(filenameParam);
  // Reserve space for the main floating bar only — history row stays absolute and must not resize imageRect.
  const contentBottomPadding = selectedImageUri
    ? EDITOR_FLOATING_MAIN_BAR_HEIGHT + theme.spacing.lg + insets.bottom
    : theme.spacing.sm;
  const draftSnapshotRef = useRef<EditorDraftSnapshot | null>(null);
  const styleButtonRef = useRef<View | null>(null);
  const exportButtonRef = useRef<View | null>(null);
  const saveButtonRef = useRef<View | null>(null);
  const tagTypesSectionRef = useRef<View | null>(null);
  const sizeSectionRef = useRef<View | null>(null);
  const [coachMeasureToken, setCoachMeasureToken] = useState(0);
  const [tipsResetToken, setTipsResetToken] = useState(0);
  const [keyboardCanvasLift, setKeyboardCanvasLift] = useState(0);
  const bumpCoachMeasure = useCallback(() => {
    setCoachMeasureToken((current) => current + 1);
  }, []);
  const handleKeyboardCanvasLiftChange = useCallback((liftY: number) => {
    setKeyboardCanvasLift(liftY);
  }, []);
  const handleEditorTipsReset = useCallback(() => {
    setTipsResetToken((current) => current + 1);
  }, []);
  const getDraftSnapshot = useCallback(() => draftSnapshotRef.current, []);
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
  const {
    applyUnlock,
    closePreview,
    exportAction,
    exportMessage,
    exportRef,
    handleCaptureImageLoad,
    handlePreviewLayout,
    handleSaveImage,
    handleShareImage,
    hasSavedToGallery,
    isExporting,
    isPreviewing,
    openPreview: openExportPreview,
    previewSize,
    showWatermark,
  } = useEditorExport({
    getDraftSnapshot,
    imageSize,
    imageUri: selectedImageUri,
    initialDraftId: selectedDraftId,
    onExportSuccess: () => {},
  });
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
    isMultiSelectMode,
    isPendingPlacement,
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
    soldStylePresetId,
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
  const canExport = canReset;
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

  const handleHardwareBackPress = useCallback(() => {
    // 1) Soft keyboard open → dismiss keyboard only (keep float/dock).
    if ((Keyboard.metrics()?.height ?? 0) > 0) {
      Keyboard.dismiss();
      return true;
    }

    // 2) Tag editor open → dismiss/auto-commit before leaving the screen.
    if (editorMode === 'tag' && selectedTag) {
      handleDismissTagEdit();
      return true;
    }

    return false;
  }, [editorMode, handleDismissTagEdit, selectedTag]);

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
    requestNewPhoto,
    setDraftFilename,
    setIsEditingFilename,
    startFilenameEdit,
  } = useEditorSession({
    closePreview,
    hasContentDirty,
    isExporting,
    isPreviewing,
    onHardwareBackPress: handleHardwareBackPress,
    routeFilename,
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
    if (!selectedImageUri || !canExport) {
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
      handleDismissTagEdit();
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
    handleDismissTagEdit,
    isMultiSelectMode,
    selectedTag,
  ]);

  const { isZoomMode, resetZoom, toggleZoomMode, zoomAnimatedStyle, zoomGesture, zoomScale } = useEditorZoom({
    canvasSize,
    imageUri: selectedImageUri,
    onBackgroundTap: handleZoomBackgroundTap,
  });

  const hasConfirmModal =
    isLeaveModalVisible || isDeleteModalVisible || isResetModalVisible || isMarkerDeleteModalVisible;

  const tagIds = useMemo(() => tags.map((tag) => tag.id), [tags]);

  const { activeStepId, canGoBack, canGoNext, focusTagId, goBack, goNext, skip } = useEditorCoach({
    draftTagId,
    editorMode,
    finishStylePicker,
    hasConfirmModal,
    hasImage: Boolean(selectedImageUri),
    isDraggingTag,
    isExporting,
    isPreviewing,
    isStylePickerVisible,
    openStylePicker,
    selectedTagId,
    tagCount: tags.length,
    tagIds,
    tipsResetToken,
  });

  const coachTagRect = useMemo(() => {
    if (!imageRect || !focusTagId) {
      return null;
    }

    if (activeStepId !== 'edit-price' && activeStepId !== 'drag-tag') {
      return null;
    }

    const focusTag = tags.find((tag) => tag.id === focusTagId);
    if (!focusTag) {
      return null;
    }

    const size = getSafeTagSize(tagSizeById[focusTag.id]);
    return {
      x: imageRect.x + focusTag.x * imageRect.width,
      // Canvas content shifts up under the keyboard; keep the coach ring on the visible tag.
      y: imageRect.y + focusTag.y * imageRect.height - keyboardCanvasLift,
      width: size.width,
      height: size.height,
    };
  }, [activeStepId, focusTagId, imageRect, keyboardCanvasLift, tagSizeById, tags]);

  useEffect(() => {
    if (!activeStepId) {
      return;
    }

    bumpCoachMeasure();
  }, [activeStepId, bumpCoachMeasure, coachTagRect, isStylePickerVisible, keyboardCanvasLift]);

  const handleCanvasPress = (event: GestureResponderEvent) => {
    if (!imageRect) {
      return;
    }

    // First tap while style sheet is open: dismiss sheet only (enter pending placement).
    // Do not create a tag — the next tap places it.
    if (isStylePickerVisible) {
      finishStylePicker();
      return;
    }

    if (isMultiSelectMode) {
      exitMultiSelectMode();
      return;
    }

    if (editorMode === 'tag' && selectedTag) {
      // Auto-save valid draft / edits; blank new price|text cancels.
      // Always return — never also place a new tag on this same tap.
      handleDismissTagEdit();
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
      if (isMultiSelectMode || isZoomMode) {
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
      cancelPendingPlacement();
      if (!isMultiSelectMode) {
        handleCancelTagEdit();
      }

      toggleZoomMode();
      return;
    }

    if (actionId === 'export') {
      if (!canExport) {
        return;
      }

      cancelPendingPlacement();
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
      body={
        deleteCandidateTagIds.length > 1 ? t('tag.confirmDeleteManyBody') : t('tag.confirmDeleteBody')
      }
      cancelLabel={t('tag.cancel')}
      confirmLabel={t('tag.delete')}
      confirmVariant="destructive"
      onCancel={cancelDeleteTag}
      onConfirm={confirmDeleteTag}
      title={
        deleteCandidateTagIds.length > 1 ? t('tag.confirmDeleteManyTitle') : t('tag.confirmDeleteTitle')
      }
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

  const stylePickerPanel = (
    <StylePickerPanel
      activeSizePresetId={activeSizePresetId}
      conditionValue={currentConditionValue}
      languageCode={currentLanguageCode}
      onClose={finishStylePicker}
      onCoachSectionsLayout={bumpCoachMeasure}
      onSelectSizePreset={handleSelectSizePreset}
      onSelectToolType={handleSelectToolType}
      priceTextFormat={currentPriceTextFormat}
      sizeSectionRef={sizeSectionRef}
      soldTextFormat={currentSoldTextFormat}
      stylePickerType={stylePickerType}
      tagTypesSectionRef={tagTypesSectionRef}
      textStylePresetId={textStylePresetId}
      soldStylePresetId={soldStylePresetId}
    />
  );

  if (isPreviewing && selectedImageUri) {
    return (
      <EditorPreviewScreen
        draftFilename={draftFilename}
        editorMode={editorMode}
        exportAction={exportAction}
        exportMessage={exportMessage}
        exportRef={exportRef}
        filename={filename}
        imageSize={imageSize}
        imageUri={selectedImageUri}
        isEditingFilename={isEditingFilename}
        isExporting={isExporting}
        hasSavedToGallery={hasSavedToGallery}
        leaveConfirmModal={leaveConfirmModal}
        onCancelFilenameEdit={cancelFilenameEdit}
        onClosePreview={closePreview}
        onConfirmFilenameEdit={confirmFilenameEdit}
        onCaptureImageLoad={handleCaptureImageLoad}
        onDraftFilenameChange={setDraftFilename}
        onImageLoad={handleImageLoad}
        onNewPhoto={requestNewPhoto}
        onPreviewLayout={handlePreviewLayout}
        onSaveImage={() => {
          const exportName = isEditingFilename ? draftFilename.trim() || filename : filename;
          if (isEditingFilename) {
            confirmFilenameEdit();
          }
          void handleSaveImage(exportName);
        }}
        onShareImage={() => {
          const exportName = isEditingFilename ? draftFilename.trim() || filename : filename;
          if (isEditingFilename) {
            confirmFilenameEdit();
          }
          void handleShareImage(exportName);
        }}
        onStartFilenameEdit={startFilenameEdit}
        onUnlockChange={applyUnlock}
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
        canRedo={canRedo}
        canReset={canReset}
        canUndo={canUndo}
        onBack={requestLeaveEditor}
        onHistoryAction={handleFloatingHistoryAction}
        onLayout={handleHeaderLayout}
        onOpenSettings={openSettings}
        ref={headerRef}
        showHistoryControls={
          Boolean(selectedImageUri) && !isStylePickerVisible && !isDraggingTag && hasEditHistory
        }
      />

      {!activeStepId && (!selectedImageUri || isZoomMode || isMultiSelectMode) ? (
        <Text style={styles.placeholder}>
          {selectedImageUri
            ? isZoomMode
              ? t('editor.zoomHint')
              : t('editor.tapEmptyToExit')
            : t('editor.choosePhotoToStart')}
        </Text>
      ) : null}

      <View style={styles.workspace}>
        {selectedImageUri &&
        editorMode === 'tag' &&
        !isStylePickerVisible &&
        !activeStepId &&
        !isMultiSelectMode &&
        !isZoomMode ? (
          <View pointerEvents="box-none" style={styles.placementChipOverlay}>
            <PendingPlacementChip onCancel={cancelPendingPlacement} previewTag={stylePreviewTag} />
          </View>
        ) : null}

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
            onKeyboardCanvasLiftChange={handleKeyboardCanvasLiftChange}
            onDeleteMarker={requestDeleteMarker}
            onDeleteTag={handleDeleteTag}
            onDraftChange={handleDraftChange}
            onEditMarkerPrice={handleEditMarkerPrice}
            onImageLoad={handleImageLoad}
            onLeaveEmpty={requestLeaveEditor}
            onSaveTag={handleSaveTag}
            onSaveButtonLayout={bumpCoachMeasure}
            saveButtonRef={saveButtonRef}
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
            viewportScale={zoomScale}
            zoomAnimatedStyle={zoomAnimatedStyle}
            zoomGesture={zoomGesture}
          />
        </View>

        {isStylePickerVisible ? (
          <Animated.View
            entering={SlideInDown.duration(STYLE_SHEET_ENTER_MS)}
            exiting={SlideOutDown.duration(STYLE_SHEET_EXIT_MS)}
            pointerEvents="box-none"
            style={styles.stylePickerOverlay}>
            {stylePickerPanel}
          </Animated.View>
        ) : null}
      </View>

      <PriceRowEditor
        confirmLabel={hasNextMarkerToEdit ? t('pricePanel.next') : t('pricePanel.done')}
        marker={editingMarker}
        onCancel={handleCancelMarkerPriceEdit}
        onSave={handleSaveMarkerPrice}
        visible={editorMode === 'priceList' && Boolean(editingMarker)}
      />

      <BottomSheetOverlay onClose={closeMoreMenu} title={t('editor.moreMenuTitle')} visible={isMoreMenuVisible}>
        <Text style={styles.moreMenuPlaceholder}>{t('editor.moreMenuPlaceholder')}</Text>
      </BottomSheetOverlay>

      <SettingsSheet onClose={closeSettings} onEditorTipsReset={handleEditorTipsReset} visible={isSettingsOpen} />

      {activeStepId ? (
        <EditorCoachMark
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          canvasRef={canvasRef}
          exportButtonRef={exportButtonRef}
          imageRect={imageRect}
          measureToken={coachMeasureToken}
          onBack={goBack}
          onNext={goNext}
          onSkip={skip}
          saveButtonRef={saveButtonRef}
          stepId={activeStepId}
          styleButtonRef={styleButtonRef}
          tagRect={coachTagRect}
        />
      ) : null}

      <EditorFloatingControls
        alignFeedbackMessage={alignFeedbackMessage}
        bottomDropAreaRef={bottomDropAreaRef}
        canExport={canExport}
        canSelect={canSelect}
        editorMode={editorMode}
        exportButtonRef={exportButtonRef}
        isDragOverDelete={isDragOverDelete}
        isDraggingTag={isDraggingTag}
        isMultiSelectMode={isMultiSelectMode}
        isStylePickerVisible={isStylePickerVisible}
        isZoomMode={isZoomMode}
        onBottomDropAreaLayout={handleBottomDropAreaLayout}
        onExportButtonLayout={bumpCoachMeasure}
        onFloatingMainAction={handleFloatingMainAction}
        onStyleButtonLayout={bumpCoachMeasure}
        selectedImageUri={selectedImageUri}
        selectedTagIds={selectedTagIds}
        styleButtonRef={styleButtonRef}
        zoomScaleLabel={isZoomMode || zoomScale !== 1 ? formatZoomPercent(zoomScale) : null}
      />
    </SafeAreaView>
  );
}
