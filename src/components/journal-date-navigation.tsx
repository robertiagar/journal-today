import type { useJournalDayNavigation } from "../hooks/use-journal-day-navigation";

export function JournalDateNavigation({ navigation }: { navigation: ReturnType<typeof useJournalDayNavigation> }) {
  const { days, activeDay, goToDay } = navigation;
  if (days.length < 2) return null;
  const index = days.findIndex((entry) => entry.day === activeDay);

  return (
    <nav className="journal-day-controls" aria-label="Journal days">
      <button type="button" aria-label="Previous journal day" title="Previous journal day" disabled={index <= 0} onClick={() => goToDay(days[index - 1].day)}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 4-4 4 4 4" /></svg>
      </button>
      <span className="tabular-nums" aria-label={`Day ${index + 1} of ${days.length}`}>{index + 1}<span aria-hidden="true"> / </span>{days.length}</span>
      <button type="button" aria-label="Next journal day" title="Next journal day" disabled={index < 0 || index === days.length - 1} onClick={() => goToDay(days[index + 1].day)}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
      </button>
    </nav>
  );
}
