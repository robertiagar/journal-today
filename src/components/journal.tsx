import { DelayedDate } from "./delayed-date";
import { JournalEditor } from "./journal-editor";
import { JournalFooter, JournalHeader } from "./journal-layout";

export function Journal() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 sm:px-12 lg:px-16">
      <JournalHeader />
      <main className="flex-1 py-12 sm:py-20">
        <div className="grid gap-9 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10">
          <aside>
            <DelayedDate />
          </aside>
          <JournalEditor />
        </div>
      </main>
      <JournalFooter />
    </div>
  );
}
