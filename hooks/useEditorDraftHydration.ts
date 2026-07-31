import { useEffect, useRef } from 'react';

import { getEditorDraft } from '@/services/draft.service';
import type { EditorDraft } from '@/types/draft';

type UseEditorDraftHydrationOptions = {
  draftId: string | null;
  /** When false, keep draftId for save continuity but do not restore tags/markers. */
  hydrateDraft?: boolean;
  onHydrate: (draft: EditorDraft) => void;
};

/**
 * Loads a persisted editor draft once per draftId and applies it via onHydrate.
 * Skips content hydration when hydrateDraft is false (e.g. after crop/rotate rebake).
 */
export function useEditorDraftHydration({
  draftId,
  hydrateDraft = true,
  onHydrate,
}: UseEditorDraftHydrationOptions) {
  const onHydrateRef = useRef(onHydrate);
  const appliedDraftIdRef = useRef<string | null>(null);

  onHydrateRef.current = onHydrate;

  useEffect(() => {
    if (!draftId || !hydrateDraft || appliedDraftIdRef.current === draftId) {
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
  }, [draftId, hydrateDraft]);
}
