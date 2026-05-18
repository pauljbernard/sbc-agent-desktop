import { useEffect } from "react";
import { useLatestRef } from "./use-latest-ref";
import type {
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  QueryResultDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  SourcePreviewDto,
  WorkspaceId
} from "../../shared/contracts";
import { canonicalWorkspace } from "./workspace-shell";
import type { BrowserDomain } from "./browser-support";

export function useDetailLoadEffects(input: {
  activeWorkspace: WorkspaceId;
  effectiveEnvironmentId: string | null;
  selectedBrowserDomain: BrowserDomain;
  runtimeSummary: RuntimeSummaryDto | null;
  selectedPackageName: string | null;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  selectedApprovalId: string | null;
  selectedIncidentId: string | null;
  incidentCount: number;
  openIncidentCount: number;
  selectedWorkItemId: string | null;
  workItemCount: number;
  blockedWorkCount: number;
  selectedArtifactId: string | null;
  documentationPages: DocumentationPageSummaryDto[];
  selectedDocumentationPage: DocumentationPageDto | null;
  selectedDocumentationSlug: string;
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  loadDiagnosticReports: (environmentId: string) => Promise<void>;
  selectedDiagnosticReportId: string | null;
  loadDiagnosticReportDetail: (reportId: string, environmentId: string) => Promise<void>;
  loadPackageBrowser: (packageName?: string) => Promise<void>;
  loadSourcePreview: (path: string, line?: number) => Promise<void>;
  loadRuntimeEntityDetail: (
    symbol: string,
    packageName?: string,
    environmentId?: string | null
  ) => Promise<void>;
  loadApprovalDetail: (requestId: string, environmentId: string) => Promise<void>;
  loadIncidentWorkspace: (environmentId: string) => Promise<void>;
  loadIncidentDetail: (incidentId: string, environmentId: string) => Promise<void>;
  loadWorkWorkspace: (environmentId: string) => Promise<void>;
  loadWorkItemDetail: (workItemId: string, environmentId: string) => Promise<void>;
  loadActivityWorkspace: (environmentId: string) => Promise<void>;
  loadArtifactsWorkspace: (environmentId: string) => Promise<void>;
  loadDocumentationPages: () => Promise<void>;
  loadDocumentationPage: (slug: string) => Promise<void>;
  loadArtifactDetail: (artifactId: string, environmentId: string) => Promise<void>;
}): void {
  const loadDiagnosticReportsRef = useLatestRef(input.loadDiagnosticReports);
  const loadDiagnosticReportDetailRef = useLatestRef(input.loadDiagnosticReportDetail);
  const loadPackageBrowserRef = useLatestRef(input.loadPackageBrowser);
  const loadSourcePreviewRef = useLatestRef(input.loadSourcePreview);
  const loadRuntimeEntityDetailRef = useLatestRef(input.loadRuntimeEntityDetail);
  const loadApprovalDetailRef = useLatestRef(input.loadApprovalDetail);
  const loadIncidentWorkspaceRef = useLatestRef(input.loadIncidentWorkspace);
  const loadIncidentDetailRef = useLatestRef(input.loadIncidentDetail);
  const loadWorkWorkspaceRef = useLatestRef(input.loadWorkWorkspace);
  const loadWorkItemDetailRef = useLatestRef(input.loadWorkItemDetail);
  const loadActivityWorkspaceRef = useLatestRef(input.loadActivityWorkspace);
  const loadArtifactsWorkspaceRef = useLatestRef(input.loadArtifactsWorkspace);
  const loadDocumentationPagesRef = useLatestRef(input.loadDocumentationPages);
  const loadDocumentationPageRef = useLatestRef(input.loadDocumentationPage);
  const loadArtifactDetailRef = useLatestRef(input.loadArtifactDetail);

  useEffect(() => {
    if (
      input.activeWorkspace !== "browser" ||
      !input.effectiveEnvironmentId ||
      input.selectedBrowserDomain !== "diagnostics"
    ) {
      return;
    }
    void loadDiagnosticReportsRef.current(input.effectiveEnvironmentId);
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.selectedBrowserDomain
  ]);

  useEffect(() => {
    if (!input.selectedDiagnosticReportId || !input.effectiveEnvironmentId) {
      return;
    }
    void loadDiagnosticReportDetailRef.current(input.selectedDiagnosticReportId, input.effectiveEnvironmentId);
  }, [
    input.effectiveEnvironmentId,
    input.selectedDiagnosticReportId
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "browser" && input.effectiveEnvironmentId && input.runtimeSummary?.currentPackage) {
      void loadPackageBrowserRef.current(input.selectedPackageName || input.runtimeSummary.currentPackage);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.runtimeSummary?.currentPackage,
    input.selectedPackageName
  ]);

  useEffect(() => {
    if (canonicalWorkspace(input.activeWorkspace) !== "browser" || !input.runtimeInspection?.data.items.length) {
      return;
    }

    const sourceBackedItem = input.runtimeInspection.data.items.find((item) => item.path);
    if (!sourceBackedItem?.path) {
      return;
    }

    if (
      input.sourcePreview?.data.path === sourceBackedItem.path &&
      input.sourcePreview.data.focusLine === (sourceBackedItem.line ?? null)
    ) {
      return;
    }

    void loadSourcePreviewRef.current(sourceBackedItem.path, sourceBackedItem.line ?? undefined);
  }, [
    input.activeWorkspace,
    input.runtimeInspection,
    input.sourcePreview?.data.focusLine,
    input.sourcePreview?.data.path
  ]);

  useEffect(() => {
    if (canonicalWorkspace(input.activeWorkspace) !== "browser" || !input.runtimeInspection?.data.symbol) {
      return;
    }

    void loadRuntimeEntityDetailRef.current(
      input.runtimeInspection.data.symbol,
      input.runtimeInspection.data.packageName ?? undefined,
      input.runtimeInspection.metadata.binding?.environmentId ?? input.effectiveEnvironmentId
    );
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.runtimeInspection?.data.packageName,
    input.runtimeInspection?.data.symbol,
    input.runtimeInspection?.metadata.binding?.environmentId
  ]);

  useEffect(() => {
    if (input.selectedApprovalId && input.effectiveEnvironmentId) {
      void loadApprovalDetailRef.current(input.selectedApprovalId, input.effectiveEnvironmentId);
    }
  }, [input.effectiveEnvironmentId, input.selectedApprovalId]);

  useEffect(() => {
    if (input.activeWorkspace === "incidents" && input.effectiveEnvironmentId) {
      void loadIncidentWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.activeWorkspace, input.effectiveEnvironmentId]);

  useEffect(() => {
    if (input.selectedIncidentId && input.effectiveEnvironmentId) {
      void loadIncidentDetailRef.current(input.selectedIncidentId, input.effectiveEnvironmentId);
    }
  }, [input.effectiveEnvironmentId, input.selectedIncidentId]);

  useEffect(() => {
    if (input.effectiveEnvironmentId && input.openIncidentCount > 0 && input.incidentCount === 0) {
      void loadIncidentWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.effectiveEnvironmentId,
    input.incidentCount,
    input.openIncidentCount
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "work" && input.effectiveEnvironmentId) {
      void loadWorkWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.activeWorkspace, input.effectiveEnvironmentId]);

  useEffect(() => {
    if (input.selectedWorkItemId && input.effectiveEnvironmentId) {
      void loadWorkItemDetailRef.current(input.selectedWorkItemId, input.effectiveEnvironmentId);
    }
  }, [input.effectiveEnvironmentId, input.selectedWorkItemId]);

  useEffect(() => {
    if (input.effectiveEnvironmentId && input.blockedWorkCount > 0 && input.workItemCount === 0) {
      void loadWorkWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.blockedWorkCount,
    input.effectiveEnvironmentId,
    input.workItemCount
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "activity" && input.effectiveEnvironmentId) {
      void loadActivityWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [
    input.activeWorkspace,
    input.effectiveEnvironmentId,
    input.eventFamilyFilter,
    input.eventVisibilityFilter,
  ]);

  useEffect(() => {
    if (input.activeWorkspace === "artifacts" && input.effectiveEnvironmentId) {
      void loadArtifactsWorkspaceRef.current(input.effectiveEnvironmentId);
    }
  }, [input.activeWorkspace, input.effectiveEnvironmentId]);

  useEffect(() => {
    if (input.activeWorkspace !== "documentation") {
      return;
    }

    if (input.documentationPages.length === 0) {
      void loadDocumentationPagesRef.current();
      return;
    }

    if (
      !input.selectedDocumentationPage ||
      input.selectedDocumentationPage.slug !== input.selectedDocumentationSlug
    ) {
      void loadDocumentationPageRef.current(input.selectedDocumentationSlug);
    }
  }, [
    input.activeWorkspace,
    input.documentationPages.length,
    input.selectedDocumentationPage,
    input.selectedDocumentationSlug
  ]);

  useEffect(() => {
    if (input.selectedArtifactId && input.effectiveEnvironmentId) {
      void loadArtifactDetailRef.current(input.selectedArtifactId, input.effectiveEnvironmentId);
    }
  }, [input.effectiveEnvironmentId, input.selectedArtifactId]);
}
