import type { DesktopPreferencesDto, WorkspaceId } from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface DesktopPreferencesServiceDependencies {
  invokeService: InvokeService;
  getCurrentEnvironmentId: () => string | undefined;
  mergeDesktopPreferences: (
    base: DesktopPreferencesDto,
    patch?: Partial<DesktopPreferencesDto> | null
  ) => DesktopPreferencesDto;
  normalizeDesktopPreferencesPayload: (value: unknown) => Partial<DesktopPreferencesDto>;
  initialPreferences: DesktopPreferencesDto;
}

export class LiveDesktopPreferencesService {
  private preferences: DesktopPreferencesDto;
  private focusedWorkspaceOverride: WorkspaceId | null = null;
  private writeQueue: Promise<DesktopPreferencesDto>;

  constructor(private readonly dependencies: DesktopPreferencesServiceDependencies) {
    this.preferences = dependencies.initialPreferences;
    this.writeQueue = Promise.resolve(this.preferences);
  }

  async focusWorkspace(workspace: WorkspaceId): Promise<void> {
    this.focusedWorkspaceOverride = workspace;
    this.preferences.lastWorkspace = workspace;
    await this.setDesktopPreferences({ lastWorkspace: workspace });
  }

  async getDesktopPreferences(): Promise<DesktopPreferencesDto> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Partial<DesktopPreferencesDto>>>(
      "desktop.preferences.get",
      this.dependencies.getCurrentEnvironmentId()
    );
    this.preferences = this.dependencies.mergeDesktopPreferences(
      this.preferences,
      this.dependencies.normalizeDesktopPreferencesPayload(response.data)
    );
    if (this.focusedWorkspaceOverride) {
      this.preferences.lastWorkspace = this.focusedWorkspaceOverride;
    }
    return this.preferences;
  }

  async setDesktopPreferences(
    patch: Partial<DesktopPreferencesDto>
  ): Promise<DesktopPreferencesDto> {
    const write = async (): Promise<DesktopPreferencesDto> => {
      const nextPreferences = this.dependencies.mergeDesktopPreferences(this.preferences, patch);
      const response = await this.dependencies.invokeService<RawServiceResponse<Partial<DesktopPreferencesDto>>>(
        "desktop.preferences.set",
        this.dependencies.getCurrentEnvironmentId(),
        { desktopPreferences: nextPreferences }
      );
      if (patch.lastWorkspace) {
        this.focusedWorkspaceOverride = patch.lastWorkspace;
      }
      this.preferences = this.dependencies.mergeDesktopPreferences(
        nextPreferences,
        this.dependencies.normalizeDesktopPreferencesPayload(response.data)
      );
      return this.preferences;
    };

    const queued = this.writeQueue.catch(() => this.preferences).then(write);
    this.writeQueue = queued.catch(() => this.preferences);
    return queued;
  }
}
