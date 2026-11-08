import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const server = await createServer();
await server.listen();

const environment = { ...process.env, ELECTRON_RENDERER_URL: "http://127.0.0.1:3000" };
// Some IDE terminals set this; it would launch Electron as plain Node.js.
delete environment.ELECTRON_RUN_AS_NODE;
const desktop = spawn(require("electron"), ["."], { stdio: "inherit", env: environment });
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (desktop.exitCode === null) desktop.kill();
  await server.close();
  process.exit(code);
}
desktop.on("error", (error) => { console.error(error); void stop(1); });
desktop.on("exit", (code) => { void stop(code ?? 0); });
process.on("SIGINT", () => { void stop(); });
process.on("SIGTERM", () => { void stop(); });
