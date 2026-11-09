import { useEffect, useState, type ReactNode } from "react";
import { applyThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "../lib/theme";
import { SettingsDialog } from "./settings-dialog";

export function DesktopWindow({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: ThemePreference;
}) {
  const [maximized, setMaximized] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [themeError, setThemeError] = useState<string>();
  const desktop = window.desktop;
  const macOS = desktop?.platform === "darwin"
    || (!desktop && /Mac/.test(navigator.platform));

  useEffect(() => {
    if (!desktop) return;
    let active = true;
    void desktop.isMaximized().then((value) => {
      if (active) setMaximized(value);
    });
    const unsubscribe = desktop.onMaximizedChange(setMaximized);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [desktop]);

  useEffect(() => {
    if (!desktop) return;
    desktop.setTheme(theme);
  }, [desktop, theme]);

  useEffect(() => {
    if (!desktop) return;
    return desktop.onOpenSettings(() => setSettingsOpen(true));
  }, [desktop]);

  useEffect(() => {
    function openSettingsOnShortcut(event: KeyboardEvent) {
      const modifierPressed = macOS ? event.metaKey : event.ctrlKey;
      if (modifierPressed && (event.key === "," || event.code === "Comma")) {
        event.preventDefault();
        setSettingsOpen(true);
      }
    }

    window.addEventListener("keydown", openSettingsOnShortcut);
    return () => window.removeEventListener("keydown", openSettingsOnShortcut);
  }, [desktop, macOS]);

  function changeTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    applyThemePreference(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      setThemeError(undefined);
    } catch (error) {
      console.error("Could not save the theme preference:", error);
      setThemeError("Your appearance changed, but the preference could not be saved.");
    }
  }

  return (
    <div
      className="desktop-window"
      data-maximized={maximized}
      data-platform={desktop?.platform}
    >
      <header className="desktop-titlebar">
        <span className="desktop-caption">a little space for yourself</span>
        <button
          type="button"
          className="settings-trigger"
          aria-label="Open settings"
          title={macOS ? "Settings (Command+,)" : "Settings (Ctrl+,)"}
          onClick={() => setSettingsOpen(true)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6.6 1.5h2.8l.4 1.7c.4.1.8.3 1.1.6l1.7-.5 1.4 2.4-1.3 1.2v1.3l1.3 1.2-1.4 2.4-1.7-.5c-.3.3-.7.5-1.1.6l-.4 1.7H6.6l-.4-1.7c-.4-.1-.8-.3-1.1-.6l-1.7.5L2 9.4l1.3-1.2V6.9L2 5.7l1.4-2.4 1.7.5c.3-.3.7-.5 1.1-.6z" />
            <circle cx="8" cy="7.5" r="2" />
          </svg>
        </button>
        {desktop && (
          <div
            className="window-controls"
            role="group"
            aria-label="Window controls"
          >
            <button
              type="button"
              aria-label="Minimize window"
              onClick={desktop.minimize}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M1 6.5h10" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={maximized ? "Restore window" : "Maximize window"}
              onClick={desktop.toggleMaximize}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                {maximized ? (
                  <path d="M3.5 3.5v-2h7v7h-2m-7-5h7v7h-7z" />
                ) : (
                  <rect x="1.5" y="1.5" width="9" height="9" rx=".5" />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="window-close"
              aria-label="Close window"
              onClick={desktop.close}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="m2 2 8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        )}
      </header>
      <div className="desktop-workspace">{children}</div>
      <SettingsDialog
        open={settingsOpen}
        theme={theme}
        error={themeError}
        onThemeChange={changeTheme}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
