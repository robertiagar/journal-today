import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useRef, useState } from "react";
import { JournalBoundaries } from "../lib/journal-boundaries";
import {
  emptyJournal,
  JournalStorageConflictError,
  restoreJournal,
  saveJournal,
  type JournalSaveStatus,
} from "../lib/journal-storage";
import { useJournalLifecycle } from "./use-journal-lifecycle";

function countWords(editor: Editor): number {
  const text = editor.getText().trim();
  return text ? text.split(/\s+/u).length : 0;
}

export function useJournalEditor() {
  const [saveStatus, setSaveStatus] = useState<JournalSaveStatus>("loading");
  const [wordCount, setWordCount] = useState(0);
  const ready = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initializeJournal = ({ editor }: { editor: Editor }) => {
    try {
      restoreJournal(editor);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unavailable");
    }
    setWordCount(countWords(editor));
    ready.current = true;
  };

  const handleEditorUpdate = ({ editor }: { editor: Editor }) => {
    setWordCount(countWords(editor));
    if (!ready.current) return;

    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        saveJournal(editor);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus(error instanceof JournalStorageConflictError ? "changed" : "unavailable");
      }
    }, 400);
  };

  const saveImmediately = useCallback((editor: Editor) => {
    // Cleanup can run before the editor's create event has restored its content.
    if (!ready.current || !editor.isInitialized) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    try {
      saveJournal(editor);
    } catch {
      // Editing reports storage failures; cleanup may run during unmount.
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    content: emptyJournal,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, markdownLinks: true },
      }),
      Markdown,
      Placeholder.configure({
        placeholder: ({ node }) => node.type.name === "heading"
          ? "Let it out"
          : "Start anywhere. What’s on your mind?",
      }),
      JournalBoundaries,
    ],
    editorProps: {
      attributes: {
        class: "journal-input prose prose-stone prose-base max-w-none focus:outline-none",
        role: "textbox",
        "aria-label": "Journal entry",
        "aria-multiline": "true",
        spellcheck: "true",
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        const hasRichText = Boolean(event.clipboardData?.getData("text/html"));
        const isCodeBlock = view.state.selection.$from.parent.type.name === "codeBlock";
        if (!text || hasRichText || isCodeBlock) return false;

        editor?.commands.insertContent(text, { contentType: "markdown" });
        return true;
      },
    },
    onCreate: initializeJournal,
    onUpdate: handleEditorUpdate,
  });

  useJournalLifecycle(editor, saveImmediately);

  return { editor, saveStatus, wordCount };
}
