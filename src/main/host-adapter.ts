import type { SbclAgentHostAdapter } from "./adapter-contract";
import { LiveSbclAgentHostAdapter, resolveLiveAdapterOptions } from "./live-host-adapter";
import { MockSbclAgentHostAdapter } from "./mock-host-adapter";

function resolveAdapterMode(): "live" | "mock" {
  const rawMode = process.env.SBCL_AGENT_ADAPTER?.trim().toLowerCase();

  if (!rawMode || rawMode === "live") {
    return "live";
  }

  if (rawMode === "mock") {
    return "mock";
  }

  throw new Error(
    `Unsupported SBCL_AGENT_ADAPTER value '${process.env.SBCL_AGENT_ADAPTER}'. Expected 'live' or 'mock'.`
  );
}

function createHostAdapter(): SbclAgentHostAdapter {
  if (resolveAdapterMode() === "mock") {
    return new MockSbclAgentHostAdapter();
  }

  return new LiveSbclAgentHostAdapter(resolveLiveAdapterOptions());
}

export const hostAdapter = createHostAdapter();
