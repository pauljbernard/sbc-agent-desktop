import type { SbclAgentHostAdapter } from "../adapter-contract";
import { DesktopEventBroker } from "./event-broker";

export interface IpcHandlerContext {
  hostAdapter: SbclAgentHostAdapter;
  eventBroker: DesktopEventBroker;
  getQuitAppHandler: () => (() => Promise<void> | void) | null;
}
