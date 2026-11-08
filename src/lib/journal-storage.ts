import type { Editor, JSONContent } from "@tiptap/core";
import { journalDayKey, restoreJournalDay } from "./journal-boundaries";

// Keep this key and JSON shape stable so existing journals survive refactors.
const storageKey = "journal-today:v1";

export const emptyJournal: JSONContent = {
  type: "doc",
  content: [{ type: "heading", attrs: { level: 1 } }],
};

export type JournalSaveStatus = "loading" | "saved" | "saving" | "unavailable";

type SavedJournal = {
  content: JSONContent;
  day: string | null;
};

export function restoreJournal(editor: Editor): void {
  const raw = localStorage.getItem(storageKey);

  if (raw) {
    const saved = JSON.parse(raw) as SavedJournal;
    if (saved.content?.type !== "doc") throw new Error("Invalid journal");

    editor
      .chain()
      .setContent(saved.content, {
        emitUpdate: false,
        errorOnInvalidContent: true,
      })
      .setMeta(restoreJournalDay, { day: saved.day ?? null })
      .run();
  }

  if (editor.isEmpty && editor.state.doc.firstChild?.type.name !== "heading") {
    editor
      .chain()
      .setContent(emptyJournal, { emitUpdate: false })
      .setMeta(restoreJournalDay, { day: null })
      .run();
  }
}

export function saveJournal(editor: Editor): void {
  const journal: SavedJournal = {
    content: editor.getJSON(),
    day: journalDayKey.getState(editor.state) ?? null,
  };

  localStorage.setItem(storageKey, JSON.stringify(journal));
}
