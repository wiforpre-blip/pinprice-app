import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { listEditorDrafts } from '@/services/draft.service';
import type { EditorDraft } from '@/types/draft';

export function useRecentDrafts() {
  const [drafts, setDrafts] = useState<EditorDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDrafts = useCallback(async () => {
    const nextDrafts = await listEditorDrafts();
    setDrafts(nextDrafts);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshDrafts();
    }, [refreshDrafts]),
  );

  return {
    drafts,
    isLoading,
    refreshDrafts,
  };
}
