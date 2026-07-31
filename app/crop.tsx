import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CropAspectRatioBar } from '@/components/crop/CropAspectRatioBar';
import { CropCanvas } from '@/components/crop/CropCanvas';
import { CropHeader } from '@/components/crop/CropHeader';
import { CropRotateButton } from '@/components/crop/CropRotateButton';
import { CROP_CANVAS_INSET } from '@/constants/cropAspectRatios';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { useCropNavigate } from '@/hooks/useCropNavigate';
import { useCropSession } from '@/hooks/useCropSession';
import { getDraftId, getFilenameParam, getImageUri } from '@/hooks/useEditorSession';

type CropParams = {
  draftId?: string | string[];
  filename?: string | string[];
  imageUri?: string | string[];
};

export default function CropScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { draftId, filename: filenameParam, imageUri } = useLocalSearchParams<CropParams>();
  const selectedImageUri = getImageUri(imageUri);
  const selectedDraftId = getDraftId(draftId);
  const routeFilename = getFilenameParam(filenameParam);

  const session = useCropSession({ imageUri: selectedImageUri });
  const workingUri = session.workingUri;
  const { bakeError, handleBack, handleNext, isBaking } = useCropNavigate({
    imageUri: workingUri,
    sourceSize: session.sourceSize,
    draftId: selectedDraftId,
    filename: routeFilename,
    rotation: session.rotation,
    cropRect: session.cropRect,
    isIdentity: session.isIdentity,
  });

  const controlsDisabled = isBaking || session.isPreparing || !workingUri;

  if (!selectedImageUri) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <CropHeader
          canRedo={false}
          canReset={false}
          canUndo={false}
          isBaking={false}
          onBack={handleBack}
          onNext={handleBack}
          onRedo={() => {}}
          onReset={() => {}}
          onUndo={() => {}}
        />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('crop.noImage')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <CropHeader
        canRedo={session.canRedo}
        canReset={session.canReset}
        canUndo={session.canUndo}
        isBaking={isBaking || session.isPreparing}
        onBack={handleBack}
        onNext={() => {
          void handleNext();
        }}
        onRedo={session.redo}
        onReset={session.reset}
        onUndo={session.undo}
      />

      <View style={styles.canvasArea}>
        <View style={styles.canvasInset}>
          {workingUri ? (
            <CropCanvas
              beginLiveEdit={session.beginLiveEdit}
              commitLiveEdit={session.commitLiveEdit}
              cropRect={session.cropRect}
              disabled={controlsDisabled}
              imageUri={workingUri}
              moveRect={session.moveRect}
              resizeFromCorner={session.resizeFromCorner}
              rotatedSize={session.rotatedSize}
              rotation={session.rotation}
            />
          ) : (
            <View style={styles.loadingCanvas}>
              <ActivityIndicator color={theme.colors.white} size="large" />
              <Text style={styles.loadingText}>{t('crop.preparing')}</Text>
            </View>
          )}
        </View>

        <CropRotateButton
          disabled={controlsDisabled}
          onRotateLeft={() => session.rotateBy(-90)}
        />
      </View>

      {bakeError || session.imageLoadError ? (
        <Text style={styles.errorText}>
          {t(session.imageLoadError ? 'crop.imageLoadError' : bakeError ?? 'crop.bakeError')}
        </Text>
      ) : null}

      <CropAspectRatioBar
        aspectId={session.aspectId}
        disabled={controlsDisabled}
        onSelect={session.selectAspect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.photoStageBackground,
  },
  // Keeps free-crop corner hits inside the screen; rotate sits in the outer gutter.
  canvasInset: {
    flex: 1,
    padding: CROP_CANVAS_INSET,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.photoStageBackground,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.white,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.sold,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
});
