import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerIpcHandlers } from "./ipc";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
