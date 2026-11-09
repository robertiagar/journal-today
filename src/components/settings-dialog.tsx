import { useEffect, useRef } from "react";
import type { ThemePreference } from "../lib/theme";

const themeOptions: { value: ThemePreference; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow your device appearance" },
  { value: "light", label: "Light", description: "A bright, warm page" },
  { value: "dark", label: "Dark", description: "A quiet, low-light page" },
];

type SettingsDialogProps = {
  open: boolean;
  theme: ThemePreference;
  error?: string;
  onThemeChange: (theme: ThemePreference) => void;
  onClose: () => void;
};

export function SettingsDialog({
  open,
  theme,
  error,
  onThemeChange,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby="settings-title"
      aria-describedby="settings-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="settings-heading">
        <div>
          <h2 id="settings-title">Settings</h2>
          <p id="settings-description">Make this space feel right for you.</p>
        </div>
        <button
          type="button"
          className="settings-close"
          aria-label="Close settings"
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m3 3 10 10M13 3 3 13" />
          </svg>
        </button>
      </div>
      <fieldset className="settings-theme-options">
        <legend>Appearance</legend>
        {themeOptions.map((option) => (
          <label
            key={option.value}
            className="settings-theme-option"
            htmlFor={`theme-${option.value}`}
            aria-label="Appearance option"
          >
            <input
              type="radio"
              id={`theme-${option.value}`}
              name="theme"
              value={option.value}
              aria-label={option.label}
              checked={theme === option.value}
              onChange={() => onThemeChange(option.value)}
            />
            <span className="settings-theme-copy">
              <span>{option.label}</span>
              <span className="settings-theme-description">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {error && <p className="settings-error" role="alert">{error}</p>}
    </dialog>
  );
}
