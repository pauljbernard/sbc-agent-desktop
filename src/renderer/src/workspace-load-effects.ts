import { useEffect } from "react";
import { useLatestRef } from "./use-latest-ref";
import type { WorkspaceId } from "../../shared/contracts";

export function useWorkspaceLoadEffects(input: {
  activeWorkspace: WorkspaceId;
  effectiveEnvironmentId: string | null;
  selectedGovernedProjectId: string | null;
  loadProjectWorkspace: (environmentId: string) => Promise<void>;
  refreshDesktopTaskActorSystemPanel: (environmentId?: string) => Promise<unknown>;
  loadMemoryWorkspace: (environmentId: string) => Promise<void>;
  loadProjectDetail: (projectId: string, environmentId: string) => Promise<void>;
  loadConversationWorkspace: (environmentId: string) => Promise<void>;
  loadRuntimeWorkspace: (environmentId: string) => Promise<void>;
  loadRuntimeTelemetry: (environmentId: string) => Promise<void>;
  loadWorkWorkspace: (environmentId: string) => Promise<void>;
  loadApprovalWorkspace: (environmentId: string) => Promise<void>;
  loadArtifactsWorkspace: (environmentId: string) => Promise<void>;
  loadIncidentWorkspace: (environmentId: string) => Promise<void>;
}): void {
  const loadProjectWorkspaceRef = useLatestRef(input.loadProjectWorkspace);
  const refreshDesktopTaskActorSystemPanelRef = useLatestRef(input.refreshDesktopTaskActorSystemPanel);
  const loadMemoryWorkspaceRef = useLatestRef(input.loadMemoryWorkspace);
  const loadProjectDetailRef = useLatestRef(input.loadProjectDetail);
  const loadConversationWorkspaceRef = useLatestRef(input.loadConversationWorkspace);
  const loadRuntimeWorkspaceRef = useLatestRef(input.loadRuntimeWorkspace);
  const loadRuntimeTelemetryRef = useLatestRef(input.loadRuntimeTelemetry);
  const loadWorkWorkspaceRef = useLatestRef(input.loadWorkWorkspace);
  const loadApprovalWorkspaceRef = useLatestRef(input.loadApprovalWorkspace);
  const loadArtifactsWorkspaceRef = useLatestRef(input.loadArtifactsWorkspace);
  const loadIncidentWorkspaceRef = useLatestRef(input.loadIncidentWorkspace);

  useEffect(() => {
    if (input.activeWorkspace === "projects" && input.effectiveEnvironmentId) {
      void loadProjectWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.activeWorkspace, input.effectiveEnvironmentId]);

  useEffect(() => {
    if (
      !input.effectiveEnvironmentId ||
      (input.activeWorkspace !== "browser" && input.activeWorkspace !== "runtime")
    ) {
      return;
    }
    void refreshDesktopTaskActorSystemPanelRef.current(input.effectiveEnvironmentId);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "memory" && input.effectiveEnvironmentId) {
      void loadMemoryWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.activeWorkspace, input.effectiveEnvironmentId]);

  useEffect(() => {
    if (
      input.activeWorkspace !== "projects" ||
      !input.effectiveEnvironmentId ||
      !input.selectedGovernedProjectId
    ) {
      return;
    }

    void loadProjectDetailRef.current(input.selectedGovernedProjectId, input.effectiveEnvironmentId);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.selectedGovernedProjectId
  ]);

  useEffect(() => {
    if (input.effectiveEnvironmentId) {
      void loadConversationWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.effectiveEnvironmentId]);

  useEffect(() => {
    if (input.activeWorkspace === "runtime" && input.effectiveEnvironmentId) {
      void loadRuntimeWorkspaceRef.current(input.effectiveEnvironmentId);
      void loadRuntimeTelemetryRef.current(input.effectiveEnvironmentId);
      void loadWorkWorkspaceRef.current(input.effectiveEnvironmentId);
      void loadApprovalWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "browser" && input.effectiveEnvironmentId) {
      void loadRuntimeWorkspaceRef.current(input.effectiveEnvironmentId);
      void loadRuntimeTelemetryRef.current(input.effectiveEnvironmentId);
      void loadArtifactsWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
  ]);

  useEffect(() => {
    if (
      (input.activeWorkspace === "environment" || input.activeWorkspace === "projects") &&
      input.effectiveEnvironmentId
    ) {
      void loadWorkWorkspaceRef.current(input.effectiveEnvironmentId);
      void loadApprovalWorkspaceRef.current(input.effectiveEnvironmentId);
      void loadIncidentWorkspaceRef.current(input.effectiveEnvironmentId);
      const refreshTimeoutId = window.setTimeout(() => {
        void loadWorkWorkspaceRef.current(input.effectiveEnvironmentId as string);
        void loadApprovalWorkspaceRef.current(input.effectiveEnvironmentId as string);
        void loadIncidentWorkspaceRef.current(input.effectiveEnvironmentId as string);
      }, 900);
      return () => window.clearTimeout(refreshTimeoutId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
  ]);
}
