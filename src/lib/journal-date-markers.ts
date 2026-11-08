import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { animate } from "framer-motion";
import { dateFromDay, readJournalDays } from "./journal-date";

function createDateMarkerElement(days: string[]): HTMLSpanElement {
  const marker = document.createElement("span");
  marker.className = "journal-date-marker";
  marker.contentEditable = "false";
  marker.setAttribute("aria-label", "Journal date boundary");

  for (const day of days) {
    const time = document.createElement("time");
    time.dateTime = day;
    time.textContent = dateFromDay(day).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
    marker.appendChild(time);
  }

  return marker;
}

function createDateMarker(position: number, days: string[]): Decoration {
  let stopAnimation: (() => void) | undefined;

  return Decoration.widget(position + 1, () => {
    const marker = createDateMarkerElement(days);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      const animation = animate(marker, { opacity: [0, 1] }, {
        duration: 6,
        ease: "easeInOut",
      });
      stopAnimation = () => animation.stop();
    }
    return marker;
  }, {
    key: `journal-date-${days.join("-")}`,
    side: -1,
    ignoreSelection: true,
    destroy: () => stopAnimation?.(),
  });
}

export function createJournalDateDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];

  state.doc.descendants((node, position) => {
    const days = readJournalDays(node.attrs.journalDays);
    if (!days.length) return;

    decorations.push(
      Decoration.node(position, position + node.nodeSize, {
        class: "journal-dated-paragraph",
      }),
      createDateMarker(position, days),
    );
  });

  return DecorationSet.create(state.doc, decorations);
}
