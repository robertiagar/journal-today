import { useEffect, useState } from "react";
import { localDay } from "../lib/journal-date";

type JournalClock = { date: Date; initialDay: string };

export function useJournalClock() {
  // Browser time avoids using the server's timezone during hydration.
  const [clock, setClock] = useState<JournalClock | null>(null);

  useEffect(() => {
    const update = () => {
      const date = new Date();
      setClock((previous) => ({
        date,
        initialDay: previous?.initialDay ?? localDay(date),
      }));
    };

    const delay = window.setTimeout(update, 500);
    const timer = window.setInterval(update, 1_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);

    return () => {
      window.clearTimeout(delay);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  return clock;
}
