import { useEffect, useState, type ReactNode } from "react";

export function DesktopWindow({ children }: { children: ReactNode }) {
  const [maximized, setMaximized] = useState(false);
  const desktop = window.desktop;

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

  return (
    <div
      className="desktop-window"
      data-maximized={maximized}
      data-platform={desktop?.platform}
    >
      <header className="desktop-titlebar">
        <span className="desktop-caption">a little space for yourself</span>
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
    </div>
  );
}
