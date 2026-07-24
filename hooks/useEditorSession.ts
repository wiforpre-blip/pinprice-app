import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

const FALLBACK_FILENAME = 'Untitled';

export function getImageUri(imageUri: string | string[] | undefined) {
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

export function getDraftId(draftId: string | string[] | undefined) {
  const rawId = Array.isArray(draftId) ? draftId[0] : draftId;
  const trimmed = rawId?.trim();

  return trimmed ? trimmed : null;
}

function getFilenameFromUri(uri: string | null) {
  if (!uri) {
    return FALLBACK_FILENAME;
  }

  const cleanUri = uri.split(/[?#]/)[0];
  const filename = cleanUri.split('/').filter(Boolean).pop();

  return filename?.trim() || FALLBACK_FILENAME;
}

type UseEditorSessionOptions = {
  closePreview: () => void;
  hasContentDirty: boolean;
  isExporting: boolean;
  isPreviewing: boolean;
  selectedImageUri: string | null;
};

export function useEditorSession({
  closePreview,
  hasContentDirty,
  isExporting,
  isPreviewing,
  selectedImageUri,
}: UseEditorSessionOptions) {
  const router = useRouter();
  const initialFilename = useMemo(() => getFilenameFromUri(selectedImageUri), [selectedImageUri]);
  const [filename, setFilename] = useState(initialFilename);
  const [draftFilename, setDraftFilename] = useState(initialFilename);
  const [baselineFilename, setBaselineFilename] = useState(initialFilename);
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);

  const hasUnsavedWork =
    Boolean(selectedImageUri) &&
    (hasContentDirty || isEditingFilename || filename !== baselineFilename || draftFilename !== filename);

  useEffect(() => {
    setFilename(initialFilename);
    setDraftFilename(initialFilename);
    setBaselineFilename(initialFilename);
    setIsEditingFilename(false);
  }, [initialFilename]);

  const applyRestoredFilename = useCallback((name: string) => {
    const nextFilename = name.trim() || FALLBACK_FILENAME;

    setFilename(nextFilename);
    setDraftFilename(nextFilename);
    setBaselineFilename(nextFilename);
    setIsEditingFilename(false);
  }, []);

  const goHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }, [router]);

  const requestLeaveEditor = useCallback(() => {
    if (isExporting) {
      return;
    }

    if (isPreviewing) {
      closePreview();
      return;
    }

    if (hasUnsavedWork) {
      setIsLeaveModalVisible(true);
      return;
    }

    goHome();
  }, [closePreview, goHome, hasUnsavedWork, isExporting, isPreviewing]);

  const cancelLeaveEditor = () => {
    setIsLeaveModalVisible(false);
  };

  const confirmLeaveEditor = () => {
    setIsLeaveModalVisible(false);
    goHome();
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestLeaveEditor();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [requestLeaveEditor]);

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

  return {
    applyRestoredFilename,
    cancelFilenameEdit,
    cancelLeaveEditor,
    confirmFilenameEdit,
    confirmLeaveEditor,
    draftFilename,
    filename,
    hasUnsavedWork,
    initialFilename,
    isEditingFilename,
    isLeaveModalVisible,
    requestLeaveEditor,
    setDraftFilename,
    setIsEditingFilename,
    startFilenameEdit,
  };
}
