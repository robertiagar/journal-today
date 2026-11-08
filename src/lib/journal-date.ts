// Journal days follow the writer's local calendar, including daylight savings.
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateFromDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

export function nextMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

// Tomorrow gently appears during the last ten minutes of the day.
export function tomorrowProgress(date: Date): number {
  return Math.max(0, Math.min(1, 1 - (nextMidnight(date).getTime() - date.getTime()) / 600_000));
}

export function readJournalDays(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((day): day is string =>
    typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
  );
}
