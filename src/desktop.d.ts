export {};

declare global {
  interface Window {
    desktop?: {
      platform: string;
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
      setTheme: (theme: "system" | "light" | "dark") => void;
      isMaximized: () => Promise<boolean>;
      onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
    };
  }
}
