# Journal / Today

A browser-local journal for writing a little each day. Markdown formats as you type, and date markers follow your writing across midnight.

## Development

Use Node.js 22 or newer and pnpm 10.30.0 (the version declared in `package.json`).

```sh
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Changes under `src/` update the development preview automatically.

For a production build:

```sh
pnpm build
pnpm start
```

## Writing

The journal starts with an editable day heading. `LET IT OUT` is its placeholder; typing replaces it with your own title. The heading keeps its horizontal line and uppercase styling. Press Enter to write a paragraph below it.

Markdown shortcuts format text directly in the editor:

| Input | Result |
| --- | --- |
| `# `, `## `, `### ` | Heading levels |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `- ` or `1. ` | Lists |
| `> ` | Blockquote |
| Backticks around text | Inline code |
| `[label](https://example.com)` | Link |

Plain Markdown pasted into the journal is parsed too. Pasting inside a code block keeps the text literal; rich HTML keeps its formatting.

The interface uses Geist sans-serif, Tailwind Typography, responsive layouts, and the browser's light or dark appearance preference.

## Dates and midnight

- Dates use the writer's browser timezone. The day and month are two-digit numbers, with the year beneath the month.
- During the final ten minutes before local midnight, tomorrow gradually appears.
- At midnight, the date display crossfades over eight seconds. Reduced-motion preferences disable these animations.
- While the editor is focused, the new day attaches to the active paragraph. If you return later, the next edit activates the date.
- Boundaries are stored on document nodes, rather than numeric line offsets. Inserting text above a boundary, splitting paragraphs, and undoing or redoing edits keep the date with its paragraph.

## Local saving

Entries save after a 400 ms pause in editing. Pending changes also save when the page is hidden, left, or unmounted. The status beside the word count reports saving failures.

The journal lives in this browser's `localStorage`, under `journal-today:v1`. It contains a Tiptap JSON document and the last active day; each dated paragraph stores its own `journalDays` attribute. This shape is preserved when refactoring so existing entries continue to load.

Storage is specific to the browser and site origin. Clearing site data removes the journal; there is currently no account or cross-device synchronization.

## Code organization

```text
src/
  app/          Root route, layout, and shared Tailwind styles
  components/   Journal layout, editor view, date display, status, and shortcuts
  hooks/        Editor state, browser lifecycle events, and the local clock
  lib/          Storage, calendar helpers, and ProseMirror date boundaries
tests/          Playwright browser scenarios
```

Start with `src/components/journal.tsx`: it composes the header, date, editor, and footer. It remains a Server Component; interactive behavior sits in its client children.

- `journal-editor.tsx` renders the writing surface, status, and shortcut help.
- `use-journal-editor.ts` configures Tiptap, initializes saved content through `onCreate`, counts words, and schedules saves.
- `use-journal-lifecycle.ts` owns midnight checks, visibility listeners, and cleanup saves. Effects only manage external subscriptions; editor callbacks update React state.
- `journal-storage.ts` owns the saved document format and storage access.
- `delayed-date.tsx` coordinates date animations. `use-journal-clock.ts` manages timers, and `journal-date-display.tsx` renders the numeric date.
- `journal-boundaries.ts` defines document attributes and activates new dates. `journal-boundary-transactions.ts` keeps dates attached during edits; `journal-date-markers.ts` renders their animated labels.

## Checks

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Playwright covers Markdown typing and paste, persistence after reload, date transitions, edits above midnight boundaries, and undo/redo in desktop and mobile layouts. Its browser timezone is fixed to Europe/Bucharest for repeatable midnight scenarios.

On Windows, tests use installed Microsoft Edge. On other platforms, install Playwright Chromium before the first run:

```sh
pnpm exec playwright install chromium
```

`PLAYWRIGHT_CHANNEL` can select another installed browser channel, such as `chrome`. The test runner reuses a development server on port 3000, or starts one if none is running.

## Stack

Next.js 16, React 19, TypeScript, Tiptap 3, Tailwind CSS 4 with Typography, Framer Motion, and Playwright. No environment variables or backend service are required for local use.

When changing Next.js code, follow `AGENTS.md` and consult the documentation shipped in `node_modules/next/dist/docs/` for this installed version.
