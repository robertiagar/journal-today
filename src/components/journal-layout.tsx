import Link from "next/link";

export function JournalHeader() {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-line py-7 sm:py-9">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 text-sm font-medium tracking-tight"
        aria-label="Journal today home"
      >
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        journal<span className="-ml-2 text-muted">/ today</span>
      </Link>
      <div className="flex flex-col items-end">
        <h1 className="text-right text-sm font-bold tracking-tight">
          make room for today
        </h1>
        <h2 className="text-right text-sm font-medium tracking-tight text-muted">
          let it all out, one day at a time
        </h2>
      </div>
    </header>
  );
}

export function JournalFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-line py-6 text-[10px] tracking-wide text-muted">
      <span>One day at a time.</span>
      <span>No perfect words needed.</span>
    </footer>
  );
}
