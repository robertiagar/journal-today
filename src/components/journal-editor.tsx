"use client";

import { EditorContent } from "@tiptap/react";
import { useJournalEditor } from "../hooks/use-journal-editor";
import { JournalStatus } from "./journal-status";
import { WritingShortcuts } from "./writing-shortcuts";

export function JournalEditor() {
  const { editor, saveStatus, wordCount } = useJournalEditor();

  return (
    <section aria-label="Your journal" className="min-w-0">
      <EditorContent editor={editor} />
      {!editor && <div className="min-h-80" aria-label="Loading journal" />}
      <JournalStatus saveStatus={saveStatus} wordCount={wordCount} />
      <WritingShortcuts />
    </section>
  );
}
