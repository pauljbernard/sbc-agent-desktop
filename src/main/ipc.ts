import { hostAdapter } from "./host-adapter";
import { registerCommandIpcHandlers } from "./ipc/channels/commands";
import { registerDesktopIpcHandlers } from "./ipc/channels/desktop";
import { registerHostIpcHandlers } from "./ipc/channels/host";
import { registerQueryIpcHandlers } from "./ipc/channels/queries";
import { DesktopEventBroker } from "./ipc/event-broker";
let quitAppHandler: (() => Promise<void> | void) | null = null;
const eventBroker = new DesktopEventBroker();

export function setQuitAppHandler(handler: (() => Promise<void> | void) | null): void {
  quitAppHandler = handler;
}

export function registerIpcHandlers(): void {
  const context = {
    hostAdapter,
    eventBroker,
    getQuitAppHandler: () => quitAppHandler
  };
  registerHostIpcHandlers(context);
  registerQueryIpcHandlers(context);
  registerCommandIpcHandlers(context);
  registerDesktopIpcHandlers(context);
}
