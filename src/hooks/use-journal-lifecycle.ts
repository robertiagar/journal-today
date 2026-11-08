"use client";

import type { Editor } from "@tiptap/core";
import { useEffect } from "react";
import { journalDayKey, journalDayTick } from "../lib/journal-boundaries";
import { localDay } from "../lib/journal-date";

export function useJournalLifecycle(
  editor: Editor | null,
  saveImmediately: (editor: Editor) => void,
) {
  useEffect(() => {
    if (!editor) return;

    const saveBeforeLeaving = () => saveImmediately(editor);
    const checkForNewDay = () => {
      const dayChanged = journalDayKey.getState(editor.state) !== localDay(new Date());
      if (editor.isFocused && !editor.isEmpty && dayChanged) {
        // Attach the date to the active paragraph without moving the caret.
        editor.view.dispatch(editor.state.tr.setMeta(journalDayTick, true));
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) saveBeforeLeaving();
      else checkForNewDay();
    };

    const timer = window.setInterval(checkForNewDay, 1_000);
    window.addEventListener("pagehide", saveBeforeLeaving);
    window.addEventListener("focus", checkForNewDay);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      saveBeforeLeaving();
      window.clearInterval(timer);
      window.removeEventListener("pagehide", saveBeforeLeaving);
      window.removeEventListener("focus", checkForNewDay);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [editor, saveImmediately]);
}
