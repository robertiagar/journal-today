import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { readJournalDays } from "../lib/journal-date";

type JournalDay = { day: string; position: number };
type DayNavigation = { days: JournalDay[]; activeDay: string | null; newDay: boolean };

function collectDays(editor: Editor): JournalDay[] {
  const days: JournalDay[] = [];
  const seen = new Set<string>();
  editor.state.doc.descendants((node, position) => {
    for (const day of readJournalDays(node.attrs.journalDays)) {
      if (seen.has(day)) continue;
      seen.add(day);
      days.push({ day, position });
    }
  });
  return days;
}

function sameDays(a: JournalDay[], b: JournalDay[]) {
  return a.length === b.length && a.every((value, index) =>
    value.day === b[index].day && value.position === b[index].position);
}

export function useJournalDayNavigation(editor: Editor | null) {
  const [navigation, setNavigation] = useState<DayNavigation>({ days: [], activeDay: null, newDay: false });
  const navigating = useRef(false);

  useEffect(() => {
    if (!editor) return;
    const workspace = editor.view.dom.closest<HTMLElement>(".desktop-workspace");
    if (!workspace) return;

    const syncDocument = () => {
      if (editor.isDestroyed) return;
      if (editor.isFocused) navigating.current = false;
      const days = collectDays(editor);
      const position = editor.state.selection.from;
      const preceding = days.filter((entry) => entry.position < position);
      const candidate = preceding.at(-1) ?? days[0];
      setNavigation((previous) => {
        const sharedDay = days.find((entry) => entry.day === previous.activeDay && entry.position === candidate?.position);
        const selectedDay = sharedDay && previous.days.some((entry) => entry.day === candidate?.day)
          ? sharedDay.day : candidate?.day ?? null;
        const activeDay = editor.isFocused ? selectedDay
          : days.some((entry) => entry.day === previous.activeDay) ? previous.activeDay : days[0]?.day ?? null;
        if (activeDay === previous.activeDay && sameDays(days, previous.days)) return previous;
        const newDay = activeDay === previous.activeDay ? previous.newDay
          : previous.days.length > 0 && activeDay !== null && !previous.days.some((entry) => entry.day === activeDay);
        return { days, activeDay, newDay };
      });
    };

    const syncScroll = () => {
      if (editor.isDestroyed || navigating.current || workspace.scrollHeight <= workspace.clientHeight + 2) return;
      const days = collectDays(editor);
      const headerHeight = workspace.querySelector<HTMLElement>(".journal-header")?.getBoundingClientRect().height ?? 0;
      const threshold = workspace.getBoundingClientRect().top + headerHeight + 40;
      let active: JournalDay | undefined = days[0];
      for (const entry of days) {
        const element = editor.view.nodeDOM(entry.position);
        if (element instanceof HTMLElement && element.getBoundingClientRect().top <= threshold) active = entry;
      }
      // The final short section may never reach the top of the viewport.
      if (workspace.scrollTop > 0 && workspace.scrollTop + workspace.clientHeight >= workspace.scrollHeight - 2) {
        active = days.at(-1);
      }
      if (!active) return;
      const activeDay = active.day;
      setNavigation((previous) => previous.activeDay === activeDay && sameDays(days, previous.days)
        ? previous : { days, activeDay, newDay: false });
    };

    const resumeReading = (event: Event) => {
      if (event.type === "pointerdown" && event.target instanceof Element && event.target.closest(".journal-day-controls")) return;
      navigating.current = false;
    };

    editor.on("create", syncDocument);
    editor.on("transaction", syncDocument);
    editor.on("focus", syncDocument);
    workspace.addEventListener("scroll", syncScroll, { passive: true });
    for (const event of ["wheel", "touchmove", "pointerdown", "keydown"]) workspace.addEventListener(event, resumeReading, { passive: true });
    const resize = new ResizeObserver(syncScroll);
    resize.observe(workspace);
    const frame = requestAnimationFrame(syncDocument);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      editor.off("create", syncDocument);
      editor.off("transaction", syncDocument);
      editor.off("focus", syncDocument);
      workspace.removeEventListener("scroll", syncScroll);
      for (const event of ["wheel", "touchmove", "pointerdown", "keydown"]) workspace.removeEventListener(event, resumeReading);
    };
  }, [editor]);

  const goToDay = useCallback((day: string) => {
    if (!editor || editor.isDestroyed) return;
    const entry = collectDays(editor).find((entry) => entry.day === day);
    if (!entry) return;
    editor.commands.setTextSelection(entry.position + 1);
    // Preserve an explicitly selected day even when its short section cannot
    // reach the top. Scrolling or clicking back into the page resumes tracking.
    navigating.current = true;
    const element = editor.view.nodeDOM(entry.position);
    const workspace = editor.view.dom.closest<HTMLElement>(".desktop-workspace");
    if (element instanceof HTMLElement && workspace && workspace.scrollHeight > workspace.clientHeight + 2) {
      const headerHeight = workspace.querySelector<HTMLElement>(".journal-header")?.getBoundingClientRect().height ?? 0;
      const top = element.getBoundingClientRect().top - workspace.getBoundingClientRect().top
        + workspace.scrollTop - headerHeight - 24;
      workspace.scrollTo({ top, behavior: "instant" });
    }
    setNavigation((previous) => ({ ...previous, activeDay: day, newDay: false }));
  }, [editor]);

  return { ...navigation, goToDay };
}
