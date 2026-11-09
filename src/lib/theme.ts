export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "journal-today:theme:v1";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(saved) ? saved : "system";
  } catch (error) {
    console.error("Could not read the theme preference:", error);
    return "system";
  }
}

export function applyThemePreference(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
}
