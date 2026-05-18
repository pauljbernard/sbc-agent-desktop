import { ipcMain } from "electron";
import type { IpcHandlerContext } from "../context";

export function registerHostIpcHandlers({ hostAdapter }: IpcHandlerContext): void {
  ipcMain.handle("host:get-status", () => hostAdapter.getHostStatus());
  ipcMain.handle("host:get-current-binding", () => hostAdapter.getCurrentBinding());
  ipcMain.handle("host:set-environment-binding", (_event, environmentId: string) =>
    hostAdapter.setEnvironmentBinding(environmentId)
  );
  ipcMain.handle("host:get-environment-image-registry", () =>
    hostAdapter.getEnvironmentImageRegistry()
  );
  ipcMain.handle("host:load-environment-image", (_event, imageIdOrName: string) =>
    hostAdapter.loadEnvironmentImage(imageIdOrName)
  );
  ipcMain.handle("host:save-environment-image", (_event, input) =>
    hostAdapter.saveEnvironmentImage(input)
  );
  ipcMain.handle("host:revert-environment-image", () => hostAdapter.revertEnvironmentToImage());
}
