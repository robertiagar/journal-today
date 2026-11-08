import type { JournalSaveStatus } from "../lib/journal-storage";

const saveMessages: Record<JournalSaveStatus, string> = {
  loading: "Opening your pages…",
  saving: "Saving…",
  saved: "Saved on this device",
  unavailable: "Couldn’t save. Keep this window open.",
  changed: "Saved journal changed. Reload to load it.",
};

type JournalStatusProps = {
  saveStatus: JournalSaveStatus;
  wordCount: number;
};

export function JournalStatus({ saveStatus, wordCount }: JournalStatusProps) {
  const indicatorColor = saveStatus === "unavailable" || saveStatus === "changed" ? "bg-accent" : "bg-sage";

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-[11px] text-muted">
      <span>
        {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
      </span>
      <span role="status" className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${indicatorColor}`}
          aria-hidden="true"
        />
        {saveMessages[saveStatus]}
      </span>
    </div>
  );
}
