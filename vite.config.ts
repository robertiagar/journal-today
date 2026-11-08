import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import packageMetadata from "./package.json" with { type: "json" };

export default defineConfig(({ command }) => ({
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageMetadata.version) },
  plugins: [react(), tailwindcss(), {
    name: "desktop-content-security-policy",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html
        .replace("__DEV_SCRIPT_POLICY__", command === "serve" ? "'unsafe-inline'" : "")
        .replace("__DEV_CONNECT_POLICY__", command === "serve" ? "ws://127.0.0.1:3000" : ""),
    },
  }],
  base: "./",
  publicDir: false,
  server: {
    host: "127.0.0.1", port: 3000, strictPort: true,
    watch: { ignored: ["**/release/**", "**/test-results/**", "**/.next/**"] },
  },
}));
