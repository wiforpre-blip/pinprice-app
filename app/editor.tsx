import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { EditorCoachMark } from '@/components/editor/EditorCoachMark';
import { EditorContextualTip } from '@/components/editor/EditorContextualTip';
import {
  EDITOR_FLOATING_MAIN_BAR_HEIGHT,
  EditorFloatingControls,
  type FloatingHistoryActionId,
  type FloatingMainActionId,
} from '@/components/editor/EditorFloatingControls';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { EditorPreviewScreen } from '@/components/editor/EditorPreviewScreen';
import { PendingPlacementChip } from '@/components/editor/PendingPlacementChip';
import { MultiSelectHintChip } from '@/components/editor/MultiSelectHintChip';
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
import { useEditorContextualTips } from '@/hooks/useEditorContextualTips';
import { useEditorDraftHydration } from '@/hooks/useEditorDraftHydration';
import { useEditorExport } from '@/hooks/useEditorExport';
import { useEditorLayout } from '@/hooks/useEditorLayout';
import { getDraftId, getFilenameParam, getHydrateDraftParam, getImageUri, useEditorSession } from '@/hooks/useEditorSession';
import { useEditorZoom, type CanvasTapPoint } from '@/hooks/useEditorZoom';
import { usePriceListEditorState } from '@/hooks/usePriceListEditorState';
import {
  getDefaultTextForType,
  useTagEditorState,
} from '@/hooks/useTagEditorState';

import type { EditorDraftSnapshot } from '@/types/draft';
import type { PriceTag } from '@/types/tag';
import { clampPointToImageRect, getSafeTagSize } from '@/utils/editorGeometry';
import { createCurrentHistorySnapshot } from '@/utils/editorHistory';

type EditorParams = {
  draftId?: string | string[];
  filename?: string | string[];
  imageUri?: string | string[];
  hydrateDraft?: string | string[];
};

const STYLE_SHEET_ENTER_MS = 280;
const STYLE_SHEET_EXIT_MS = 220;

export default function EditorScreen() {
  const { t } = useTranslation();
  const { draftId, filename: filenameParam, imageUri, hydrateDraft: hydrateDraftParam } =
    useLocalSearchParams<EditorParams>();
  const selectedImageUri = getImageUri(imageUri);
  const selectedDraftId = getDraftId(draftId);
  const routeFilename = getFilenameParam(filenameParam);
  const shouldHydrateDraft = getHydrateDraftParam(hydrateDraftParam);
  // Reserve main bar height only — sm less than bar+gap so the floating pill
  // overlaps the photo stage slightly (~8pt) instead of sitting flush on the edge.
  // History row stays absolute and must not resize imageRect.
  const contentBottomPadding = selectedImageUri
    ? EDITOR_FLOATING_MAIN_BAR_HEIGHT
    : theme.spacing.sm;
  const draftSnapshotRef = useRef<EditorDraftSnapshot | null>(null);
  const styleButtonRef = useRef<View | null>(null);
  const alignButtonRef = useRef<View | null>(null);
  const exportButtonRef = useRef<View | null>(null);
  const saveButtonRef = useRef<View | null>(null);
  const tagTypesSectionRef = useRef<View | null>(null);
  const sizeSectionRef = useRef<View | null>(null);
  const [coachMeasureToken, setCoachMeasureToken] = useState(0);
  const [contextualTipMeasureToken, setContextualTipMeasureToken] = useState(0);
  const [tipsResetToken, setTipsResetToken] = useState(0);
  const [keyboardCanvasLift, setKeyboardCanvasLift] = useState(0);
  const [draftPreviewVisualOffsetY, setDraftPreviewVisualOffsetY] = useState(0);
  const bumpCoachMeasure = useCallback(() => {
    setCoachMeasureToken((current) => current + 1);
  }, []);
  const bumpContextualTipMeasure = useCallback(() => {
    setContextualTipMeasureToken((current) => current + 1);
  }, []);
  const handleKeyboardCanvasLiftChange = useCallback((liftY: number) => {
    setKeyboardCanvasLift(liftY);
  }, []);
  const handleDraftPreviewVisualOffsetChange = useCallback((offsetY: number) => {
    setDraftPreviewVisualOffsetY(Number.isFinite(offsetY) ? offsetY : 0);
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
    activeStylePresetId,
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
    deselectTagForMarkerSelect,
    draftTagId,
    draftText,
    draftType,
    draftPreview,
    draggingTagId,
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
    handleSelectToolConditionValue,
    handleSelectToolLanguageCode,
    handleSelectToolPriceFormat,
    handleSelectToolStylePreset,
    handleSelectToolType,
    handleTagDragCancel,
    handleTagDragEnd,
    handleTagDragMove,
    handleTagDragOffsetChange,
    handleTagDragStart,
    handleTagLongPress,
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
    hydrateDraft: shouldHydrateDraft,
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

  const handleCanvasPressRef = useRef<(point: CanvasTapPoint) => void>(() => {});

  const { resetZoom, zoomAnimatedStyle, zoomGesture, zoomScale } = useEditorZoom({
    canvasSize,
    imageUri: selectedImageUri,
    onCanvasTap: (point) => handleCanvasPressRef.current(point),
  });

  const hasConfirmModal =
    isLeaveModalVisible || isDeleteModalVisible || isResetModalVisible || isMarkerDeleteModalVisible;

  const tagIds = useMemo(() => tags.map((tag) => tag.id), [tags]);

  const { activeStepId, canGoBack, canGoNext, focusTagId, goBack, goNext, isCoachCompleted, skip } =
    useEditorCoach({
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

  const {
    message: contextualTipTitle,
    notifyAlignTapped,
    notifyEnteredMultiSelect,
    onGotIt: onContextualTipGotIt,
    visibleTipId: contextualTipId,
  } = useEditorContextualTips({
    alignFeedbackVisible: Boolean(alignFeedbackMessage),
    coachCompleted: isCoachCompleted,
    editorMode,
    hasConfirmModal,
    hasImage: Boolean(selectedImageUri),
    hasTagEditorOpen: Boolean(selectedTag),
    isDraggingTag,
    isExporting,
    isMultiSelectMode,
    isPreviewing,
    isStylePickerVisible,
    selectedCount: selectedTagIds.length,
    tagCount: tags.length,
    tipsResetToken,
  });

  const handleTagLongPressWithTip = useCallback(
    (tag: PriceTag) => {
      handleTagLongPress(tag);
      notifyEnteredMultiSelect();
    },
    [handleTagLongPress, notifyEnteredMultiSelect],
  );

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
    // Match TagOverlay placement (clamped) + draft visualOffsetY so the hole tracks the preview.
    // keyboardCanvasLift stays 0 (canvas no longer lifts) but keep the term for safety.
    const clamped = clampPointToImageRect(
      imageRect.x + focusTag.x * imageRect.width,
      imageRect.y + focusTag.y * imageRect.height,
      imageRect,
      size,
    );
    return {
      x: clamped.x,
      y: clamped.y - keyboardCanvasLift + draftPreviewVisualOffsetY,
      width: size.width,
      height: size.height,
    };
  }, [
    activeStepId,
    draftPreviewVisualOffsetY,
    focusTagId,
    imageRect,
    keyboardCanvasLift,
    tagSizeById,
    tags,
  ]);

  /** Tip A spotlight — newest tag (single hole; never merges nearby tags). */
  const contextualTipTagRect = useMemo(() => {
    if (contextualTipId !== 'multi-select' || !imageRect || tags.length < 2) {
      return null;
    }

    const focusTag = tags[tags.length - 1];
    if (!focusTag) {
      return null;
    }

    const size = getSafeTagSize(tagSizeById[focusTag.id]);
    const clamped = clampPointToImageRect(
      imageRect.x + focusTag.x * imageRect.width,
      imageRect.y + focusTag.y * imageRect.height,
      imageRect,
      size,
    );
    return {
      x: clamped.x,
      y: clamped.y - keyboardCanvasLift,
      width: size.width,
      height: size.height,
    };
  }, [contextualTipId, imageRect, keyboardCanvasLift, tagSizeById, tags]);

  useEffect(() => {
    if (!activeStepId) {
      return;
    }

    bumpCoachMeasure();
  }, [
    activeStepId,
    bumpCoachMeasure,
    coachTagRect,
    draftPreviewVisualOffsetY,
    isStylePickerVisible,
    keyboardCanvasLift,
  ]);

  useEffect(() => {
    if (!contextualTipId) {
      return;
    }

    bumpContextualTipMeasure();
  }, [bumpContextualTipMeasure, contextualTipId, contextualTipTagRect, isMultiSelectMode]);

  const handleCanvasPress = (point: CanvasTapPoint) => {
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

    const { locationX, locationY, pageX, pageY } = point;

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
  handleCanvasPressRef.current = handleCanvasPress;

  const handleFloatingMainAction = (actionId: FloatingMainActionId) => {
    if (actionId === 'style') {
      if (isMultiSelectMode) {
        return;
      }

      openStylePicker();
      return;
    }

    if (actionId === 'align') {
      notifyAlignTapped();
      handleAlignSelectedTags();
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
      activeStylePresetId={activeStylePresetId}
      activeSizePresetId={activeSizePresetId}
      conditionValue={currentConditionValue}
      languageCode={currentLanguageCode}
      onClose={finishStylePicker}
      onCoachSectionsLayout={bumpCoachMeasure}
      onSelectConditionValue={handleSelectToolConditionValue}
      onSelectLanguageCode={handleSelectToolLanguageCode}
      onSelectPriceTextFormat={handleSelectToolPriceFormat}
      onSelectSizePreset={handleSelectSizePreset}
      onSelectToolStylePreset={handleSelectToolStylePreset}
      onSelectToolType={handleSelectToolType}
      priceTextFormat={currentPriceTextFormat}
      sizeSectionRef={sizeSectionRef}
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

      {!activeStepId && !selectedImageUri ? (
        <Text style={styles.placeholder}>{t('editor.choosePhotoToStart')}</Text>
      ) : null}

      <View style={styles.workspace}>
        {selectedImageUri && editorMode === 'tag' && !isStylePickerVisible && !activeStepId ? (
          <View pointerEvents="box-none" style={styles.placementChipOverlay}>
            {isMultiSelectMode ? (
              <MultiSelectHintChip />
            ) : (
              <PendingPlacementChip previewTag={stylePreviewTag} />
            )}
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
            hideSelectedTagRing={activeStepId === 'edit-price'}
            isDraggingTag={isDraggingTag}
            isMultiSelectMode={isMultiSelectMode}
            isStylePickerVisible={isStylePickerVisible}
            onCancelTagEdit={handleCancelTagEdit}
            onCanvasLayout={handleCanvasLayout}
            onKeyboardCanvasLiftChange={handleKeyboardCanvasLiftChange}
            onDraftPreviewVisualOffsetChange={handleDraftPreviewVisualOffsetChange}
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
            onTagLongPress={handleTagLongPressWithTip}
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

      <SettingsSheet
        onClose={closeSettings}
        onEditorTipsReset={handleEditorTipsReset}
        onUnlockChange={applyUnlock}
        visible={isSettingsOpen}
      />

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

      {contextualTipId && contextualTipTitle && !activeStepId ? (
        <EditorContextualTip
          alignButtonRef={alignButtonRef}
          canvasRef={canvasRef}
          measureToken={contextualTipMeasureToken}
          onGotIt={onContextualTipGotIt}
          tagRect={contextualTipTagRect}
          tipId={contextualTipId}
          title={contextualTipTitle}
        />
      ) : null}

      <EditorFloatingControls
        alignButtonRef={alignButtonRef}
        alignFeedbackMessage={alignFeedbackMessage}
        bottomDropAreaRef={bottomDropAreaRef}
        canExport={canExport}
        editorMode={editorMode}
        exportButtonRef={exportButtonRef}
        isDragOverDelete={isDragOverDelete}
        isDraggingTag={isDraggingTag}
        isMultiSelectMode={isMultiSelectMode}
        isStylePickerVisible={isStylePickerVisible}
        onAlignButtonLayout={bumpContextualTipMeasure}
        onBottomDropAreaLayout={handleBottomDropAreaLayout}
        onExportButtonLayout={bumpCoachMeasure}
        onFloatingMainAction={handleFloatingMainAction}
        onStyleButtonLayout={bumpCoachMeasure}
        selectedImageUri={selectedImageUri}
        selectedTagIds={selectedTagIds}
        styleButtonRef={styleButtonRef}
      />
    </SafeAreaView>
  );
}
