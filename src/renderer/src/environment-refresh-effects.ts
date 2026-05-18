import { useEffect } from "react";
import { useLatestRef } from "./use-latest-ref";
import type { WorkspaceId } from "../../shared/contracts";
import type { BrowserDomain } from "./browser-support";

export function useEnvironmentRefreshEffects(input: {
  activeWorkspace: WorkspaceId;
  effectiveEnvironmentId: string | null;
  selectedBrowserDomain: BrowserDomain;
  refreshProviderSummary: (environmentId?: string) => Promise<unknown>;
  refreshPackageManagementSummary: (environmentId?: string) => Promise<unknown>;
  refreshDesktopTaskManifests: (environmentId?: string) => Promise<unknown>;
  refreshDesktopTaskRecords: (environmentId?: string) => Promise<unknown>;
  refreshDesktopTaskActorTrace: (environmentId?: string) => Promise<unknown>;
  refreshDesktopTaskDeadLetters: (environmentId?: string) => Promise<unknown>;
  refreshPendingConversationApproval: (environmentId?: string) => Promise<unknown>;
  refreshMcpServerConfigs: (environmentId?: string) => Promise<unknown>;
}): void {
  const refreshProviderSummaryRef = useLatestRef(input.refreshProviderSummary);
  const refreshPackageManagementSummaryRef = useLatestRef(input.refreshPackageManagementSummary);
  const refreshDesktopTaskManifestsRef = useLatestRef(input.refreshDesktopTaskManifests);
  const refreshDesktopTaskRecordsRef = useLatestRef(input.refreshDesktopTaskRecords);
  const refreshDesktopTaskActorTraceRef = useLatestRef(input.refreshDesktopTaskActorTrace);
  const refreshDesktopTaskDeadLettersRef = useLatestRef(input.refreshDesktopTaskDeadLetters);
  const refreshPendingConversationApprovalRef = useLatestRef(input.refreshPendingConversationApproval);
  const refreshMcpServerConfigsRef = useLatestRef(input.refreshMcpServerConfigs);

  useEffect(() => {
    if (input.activeWorkspace === "configuration" && input.effectiveEnvironmentId) {
      void refreshProviderSummaryRef.current(input.effectiveEnvironmentId);
      void refreshPackageManagementSummaryRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskManifestsRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskRecordsRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskActorTraceRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskDeadLettersRef.current(input.effectiveEnvironmentId);
      void refreshPendingConversationApprovalRef.current(input.effectiveEnvironmentId);
      void refreshMcpServerConfigsRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
  ]);

  useEffect(() => {
    if (!input.effectiveEnvironmentId) {
      return;
    }
    if (
      input.activeWorkspace === "environment" ||
      (input.activeWorkspace === "browser" && input.selectedBrowserDomain === "governance")
    ) {
      void refreshDesktopTaskRecordsRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskActorTraceRef.current(input.effectiveEnvironmentId);
      void refreshDesktopTaskDeadLettersRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.selectedBrowserDomain
  ]);
}
