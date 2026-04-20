import { app, BrowserWindow, Menu } from "electron";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerIpcHandlers } from "./ipc";

const __dirname = dirname(fileURLToPath(import.meta.url));
app.setName("Agent Desktop");
let mainWindow: BrowserWindow | null = null;

function sendMenuAction(action: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("menu:action", { action });
}

function installApplicationMenu(): void {
  const template = [
    {
      label: "Agent Desktop",
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

  window.setTitle("sbcl-agent Desktop");

  window.once("ready-to-show", () => window.show());

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
  registerIpcHandlers();
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
