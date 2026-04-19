/// <reference types="vite/client" />

import type { SbclAgentDesktopApi } from "../../shared/contracts";

declare global {
  interface Window {
    sbclAgentDesktop: SbclAgentDesktopApi;
  }
}

export {};
