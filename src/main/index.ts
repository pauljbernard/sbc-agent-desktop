import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerIpcHandlers, setQuitAppHandler } from "./ipc";

const __dirname = dirname(fileURLToPath(import.meta.url));
app.setName("Surface");
let mainWindow: BrowserWindow | null = null;
let allowMainWindowClose = false;
let terminalStreamWriteDisabled = false;

function isBrokenTerminalStreamError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EIO" || code === "EPIPE" || code === "ERR_STREAM_DESTROYED";
}

function disableTerminalStreamWrites(): void {
  terminalStreamWriteDisabled = true;
}

function installTerminalStreamGuards(): void {
  const guard = (error: Error): void => {
    if (isBrokenTerminalStreamError(error)) {
      disableTerminalStreamWrites();
      return;
    }
    throw error;
  };
  process.stdout.on("error", guard);
  process.stderr.on("error", guard);
}

function logWindowEvent(label: string, detail?: string): void {
  if (terminalStreamWriteDisabled || process.stdout.destroyed || !process.stdout.writable) {
    return;
  }
  const suffix = detail ? ` ${detail}` : "";
  process.stdout.write(`[intentos-window] ${label}${suffix}\n`, (error) => {
    if (error && isBrokenTerminalStreamError(error)) {
      disableTerminalStreamWrites();
      return;
    }
    if (error) {
      throw error;
    }
  });
}

function sendMenuAction(action: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("menu:action", { action });
}

function installApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "Surface",
      submenu: [
        { role: "about" as const },
        { type: "separator" },
        { role: "services" as const },
        { type: "separator" },
        { role: "hide" as const },
        { role: "hideOthers" as const },
        { role: "unhide" as const },
        { type: "separator" },
        { role: "quit" as const }
      ]
    },
    {
      label: "File",
      submenu: [
        { label: "New Project", accelerator: "CmdOrCtrl+N", click: () => sendMenuAction("project:new") },
        { label: "Open Project...", accelerator: "CmdOrCtrl+O", click: () => sendMenuAction("project:open") },
        { type: "separator" },
        { label: "Save Project", accelerator: "CmdOrCtrl+S", click: () => sendMenuAction("project:save") },
        { type: "separator" },
        { role: "close" as const }
      ]
    },
    {
      label: "Edit",
      submenu: [{ role: "undo" as const }, { role: "redo" as const }, { type: "separator" }, { role: "cut" as const }, { role: "copy" as const }, { role: "paste" as const }, { role: "selectAll" as const }]
    },
    {
      label: "View",
      submenu: [{ role: "reload" as const }, { role: "forceReload" as const }, { role: "toggleDevTools" as const }, { type: "separator" }, { role: "resetZoom" as const }, { role: "zoomIn" as const }, { role: "zoomOut" as const }, { type: "separator" }, { role: "togglefullscreen" as const }]
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" as const }, { role: "zoom" as const }, { type: "separator" }, { role: "front" as const }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(): BrowserWindow {
  const preloadMjs = join(__dirname, "../preload/index.mjs");
  const preloadJs = join(__dirname, "../preload/index.js");

  const window = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0f16",
    show: false,
    webPreferences: {
      preload: existsSync(preloadMjs) ? preloadMjs : preloadJs,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  allowMainWindowClose = false;
  window.setTitle("Surface");
  window.on("close", (event) => {
    if (allowMainWindowClose) {
      return;
    }

    event.preventDefault();
    sendMenuAction("app:request-quit");
  });
  window.on("ready-to-show", () => logWindowEvent("ready-to-show"));
  window.on("show", () => logWindowEvent("show"));
  window.on("unresponsive", () => logWindowEvent("unresponsive"));
  window.on("closed", () => {
    logWindowEvent("closed");
    if (mainWindow === window) {
      mainWindow = null;
    }
    allowMainWindowClose = false;
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.on("did-start-loading", () => logWindowEvent("did-start-loading"));
  window.webContents.on("dom-ready", () => logWindowEvent("dom-ready"));
  window.webContents.on("did-stop-loading", () => logWindowEvent("did-stop-loading"));
  window.webContents.on("did-finish-load", () => logWindowEvent("did-finish-load"));
  window.webContents.on("did-fail-load", (_event, code, description, url) =>
    logWindowEvent("did-fail-load", `${code} ${description} ${url}`)
  );
  window.webContents.on("render-process-gone", (_event, details) =>
    logWindowEvent("render-process-gone", `${details.reason} exitCode=${details.exitCode}`)
  );
  window.webContents.on("console-message", (_event, level, message, line, sourceId) =>
    logWindowEvent("renderer-console", `level=${level} ${sourceId}:${line} ${message}`)
  );

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const packagedRenderer = join(__dirname, "../../dist/renderer/index.html");
    const localRenderer = join(__dirname, "../renderer/index.html");
    void window.loadFile(existsSync(packagedRenderer) ? packagedRenderer : localRenderer);
  }

  return window;
}

app.whenReady().then(() => {
  installTerminalStreamGuards();
  registerIpcHandlers();
  setQuitAppHandler(() => {
    allowMainWindowClose = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    app.quit();
  });
  installApplicationMenu();
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
