import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { readJournalDays } from "./journal-date";

function removeDuplicateDates(
  transaction: Transaction,
  anchorPosition: number,
  days: string[],
) {
  const duplicatePositions: number[] = [];

  transaction.doc.descendants((node, position) => {
    const duplicates = readJournalDays(node.attrs.journalDays)
      .some((day) => days.includes(day));
    if (position !== anchorPosition && duplicates) duplicatePositions.push(position);
  });

  for (const position of duplicatePositions) {
    const node = transaction.doc.nodeAt(position)!;
    transaction.setNodeMarkup(position, undefined, {
      ...node.attrs,
      journalDays: readJournalDays(node.attrs.journalDays)
        .filter((day) => !days.includes(day)),
    });
  }
}

export function preserveParagraphDates(
  changes: readonly Transaction[],
  oldState: EditorState,
  transaction: Transaction,
) {
  const mapping = new Mapping();
  for (const change of changes) mapping.appendMapping(change.mapping);

  // Enter at the start of a paragraph inserts a line above its text. Follow the
  // original text so its date is not left on the newly inserted empty line.
  oldState.doc.descendants((node, position) => {
    const days = readJournalDays(node.attrs.journalDays);
    if (!node.isTextblock || !node.content.size || !days.length) return;

    const mapped = mapping.mapResult(position + 1, 1);
    if (mapped.deleted) return;

    const anchor = transaction.doc.resolve(mapped.pos);
    if (!anchor.parent.isTextblock) return;

    const anchorPosition = anchor.before();
    const anchorDays = readJournalDays(anchor.parent.attrs.journalDays);
    removeDuplicateDates(transaction, anchorPosition, days);

    if (!days.every((day) => anchorDays.includes(day))) {
      transaction.setNodeMarkup(anchorPosition, undefined, {
        ...anchor.parent.attrs,
        journalDays: [...new Set([...anchorDays, ...days])],
      });
    }
  });
}
