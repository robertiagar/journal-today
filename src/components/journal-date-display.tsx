import { localDay } from "../lib/journal-date";

export function JournalDateDisplay({ date }: { date: Date }) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  return (
    <>
      <p className="mb-2 text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
        {date.toLocaleDateString(undefined, { weekday: "long" })}
      </p>
      <time
        dateTime={localDay(date)}
        className="grid w-fit grid-cols-2 items-baseline gap-x-2 gap-y-2 font-sans"
      >
        <span className="text-6xl leading-none tracking-[-0.06em] tabular-nums sm:text-7xl">
          {day}
        </span>
        <span className="text-6xl leading-none tracking-[-0.06em] text-muted tabular-nums sm:text-7xl">
          {month}
        </span>
        <span className="col-start-2 text-base leading-6 text-muted">
          {date.getFullYear()}
        </span>
      </time>
    </>
  );
}
