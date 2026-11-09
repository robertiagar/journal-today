import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "./app/globals.css";
import { DesktopWindow } from "./components/desktop-window";
import { Journal } from "./components/journal";
import { applyThemePreference, readThemePreference } from "./lib/theme";

const theme = readThemePreference();
applyThemePreference(theme);
createRoot(document.getElementById("root")!).render(
  <DesktopWindow initialTheme={theme}>
    <Journal />
  </DesktopWindow>,
);
