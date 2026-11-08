# Journal / Today

A quiet, offline Electron journal with a borderless window, a draggable title bar, custom window controls, and a softly rounded writing surface. Markdown formatting, local saving, and midnight date markers carry over from the original application.

## Run and develop

Use Node.js 22.12 or newer and pnpm 10.30.0.

```sh
pnpm install
pnpm dev
```

`pnpm dev` opens the desktop window and a separate DevTools window, and starts Vite for hot updates. Closing the app stops its development server. Fonts ship with the application; production does not require a web server or an internet connection. The first Electron launch may download its runtime.

To run the production renderer locally:

```sh
pnpm build
pnpm start
```

`pnpm start` also opens DevTools in a separate window. It loads the existing `dist/` bundle, so run `pnpm build` again after changing the source. `pnpm dev` updates the renderer automatically; restart it after changing `electron/` or the development launcher.

### Browser debugging

```sh
pnpm dev:renderer
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and use the browser's Developer Tools. If `pnpm dev` is already running, open that same URL without starting another server. Vite uses a fixed port and exits if another server already occupies it.

The browser preview supports the editor, Markdown, dates, sticky header, animations, and local saving. Native window controls and Electron's main/preload processes require the desktop app. Both `pnpm dev` and `pnpm start` open detached DevTools automatically; packaged applications do not. Automatic opening belongs to the main process, and the preload exposes only the supported window controls.

Drag the top strip to move the window; double-click it to maximize or restore it. Minimize, maximize/restore, and close buttons are built into the strip. The app remembers its size, position, and maximized state. Opening it again focuses the existing window. On Windows and Linux, press Alt to access the application menus. Standard editing, zoom, and fullscreen shortcuts are available through those menus. On macOS, closing the window keeps the app running; use Quit to exit.

## Package

```sh
pnpm package
```

Builds an unpacked desktop application in `release/`. On Windows, launch `release/win-unpacked/Journal Today.exe`. Keep the entire unpacked directory together.

```sh
pnpm dist
```

Builds an installer for the current platform: NSIS on Windows, DMG on macOS, or AppImage on Linux. Build each platform on that platform. Signing credentials and custom application icons are not configured; local builds use Electron's default icon and are unsigned.

## Writing

The journal starts with an editable day heading. `LET IT OUT` is its placeholder; typing replaces it with your own title. Press Enter to write below it.

| Input | Result |
| --- | --- |
| `# `, `## `, `### ` | Headings |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `- ` or `1. ` | Lists |
| `> ` | Blockquote |
| Backticks around text | Inline code |
| `[label](https://example.com)` | Link |

Plain Markdown pasted into the journal is parsed too. Pasting inside a code block keeps text literal; rich HTML keeps its formatting. The interface follows the system's light/dark appearance and reduced-motion preferences.

Dates follow the device's local timezone. Tomorrow gradually appears during the last ten minutes of the day. At midnight, the date crossfades over eight seconds. If the editor is focused, the new day attaches to the active paragraph; if you return later, the next edit activates it. Date boundaries stay attached when inserting paragraphs or undoing and redoing changes.

The date column stays pinned while you scroll on desktop, and its large date follows the day you are reading or editing. It starts at the first dated section when a saved journal opens. For short entries, click a paragraph or use the previous/next arrows below the date to move between days without needing to scroll or adding filler text. Arrows keep the chosen day selected until you resume scrolling or interact with the writing surface; browsing with them does not add today's date to older entries. Days sharing a paragraph remain individually navigable. On narrow screens, the date column appears above the editor.

Paragraph date markers fade in over six seconds. The side date uses a short Framer Motion transition when changing existing days and an eight-second crossfade for midnight. Tomorrow's hint appears only when the displayed date is today. Reduced-motion settings disable these transitions.

The journal header stays visible at the top of the writing surface. A Framer Motion spring reduces its vertical padding over the first 96 pixels of scrolling, from 40 px on desktop (32 px on narrow screens) to 8 px above and below. Scrolling back to the top expands it again. Its height follows its content without a fixed maximum. The date column remains 24 px below the header's measured height, including during the transition. Reduced-motion preferences remove the spring animation.

## Saving and moving existing entries

Entries save after a 400 ms pause and immediately when the window closes or the renderer is hidden or unloaded. The status beside the word count reports saving failures.

The application preserves the original `journal-today:v1` localStorage key and JSON format: a Tiptap document, the last active day, and `journalDays` attributes on dated nodes. Production uses the stable `journal://app/` origin in an Electron profile at:

- Windows: `%APPDATA%/Journal Today`
- macOS: `~/Library/Application Support/Journal Today`
- Linux: `$XDG_CONFIG_HOME/Journal Today`, usually `~/.config/Journal Today`

Back up that profile with the application closed. Removing it deletes the saved journal. There is no account or synchronization. Window size and position are stored separately in `window-state.json` inside the same profile.

Storage belongs to both a profile and an origin:

| Launch mode | Origin | Storage profile |
| --- | --- | --- |
| `pnpm dev` | `http://127.0.0.1:3000` | Electron profile |
| `pnpm start` or packaged app | `journal://app/` | Same Electron profile, separate origin from development |
| Browser preview | `http://127.0.0.1:3000` | That browser's profile, separate from Electron |

Entries do not move automatically between these stores. Use the transfer steps below when moving between development, the browser preview, and production.

The Electron application cannot read another browser's site storage automatically. To move a journal from the former browser app, retain its browser profile and transfer the saved JSON:

1. Open the old journal in its original browser and origin. In Developer Tools, under Application/Storage → Local Storage, copy the value of `journal-today:v1` to a backup text file.
2. Run `pnpm build`, then `pnpm start`. Developer Tools open automatically in a separate window.
3. Under Application → Local Storage → `journal://app`, set `journal-today:v1` to the backed-up value. This replaces the desktop journal, so copy any existing desktop value first.
4. Reload the journal window with View → Reload. The original document and dated paragraphs will load. Close Developer Tools afterward.

Paste the raw saved JSON value, including its `content` document and `day` fields. This is a manual storage transfer; there is no import-file button.

Storage changes made outside the editor, including imports, survive autosave and reload. If editing conflicts with an external change, the save status asks you to reload. A document that fails to restore is also protected from being overwritten by the blank editor.

If an import still looks blank, confirm that you edited `journal-today:v1` under the journal window's correct origin, rebuild and restart the desktop app, then paste the original backup again. Earlier builds could overwrite the imported value on reload. Keep the original browser entry or backup file until the transferred document loads successfully.

The installed app uses the same production profile as `pnpm start`, so the imported journal will be available there too. Developer Tools are offered only when running from source.

## Code organization

```text
electron/       Main process, app protocol, menus, window state, and isolated preload
scripts/        Desktop development launcher
src/main.tsx    React entry point
src/components/ Journal, desktop chrome, sticky header, date navigation, and editor
src/hooks/      Editor state, day navigation, save lifecycle, and clock
src/lib/        Storage format and ProseMirror date boundaries
src/app/        Shared Tailwind styles
tests/          Renderer regression scenarios and Electron integration tests
```

The runtime is Electron with a Vite-built React renderer; there is no Next.js runtime or local production server. Vite bundles React and the local Geist font into `dist/`. Electron serves bundled files through a standard secure custom protocol. The renderer has no Node.js access; a sandboxed, context-isolated preload exposes only window controls. IPC validates the main frame and application origin. Navigation stays in the journal, while allowed external navigation and popup URLs open in the system browser. The editor keeps ordinary link clicks available for editing. These choices follow the [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security) and [custom window interactions guide](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions).

All renderer dependencies are development dependencies because their compiled output ships inside the desktop bundle.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:electron
pnpm package
```

Renderer tests cover Markdown, persistence, manual imports, preservation after failed restores, midnight transitions, date boundaries, undo/redo, short-entry day navigation, and the shrinking sticky header. They run desktop and narrow layouts and use Europe/Bucharest for repeatable clock scenarios. The side-column scrolling check runs on desktop; the shared midnight animation check runs once. On Windows tests use Microsoft Edge; elsewhere install Chromium with `pnpm exec playwright install chromium`. `PLAYWRIGHT_CHANNEL` can select another installed browser. The test runner starts or reuses the renderer server at `http://127.0.0.1:3000`.

Electron tests launch real application windows with disposable profiles under `test-results/electron/`. They select the journal window explicitly because DevTools may also open. They verify the production protocol, isolated preload, draggable region, window controls, blocked popup scripts, manual imports with preserved dates, and saving when closed before the debounce completes. Renderer test artifacts are kept separately in `test-results/renderer/`. A graphical desktop session is required (use Xvfb on Linux CI).

To run those same checks against a packaged executable, set `ELECTRON_EXECUTABLE_PATH` to its absolute path and run `pnpm exec playwright test --config playwright.electron.config.ts`.

For the Windows unpacked build, in PowerShell:

```powershell
$env:ELECTRON_EXECUTABLE_PATH = (Resolve-Path 'release/win-unpacked/Journal Today.exe').Path
pnpm exec playwright test --config playwright.electron.config.ts
Remove-Item Env:ELECTRON_EXECUTABLE_PATH
```

`JOURNAL_USER_DATA_DIR` selects an isolated profile when running from source. The standard `--user-data-dir=/absolute/path` Electron switch is also supported, including in packaged builds.
