import { BrowserWindow, ipcMain, shell } from "electron";
import { listDocumentationPages, readDocumentationPageBySlug } from "../../documentation";
import type { IpcHandlerContext } from "../context";

export function registerDesktopIpcHandlers({
  hostAdapter,
  eventBroker,
  getQuitAppHandler
}: IpcHandlerContext): void {
  ipcMain.handle("desktop:focus-workspace", (_event, workspace) =>
    hostAdapter.focusWorkspace(workspace)
  );
  ipcMain.handle("desktop:get-preferences", () => hostAdapter.getDesktopPreferences());
  ipcMain.handle("desktop:set-preferences", (_event, patch) =>
    hostAdapter.setDesktopPreferences(patch)
  );
  ipcMain.handle("desktop:quit-app", async () => {
    const quitAppHandler = getQuitAppHandler();
    if (quitAppHandler) {
      await quitAppHandler();
      return;
    }
    await hostAdapter.quitApp();
  });
  ipcMain.handle("desktop:set-window-title", (event, title: string) => {
    BrowserWindow.fromWebContents(event.sender)?.setTitle(title);
  });
  ipcMain.handle("desktop:open-entity", (_event, ref) => hostAdapter.openEntityInNewWindow(ref));
  ipcMain.handle("desktop:list-documentation-pages", () => listDocumentationPages());
  ipcMain.handle("desktop:read-documentation-page", (_event, slug: string) =>
    readDocumentationPageBySlug(slug)
  );
  ipcMain.handle("desktop:open-external-link", (_event, url: string) => shell.openExternal(url));
  ipcMain.handle("events:subscribe", (event, input) => eventBroker.subscribe(event.sender, input));
  ipcMain.handle("events:unsubscribe", (_event, subscriptionId: string) => {
    eventBroker.unsubscribe(subscriptionId);
  });
}
