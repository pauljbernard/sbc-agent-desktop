import { useEffect } from "react";
import type {
  PackageBrowserDto,
  QueryResultDto,
  RuntimeInspectionMode,
  RuntimeSymbolBrowserPageDto
} from "../../shared/contracts";
import {
  ensurePackageBrowserData,
  fetchPackageBrowserData,
  loadRuntimeSymbolPage,
  mergePackageBrowserCacheEntries,
  scopedPackageNames
} from "./browser-workspace-data";
import { classMethodKindsForMode, symbolKindsForMode } from "./browser-workspace-support";

export function useBrowserWorkspaceEffects(input: {
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  setPackageBrowserCache: (
    updater: (current: Record<string, PackageBrowserDto>) => Record<string, PackageBrowserDto>
  ) => void;
  packageBrowserPrefetchTimerRef: { current: number | null };
  environmentId: string | null;
  selectedDomain: string;
  selectedPackageName: string;
  packageNames: string[];
  allPackagesOption: string;
  packageBrowserCache: Record<string, PackageBrowserDto>;
  packageBrowserLoadRef: { current: Map<string, Promise<void>> };
  classMethodPackageScope: string;
  symbolPackageScope: string;
  symbolPageResult: QueryResultDto<RuntimeSymbolBrowserPageDto> | null;
  symbolWorkspaceMode: "generic-function" | "class" | "macro" | "variable" | "function";
  setSymbolPage: (value: number) => void;
  symbolSearchTerm: string;
  symbolVisibilityFilter: string;
  symbolPageSize: number;
  setClassMethodPage: (value: number) => void;
  classMethodMode: "classes" | "generic-functions";
  classMethodSearchTerm: string;
  classMethodPageSize: number;
  resolvedBrowserEnvironmentId: string | null;
  symbolPage: number;
  setSymbolPageResult: (value: QueryResultDto<RuntimeSymbolBrowserPageDto> | null) => void;
  classMethodPage: number;
  setClassMethodPageResult: (value: QueryResultDto<RuntimeSymbolBrowserPageDto> | null) => void;
  activeListenerForm: string;
  runtimeForm: string;
  setRuntimeForm: (value: string) => void;
  conversationDraft: string;
  previousConversationHandoffPromptRef: { current: string };
  conversationHandoffPrompt: string;
  setConversationDraft: (value: string) => void;
  setListenerActionMode: (value: "default" | "inspect" | "reload" | "evaluate" | "custom") => void;
  setCustomListenerForm: (value: string | null) => void;
  focusedSymbol: string;
  focusedPackage?: string;
  sourcePreviewPath?: string | null;
  sourcePreviewLine?: number | null;
  runtimeInspectionSymbol?: string;
  runtimeInspectionMode?: RuntimeInspectionMode;
  runtimeEntityKind?: string | null;
  setSymbolWorkspaceMode: (
    value: "generic-function" | "class" | "macro" | "variable" | "function"
  ) => void;
}) {
  useEffect(() => {
    const packageName = input.packageBrowser?.data.packageName;
    const packageData = input.packageBrowser?.data;
    if (!packageName || !packageData) {
      return;
    }
    input.setPackageBrowserCache((current) =>
      mergePackageBrowserCacheEntries(current, {
        [packageName]: packageData
      })
    );
  }, [input.packageBrowser, input.setPackageBrowserCache]);

  useEffect(() => {
    if (!input.environmentId) {
      return;
    }
    const requiredPackages =
      input.selectedDomain === "packages"
        ? scopedPackageNames(input.selectedPackageName, input.packageNames, input.allPackagesOption)
        : [];
    if (requiredPackages.length === 0) {
      return;
    }
    if (input.packageBrowserPrefetchTimerRef.current !== null) {
      window.clearTimeout(input.packageBrowserPrefetchTimerRef.current);
      input.packageBrowserPrefetchTimerRef.current = null;
    }
    if (requiredPackages.length === 1) {
      void ensurePackageBrowserData({
        environmentId: input.environmentId,
        packageName: requiredPackages[0],
        packageBrowser: input.packageBrowser,
        packageBrowserCache: input.packageBrowserCache,
        packageBrowserLoadRef: input.packageBrowserLoadRef,
        setPackageBrowserCache: input.setPackageBrowserCache
      });
      return;
    }
    let cancelled = false;
    const pendingPackages = requiredPackages.filter(
      (packageName) =>
        !input.packageBrowserCache[packageName] &&
        input.packageBrowser?.data.packageName !== packageName
    );
    const loadNextBatch = async () => {
      if (cancelled || pendingPackages.length === 0) {
        return;
      }
      const nextBatch = pendingPackages.splice(0, 4);
      const loadedEntries: Record<string, PackageBrowserDto> = {};
      for (const packageName of nextBatch) {
        if (cancelled) {
          return;
        }
        const result = await fetchPackageBrowserData({
          environmentId: input.environmentId,
          packageName,
          packageBrowser: input.packageBrowser,
          packageBrowserCache: input.packageBrowserCache
        });
        if (result) {
          loadedEntries[packageName] = result;
        }
      }
      input.setPackageBrowserCache((current) => mergePackageBrowserCacheEntries(current, loadedEntries));
      if (cancelled || pendingPackages.length === 0) {
        return;
      }
      input.packageBrowserPrefetchTimerRef.current = window.setTimeout(() => {
        void loadNextBatch();
      }, 80);
    };
    void loadNextBatch();
    return () => {
      cancelled = true;
      if (input.packageBrowserPrefetchTimerRef.current !== null) {
        window.clearTimeout(input.packageBrowserPrefetchTimerRef.current);
        input.packageBrowserPrefetchTimerRef.current = null;
      }
    };
  }, [
    input.allPackagesOption,
    input.environmentId,
    input.packageBrowser,
    input.packageBrowserCache,
    input.packageBrowserLoadRef,
    input.packageBrowserPrefetchTimerRef,
    input.packageNames,
    input.selectedDomain,
    input.selectedPackageName,
    input.setPackageBrowserCache
  ]);

  useEffect(() => {
    if (input.selectedDomain !== "symbols") {
      return;
    }
    console.info(
      "[browser-symbols] scope=%s packageCount=%d cacheCount=%d rowCount=%d lane=%s",
      input.symbolPackageScope,
      input.packageNames.length,
      Object.keys(input.packageBrowserCache).length,
      input.symbolPageResult?.data.items.length ?? 0,
      input.symbolWorkspaceMode
    );
  }, [
    input.packageBrowserCache,
    input.packageNames.length,
    input.selectedDomain,
    input.symbolPackageScope,
    input.symbolPageResult,
    input.symbolWorkspaceMode
  ]);

  useEffect(() => {
    input.setSymbolPage(1);
  }, [
    input.setSymbolPage,
    input.symbolPackageScope,
    input.symbolPageSize,
    input.symbolSearchTerm,
    input.symbolVisibilityFilter,
    input.symbolWorkspaceMode
  ]);

  useEffect(() => {
    input.setClassMethodPage(1);
  }, [
    input.classMethodMode,
    input.classMethodPackageScope,
    input.classMethodPageSize,
    input.classMethodSearchTerm,
    input.setClassMethodPage
  ]);

  useEffect(() => {
    let cancelled = false;
    if (input.selectedDomain !== "symbols") {
      return;
    }
    void (async () => {
      const result = await loadRuntimeSymbolPage({
        resolvedBrowserEnvironmentId: input.resolvedBrowserEnvironmentId,
        allPackagesOption: input.allPackagesOption,
        packageScope: input.symbolPackageScope,
        kinds: symbolKindsForMode(input.symbolWorkspaceMode),
        visibility: input.symbolVisibilityFilter,
        search: input.symbolSearchTerm,
        page: input.symbolPage,
        pageSize: input.symbolPageSize
      });
      if (!cancelled) {
        console.info(
          "[browser-symbol-page] scope=%s lane=%s total=%d items=%d page=%d pageSize=%d",
          input.symbolPackageScope,
          input.symbolWorkspaceMode,
          result?.data.totalCount ?? 0,
          result?.data.items.length ?? 0,
          input.symbolPage,
          input.symbolPageSize
        );
        input.setSymbolPageResult(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    input.allPackagesOption,
    input.resolvedBrowserEnvironmentId,
    input.selectedDomain,
    input.setSymbolPageResult,
    input.symbolPackageScope,
    input.symbolPage,
    input.symbolPageSize,
    input.symbolSearchTerm,
    input.symbolVisibilityFilter,
    input.symbolWorkspaceMode
  ]);

  useEffect(() => {
    let cancelled = false;
    if (input.selectedDomain !== "classes-methods") {
      return;
    }
    void (async () => {
      const result = await loadRuntimeSymbolPage({
        resolvedBrowserEnvironmentId: input.resolvedBrowserEnvironmentId,
        allPackagesOption: input.allPackagesOption,
        packageScope: input.classMethodPackageScope,
        kinds: classMethodKindsForMode(input.classMethodMode),
        search: input.classMethodSearchTerm,
        page: input.classMethodPage,
        pageSize: input.classMethodPageSize
      });
      if (!cancelled) {
        console.info(
          "[browser-class-page] scope=%s mode=%s total=%d items=%d page=%d pageSize=%d",
          input.classMethodPackageScope,
          input.classMethodMode,
          result?.data.totalCount ?? 0,
          result?.data.items.length ?? 0,
          input.classMethodPage,
          input.classMethodPageSize
        );
        input.setClassMethodPageResult(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    input.allPackagesOption,
    input.classMethodMode,
    input.classMethodPackageScope,
    input.classMethodPage,
    input.classMethodPageSize,
    input.classMethodSearchTerm,
    input.resolvedBrowserEnvironmentId,
    input.selectedDomain,
    input.setClassMethodPageResult
  ]);

  useEffect(() => {
    if (input.runtimeForm !== input.activeListenerForm) {
      input.setRuntimeForm(input.activeListenerForm);
    }
  }, [input.activeListenerForm, input.runtimeForm, input.setRuntimeForm]);

  useEffect(() => {
    if (
      input.conversationDraft === input.previousConversationHandoffPromptRef.current &&
      input.conversationDraft !== input.conversationHandoffPrompt
    ) {
      input.setConversationDraft(input.conversationHandoffPrompt);
    }
    input.previousConversationHandoffPromptRef.current = input.conversationHandoffPrompt;
  }, [
    input.conversationDraft,
    input.conversationHandoffPrompt,
    input.previousConversationHandoffPromptRef,
    input.setConversationDraft
  ]);

  useEffect(() => {
    input.setListenerActionMode("default");
    input.setCustomListenerForm(null);
  }, [
    input.focusedPackage,
    input.focusedSymbol,
    input.setCustomListenerForm,
    input.setListenerActionMode,
    input.sourcePreviewLine,
    input.sourcePreviewPath
  ]);

  useEffect(() => {
    if (input.selectedDomain !== "symbols" || !input.runtimeInspectionSymbol) {
      return;
    }

    if (
      input.runtimeInspectionMode === "methods" &&
      input.symbolWorkspaceMode !== "generic-function"
    ) {
      input.setSymbolWorkspaceMode("generic-function");
      return;
    }

    if (input.runtimeEntityKind === "class" && input.symbolWorkspaceMode !== "class") {
      input.setSymbolWorkspaceMode("class");
    }
  }, [
    input.runtimeEntityKind,
    input.runtimeInspectionMode,
    input.runtimeInspectionSymbol,
    input.selectedDomain,
    input.setSymbolWorkspaceMode,
    input.symbolWorkspaceMode
  ]);
}
