import { EditorContent } from "@tiptap/react";
import type { useJournalEditor } from "../hooks/use-journal-editor";
import { JournalStatus } from "./journal-status";
import { WritingShortcuts } from "./writing-shortcuts";

export function JournalEditor({ journal }: { journal: ReturnType<typeof useJournalEditor> }) {
  const { editor, saveStatus, wordCount } = journal;

  return (
    <section aria-label="Your journal" className="min-w-0">
      <EditorContent editor={editor} />
      {!editor && <div className="min-h-80" aria-label="Loading journal" />}
      <JournalStatus saveStatus={saveStatus} wordCount={wordCount} />
      <WritingShortcuts />
    </section>
  );
}
