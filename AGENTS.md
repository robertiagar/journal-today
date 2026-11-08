# Working on Journal / Today

## Runtime and commands

This repository is an Electron desktop application with a Vite-built React renderer. Next.js was removed during the desktop conversion. The remaining `src/app/` directory contains shared CSS, not routes or Server Components.

Use Node.js 22.12 or newer and the pnpm version declared in `package.json`. Read `README.md` for startup, browser debugging, packaging, profile locations, and manual journal transfer.

- `pnpm dev` starts Vite and Electron together. Renderer changes update automatically; restart for main/preload changes.
- `pnpm dev:renderer` serves the renderer at `http://127.0.0.1:3000` for browser debugging.
- `pnpm build` produces `dist/`; `pnpm start` launches Electron against that existing bundle.
- Both source launch modes open detached DevTools from the main process. Packaged builds do not open it automatically.
- `pnpm package` builds an unpacked application; `pnpm dist` builds the current platform's installer. Outputs belong in ignored `release/`.

## Process boundaries

- `electron/main.cjs` owns the borderless window, menus, single-instance behavior, persisted window bounds, custom protocol, and IPC handlers.
- `electron/preload.cjs` exposes a narrow window-control API through `contextBridge`. Keep `src/desktop.d.ts` aligned with the actual bridge. Do not call bridge methods that only exist in TypeScript declarations.
- Keep renderer Node integration disabled, context isolation enabled, and sandboxing enabled. Validate the main frame and origin for privileged IPC.
- Production uses the stable `journal://app/` origin and local bundled assets. Keep protocol file access confined to `dist/` and maintain navigation restrictions.
- Renderer dependencies are bundled by Vite and live in `devDependencies`; the packaged main process uses Electron, Node built-ins, and the `electron-updater` production dependency. Updates stay in the main process, require download/restart consent, and preserve synchronous journal flushes on close.

## Journal data

- Preserve the `journal-today:v1` storage key and saved JSON shape: `{ content: <Tiptap document>, day: <string or null> }`.
- Dates belong to document-node `journalDays` attributes, not line numbers or visual offsets. Preserve them through paragraph splits, edits above boundaries, and undo/redo.
- `src/lib/journal-storage.ts` tracks the value restored by each editor. Autosave and unload must not overwrite an externally replaced value or a document that failed to restore.
- Saving remains debounced by 400 ms, with synchronous lifecycle flushes when leaving or closing the renderer.
- Electron development, Electron production, and browser preview storage are distinct as documented in the README. Do not assume browser-local entries migrate automatically.
- Use disposable profiles for automated desktop checks. `JOURNAL_USER_DATA_DIR` works from source; `--user-data-dir` also works with packaged builds. Keep real journal content out of fixtures, logs, screenshots, and commits.

## Dates, layout, and motion

- `Journal` owns the editor and shares its state with the date column and writing surface. Avoid creating a second editor for navigation.
- `use-journal-day-navigation.ts` chooses days from scroll position or the active paragraph. Day arrows also support short documents and days sharing one paragraph, without stamping new dates merely to browse.
- The scroll container is `.desktop-workspace`, not `window`. Use its geometry for sticky positioning and scrolling.
- The header uses a Framer Motion spring over the first 96 px of scrolling. Its padding reaches 8 px on each vertical side; its overall height remains content-based.
- The header's border-box `ResizeObserver` updates `--journal-header-height`. Keep the sticky calendar and day-navigation offsets below the actual header, including during animation.
- Preserve Framer Motion date transitions, the eight-second midnight crossfade, and reduced-motion behavior. Reserve date-display space before the clock loads so narrow layouts do not shift the editor during a click.

## Verification

Run checks appropriate to the change: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test`, `pnpm test:electron`, and a production build. Packaging changes should also be checked with `pnpm package` or `pnpm dist` on the target platform. Tests must disable network updates with `JOURNAL_DISABLE_UPDATES=1`. See `docs/SIGNING.md` before changing signing; never put credentials in fixtures, logs, artifacts, or commits.

Renderer tests cover desktop and narrow layouts with a Europe/Bucharest timezone. Windows uses installed Edge by default. Electron tests need a graphical session and select the journal window separately from DevTools. `ELECTRON_EXECUTABLE_PATH` runs the same desktop checks against an existing packaged executable.

Keep build output, installers, browser profiles, traces, and screenshots out of source control. `dist/`, `release/`, and `test-results/` are ignored.
