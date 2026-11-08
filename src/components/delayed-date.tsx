"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useJournalClock } from "../hooks/use-journal-clock";
import { localDay, nextMidnight, tomorrowProgress } from "../lib/journal-date";
import { JournalDateDisplay } from "./journal-date-display";

export function DelayedDate() {
  const clock = useJournalClock();
  const reduceMotion = useReducedMotion();
  const currentDate = clock?.date;
  const day = currentDate ? localDay(currentDate) : null;
  const isInitialDay = clock?.initialDay === day;
  const progress = currentDate ? tomorrowProgress(currentDate) : 0;
  const tomorrow = currentDate ? nextMidnight(currentDate) : null;

  return (
    <div className="relative min-h-25" aria-label="Current journal date">
      <div className="grid" aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false}>
          {currentDate && (
            <motion.div
              key={day}
              className="col-start-1 row-start-1"
              initial={isInitialDay ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{ duration: reduceMotion ? 0 : 8, ease: "easeInOut" }}
            >
              <JournalDateDisplay date={currentDate} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {progress > 0 && tomorrow && (
          <motion.p
            key={`tomorrow-${localDay(tomorrow)}`}
            className="mt-4 text-xs text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: progress * 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 3 }}
          >
            <time dateTime={localDay(tomorrow)}>
              {tomorrow.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </time>
            <span className="ml-2">is on its way</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
