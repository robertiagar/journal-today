import { Extension } from "@tiptap/core";
import { isHistoryTransaction } from "@tiptap/pm/history";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { preserveParagraphDates } from "./journal-boundary-transactions";
import { localDay, readJournalDays } from "./journal-date";
import { createJournalDateDecorations } from "./journal-date-markers";

export const restoreJournalDay = "restore-journal-day";
export const journalDayTick = "journal-day-tick";
export const journalDayKey = new PluginKey<string | null>("journal-day");

function updateJournalDates(
  changes: readonly Transaction[],
  oldState: EditorState,
  state: EditorState,
): Transaction | undefined {
  const isRestoring = changes.some((change) => change.getMeta(restoreJournalDay));
  const needsUpdate = changes.some((change) => change.docChanged || change.getMeta(journalDayTick));
  if (isRestoring || !needsUpdate) return;

  const transaction = state.tr;
  preserveParagraphDates(changes, oldState, transaction);

  const day = localDay(new Date());
  const dayChanged = journalDayKey.getState(state) !== day;
  const isUndoOrRedo = changes.some(isHistoryTransaction);
  const { $from } = transaction.selection;

  if (dayChanged && !isUndoOrRedo && $from.parent.isTextblock) {
    const days = readJournalDays($from.parent.attrs.journalDays);
    transaction
      .setNodeMarkup($from.before(), undefined, {
        ...$from.parent.attrs,
        journalDays: [...new Set([...days, day])],
      })
      .setMeta(journalDayKey, day);
  }

  return transaction.docChanged
    ? transaction.setMeta("addToHistory", false)
    : undefined;
}

export const JournalBoundaries = Extension.create({
  name: "journalBoundaries",

  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "codeBlock"],
      attributes: {
        journalDays: {
          default: [],
          keepOnSplit: false,
          parseHTML(element) {
            try {
              return readJournalDays(JSON.parse(element.getAttribute("data-journal-days") ?? "[]"));
            } catch {
              return [];
            }
          },
          renderHTML(attributes) {
            const days = readJournalDays(attributes.journalDays);
            return days.length ? { "data-journal-days": JSON.stringify(days) } : {};
          },
        },
      },
    }];
  },

  addProseMirrorPlugins() {
    return [new Plugin<string | null>({
      key: journalDayKey,
      state: {
        init: () => null,
        apply(transaction, day) {
          const restored = transaction.getMeta(restoreJournalDay);
          if (restored) return restored.day;
          return transaction.getMeta(journalDayKey) ?? day;
        },
      },
      appendTransaction: updateJournalDates,
      props: { decorations: createJournalDateDecorations },
    })];
  },
});
