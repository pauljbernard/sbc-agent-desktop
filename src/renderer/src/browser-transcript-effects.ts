import { useEffect, type MutableRefObject } from "react";
import { useLatestRef } from "./use-latest-ref";
import type { EnvironmentEventDto, WorkspaceId } from "../../shared/contracts";
import type { BrowserDomain } from "./browser-support";

export function useBrowserTranscriptEffects(input: {
  activeWorkspace: WorkspaceId;
  effectiveEnvironmentId: string | null;
  selectedBrowserDomain: BrowserDomain;
  selectedConsolePlane: "environment" | "host";
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  selectedTranscriptSourceFilter: string;
  isTranscriptEventRefreshActive: boolean;
  setIsTranscriptEventRefreshActive: (value: boolean) => void;
  pendingTranscriptRefreshTimerRef: MutableRefObject<number | null>;
  loadRuntimeTelemetry: (environmentId: string) => Promise<void>;
  loadConsoleLogStream: (
    environmentId: string,
    plane: "environment" | "host"
  ) => Promise<void>;
  loadTranscriptWorkspace: (environmentId: string) => Promise<void>;
  shouldLoadTranscriptActivityEntries: () => boolean;
  shouldLoadTranscriptConsoleEntries: () => boolean;
  shouldSubscribeTranscriptEnvironmentEvents: () => boolean;
  shouldRefreshTranscriptFromEvent: (event: EnvironmentEventDto) => boolean;
  scheduleTranscriptEventRefresh: (environmentId: string) => void;
}): void {
  const loadRuntimeTelemetryRef = useLatestRef(input.loadRuntimeTelemetry);
  const loadConsoleLogStreamRef = useLatestRef(input.loadConsoleLogStream);
  const loadTranscriptWorkspaceRef = useLatestRef(input.loadTranscriptWorkspace);
  const shouldLoadTranscriptActivityEntriesRef = useLatestRef(input.shouldLoadTranscriptActivityEntries);
  const shouldLoadTranscriptConsoleEntriesRef = useLatestRef(input.shouldLoadTranscriptConsoleEntries);
  const shouldSubscribeTranscriptEnvironmentEventsRef = useLatestRef(input.shouldSubscribeTranscriptEnvironmentEvents);
  const shouldRefreshTranscriptFromEventRef = useLatestRef(input.shouldRefreshTranscriptFromEvent);
  const scheduleTranscriptEventRefreshRef = useLatestRef(input.scheduleTranscriptEventRefresh);

  useEffect(() => {
    if (
      input.activeWorkspace !== "browser" ||
      !input.effectiveEnvironmentId ||
      !["processes", "performance", "host-io"].includes(input.selectedBrowserDomain)
    ) {
      return;
    }

    void loadRuntimeTelemetryRef.current(input.effectiveEnvironmentId);
    const intervalId = window.setInterval(() => {
      void loadRuntimeTelemetryRef.current(input.effectiveEnvironmentId as string);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.selectedBrowserDomain
  ]);

  useEffect(() => {
    if (
      input.activeWorkspace !== "browser" ||
      !input.effectiveEnvironmentId ||
      input.selectedBrowserDomain !== "console"
    ) {
      return;
    }

    void loadConsoleLogStreamRef.current(input.effectiveEnvironmentId, input.selectedConsolePlane);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.selectedBrowserDomain,
    input.selectedConsolePlane
  ]);

  useEffect(() => {
    if (input.activeWorkspace !== "transcript" || !input.effectiveEnvironmentId) {
      return;
    }

    const shouldLoadActivity = shouldLoadTranscriptActivityEntriesRef.current();
    const shouldLoadConsole = shouldLoadTranscriptConsoleEntriesRef.current();

    if (shouldLoadActivity || shouldLoadConsole) {
      void loadTranscriptWorkspaceRef.current(input.effectiveEnvironmentId);
    }
    if (!shouldLoadActivity && !shouldLoadConsole) {
      return;
    }
    const pollIntervalMs = input.isTranscriptEventRefreshActive ? 15000 : 4000;
    const intervalId = window.setInterval(() => {
      void loadTranscriptWorkspaceRef.current(input.effectiveEnvironmentId as string);
    }, pollIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.eventFamilyFilter,
    input.eventVisibilityFilter,
    input.isTranscriptEventRefreshActive,
    input.selectedTranscriptSourceFilter,
  ]);

  useEffect(() => {
    if (input.activeWorkspace !== "transcript" || !input.effectiveEnvironmentId) {
      input.setIsTranscriptEventRefreshActive(false);
      return;
    }
    if (!shouldSubscribeTranscriptEnvironmentEventsRef.current()) {
      input.setIsTranscriptEventRefreshActive(false);
      return;
    }

    let active = true;
    let transcriptSubscriptionId: string | null = null;

    const handleTranscriptEvent = (event: EnvironmentEventDto) => {
      if (!active) {
        return;
      }
      if (!shouldRefreshTranscriptFromEventRef.current(event)) {
        return;
      }
      scheduleTranscriptEventRefreshRef.current(input.effectiveEnvironmentId as string);
    };

    void window.sbclAgentDesktop.events
      .subscribeEnvironmentEvents(
        {
          environmentId: input.effectiveEnvironmentId,
          families: input.eventFamilyFilter === "all" ? undefined : [input.eventFamilyFilter],
          visibility: input.eventVisibilityFilter === "all" ? undefined : [input.eventVisibilityFilter]
        },
        handleTranscriptEvent
      )
      .then((handle) => {
        transcriptSubscriptionId = handle.subscriptionId;
        input.setIsTranscriptEventRefreshActive(true);
      })
      .catch(() => {
        input.setIsTranscriptEventRefreshActive(false);
        return undefined;
      });

    return () => {
      active = false;
      input.setIsTranscriptEventRefreshActive(false);
      if (input.pendingTranscriptRefreshTimerRef.current != null) {
        window.clearTimeout(input.pendingTranscriptRefreshTimerRef.current);
        input.pendingTranscriptRefreshTimerRef.current = null;
      }
      if (transcriptSubscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(transcriptSubscriptionId);
      }
    };
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.eventFamilyFilter,
    input.eventVisibilityFilter,
    input.pendingTranscriptRefreshTimerRef,
    input.selectedTranscriptSourceFilter,
    input.setIsTranscriptEventRefreshActive,
  ]);
}
