import { useEffect, useRef } from 'react';

import { getEditorDraft } from '@/services/draft.service';
import type { EditorDraft } from '@/types/draft';

type UseEditorDraftHydrationOptions = {
  draftId: string | null;
  onHydrate: (draft: EditorDraft) => void;
};

/**
 * Loads a persisted editor draft once per draftId and applies it via onHydrate.
 */
export function useEditorDraftHydration({ draftId, onHydrate }: UseEditorDraftHydrationOptions) {
  const onHydrateRef = useRef(onHydrate);
  const appliedDraftIdRef = useRef<string | null>(null);

  onHydrateRef.current = onHydrate;

  useEffect(() => {
    if (!draftId || appliedDraftIdRef.current === draftId) {
      return;
    }

    let cancelled = false;

    void getEditorDraft(draftId).then((draft) => {
      if (cancelled || !draft) {
        return;
      }

      appliedDraftIdRef.current = draftId;
      onHydrateRef.current(draft);
    });

    return () => {
      cancelled = true;
    };
  }, [draftId]);
}
