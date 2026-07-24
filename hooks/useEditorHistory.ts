import { useCallback, useRef, useState } from 'react';

import { EDITOR_HISTORY_LIMIT } from '@/constants/editorHistory';
import type { EditorUndoSnapshot } from '@/types/editor';

type PushHistoryOptions = {
  asPendingDraft?: boolean;
};

function trimStack(stack: EditorUndoSnapshot[]): EditorUndoSnapshot[] {
  if (stack.length <= EDITOR_HISTORY_LIMIT) {
    return stack;
  }

  return stack.slice(stack.length - EDITOR_HISTORY_LIMIT);
}

export function useEditorHistory() {
  const [undoStack, setUndoStack] = useState<EditorUndoSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorUndoSnapshot[]>([]);
  const [hasPendingDraftHistory, setHasPendingDraftHistory] = useState(false);

  const undoStackRef = useRef(undoStack);
  const redoStackRef = useRef(redoStack);
  const hasPendingDraftHistoryRef = useRef(hasPendingDraftHistory);

  undoStackRef.current = undoStack;
  redoStackRef.current = redoStack;
  hasPendingDraftHistoryRef.current = hasPendingDraftHistory;

  const discardPendingDraftHistory = useCallback(() => {
    if (!hasPendingDraftHistoryRef.current) {
      return;
    }

    hasPendingDraftHistoryRef.current = false;
    setUndoStack((current) => {
      const nextUndo = current.slice(0, -1);
      undoStackRef.current = nextUndo;
      return nextUndo;
    });
    setHasPendingDraftHistory(false);
  }, []);

  const confirmPendingDraftHistory = useCallback(() => {
    if (!hasPendingDraftHistoryRef.current) {
      return;
    }

    hasPendingDraftHistoryRef.current = false;
    setHasPendingDraftHistory(false);
    redoStackRef.current = [];
    setRedoStack([]);
  }, []);

  const clearHistory = useCallback(() => {
    hasPendingDraftHistoryRef.current = false;
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoStack([]);
    setRedoStack([]);
    setHasPendingDraftHistory(false);
  }, []);

  const undo = useCallback((currentSnapshot: EditorUndoSnapshot): EditorUndoSnapshot | null => {
    const stack = undoStackRef.current;

    if (stack.length === 0) {
      return null;
    }

    const previous = stack[stack.length - 1];
    const nextUndo = stack.slice(0, -1);
    undoStackRef.current = nextUndo;
    setUndoStack(nextUndo);
    setRedoStack((current) => {
      const nextRedo = trimStack([...current, currentSnapshot]);
      redoStackRef.current = nextRedo;
      return nextRedo;
    });
    hasPendingDraftHistoryRef.current = false;
    setHasPendingDraftHistory(false);
    return previous;
  }, []);

  const redo = useCallback((currentSnapshot: EditorUndoSnapshot): EditorUndoSnapshot | null => {
    const stack = redoStackRef.current;

    if (stack.length === 0) {
      return null;
    }

    const next = stack[stack.length - 1];
    const nextRedo = stack.slice(0, -1);
    redoStackRef.current = nextRedo;
    setRedoStack(nextRedo);
    setUndoStack((current) => {
      const nextUndo = trimStack([...current, currentSnapshot]);
      undoStackRef.current = nextUndo;
      return nextUndo;
    });
    hasPendingDraftHistoryRef.current = false;
    setHasPendingDraftHistory(false);
    return next;
  }, []);

  const pushHistory = useCallback((snapshot: EditorUndoSnapshot, options?: PushHistoryOptions) => {
    setUndoStack((current) => {
      const nextUndo = trimStack([...current, snapshot]);
      undoStackRef.current = nextUndo;
      return nextUndo;
    });

    if (options?.asPendingDraft) {
      hasPendingDraftHistoryRef.current = true;
      setHasPendingDraftHistory(true);
      return;
    }

    hasPendingDraftHistoryRef.current = false;
    setHasPendingDraftHistory(false);
    redoStackRef.current = [];
    setRedoStack([]);
  }, []);

  return {
    canRedo: redoStack.length > 0,
    canUndo: undoStack.length > 0,
    clearHistory,
    confirmPendingDraftHistory,
    discardPendingDraftHistory,
    pushHistory,
    redo,
    undo,
  };
}
