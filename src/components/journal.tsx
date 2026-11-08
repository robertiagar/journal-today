import { DelayedDate } from "./delayed-date";
import { JournalEditor } from "./journal-editor";
import { JournalFooter, JournalHeader } from "./journal-layout";
import { useJournalEditor } from "../hooks/use-journal-editor";
import { useJournalDayNavigation } from "../hooks/use-journal-day-navigation";
import { JournalDateNavigation } from "./journal-date-navigation";

export function Journal() {
  const journal = useJournalEditor();
  const navigation = useJournalDayNavigation(journal.editor);
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 sm:px-12 lg:px-16">
      <JournalHeader />
      <main className="flex-1 py-12 sm:py-20">
        <div className="grid gap-9 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-10">
          <aside className="journal-calendar">
            <div className="journal-calendar-sticky" data-day={navigation.activeDay} aria-label="Journal date navigation">
              <DelayedDate activeDay={navigation.activeDay} newDay={navigation.newDay} />
              <JournalDateNavigation navigation={navigation} />
            </div>
          </aside>
          <JournalEditor journal={journal} />
        </div>
      </main>
      <JournalFooter />
    </div>
  );
}
