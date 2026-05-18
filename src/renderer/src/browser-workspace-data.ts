import type {
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeSymbolBrowserPageDto
} from "../../shared/contracts";
import { normalizeBrowserPackageData } from "./browser-workspace-support";

export function buildPackageNames(
  packageBrowser: QueryResultDto<PackageBrowserDto> | null,
  runtimeSummary: RuntimeSummaryDto | null
): string[] {
  return Array.from(
    new Set([
      ...(packageBrowser?.data.availablePackages ?? []),
      runtimeSummary?.currentPackage,
      packageBrowser?.data.packageName,
      ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
    ].filter((value): value is string => Boolean(value)))
  );
}

export function resolveBrowserEnvironmentId(
  packageBrowser: QueryResultDto<PackageBrowserDto> | null,
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null,
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null,
  environmentId: string | null
): string | null {
  return (
    packageBrowser?.metadata.binding?.environmentId ??
    runtimeInspection?.metadata.binding?.environmentId ??
    runtimeEntityDetail?.metadata.binding?.environmentId ??
    environmentId
  );
}

export function scopedPackageNames(
  scope: string,
  packageNames: string[],
  allPackagesOption: string
): string[] {
  return scope === allPackagesOption ? packageNames : scope ? [scope] : [];
}

export function mergePackageBrowserCacheEntries(
  current: Record<string, PackageBrowserDto>,
  entries: Record<string, PackageBrowserDto>
): Record<string, PackageBrowserDto> {
  const entryNames = Object.keys(entries);
  if (entryNames.length === 0) {
    return current;
  }
  let changed = false;
  const next = { ...current };
  for (const packageName of entryNames) {
    if (next[packageName] !== entries[packageName]) {
      next[packageName] = entries[packageName];
      changed = true;
    }
  }
  return changed ? next : current;
}

export function browserDataForPackage(
  packageName: string,
  packageBrowser: QueryResultDto<PackageBrowserDto> | null,
  packageBrowserCache: Record<string, PackageBrowserDto>
): PackageBrowserDto | null {
  if (packageBrowser?.data.packageName === packageName) {
    return packageBrowser.data;
  }
  return packageBrowserCache[packageName] ?? null;
}

export async function fetchPackageBrowserData(input: {
  environmentId: string | null;
  packageName: string;
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  packageBrowserCache: Record<string, PackageBrowserDto>;
}): Promise<PackageBrowserDto | null> {
  if (!input.environmentId || !input.packageName) {
    return null;
  }
  if (
    input.packageBrowserCache[input.packageName] ||
    input.packageBrowser?.data.packageName === input.packageName
  ) {
    return input.packageBrowserCache[input.packageName] ?? input.packageBrowser?.data ?? null;
  }
  const result = await window.sbclAgentDesktop.query.packageBrowser({
    environmentId: input.environmentId,
    packageName: input.packageName
  });
  return result.data;
}

export async function ensurePackageBrowserData(input: {
  environmentId: string | null;
  packageName: string;
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  packageBrowserCache: Record<string, PackageBrowserDto>;
  packageBrowserLoadRef: { current: Map<string, Promise<void>> };
  setPackageBrowserCache: (
    updater: (current: Record<string, PackageBrowserDto>) => Record<string, PackageBrowserDto>
  ) => void;
}): Promise<void> {
  if (!input.environmentId || !input.packageName) {
    return;
  }
  if (
    input.packageBrowserCache[input.packageName] ||
    input.packageBrowser?.data.packageName === input.packageName
  ) {
    return;
  }
  const existingLoad = input.packageBrowserLoadRef.current.get(input.packageName);
  if (existingLoad) {
    return existingLoad;
  }
  let loadPromise: Promise<void> | null = null;
  loadPromise = (async () => {
    try {
      const result = await fetchPackageBrowserData({
        environmentId: input.environmentId,
        packageName: input.packageName,
        packageBrowser: input.packageBrowser,
        packageBrowserCache: input.packageBrowserCache
      });
      if (!result) {
        return;
      }
      input.setPackageBrowserCache((current) =>
        mergePackageBrowserCacheEntries(current, { [input.packageName]: result })
      );
    } finally {
      if (input.packageBrowserLoadRef.current.get(input.packageName) === loadPromise) {
        input.packageBrowserLoadRef.current.delete(input.packageName);
      }
    }
  })();
  input.packageBrowserLoadRef.current.set(input.packageName, loadPromise);
  return loadPromise;
}

export async function loadRuntimeSymbolPage(input: {
  resolvedBrowserEnvironmentId: string | null;
  allPackagesOption: string;
  packageScope: string;
  kinds: Array<PackageBrowserSymbolDto["kind"]>;
  visibility?: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto> | null> {
  if (!input.resolvedBrowserEnvironmentId) {
    return null;
  }
  return window.sbclAgentDesktop.query.runtimeSymbolPage({
    environmentId: input.resolvedBrowserEnvironmentId,
    packageScope: input.packageScope === input.allPackagesOption ? null : input.packageScope,
    kinds: input.kinds,
    visibility:
      input.visibility === "external" || input.visibility === "internal" ? input.visibility : "all",
    search: input.search?.trim() ? input.search.trim() : undefined,
    offset: (input.page - 1) * input.pageSize,
    limit: input.pageSize
  });
}

export function collectScopedPackageSymbols(input: {
  scope: string;
  packageNames: string[];
  allPackagesOption: string;
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  packageBrowserCache: Record<string, PackageBrowserDto>;
}): Array<PackageBrowserSymbolDto & { packageName: string }> {
  return scopedPackageNames(input.scope, input.packageNames, input.allPackagesOption)
    .flatMap((packageName) => {
      const browserData = browserDataForPackage(packageName, input.packageBrowser, input.packageBrowserCache);
      if (!browserData) {
        return [];
      }
      const normalized = normalizeBrowserPackageData(browserData, packageName);
      return [
        ...normalized.externalSymbols.map((entry) => ({ ...entry, packageName: normalized.packageName })),
        ...normalized.internalSymbols.map((entry) => ({ ...entry, packageName: normalized.packageName }))
      ];
    })
    .filter(
      (entry, index, entries) =>
        entries.findIndex(
          (candidate) =>
            candidate.packageName === entry.packageName &&
            candidate.symbol === entry.symbol &&
            candidate.kind === entry.kind &&
            candidate.visibility === entry.visibility
        ) === index
    );
}
