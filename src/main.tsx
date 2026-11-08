import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "./app/globals.css";
import { DesktopWindow } from "./components/desktop-window";
import { Journal } from "./components/journal";

createRoot(document.getElementById("root")!).render(
  <DesktopWindow>
    <Journal />
  </DesktopWindow>,
);
