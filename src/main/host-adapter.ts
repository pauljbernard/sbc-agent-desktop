import type { SbclAgentHostAdapter } from "./adapter-contract";
import { LiveSbclAgentHostAdapter, resolveLiveAdapterOptions } from "./live-host-adapter";
import { MockSbclAgentHostAdapter } from "./mock-host-adapter";

function createHostAdapter(): SbclAgentHostAdapter {
  if (process.env.SBCL_AGENT_ADAPTER === "live") {
    return new LiveSbclAgentHostAdapter(resolveLiveAdapterOptions());
  }

  return new MockSbclAgentHostAdapter();
}

export const hostAdapter = createHostAdapter();
