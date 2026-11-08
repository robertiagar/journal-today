import type { Editor, JSONContent } from "@tiptap/core";
import { journalDayKey, restoreJournalDay } from "./journal-boundaries";

// Keep this key and JSON shape stable so existing journals survive refactors.
const storageKey = "journal-today:v1";
const storedValues = new WeakMap<Editor, string | null>();

export class JournalStorageConflictError extends Error {
  constructor() {
    super("The saved journal changed. Reload to load it before editing.");
    this.name = "JournalStorageConflictError";
  }
}

export const emptyJournal: JSONContent = {
  type: "doc",
  content: [{ type: "heading", attrs: { level: 1 } }],
};

export type JournalSaveStatus = "loading" | "saved" | "saving" | "unavailable" | "changed";

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

  // Only allow saving after the stored document has been restored successfully.
  storedValues.set(editor, raw);
}

export function saveJournal(editor: Editor): void {
  if (!storedValues.has(editor)) throw new Error("The saved journal could not be restored.");
  // DevTools imports and other windows can replace storage while this editor is
  // open. Never overwrite those changes with the old document during unload.
  if (localStorage.getItem(storageKey) !== storedValues.get(editor)) {
    throw new JournalStorageConflictError();
  }

  const journal: SavedJournal = {
    content: editor.getJSON(),
    day: journalDayKey.getState(editor.state) ?? null,
  };

  const raw = JSON.stringify(journal);
  localStorage.setItem(storageKey, raw);
  storedValues.set(editor, raw);
}
