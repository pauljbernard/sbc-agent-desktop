import { expect, test } from "@playwright/test";
import { _electron as electron, type ElectronApplication, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import electronBinary from "electron";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const sbclAgentRoot = resolve(projectRoot, "../sbcl-agent");
const bridgePath = resolve(projectRoot, "scripts/live-service-bridge.lisp");

type BridgeResponse = Record<string, unknown>;

function camelizeKey(value: string): string {
  return value.replace(/[-_]+([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase());
}

function camelizeKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [camelizeKey(key), camelizeKeys(entry)])
    ) as T;
  }

  return value;
}

function invokeBridge(
  environmentStatePath: string,
  operation: string,
  request?: Record<string, unknown>
): BridgeResponse {
  const args = ["--script", bridgePath, sbclAgentRoot, environmentStatePath, operation, ""];
  if (request) {
    args.push(JSON.stringify(request));
  }

  const stdout = execFileSync("sbcl", args, {
    cwd: sbclAgentRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      XDG_CACHE_HOME: process.env.XDG_CACHE_HOME ?? join(tmpdir(), "sbcl-agent-playwright-cache")
    }
  });

  return camelizeKeys(JSON.parse(stdout)) as BridgeResponse;
}

function writePassingTestingEvidence(): void {
  const reportRoot = join(sbclAgentRoot, "tmp", "test-results");
  const coverageRoot = join(sbclAgentRoot, "tmp", "coverage");
  const performanceRoot = join(sbclAgentRoot, "tmp", "performance");

  mkdirSync(reportRoot, { recursive: true });
  mkdirSync(coverageRoot, { recursive: true });
  mkdirSync(performanceRoot, { recursive: true });

  writeFileSync(
    join(reportRoot, "latest-report.json"),
    JSON.stringify(
      {
        generatedAt: 123456,
        suiteId: "sbcl-agent",
        summary: {
          total: 3,
          passed: 3,
          failed: 0,
          durationSeconds: 1.5
        },
        results: [
          { name: "project-governance-smoke", category: "service-contracts", status: "passed", durationSeconds: 0.5 },
          { name: "trace-link-smoke", category: "service-contracts", status: "passed", durationSeconds: 0.5 },
          {
            name: "persistence-smoke",
            category: "environment-and-persistence",
            status: "passed",
            durationSeconds: 0.5
          }
        ]
      },
      null,
      2
    )
  );

  writeFileSync(join(coverageRoot, "cover-index.html"), "<html><body>coverage</body></html>");
  writeFileSync(
    join(performanceRoot, "latest.sexp"),
    "(:generated-at 123456 :say-turn-latency (:avg-seconds 0.02 :min-seconds 0.01 :max-seconds 0.03 :count 3) :environment-save-load (:save-seconds 0.03 :load-seconds 0.04 :total-seconds 0.07))"
  );
}

async function waitForShellReady(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.body?.innerText?.trim().length > 0, undefined, {
    timeout: 30000
  });
  await expect(page.locator("body")).toContainText("IntentOS Shell", { timeout: 30000 });

  const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
  if (await chooser.isVisible().catch(() => false)) {
    await chooser.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(chooser).toBeHidden({ timeout: 15000 });
  }

  await expect(page.locator("body")).toContainText("Shell", { timeout: 30000 });
}

async function selectEnvironmentImageIfPresent(page: Page, imageName: string): Promise<void> {
  const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
  await chooser.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
  if (await chooser.isVisible().catch(() => false)) {
    await chooser.getByRole("button", { name: new RegExp(imageName) }).first().click();
    await expect(chooser).toBeHidden({ timeout: 15000 });
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const registry = await window.sbclAgentDesktop.host.getEnvironmentImageRegistry();
            return registry.data.currentImageName ?? null;
          }),
        { timeout: 15000 }
      )
      .toBe(imageName);
  }
}

async function launchDesktop(envOverrides: Record<string, string> = {}): Promise<{
  app: ElectronApplication;
  environmentStatePath: string;
  page: Page;
}> {
  const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-sdlc-"));
  return launchDesktopAtState(join(stateDir, "live-environment.sexp"), envOverrides);
}

async function launchDesktopAtState(
  environmentStatePath: string,
  envOverrides: Record<string, string> = {}
): Promise<{
  app: ElectronApplication;
  environmentStatePath: string;
  page: Page;
}> {
  const app = await electron.launch({
    executablePath: electronBinary,
    args: [join(projectRoot, "out/main/index.js")],
    cwd: projectRoot,
    env: {
      ...process.env,
      SBCL_AGENT_ADAPTER: "live",
      SBCL_AGENT_TRANSPORT: "pipe",
      SBCL_AGENT_PROJECT_DIR: sbclAgentRoot,
      SBCL_AGENT_ENVIRONMENT_STATE_PATH: environmentStatePath,
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      ...envOverrides
    }
  });

  const page = await app.firstWindow();
  await waitForShellReady(page);
  return { app, environmentStatePath, page };
}

async function openExitDialog(page: Page): Promise<void> {
  const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
  if (await chooser.isVisible().catch(() => false)) {
    await chooser.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(chooser).toBeHidden({ timeout: 15000 });
  }
  const shellTabs = page.getByRole("tablist", { name: "Shell rail panels" });
  const utilitiesTab = shellTabs.getByRole("tab", { name: "Utilities", exact: true });
  if (await utilitiesTab.count()) {
    await utilitiesTab.click();
  }
  await page.getByRole("button", { name: "Exit IntentOS Shell", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Exit IntentOS Shell" })).toBeVisible({ timeout: 15000 });
}

async function openWorkspace(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${name}$`) }).first().click({ timeout: 15000 });
}

async function openWorkspaceSubpage(page: Page, parent: string, child: string): Promise<void> {
  const parentButton = page.getByRole("button", { name: parent, exact: true }).first();
  await parentButton.click();
  const parentNode = parentButton.locator("xpath=ancestor::div[contains(@class,'workspace-tree-node')][1]");
  await parentNode.getByRole("button", { name: child, exact: true }).click();
}

async function createConversationSession(page: Page, title: string): Promise<void> {
  await openWorkspace(page, "Conversations");
  await page.getByRole("button", { name: "New conversation session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Conversation Session" });
  await dialog.locator("input").fill(title);
  await dialog.getByRole("button", { name: "Create Session", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

test.describe("live SDLC journey", () => {
  test.setTimeout(180000);

  test("drives the governed SDLC happy path across projects, editor, conversations, monitoring, and quality posture", async () => {
    const { app, page, environmentStatePath } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });

    try {
      const projectTitle = "SDLC Journey Validation";
      const conversationTitle = "SDLC Journey Conversation";
      const imageName = `sdlc-journey-${Date.now()}`;

      const createProjectResult = invokeBridge(environmentStatePath, "project.create", {
        title: projectTitle,
        summary: "Validate the full SDLC path inside the live shell."
      });
      const projectId = (createProjectResult.data as { id?: string } | undefined)?.id;
      if (!projectId) {
        throw new Error("Created project did not return a projectId.");
      }

      invokeBridge(environmentStatePath, "project.set-constitution", {
        projectId,
        constitution: {
          purpose: "Validate the full SDLC journey inside IntentOS Shell.",
          principles: ["governed mutation", "traceable closure", "persistent evidence"]
        }
      });
      invokeBridge(environmentStatePath, "project.append-requirement", {
        projectId,
        title: "Persist conversation drafts",
        summary: "Conversation drafts should survive environment image save and load.",
        scope: "conversation",
        kind: "functional",
        priority: "high",
        status: "draft",
        verificationKind: "test"
      });
      invokeBridge(environmentStatePath, "project.append-requirement", {
        projectId,
        title: "Preserve recovery honesty",
        summary: "The shell must distinguish restored image state from reconstructed runtime state.",
        scope: "recovery",
        kind: "non-functional",
        priority: "high",
        status: "draft",
        verificationKind: "inspection",
        nonFunctional: true
      });

      const seededDetail = await page.evaluate(async (selectedId) => {
        const result = await window.sbclAgentDesktop.query.projectDetail(selectedId);
        return result.data;
      }, projectId);

      const requirementIds = seededDetail.requirements.map((requirement) => requirement.requirementId);

      invokeBridge(environmentStatePath, "project.append-user-journey", {
        projectId,
        title: "Recover draft after relaunch",
        summary: "An operator resumes a saved image and sees the conversation draft restored.",
        actors: ["operator"],
        entrypoints: ["saved image chooser"],
        steps: ["open saved image", "navigate to conversations", "inspect restored draft"],
        outcomes: ["draft restored"],
        edgeCases: ["discarded image should not restore new state"]
      });

      const detailWithJourney = await page.evaluate(async (selectedId) => {
        const result = await window.sbclAgentDesktop.query.projectDetail(selectedId);
        return result.data;
      }, projectId);

      const journeyIds = detailWithJourney.userJourneys.map((journey) => journey.journeyId);

      invokeBridge(environmentStatePath, "project.append-feature-specification", {
        projectId,
        title: "Conversation Draft Recovery",
        summary: "Persist and restore conversation drafts across image lifecycle transitions.",
        status: "draft",
        acceptanceCriteria: ["draft text survives save current", "discard does not create a new image"],
        linkedRequirementIds: requirementIds,
        linkedJourneyIds: journeyIds
      });
      invokeBridge(environmentStatePath, "project.append-architecture-decision", {
        projectId,
        title: "Persist shell state inside the SBCL environment image",
        status: "accepted",
        summary: "Desktop state persists through the image rather than a separate database.",
        drivers: ["single-source persistence", "Lisp-native recovery"],
        consequences: ["shell state must serialize cleanly"],
        stackChoices: ["SBCL image metadata", "live bridge save/load"],
        linkedRequirementIds: requirementIds
      });
      invokeBridge(environmentStatePath, "project.bind-testing-harness", {
        projectId,
        harnessId: "full-suite"
      });
      invokeBridge(environmentStatePath, "project.append-source-root", {
        projectId,
        sourceRoot: sbclAgentRoot
      });
      invokeBridge(environmentStatePath, "project.append-quality-gate", {
        projectId,
        title: "SDLC closure gate",
        summary: "Testing, coverage, performance, and recovery posture must all remain green.",
        requiredHarnessIds: ["full-suite"],
        requireSourceRoots: true,
        maximumFailedTests: 0,
        requireCoverage: true,
        maximumSayTurnLatencySeconds: 0.05,
        maximumEnvironmentSaveLoadSeconds: 0.1,
        requireRecoveryReady: true
      });

      writePassingTestingEvidence();

      const seededProjectList = invokeBridge(environmentStatePath, "project.list");
      const seededProjects =
        ((seededProjectList.data as { projects?: unknown[] } | undefined)?.projects as unknown[] | undefined) ?? [];
      await page.evaluate(
        async ({ currentProjectId, projects }) => {
          await window.sbclAgentDesktop.desktop.setDesktopPreferences({
            lastWorkspace: "projects",
            currentProjectId,
            projects
          });
        },
        {
          currentProjectId: projectId,
          projects: seededProjects
        }
      );

      invokeBridge(environmentStatePath, "environment.save-image", {
        imageName,
        overwrite: true
      });
      await page.evaluate(async (nextImageName) => {
        await window.sbclAgentDesktop.host.loadEnvironmentImage(nextImageName);
      }, imageName);

      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await selectEnvironmentImageIfPresent(page, imageName);
      await waitForShellReady(page);
      await expect
        .poll(
          async () =>
            page.evaluate(async () => {
              const projects = await window.sbclAgentDesktop.query.projectList();
              return projects.data.projects.map((project) => project.title);
            }),
          { timeout: 15000 }
        )
        .toContain(projectTitle);

      await openWorkspace(page, "Projects");
      await expect(page.locator("body")).toContainText(projectTitle);
      await expect(page.locator("body")).toContainText("Persist conversation drafts");
      await expect(page.locator("body")).toContainText("Recover draft after relaunch");
      await expect(page.locator("body")).toContainText("Conversation Draft Recovery");
      await expect(page.locator("body")).toContainText("Persist shell state inside the SBCL environment image");
      await expect(page.locator("body")).toContainText("Quality Gates");
      await expect(page.locator("body")).toContainText("SDLC closure gate");
      await expect(page.locator("body")).toContainText("Readiness");
      await expect(page.locator("body")).toContainText(/ready|blocked/i);
      await expect(page.locator("body")).toContainText("Trace");

      await createConversationSession(page, conversationTitle);
      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill("validate conversation draft persistence");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();
      await expect(page.locator(".conversation-thread-transcript-panel")).toContainText(
        "Mock response: validate conversation draft persistence",
        { timeout: 8000 }
      );

      await openWorkspace(page, "Editor");
      const editorShell = page.locator(".editor-journey .lisp-editor-shell").first();
      await expect(editorShell).toBeVisible({ timeout: 15000 });
      await editorShell.click({ position: { x: 24, y: 24 } });
      await page.keyboard.type(" (defun conversation-draft-recovery-smoke () :ok)");
      await expect(page.locator(".cm-content").first()).toContainText("conversation-draft-recovery-smoke");

      await openWorkspaceSubpage(page, "Browser", "Console");
      await expect(page.locator("body")).toContainText("Visible");
      await expect(page.locator("body")).toContainText("Alerts");
      await expect(page.locator("body")).toContainText("Processes");
      await expect(page.locator("body")).toContainText("Context");
      await expect(page.locator("body")).toContainText("Detail");
      await expect(page.locator("body")).toContainText("Plane");
      await expect(page.locator("body")).toContainText("Source");

      await openWorkspaceSubpage(page, "Browser", "Performance");
      await expect(page.locator("body")).toContainText("CPU");
      await expect(page.locator("body")).toContainText("Load 1m");
      await expect(page.locator("body")).toContainText("RSS");
      await expect(page.locator("body")).toContainText("Heap Used");
      await expect(page.locator("body")).toContainText("Performance Posture");
      await expect(page.locator("body")).toContainText("Sampled At");

      await openWorkspaceSubpage(page, "Browser", "Host I/O");
      await expect(page.locator("body")).toContainText("Connections");
      await expect(page.locator("body")).toContainText("Interfaces");
      await expect(page.locator("body")).toContainText("Disk Read");
      await expect(page.locator("body")).toContainText("Disk Write");
      await expect(page.locator("body")).toContainText("Network Summary");
      await expect(page.locator("body")).toContainText("Disk Summary");
    } finally {
      await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      await app.close();
    }
  });

  test("surfaces blocked quality-gate posture when testing evidence is incomplete", async () => {
    const { app, page, environmentStatePath } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });

    try {
      const projectTitle = "Blocked Gate Validation";
      const imageName = `sdlc-blocked-${Date.now()}`;

      const createProjectResult = invokeBridge(environmentStatePath, "project.create", {
        title: projectTitle,
        summary: "Validate blocked quality-gate posture in the live shell."
      });
      const projectId = (createProjectResult.data as { id?: string } | undefined)?.id;
      if (!projectId) {
        throw new Error("Created project did not return a projectId.");
      }

      invokeBridge(environmentStatePath, "project.append-requirement", {
        projectId,
        title: "Coverage evidence required",
        summary: "The project should remain blocked until coverage evidence exists.",
        scope: "testing",
        kind: "functional",
        priority: "high",
        status: "draft",
        verificationKind: "test"
      });
      invokeBridge(environmentStatePath, "project.bind-testing-harness", {
        projectId,
        harnessId: "full-suite"
      });
      invokeBridge(environmentStatePath, "project.append-source-root", {
        projectId,
        sourceRoot: sbclAgentRoot
      });
      invokeBridge(environmentStatePath, "project.append-quality-gate", {
        projectId,
        title: "Blocked coverage gate",
        summary: "Coverage and recovery posture must exist before closure.",
        requiredHarnessIds: ["full-suite"],
        requireSourceRoots: true,
        requireCoverage: true,
        requireRecoveryReady: true
      });

      const seededProjectList = invokeBridge(environmentStatePath, "project.list");
      const seededProjects =
        ((seededProjectList.data as { projects?: unknown[] } | undefined)?.projects as unknown[] | undefined) ?? [];
      await page.evaluate(
        async ({ currentProjectId, projects }) => {
          await window.sbclAgentDesktop.desktop.setDesktopPreferences({
            lastWorkspace: "projects",
            currentProjectId,
            projects
          });
        },
        {
          currentProjectId: projectId,
          projects: seededProjects
        }
      );

      invokeBridge(environmentStatePath, "environment.save-image", {
        imageName,
        overwrite: true
      });
      await page.evaluate(async (nextImageName) => {
        await window.sbclAgentDesktop.host.loadEnvironmentImage(nextImageName);
      }, imageName);

      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await selectEnvironmentImageIfPresent(page, imageName);
      await waitForShellReady(page);

      await openWorkspace(page, "Projects");
      await expect(page.locator("body")).toContainText(projectTitle);
      await expect(page.locator("body")).toContainText("Blocked coverage gate");
      await expect(page.locator("body")).toContainText("Readiness");
      await expect(page.locator("body")).toContainText("blocked");
      await expect(page.locator("body")).toContainText("Blocked");
      await expect(page.locator("body")).toContainText("1");
    } finally {
      await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      await app.close().catch(() => undefined);
    }
  });

  test("supports shell exit Save As New and offers the saved image again at startup", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-sdlc-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");
    const imageName = `sdlc-save-as-${Date.now()}`;
    let app: ElectronApplication | null = null;
    let page: Page | null = null;

    try {
      const launched = await launchDesktopAtState(environmentStatePath, {
        TUTOR_CODEX_PROVIDER: "mock"
      });
      app = launched.app;
      page = launched.page;

      await page.evaluate(async () => {
        await window.sbclAgentDesktop.desktop.setDesktopPreferences({
          lastWorkspace: "conversations",
          conversationDraft: "save-as-new lifecycle draft"
        });
      });

      await openExitDialog(page);
      const dialog = page.getByRole("dialog", { name: "Exit IntentOS Shell" });
      await dialog.locator("input").fill(imageName);
      await dialog.getByRole("button", { name: "Save As New", exact: true }).click();

      await expect
        .poll(
          async () => {
            const registry = invokeBridge(environmentStatePath, "environment.image-registry");
            const data = (registry.data as { images?: Array<{ name?: string }> } | undefined) ?? {};
            return (data.images ?? []).some((image) => image.name === imageName);
          },
          { timeout: 15000 }
        )
        .toBe(true);

      await app.close().catch(() => undefined);
      app = null;
      page = null;

      const relaunched = await launchDesktopAtState(environmentStatePath, {
        TUTOR_CODEX_PROVIDER: "mock"
      });
      app = relaunched.app;
      page = relaunched.page;

      const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
      await expect(chooser).toBeVisible({ timeout: 15000 });
      await expect(chooser).toContainText(imageName);
    } finally {
      if (page) {
        await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      }
      if (app) {
        await app.close().catch(() => undefined);
      }
    }
  });

  test("surfaces degraded recovery posture as a blocked project quality gate", async () => {
    const { app, page, environmentStatePath } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });

    try {
      const projectTitle = "Recovery Gate Validation";
      const imageName = `sdlc-recovery-${Date.now()}`;

      const createProjectResult = invokeBridge(environmentStatePath, "project.create", {
        title: projectTitle,
        summary: "Validate degraded recovery posture through project quality gates."
      });
      const projectId = (createProjectResult.data as { id?: string } | undefined)?.id;
      if (!projectId) {
        throw new Error("Created project did not return a projectId.");
      }

      invokeBridge(environmentStatePath, "project.append-quality-gate", {
        projectId,
        title: "Recovery readiness gate",
        summary: "The project stays blocked until the restored environment is recovery-ready.",
        requireRecoveryReady: true
      });

      const seededProjectList = invokeBridge(environmentStatePath, "project.list");
      const seededProjects =
        ((seededProjectList.data as { projects?: unknown[] } | undefined)?.projects as unknown[] | undefined) ?? [];
      await page.evaluate(
        async ({ currentProjectId, projects }) => {
          await window.sbclAgentDesktop.desktop.setDesktopPreferences({
            lastWorkspace: "projects",
            currentProjectId,
            projects
          });
        },
        {
          currentProjectId: projectId,
          projects: seededProjects
        }
      );

      invokeBridge(environmentStatePath, "environment.save-image", {
        imageName,
        overwrite: true
      });
      await page.evaluate(async (nextImageName) => {
        await window.sbclAgentDesktop.host.loadEnvironmentImage(nextImageName);
      }, imageName);

      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await selectEnvironmentImageIfPresent(page, imageName);
      await waitForShellReady(page);
      await expect
        .poll(
          async () =>
            page.evaluate(async () => {
              const projects = await window.sbclAgentDesktop.query.projectList();
              return projects.data.projects.map((project) => project.title);
            }),
          { timeout: 15000 }
        )
        .toContain(projectTitle);

      await openWorkspace(page, "Projects");
      await expect(page.locator("body")).toContainText(projectTitle);
      await expect(page.locator("body")).toContainText("Recovery readiness gate");
      await expect(page.locator("body")).toContainText("Readiness");
      await expect(page.locator("body")).toContainText("blocked");
      await expect(page.locator("body")).toContainText("recovery ready required");
    } finally {
      await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      await app.close().catch(() => undefined);
    }
  });

  test("surfaces incident-linked project evidence across projects and incidents", async () => {
    const { app, page, environmentStatePath } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });

    try {
      const projectTitle = "Incident Evidence Validation";
      const incidentTitle = "Operator-visible runtime incident";
      const imageName = `sdlc-incident-${Date.now()}`;

      const createProjectResult = invokeBridge(environmentStatePath, "project.create", {
        title: projectTitle,
        summary: "Validate project-to-incident trace and evidence in the live shell."
      });
      const projectId = (createProjectResult.data as { id?: string } | undefined)?.id;
      if (!projectId) {
        throw new Error("Created project did not return a projectId.");
      }

      const incidentCreateResult = invokeBridge(environmentStatePath, "incident.create", {
        kind: "runtime-condition",
        title: incidentTitle,
        summary: "Synthetic incident created for the SDLC journey automation."
      });
      const incidentId = (incidentCreateResult.data as { id?: string } | undefined)?.id;
      if (!incidentId) {
        throw new Error("Created incident did not return an incidentId.");
      }

      invokeBridge(environmentStatePath, "project.bind-incident", {
        projectId,
        incidentId
      });

      const seededProjectList = invokeBridge(environmentStatePath, "project.list");
      const seededProjects =
        ((seededProjectList.data as { projects?: unknown[] } | undefined)?.projects as unknown[] | undefined) ?? [];
      await page.evaluate(
        async ({ currentProjectId, projects }) => {
          await window.sbclAgentDesktop.desktop.setDesktopPreferences({
            lastWorkspace: "projects",
            currentProjectId,
            projects
          });
        },
        {
          currentProjectId: projectId,
          projects: seededProjects
        }
      );

      invokeBridge(environmentStatePath, "environment.save-image", {
        imageName,
        overwrite: true
      });
      await page.evaluate(async (nextImageName) => {
        await window.sbclAgentDesktop.host.loadEnvironmentImage(nextImageName);
      }, imageName);

      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await selectEnvironmentImageIfPresent(page, imageName);
      await waitForShellReady(page);
      await expect
        .poll(
          async () =>
            page.evaluate(async () => {
              const projects = await window.sbclAgentDesktop.query.projectList();
              return projects.data.projects.map((project) => project.title);
            }),
          { timeout: 15000 }
        )
        .toContain(projectTitle);

      await openWorkspace(page, "Projects");
      await expect(page.locator("body")).toContainText(projectTitle);
      await expect(page.locator("body")).toContainText(incidentTitle);
      await expect(page.locator("body")).toContainText("Architecture And Evidence");
      await expect(page.locator("body")).toContainText("Operator-visible runtime incident");
      await expect(page.locator("body")).toContainText("Trace");
      await expect(page.locator("body")).toContainText("tracked_by_incident");

      await openWorkspace(page, "Incidents");
      await expect(page.locator("body")).toContainText(incidentTitle);
      await expect(page.locator("body")).toContainText("Trace");
    } finally {
      await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      await app.close().catch(() => undefined);
    }
  });

  test("supports shell exit Discard without creating a new saved image", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-sdlc-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");
    const preservedImageName = `sdlc-discard-preserved-${Date.now()}`;
    const discardedDraft = "discard lifecycle draft";
    const discardedPostImageDraft = "discarded post-image draft";
    let app: ElectronApplication | null = null;
    let page: Page | null = null;

    try {
      const launched = await launchDesktopAtState(environmentStatePath, {
        TUTOR_CODEX_PROVIDER: "mock"
      });
      app = launched.app;
      page = launched.page;

      await page.evaluate(async (conversationDraft) => {
        await window.sbclAgentDesktop.desktop.setDesktopPreferences({
          lastWorkspace: "conversations",
          conversationDraft
        });
      }, discardedDraft);

      invokeBridge(environmentStatePath, "environment.save-image", {
        imageName: preservedImageName,
        overwrite: true
      });
      const registryBeforeDiscard = invokeBridge(environmentStatePath, "environment.image-registry");
      const imageNamesBeforeDiscard = (
        (((registryBeforeDiscard.data as { images?: Array<{ name?: string }> } | undefined) ?? {}).images ?? [])
          .map((image) => image.name)
          .filter((name): name is string => Boolean(name))
      );

      await page.evaluate(async (nextImageName) => {
        await window.sbclAgentDesktop.host.loadEnvironmentImage(nextImageName);
      }, preservedImageName);
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await selectEnvironmentImageIfPresent(page, preservedImageName);
      await waitForShellReady(page);

      await page.evaluate(async () => {
        await window.sbclAgentDesktop.desktop.setDesktopPreferences({
          lastWorkspace: "conversations",
          conversationDraft: "discarded post-image draft"
        });
      });

      await openExitDialog(page);
      const dialog = page.getByRole("dialog", { name: "Exit IntentOS Shell" });
      await dialog.getByRole("button", { name: "Discard", exact: true }).click();

      await app.close().catch(() => undefined);
      app = null;
      page = null;

      const registry = invokeBridge(environmentStatePath, "environment.image-registry");
      const images = (((registry.data as { images?: Array<{ name?: string }> } | undefined) ?? {}).images ?? [])
        .map((image) => image.name)
        .filter((name): name is string => Boolean(name));
      expect(images).toContain(preservedImageName);
      expect(images).toEqual(imageNamesBeforeDiscard);

      const relaunched = await launchDesktopAtState(environmentStatePath, {
        TUTOR_CODEX_PROVIDER: "mock"
      });
      app = relaunched.app;
      page = relaunched.page;

      const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
      await expect(chooser).toBeVisible({ timeout: 15000 });
      await expect(chooser).toContainText(preservedImageName);

      await chooser.getByRole("button", { name: new RegExp(preservedImageName) }).first().click();
      await expect(chooser).toBeHidden({ timeout: 15000 });
      await waitForShellReady(page);

      await openWorkspace(page, "Conversations");
      const preferences = await page.evaluate(() => window.sbclAgentDesktop.desktop.getDesktopPreferences());
      expect(preferences.conversationDraft).toBe(discardedDraft);
      expect(preferences.conversationDraft).not.toBe(discardedPostImageDraft);
    } finally {
      if (page) {
        await page.evaluate(() => window.sbclAgentDesktop.desktop.quitApp()).catch(() => undefined);
      }
      if (app) {
        await app.close().catch(() => undefined);
      }
    }
  });
});
