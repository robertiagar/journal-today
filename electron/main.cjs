const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, net, protocol, screen, session, shell } = require("electron");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const appUrl = "journal://app/";
const rendererDirectory = path.join(__dirname, "../dist");
const developmentUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined;
if (developmentUrl && developmentUrl !== "http://127.0.0.1:3000") {
  throw new Error("The development renderer must use http://127.0.0.1:3000");
}

// Keep the production profile and origin stable across installs and updates.
app.setName("Journal Today");
const profileOverride = app.commandLine.getSwitchValue("user-data-dir")
  || (!app.isPackaged && process.env.JOURNAL_USER_DATA_DIR);
app.setPath("userData", profileOverride
  ? path.resolve(profileOverride)
  : path.join(app.getPath("appData"), "Journal Today"));
app.setAppUserModelId("com.journaltoday.desktop");

protocol.registerSchemesAsPrivileged([
  { scheme: "journal", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let mainWindow;

function isTrustedFrame(event) {
  const frame = event.senderFrame;
  if (!mainWindow || event.sender !== mainWindow.webContents || frame !== event.sender.mainFrame) return false;
  const url = new URL(frame.url);
  return developmentUrl ? url.origin === developmentUrl : url.protocol === "journal:" && url.host === "app";
}

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (["https:", "http:", "mailto:"].includes(parsed.protocol)) {
      void shell.openExternal(parsed.href).catch(console.error);
    }
  } catch { /* Ignore malformed links. */ }
}

function restoreWindowState() {
  try {
    const saved = JSON.parse(readFileSync(path.join(app.getPath("userData"), "window-state.json"), "utf8"));
    const { x, y, width, height } = saved;
    if (![x, y, width, height].every(Number.isFinite) || width < 520 || height < 480) return {};
    const visible = screen.getAllDisplays().some(({ workArea }) =>
      x >= workArea.x && y >= workArea.y && x + 80 <= workArea.x + workArea.width && y + 80 <= workArea.y + workArea.height);
    return visible ? { x, y, width, height, maximized: saved.maximized === true } : {};
  } catch { return {}; }
}

async function createWindow() {
  const { maximized, ...bounds } = restoreWindowState();
  const win = new BrowserWindow({
    width: 1120,
    height: 820,
    ...bounds,
    minWidth: 520,
    minHeight: 480,
    title: "Journal / Today",
    frame: false,
    roundedCorners: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#252b25" : "#f2f2eb",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  mainWindow = win;
  win.once("ready-to-show", () => {
    if (maximized) win.maximize();
    win.show();
  });
  const publishMaximized = () => win.webContents.send("window:maximized", win.isMaximized());
  win.on("maximize", publishMaximized);
  win.on("unmaximize", publishMaximized);
  win.on("close", () => {
    try {
      writeFileSync(path.join(app.getPath("userData"), "window-state.json"), JSON.stringify({
        ...win.getNormalBounds(), maximized: win.isMaximized(),
      }));
    } catch (error) { console.error("Could not save window position:", error); }
  });
  win.on("closed", () => { mainWindow = undefined; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault();
      openExternal(url);
    }
  });
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  await win.loadURL(developmentUrl || appUrl);
  if (!app.isPackaged) win.webContents.openDevTools({ mode: "detach", activate: false });
}

function reportStartupError(error) {
  console.error(error);
  dialog.showErrorBox("Could not open Journal Today", String(error));
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.show();
    mainWindow?.focus();
  });

  app.whenReady().then(async () => {
    protocol.handle("journal", async (request) => {
      try {
        const url = new URL(request.url);
        if (url.host !== "app" || !["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 403 });
        const requestedPath = decodeURIComponent(url.pathname);
        const file = path.resolve(rendererDirectory, `.${requestedPath === "/" ? "/index.html" : requestedPath}`);
        const relative = path.relative(rendererDirectory, file);
        if (relative.startsWith("..") || path.isAbsolute(relative)) return new Response(null, { status: 403 });
        return await net.fetch(pathToFileURL(file).href);
      } catch { return new Response("Not found", { status: 404 }); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);

    for (const [channel, action] of [
      ["window:minimize", (win) => win.minimize()],
      ["window:toggle-maximize", (win) => win.isMaximized() ? win.unmaximize() : win.maximize()],
      ["window:close", (win) => win.close()],
    ]) {
      ipcMain.on(channel, (event) => { if (isTrustedFrame(event)) action(mainWindow); });
    }
    ipcMain.handle("window:is-maximized", (event) => isTrustedFrame(event) && mainWindow.isMaximized());

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      { role: "fileMenu" },
      { role: "editMenu" },
      { label: "View", submenu: [
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" }, { role: "togglefullscreen" },
        ...(!app.isPackaged ? [{ role: "reload" }, { role: "toggleDevTools" }] : []),
      ] },
      { role: "windowMenu" },
    ]));
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow().catch(reportStartupError);
    });
  }).catch(reportStartupError);

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
