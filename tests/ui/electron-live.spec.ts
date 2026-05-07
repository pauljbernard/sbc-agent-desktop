import { expect, test } from "@playwright/test";
import { _electron as electron, type ElectronApplication, type Locator, type Page } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import electronBinary from "electron";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const sbclAgentRoot = resolve(projectRoot, "../sbcl-agent");

async function launchDesktop(): Promise<{
  app: ElectronApplication;
  page: Page;
}>;
async function launchDesktop(
  envOverrides?: Record<string, string>,
  environmentStatePathOverride?: string
): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-"));
  const environmentStatePath = environmentStatePathOverride ?? join(stateDir, "live-environment.sexp");

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
      ...(envOverrides ?? {})
    }
  });

  const page = await app.firstWindow();
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? String(error));
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForFunction(() => document.body?.innerText?.trim().length > 0, undefined, {
      timeout: 30000
    });
    await expect(page.locator("body")).toContainText("Surface", { timeout: 30000 });
    const chooser = page.getByRole("dialog", { name: "Open Environment Image" });
    await chooser.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    if (await chooser.isVisible().catch(() => false)) {
      await chooser.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(chooser).toBeHidden({ timeout: 15000 });
    }
    await expect(page.locator("body")).toContainText("Shell", { timeout: 30000 });
    await expect(page.getByRole("button", { name: "Conversations", exact: true }).first()).toBeVisible({
      timeout: 30000
    });
  } catch (error) {
    const bodyText = await page.locator("body").textContent();
    const diagnostics = [
      `body=${JSON.stringify(bodyText)}`,
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `consoleErrors=${JSON.stringify(consoleErrors)}`
    ].join("\n");
    throw new Error(`${String(error)}\n${diagnostics}`);
  }

  return { app, page };
}

async function closeDesktop(app: ElectronApplication, _page: Page): Promise<void> {
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timed out closing Electron app")), 5000);
      })
    ]);
    return;
  } catch {
    // Fall through to a hard exit if a clean close does not complete.
  }
  try {
    await app.evaluate(async ({ app: electronApp }) => {
      electronApp.exit(0);
    });
  } catch {
    // The process may already be shutting down.
  }
  try {
    app.process().kill("SIGKILL");
  } catch {
    // Ignore if the process is already gone.
  }
}

async function shellMetrics(page: Page): Promise<{
  gridTemplateColumns: string;
  sidebarWidth: number;
  canvasWidth: number;
  inspectorWidth: number;
}> {
  return page.evaluate(() => {
    const shell = document.querySelector(".desktop-shell");
    const sidebar = document.querySelector("aside.sidebar");
    const canvas = document.querySelector("main.canvas, aside.canvas");
    const inspector = document.querySelector("aside.inspector");
    if (!(shell instanceof HTMLElement) || !(sidebar instanceof HTMLElement) || !(canvas instanceof HTMLElement) || !(inspector instanceof HTMLElement)) {
      throw new Error("Expected shell panels to be present.");
    }
    return {
      gridTemplateColumns: window.getComputedStyle(shell).gridTemplateColumns,
      sidebarWidth: sidebar.getBoundingClientRect().width,
      canvasWidth: canvas.getBoundingClientRect().width,
      inspectorWidth: inspector.getBoundingClientRect().width
    };
  });
}

async function shellSplitterMetrics(page: Page): Promise<{
  leftX: number;
  rightX: number;
  sidebarWidth: number;
  inspectorWidth: number;
}> {
  return page.evaluate(() => {
    const leftSplitter = document.querySelector<HTMLElement>(".shell-column-splitter-left");
    const rightSplitter = document.querySelectorAll<HTMLElement>(".shell-column-splitter");
    const shell = document.querySelector<HTMLElement>(".desktop-shell");
    const sidebar = document.querySelector<HTMLElement>("aside.sidebar");
    const inspector = document.querySelector<HTMLElement>("aside.inspector");
    if (!leftSplitter || rightSplitter.length === 0 || !shell || !sidebar || !inspector) {
      throw new Error("Expected shell splitters and rail panels to be present.");
    }
    const leftRect = leftSplitter.getBoundingClientRect();
    const rightRect = rightSplitter[rightSplitter.length - 1].getBoundingClientRect();
    return {
      leftX: leftRect.x + leftRect.width / 2,
      rightX: rightRect.x + rightRect.width / 2,
      sidebarWidth: sidebar.getBoundingClientRect().width,
      inspectorWidth: inspector.getBoundingClientRect().width
    };
  });
}

async function dismissBlockingProjectDialogIfPresent(page: Page): Promise<void> {
  const dialog = page.locator(".project-dialog-overlay [role='dialog']").last();
  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }
  const continueButton = dialog.getByRole("button", { name: "Continue", exact: true }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click({ timeout: 15000 });
    await expect(dialog).toBeHidden({ timeout: 15000 });
    return;
  }
  const discardButton = dialog.getByRole("button", { name: "Discard", exact: true }).first();
  if (await discardButton.isVisible().catch(() => false)) {
    await discardButton.click({ timeout: 15000 });
    await expect(dialog).toBeHidden({ timeout: 15000 });
    return;
  }
  const dismissButton = dialog.getByRole("button", { name: /^(Close|Cancel)$/ }).first();
  await dismissButton.click({ timeout: 15000 });
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

async function openWorkspace(page: Page, name: string): Promise<void> {
  await dismissBlockingProjectDialogIfPresent(page);
  const sidebar = page.locator("aside.sidebar").first();
  const button = sidebar.getByRole("button", { name: new RegExp(`^${name}$`) }).first();
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout: 15000 });
  await dismissBlockingProjectDialogIfPresent(page);
}

function workspaceInspector(page: Page): Locator {
  return page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first();
}

async function openWorkspaceSubpage(page: Page, parent: string, child: string): Promise<void> {
  if (parent === "Operate") {
    if (child === "Journeys") {
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const [workItems, approvals, incidents] = await Promise.all([
            window.sbclAgentDesktop.query.workItemList(environmentId),
            window.sbclAgentDesktop.query.approvalRequestList(environmentId),
            window.sbclAgentDesktop.query.incidentList(environmentId)
          ]);
          return workItems.data.length > 0 || approvals.data.length > 0 || incidents.data.length > 0;
        });
      }, { timeout: 15000 }).toBeTruthy();
    }
    const sidebar = page.locator("aside.sidebar").first();
    const parentNode = sidebar.locator(".workspace-tree-node").filter({
      has: page.getByRole("button", { name: parent, exact: true })
    }).first();
    await dismissBlockingProjectDialogIfPresent(page);
    const parentButton = parentNode.getByRole("button", { name: parent, exact: true }).first();
    await parentButton.scrollIntoViewIfNeeded();
    await parentButton.evaluate((element: HTMLElement) => element.click());
    const orientationButton = parentNode.getByRole("button", { name: "Orientation", exact: true }).first();
    await orientationButton.scrollIntoViewIfNeeded();
    await orientationButton.evaluate((element: HTMLElement) => element.click());
    await expect(page.locator(".environment-grid")).toContainText("Orientation Records", { timeout: 15000 });
    if (child !== "Orientation") {
      const childButton = parentNode.getByRole("button", { name: child, exact: true }).first();
      await childButton.scrollIntoViewIfNeeded();
      await childButton.evaluate((element: HTMLElement) => element.click());
    }
    await dismissBlockingProjectDialogIfPresent(page);
    return;
  }

  await openWorkspace(page, parent);
  const parentNode = page.locator(".workspace-tree-node").filter({
    has: page.getByRole("button", { name: parent, exact: true })
  }).first();
  const childButton = parentNode.getByRole("button", { name: child, exact: true }).first();
  await childButton.scrollIntoViewIfNeeded();
  await childButton.click({ timeout: 15000 });
  await dismissBlockingProjectDialogIfPresent(page);
}

async function createConversationSession(page: Page, title: string): Promise<void> {
  await openWorkspace(page, "Conversations");
  await page.getByRole("button", { name: "New conversation session", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Conversation Session" });
  await dialog.locator("input").fill(title);
  const createButton = dialog.getByRole("button", { name: "Create Session", exact: true });
  await expect(createButton).toBeEnabled({ timeout: 15000 });
  await createButton.click();
  try {
    await expect(dialog).toBeHidden({ timeout: 4000 });
  } catch {
    await createButton.click();
    await expect(dialog).toBeHidden({ timeout: 15000 });
  }
  await expect(page.locator(".conversation-list-panel")).toContainText(title, { timeout: 15000 });
  await selectConversationThread(page, title);
  await expect(page.locator(".conversation-browse-detail-panel .eyebrow")).toContainText(title, { timeout: 15000 });
  await expect(page.locator(".conversation-composer-panel .conversation-draft-editor")).toBeVisible({ timeout: 15000 });
}

async function domClick(locator: Locator): Promise<void> {
  await locator.evaluate((element: HTMLElement) => element.click());
}

async function railOptionLabels(listbox: Locator): Promise<string[]> {
  return listbox.locator(".shell-dock-list-option").evaluateAll((elements) =>
    elements.map((element) => (element.textContent ?? "").trim()).filter((label) => label.length > 0)
  );
}

async function selectConversationThread(page: Page, title: string): Promise<void> {
  const listPanel = page.locator(".conversation-list-panel");
  await expect(listPanel).toContainText(title, { timeout: 15000 });
  const row = listPanel.locator(".browser-table-row").filter({ hasText: title }).first();
  await row.scrollIntoViewIfNeeded();
  const detailPanel = page.locator(".conversation-browse-detail-panel");
  await expect(detailPanel).not.toContainText("Select a thread first.", { timeout: 15000 });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await row.evaluate((element: HTMLElement) => element.click());
    await expect(row).toHaveClass(/selected|active/, { timeout: 15000 });
    try {
      await expect(detailPanel).toContainText(title, { timeout: 3000 });
      return;
    } catch {
      await page.waitForTimeout(350);
    }
  }
  await expect(detailPanel).toContainText(title, { timeout: 15000 });
}


async function approvalRequests(page: Page): Promise<Array<{ requestId: string; title: string; summary: string; state: string }>> {
  return page.evaluate(async () => {
    const summary = await window.sbclAgentDesktop.query.environmentSummary();
    const environmentId = summary.data.environmentId;
    const result = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
    return result.data.map((request) => ({
      requestId: request.requestId,
      title: request.title,
      summary: request.summary,
      state: request.state
    }));
  });
}

async function approvalRequestIds(page: Page): Promise<string[]> {
  return (await approvalRequests(page)).map((request) => request.requestId);
}

async function nextApprovalRequestId(page: Page, previousIds: string[]): Promise<string> {
  await expect.poll(async () => (await approvalRequestIds(page)).some((id) => !previousIds.includes(id)), { timeout: 15000 }).toBeTruthy();
  const ids = await approvalRequestIds(page);
  const requestId = ids.find((id) => !previousIds.includes(id));
  if (!requestId) {
    throw new Error(`No new approval request found. Existing ids: ${ids.join(", ")}`);
  }
  return requestId;
}

async function currentAwaitingApprovalRequestId(page: Page): Promise<string> {
  await expect.poll(async () => {
    const requests = await approvalRequests(page);
    return requests.some((request) => request.state === "awaiting");
  }, { timeout: 15000 }).toBeTruthy();
  const requests = await approvalRequests(page);
  const request = requests.find((entry) => entry.state === "awaiting");
  if (!request) {
    throw new Error(`No awaiting approval request found. Requests: ${JSON.stringify(requests)}`);
  }
  return request.requestId;
}

async function approveNewRequest(page: Page, previousIds: string[]): Promise<string> {
  return nextApprovalRequestId(page, previousIds);
}

async function denyNewRequest(page: Page, previousIds: string[]): Promise<string> {
  return nextApprovalRequestId(page, previousIds);
}

async function openBrowserManualInspect(page: Page): Promise<{
  symbolInput: ReturnType<Page["locator"]>;
  packageInput: ReturnType<Page["locator"]>;
  modeSelect: ReturnType<Page["locator"]>;
  browseButton: ReturnType<Page["locator"]>;
}> {
  await openWorkspace(page, "Browser");
  const manualInspectCard = page.locator(".browser-secondary-card");
  const showButton = manualInspectCard.getByRole("button", { name: "Show", exact: true });
  if (await showButton.isVisible()) {
    await showButton.click();
  }

  const controls = manualInspectCard.locator(".runtime-inspector-controls");
  return {
    symbolInput: controls.locator("input").nth(0),
    packageInput: controls.locator("input").nth(1),
    modeSelect: controls.locator("select"),
    browseButton: controls.locator(".action-button")
  };
}

async function openConversationTurnTabIfPresent(page: Page): Promise<void> {
  const turnTab = page.getByRole("tab", { name: "Turn", exact: true });
  if (await turnTab.isVisible().catch(() => false)) {
    await turnTab.click();
  }
}

async function openOperateJourneys(page: Page): Promise<void> {
  await openWorkspaceSubpage(page, "Operate", "Journeys");
  await expect(operateQueuePanel(page)).toContainText("Ranked Governed Queue", { timeout: 15000 });
}

async function openOperateEvidence(page: Page): Promise<void> {
  await openWorkspaceSubpage(page, "Operate", "Evidence");
  await expect(operateEvidencePanel(page)).toContainText("Evidence Table", { timeout: 15000 });
}

function operateQueuePanel(page: Page) {
  return page.locator(".operate-table-panel").filter({ hasText: "Ranked Governed Queue" }).first();
}

function operateJourneyPanel(page: Page) {
  return page.locator(".operate-table-panel").filter({ hasText: "Journey Queue" }).first();
}

function operateEvidencePanel(page: Page) {
  return page.locator(".operate-table-panel").filter({ hasText: "Evidence Table" }).first();
}

function operateDetailPanel(page: Page) {
  return page.locator(".operate-detail-panel").last();
}

test.describe("live sbcl-agent desktop shell", () => {
  test("exposes the conversation creation command on the desktop bridge", async () => {
    const { app, page } = await launchDesktop();
    try {
      const bridgeShape = await page.evaluate(() => ({
        hasDesktop: typeof window.sbclAgentDesktop === "object" && window.sbclAgentDesktop !== null,
        hasCommand: typeof window.sbclAgentDesktop?.command === "object" && window.sbclAgentDesktop.command !== null,
        hasCreateConversationThread:
          typeof window.sbclAgentDesktop?.command?.createConversationThread === "function"
      }));

      expect(bridgeShape.hasDesktop).toBe(true);
      expect(bridgeShape.hasCommand).toBe(true);
      expect(bridgeShape.hasCreateConversationThread).toBe(true);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("collapses shell side rails and changes their outer widths", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sidebar = page.locator("aside.sidebar").first();
      const inspector = page.locator("aside.inspector").first();
      const initialMetrics = await shellMetrics(page);

      const initialSidebarWidth = (await sidebar.boundingBox())?.width ?? 0;
      const initialInspectorWidth = (await inspector.boundingBox())?.width ?? 0;

      await domClick(sidebar.getByRole("button", { name: "Hide Navigation", exact: true }));
      const collapsedSidebar = page.locator("aside.sidebar.sidebar-collapsed-rail").first();
      await expect(collapsedSidebar).toBeVisible({ timeout: 15000 });
      const collapsedSidebarWidth = (await collapsedSidebar.boundingBox())?.width ?? 0;
      const sidebarCollapsedMetrics = await shellMetrics(page);

      await domClick(inspector.getByRole("button", { name: "Collapse workspace panel", exact: true }));
      const collapsedInspector = page.locator("aside.inspector.inspector-collapsed-rail").first();
      await expect(collapsedInspector).toBeVisible({ timeout: 15000 });
      const collapsedInspectorWidth = (await collapsedInspector.boundingBox())?.width ?? 0;
      const fullyCollapsedMetrics = await shellMetrics(page);

      expect(initialSidebarWidth).toBeGreaterThan(180);
      expect(initialInspectorWidth).toBeGreaterThan(220);
      expect(collapsedSidebarWidth).toBeLessThan(100);
      expect(collapsedInspectorWidth).toBeLessThan(100);
      expect(initialMetrics.sidebarWidth).toBeGreaterThan(180);
      expect(initialMetrics.inspectorWidth).toBeGreaterThan(220);
      expect(sidebarCollapsedMetrics.sidebarWidth).toBeLessThan(100);
      expect(sidebarCollapsedMetrics.canvasWidth).toBeGreaterThan(initialMetrics.canvasWidth);
      expect(fullyCollapsedMetrics.inspectorWidth).toBeLessThan(100);
      expect(fullyCollapsedMetrics.canvasWidth).toBeGreaterThan(sidebarCollapsedMetrics.canvasWidth);
      expect(initialMetrics.gridTemplateColumns).not.toEqual(sidebarCollapsedMetrics.gridTemplateColumns);
      expect(sidebarCollapsedMetrics.gridTemplateColumns).not.toEqual(fullyCollapsedMetrics.gridTemplateColumns);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("resizes shell side columns through the splitters", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sidebar = page.locator("aside.sidebar").first();
      const inspector = page.locator("aside.inspector").first();
      const leftSplitter = page.locator(".shell-column-splitter-left").first();
      const rightSplitter = page.locator(".shell-column-splitter").last();
      const initialMetrics = await shellMetrics(page);

      const initialSidebarWidth = (await sidebar.boundingBox())?.width ?? 0;
      const initialInspectorWidth = (await inspector.boundingBox())?.width ?? 0;
      const leftBox = await leftSplitter.boundingBox();
      const rightBox = await rightSplitter.boundingBox();

      if (!leftBox || !rightBox) {
        throw new Error("Expected both shell splitters to be visible.");
      }

      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(leftBox.x + leftBox.width / 2 + 72, leftBox.y + leftBox.height / 2);
      await page.mouse.up();

      await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rightBox.x + rightBox.width / 2 - 72, rightBox.y + rightBox.height / 2);
      await page.mouse.up();

      const resizedSidebarWidth = (await sidebar.boundingBox())?.width ?? 0;
      const resizedInspectorWidth = (await inspector.boundingBox())?.width ?? 0;
      const resizedMetrics = await shellMetrics(page);

      expect(Math.abs(resizedSidebarWidth - initialSidebarWidth)).toBeGreaterThan(20);
      expect(Math.abs(resizedInspectorWidth - initialInspectorWidth)).toBeGreaterThan(20);
      expect(Math.abs(resizedMetrics.sidebarWidth - initialMetrics.sidebarWidth)).toBeGreaterThan(20);
      expect(Math.abs(resizedMetrics.inspectorWidth - initialMetrics.inspectorWidth)).toBeGreaterThan(20);
      expect(resizedMetrics.gridTemplateColumns).not.toEqual(initialMetrics.gridTemplateColumns);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("restores shell collapse and resize controls after collapsing and re-expanding both side columns", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sidebar = page.locator("aside.sidebar").first();
      const inspector = page.locator("aside.inspector").first();
      const initialMetrics = await shellMetrics(page);

      await domClick(sidebar.getByRole("button", { name: "Hide Navigation", exact: true }));
      const collapsedSidebar = page.locator("aside.sidebar.sidebar-collapsed-rail").first();
      await expect(collapsedSidebar).toBeVisible({ timeout: 15000 });
      await expect(page.locator(".shell-column-splitter-left")).toHaveCount(0);

      await domClick(inspector.getByRole("button", { name: "Collapse workspace panel", exact: true }));
      const collapsedInspector = page.locator("aside.inspector.inspector-collapsed-rail").first();
      await expect(collapsedInspector).toBeVisible({ timeout: 15000 });
      await expect(page.locator(".shell-column-splitter")).toHaveCount(0);

      await domClick(collapsedSidebar.getByRole("button", { name: "Show Navigation", exact: true }));
      const expandedSidebar = page.locator("aside.sidebar").first();
      await expect(expandedSidebar).toBeVisible({ timeout: 15000 });
      await expect(expandedSidebar.getByRole("button", { name: "Hide Navigation", exact: true })).toBeVisible({
        timeout: 15000
      });

      await domClick(collapsedInspector.getByRole("button", { name: "Open Inspector", exact: true }));
      const expandedInspector = page.locator("aside.inspector").first();
      await expect(expandedInspector).toBeVisible({ timeout: 15000 });
      await expect(
        expandedInspector.getByRole("button", { name: "Collapse workspace panel", exact: true })
      ).toBeVisible({ timeout: 15000 });

      await expect.poll(async () => (await shellMetrics(page)).sidebarWidth, { timeout: 15000 }).toBeGreaterThan(180);
      await expect.poll(async () => (await shellMetrics(page)).inspectorWidth, { timeout: 15000 }).toBeGreaterThan(220);

      const restoredMetrics = await shellMetrics(page);
      const leftSplitter = page.locator(".shell-column-splitter-left").first();
      const rightSplitter = page.locator(".shell-column-splitter").last();
      await expect(leftSplitter).toBeVisible({ timeout: 15000 });
      await expect(rightSplitter).toBeVisible({ timeout: 15000 });

      const restoredSidebarWidth = (await expandedSidebar.boundingBox())?.width ?? 0;
      const restoredInspectorWidth = (await expandedInspector.boundingBox())?.width ?? 0;
      expect(restoredSidebarWidth).toBeGreaterThan(180);
      expect(restoredInspectorWidth).toBeGreaterThan(220);
      expect(restoredMetrics.sidebarWidth).toBeGreaterThan(180);
      expect(restoredMetrics.inspectorWidth).toBeGreaterThan(220);
      expect(restoredMetrics.gridTemplateColumns).toEqual(initialMetrics.gridTemplateColumns);

      const leftBox = await leftSplitter.boundingBox();
      const rightBox = await rightSplitter.boundingBox();
      if (!leftBox || !rightBox) {
        throw new Error("Expected both shell splitters to be restored after re-expanding the side columns.");
      }

      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(leftBox.x + leftBox.width / 2 + 64, leftBox.y + leftBox.height / 2);
      await page.mouse.up();

      await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rightBox.x + rightBox.width / 2 - 64, rightBox.y + rightBox.height / 2);
      await page.mouse.up();

      const resizedMetrics = await shellMetrics(page);
      expect(Math.abs(resizedMetrics.sidebarWidth - restoredMetrics.sidebarWidth)).toBeGreaterThan(20);
      expect(Math.abs(resizedMetrics.inspectorWidth - restoredMetrics.inspectorWidth)).toBeGreaterThan(20);
      expect(resizedMetrics.gridTemplateColumns).not.toEqual(restoredMetrics.gridTemplateColumns);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("preserves shell collapse and resize behavior after a relaunch with persisted desktop preferences", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-persist-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");

    const firstLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const sidebar = firstLaunch.page.locator("aside.sidebar").first();
      const inspector = firstLaunch.page.locator("aside.inspector").first();
      const leftSplitter = firstLaunch.page.locator(".shell-column-splitter-left").first();
      const rightSplitter = firstLaunch.page.locator(".shell-column-splitter").last();
      const leftBox = await leftSplitter.boundingBox();
      const rightBox = await rightSplitter.boundingBox();
      if (!leftBox || !rightBox) {
        throw new Error("Expected both shell splitters to be visible on first launch.");
      }

      await firstLaunch.page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await firstLaunch.page.mouse.down();
      await firstLaunch.page.mouse.move(leftBox.x + leftBox.width / 2 + 56, leftBox.y + leftBox.height / 2);
      await firstLaunch.page.mouse.up();

      await firstLaunch.page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
      await firstLaunch.page.mouse.down();
      await firstLaunch.page.mouse.move(rightBox.x + rightBox.width / 2 - 56, rightBox.y + rightBox.height / 2);
      await firstLaunch.page.mouse.up();

      await domClick(sidebar.getByRole("button", { name: "Hide Navigation", exact: true }));
      await expect(firstLaunch.page.locator("aside.sidebar.sidebar-collapsed-rail").first()).toBeVisible({ timeout: 15000 });

      await domClick(inspector.getByRole("button", { name: "Collapse workspace panel", exact: true }));
      await expect(firstLaunch.page.locator("aside.inspector.inspector-collapsed-rail").first()).toBeVisible({
        timeout: 15000
      });

      await expect
        .poll(
          async () =>
            firstLaunch.page.evaluate(async () => {
              const preferences = await window.sbclAgentDesktop.desktop.getDesktopPreferences();
              return {
                sidebarPinned: preferences.sidebarPinned,
                inspectorPinned: preferences.inspectorPinned
              };
            }),
          { timeout: 15000 }
        )
        .toEqual({
          sidebarPinned: false,
          inspectorPinned: false
        });
    } finally {
      await closeDesktop(firstLaunch.app, firstLaunch.page);
    }

    const secondLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const collapsedSidebar = secondLaunch.page.locator("aside.sidebar.sidebar-collapsed-rail").first();
      const collapsedInspector = secondLaunch.page.locator("aside.inspector.inspector-collapsed-rail").first();
      await expect(collapsedSidebar).toBeVisible({ timeout: 15000 });
      await expect(collapsedInspector).toBeVisible({ timeout: 15000 });

      await domClick(collapsedSidebar.getByRole("button", { name: "Show Navigation", exact: true }));
      await domClick(collapsedInspector.getByRole("button", { name: "Open Inspector", exact: true }));

      const expandedSidebar = secondLaunch.page.locator("aside.sidebar").first();
      const expandedInspector = secondLaunch.page.locator("aside.inspector").first();
      await expect(expandedSidebar).toBeVisible({ timeout: 15000 });
      await expect(expandedInspector).toBeVisible({ timeout: 15000 });

      const leftSplitter = secondLaunch.page.locator(".shell-column-splitter-left").first();
      const rightSplitter = secondLaunch.page.locator(".shell-column-splitter").last();
      await expect(leftSplitter).toBeVisible({ timeout: 15000 });
      await expect(rightSplitter).toBeVisible({ timeout: 15000 });
      await expect.poll(async () => (await shellMetrics(secondLaunch.page)).sidebarWidth, { timeout: 15000 }).toBeGreaterThan(180);
      await expect.poll(async () => (await shellMetrics(secondLaunch.page)).inspectorWidth, { timeout: 15000 }).toBeGreaterThan(220);

      const restoredMetrics = await shellMetrics(secondLaunch.page);
      expect(restoredMetrics.sidebarWidth).toBeGreaterThan(180);
      expect(restoredMetrics.inspectorWidth).toBeGreaterThan(220);

      const leftBox = await leftSplitter.boundingBox();
      const rightBox = await rightSplitter.boundingBox();
      if (!leftBox || !rightBox) {
        throw new Error("Expected both shell splitters to be visible after relaunch and re-expansion.");
      }

      await secondLaunch.page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await secondLaunch.page.mouse.down();
      await secondLaunch.page.mouse.move(leftBox.x + leftBox.width / 2 + 48, leftBox.y + leftBox.height / 2);
      await secondLaunch.page.mouse.up();

      await secondLaunch.page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
      await secondLaunch.page.mouse.down();
      await secondLaunch.page.mouse.move(rightBox.x + rightBox.width / 2 - 48, rightBox.y + rightBox.height / 2);
      await secondLaunch.page.mouse.up();

      const resizedMetrics = await shellMetrics(secondLaunch.page);
      expect(Math.abs(resizedMetrics.sidebarWidth - restoredMetrics.sidebarWidth)).toBeGreaterThan(20);
      expect(Math.abs(resizedMetrics.inspectorWidth - restoredMetrics.inspectorWidth)).toBeGreaterThan(20);
    } finally {
      await closeDesktop(secondLaunch.app, secondLaunch.page);
    }
  });

  test("preserves active docked rail panels after a relaunch with persisted desktop preferences", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-rail-panels-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");

    const firstLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = firstLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = firstLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });
      const utilitiesTab = leftTabs.getByRole("option", { name: /Utilities/ });
      const editorSymbolTab = rightTabs.getByRole("option", { name: /Editor Symbol/ });
      const utilitiesButton = leftTabs.getByRole("button", { name: "Utilities", exact: true });
      const editorSymbolButton = rightTabs.getByRole("button", { name: "Editor Symbol", exact: true });

      await domClick(utilitiesButton);
      await domClick(editorSymbolButton);

      await expect(utilitiesTab).toHaveAttribute("aria-selected", "true");
      await expect(editorSymbolTab).toHaveAttribute("aria-selected", "true");

      await expect
        .poll(
          async () =>
            firstLaunch.page.evaluate(async () => {
              const preferences = await window.sbclAgentDesktop.desktop.getDesktopPreferences();
              return {
                sidebarActivePanelId: preferences.sidebarActivePanelId ?? null,
                inspectorActivePanelId: preferences.inspectorActivePanelId ?? null,
                sidebarDockedPanelIds: preferences.sidebarDockedPanelIds ?? [],
                inspectorDockedPanelIds: preferences.inspectorDockedPanelIds ?? []
              };
            }),
          { timeout: 15000 }
        )
        .toEqual({
          sidebarActivePanelId: "shell-utilities",
          inspectorActivePanelId: "editor-symbol",
          sidebarDockedPanelIds: ["shell-navigation", "shell-utilities"],
          inspectorDockedPanelIds: ["workspace-inspector", "editor-symbol"]
        });
    } finally {
      await closeDesktop(firstLaunch.app, firstLaunch.page);
    }

    const secondLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = secondLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = secondLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });
      const utilitiesTab = leftTabs.getByRole("option", { name: /Utilities/ });
      const editorSymbolTab = rightTabs.getByRole("option", { name: /Editor Symbol/ });

      await expect(utilitiesTab).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
      await expect(editorSymbolTab).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
      await expect(secondLaunch.page.locator("aside.inspector")).toContainText("Symbol", { timeout: 15000 });
    } finally {
      await closeDesktop(secondLaunch.app, secondLaunch.page);
    }
  });

  test("undocks and redocks shell rail panels through the live desktop shell", async () => {
    const { app, page } = await launchDesktop();
    try {
      const leftTabs = page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = page.getByRole("listbox", { name: "Inspector rail panels" });
      const desktopStage = page.getByLabel("Desktop window registry");

      await domClick(leftTabs.getByRole("button", { name: "Undock Utilities", exact: true }));
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(leftTabs.getByRole("option", { name: /Utilities/ })).toHaveCount(0);

      await domClick(rightTabs.getByRole("button", { name: "Undock Editor Symbol", exact: true }));
      await expect(
        desktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })
      ).toBeVisible({ timeout: 15000 });
      await expect(
        desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true })
      ).toBeVisible({ timeout: 15000 });
      await expect(rightTabs.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(0);

      await domClick(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true }));
      await expect(rightTabs.getByRole("option", { name: /Utilities/ })).toHaveCount(1);
      await expect(rightTabs.getByRole("button", { name: "Undock Utilities", exact: true })).toHaveCount(1);

      await domClick(desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true }));
      await expect(leftTabs.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(1);
      await expect(leftTabs.getByRole("button", { name: "Undock Editor Symbol", exact: true })).toHaveCount(1);
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("drags shell rail panels into the floating desktop stage and docks them back into their rails", async () => {
    test.setTimeout(120000);
    const { app, page } = await launchDesktop();
    try {
      const leftPanels = page.getByRole("listbox", { name: "Shell rail panels" });
      const rightPanels = page.getByRole("listbox", { name: "Inspector rail panels" });
      const desktopStage = page.getByLabel("Desktop window registry");
      const dragBetween = async (source: Locator, target: Locator): Promise<void> => {
        await expect(source).toBeVisible({ timeout: 15000 });
        await expect(target).toBeVisible({ timeout: 15000 });
        await source.dragTo(target);
      };

      await dragBetween(
        leftPanels.locator(".shell-dock-list-item").filter({ hasText: "Utilities" }).locator(".shell-dock-list-drag").first(),
        desktopStage
      );
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(leftPanels.getByRole("option", { name: /Utilities/ })).toHaveCount(0);

      await dragBetween(
        rightPanels
          .locator(".shell-dock-list-item")
          .filter({ hasText: "Editor Symbol" })
          .locator(".shell-dock-list-drag")
          .first(),
        desktopStage
      );
      await expect(
        desktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })
      ).toBeVisible({ timeout: 15000 });
      await expect(
        desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true })
      ).toBeVisible({ timeout: 15000 });
      await expect(rightPanels.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(0);

      await domClick(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true }));
      await expect(rightPanels.getByRole("option", { name: /Utilities/ })).toHaveCount(1);

      await domClick(desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true }));
      await expect(leftPanels.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(1);
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Utilities to right rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Editor Symbol to left rail", exact: true })).toHaveCount(0);
      await expect(desktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("resizes shell columns while floating shell panels are present in the desktop stage", async () => {
    const { app, page } = await launchDesktop();
    try {
      const leftTabs = page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = page.getByRole("listbox", { name: "Inspector rail panels" });

      await domClick(leftTabs.getByRole("button", { name: "Undock Utilities", exact: true }));
      await domClick(rightTabs.getByRole("button", { name: "Undock Editor Symbol", exact: true }));

      await expect(page.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(page.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toBeVisible({
        timeout: 15000
      });

      const beforeMetrics = await shellMetrics(page);
      const beforeSplitters = await shellSplitterMetrics(page);
      const leftSplitter = page.locator(".shell-column-splitter-left").first();
      const rightSplitter = page.locator(".shell-column-splitter").last();
      const leftBox = await leftSplitter.boundingBox();
      const rightBox = await rightSplitter.boundingBox();
      if (!leftBox || !rightBox) {
        throw new Error("Expected both shell splitters to remain visible while floating shell panels are present.");
      }

      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(leftBox.x + leftBox.width / 2 + 48, leftBox.y + leftBox.height / 2);
      await page.mouse.up();

      await page.mouse.move(rightBox.x + rightBox.width / 2, rightBox.y + rightBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rightBox.x + rightBox.width / 2 - 48, rightBox.y + rightBox.height / 2);
      await page.mouse.up();

      const afterMetrics = await shellMetrics(page);
      const afterSplitters = await shellSplitterMetrics(page);
      expect(Math.abs(afterMetrics.sidebarWidth - beforeMetrics.sidebarWidth)).toBeGreaterThan(20);
      expect(Math.abs(afterMetrics.inspectorWidth - beforeMetrics.inspectorWidth)).toBeGreaterThan(20);
      expect(Math.abs(afterSplitters.leftX - beforeSplitters.leftX)).toBeGreaterThan(20);
      expect(Math.abs(afterSplitters.rightX - beforeSplitters.rightX)).toBeGreaterThan(20);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("preserves reordered shell rail tabs after a relaunch with persisted desktop preferences", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-reordered-panels-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");

    const firstLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = firstLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = firstLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });

      await domClick(leftTabs.locator(".shell-dock-list-item").nth(1).locator(".shell-dock-list-reorder").first());
      await domClick(rightTabs.locator(".shell-dock-list-item").nth(1).locator(".shell-dock-list-reorder").first());

      await expect.poll(async () => railOptionLabels(leftTabs), { timeout: 15000 }).toEqual(["Utilities", "Navigation"]);
      await expect.poll(async () => railOptionLabels(rightTabs), { timeout: 15000 }).toEqual(["Editor Symbol", "Inspector"]);

      await expect
        .poll(
          async () =>
            firstLaunch.page.evaluate(async () => {
              const preferences = await window.sbclAgentDesktop.desktop.getDesktopPreferences();
              return {
                sidebarDockedPanelIds: preferences.sidebarDockedPanelIds ?? [],
                inspectorDockedPanelIds: preferences.inspectorDockedPanelIds ?? []
              };
            }),
          { timeout: 15000 }
        )
        .toEqual({
          sidebarDockedPanelIds: ["shell-utilities", "shell-navigation"],
          inspectorDockedPanelIds: ["editor-symbol", "workspace-inspector"]
        });
    } finally {
      await closeDesktop(firstLaunch.app, firstLaunch.page);
    }

    const secondLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = secondLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = secondLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });

      await expect.poll(async () => railOptionLabels(leftTabs), { timeout: 15000 }).toEqual(["Utilities", "Navigation"]);
      await expect.poll(async () => railOptionLabels(rightTabs), { timeout: 15000 }).toEqual(["Editor Symbol", "Inspector"]);
    } finally {
      await closeDesktop(secondLaunch.app, secondLaunch.page);
    }
  });

  test("preserves undocked shell panels after a relaunch with persisted desktop preferences", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-undocked-panels-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");

    const firstLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = firstLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = firstLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });
      const firstDesktopStage = firstLaunch.page.getByLabel("Desktop window registry");

      await domClick(leftTabs.getByRole("button", { name: "Undock Utilities", exact: true }));
      await domClick(rightTabs.getByRole("button", { name: "Undock Editor Symbol", exact: true }));

      await expect(firstDesktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(firstDesktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(leftTabs.getByRole("option", { name: /Utilities/ })).toHaveCount(0);
      await expect(rightTabs.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(0);

      await expect
        .poll(
          async () =>
            firstLaunch.page.evaluate(async () => {
              const preferences = await window.sbclAgentDesktop.desktop.getDesktopPreferences();
              return {
                sidebarDockedPanelIds: preferences.sidebarDockedPanelIds ?? [],
                inspectorDockedPanelIds: preferences.inspectorDockedPanelIds ?? []
              };
            }),
          { timeout: 15000 }
        )
        .toEqual({
          sidebarDockedPanelIds: ["shell-navigation"],
          inspectorDockedPanelIds: ["workspace-inspector"]
        });
    } finally {
      await closeDesktop(firstLaunch.app, firstLaunch.page);
    }

    const secondLaunch = await launchDesktop({}, environmentStatePath);
    try {
      const leftTabs = secondLaunch.page.getByRole("listbox", { name: "Shell rail panels" });
      const rightTabs = secondLaunch.page.getByRole("listbox", { name: "Inspector rail panels" });
      const secondDesktopStage = secondLaunch.page.getByLabel("Desktop window registry");

      await expect(secondDesktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(secondDesktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toBeVisible({
        timeout: 15000
      });
      await expect(leftTabs.getByRole("option", { name: /Utilities/ })).toHaveCount(0);
      await expect(rightTabs.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(0);

      await domClick(secondDesktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true }));
      await domClick(secondDesktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true }));

      await expect(leftTabs.getByRole("option", { name: /Utilities/ })).toHaveCount(1);
      await expect(rightTabs.getByRole("option", { name: /Editor Symbol/ })).toHaveCount(1);
      await expect(secondDesktopStage.getByRole("button", { name: "Dock Utilities to left rail", exact: true })).toHaveCount(0);
      await expect(secondDesktopStage.getByRole("button", { name: "Dock Editor Symbol to right rail", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(secondLaunch.app, secondLaunch.page);
    }
  });

  test("round-trips shell preference booleans through the live desktop bridge", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-shell-pref-"));
    const environmentStatePath = join(stateDir, "live-environment.sexp");

    const desktop = await launchDesktop({}, environmentStatePath);
    try {
      await desktop.page.evaluate(async () => {
        await window.sbclAgentDesktop.desktop.setDesktopPreferences({
          sidebarPinned: false,
          inspectorPinned: false
        });
      });

      await expect
        .poll(
          async () =>
            desktop.page.evaluate(async () => {
              const preferences = await window.sbclAgentDesktop.desktop.getDesktopPreferences();
              return {
                sidebarPinned: preferences.sidebarPinned,
                inspectorPinned: preferences.inspectorPinned
              };
            }),
          { timeout: 15000 }
        )
        .toEqual({
          sidebarPinned: false,
          inspectorPinned: false
        });
    } finally {
      await closeDesktop(desktop.app, desktop.page);
    }
  });

  test("shows bound environment identity from the live adapter", async () => {
    const { app, page } = await launchDesktop();
    try {
      const binding = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        return {
          environmentId: summary.data.environmentId,
          sessionId: summary.metadata.binding?.sessionId ?? null
        };
      });
      await expect(page.locator("body")).toContainText("Binding");
      await expect(page.locator("body")).toContainText("Runtime");
      await expect(page.locator("body")).toContainText("Workflow");
      await expect(page.locator("body")).toContainText(binding.environmentId);
      if (binding.sessionId) {
        await expect(page.locator("body")).toContainText(binding.sessionId);
      }
      await expect(page.locator("body")).not.toContainText("unbound");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders live structured conversations from sbcl-agent state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");
      await expect(page.locator(".conversation-list-panel")).toContainText("Conversations >> Threads");
      await expect(page.getByRole("button", { name: "New conversation session", exact: true })).toBeVisible();
      await expect(page.locator(".conversation-browse-detail-panel")).toContainText("Conversations >> Threads");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("streams assistant text into the selected conversation before final completion with the mock provider", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock",
      TUTOR_CODEX_MOCK_STREAM_DELAY_MS: "600"
    });
    try {
      const prompt = "stream verification prompt";
      await createConversationSession(page, "Streaming Verification Session");
      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill(prompt);
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      const transcript = page.locator(".conversation-thread-transcript-panel");
      await expect(page.getByRole("button", { name: "Sending message", exact: true })).toBeVisible();
      const pendingTranscript = await transcript.textContent();
      expect(pendingTranscript ?? "").not.toContain("Replace the mock provider with a real model adapter next.");
      await expect(transcript).toContainText("Replace the mock provider with a real model adapter next.", {
        timeout: 12000
      });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("retains the selected conversation transcript after sending a live message", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      const sessionTitle = "Transcript Retention Session";
      const prompt = "retain this conversation history";

      await createConversationSession(page, sessionTitle);
      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill(prompt);
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      const browseDetail = page.locator(".conversation-browse-detail-panel");
      const transcript = page.locator(".conversation-thread-transcript-panel");

      await expect(transcript).toContainText(prompt, { timeout: 15000 });
      await expect(transcript).toContainText("Replace the mock provider with a real model adapter next.", {
        timeout: 15000
      });
      await expect(browseDetail).toContainText(sessionTitle, { timeout: 15000 });
      await expect(page.locator(".conversation-thread-empty")).toHaveCount(0);
      await expect(page.locator(".conversation-thread-transcript-panel .message-bubble")).toHaveCount(2, {
        timeout: 15000
      });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps the newly selected thread active when sending immediately after switching threads", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      const firstSessionTitle = "Thread Selection Baseline";
      const secondSessionTitle = "Thread Selection Target";
      const prompt = "stay on the newly selected thread";

      await createConversationSession(page, firstSessionTitle);
      await createConversationSession(page, secondSessionTitle);
      await selectConversationThread(page, firstSessionTitle);

      const listPanel = page.locator(".conversation-list-panel");
      const targetRow = listPanel.locator(".browser-table-row").filter({ hasText: secondSessionTitle }).first();
      await targetRow.scrollIntoViewIfNeeded();
      await targetRow.evaluate((element: HTMLElement) => element.click());

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill(prompt);
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      const browseDetail = page.locator(".conversation-browse-detail-panel");
      const transcript = page.locator(".conversation-thread-transcript-panel");

      await expect(browseDetail).toContainText(secondSessionTitle, { timeout: 15000 });
      await expect(transcript).toContainText(prompt, { timeout: 15000 });
      await expect(transcript).not.toContainText("Select a thread from Browse to continue the session here.", {
        timeout: 15000
      });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("anchors short transcript history against the composer instead of the top of the transcript panel with the mock provider", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Anchor Verification Session");
      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill("anchor verification prompt");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      const transcript = page.locator(".conversation-thread-transcript-panel");
      await expect(transcript).toContainText("anchor verification prompt", { timeout: 15000 });
      const lastBubble = transcript.locator(".message-bubble").last();

      await expect(lastBubble).toBeVisible({ timeout: 15000 });

      const transcriptBox = await transcript.boundingBox();
      const lastBubbleBox = await lastBubble.boundingBox();

      expect(transcriptBox).not.toBeNull();
      expect(lastBubbleBox).not.toBeNull();

      if (!transcriptBox || !lastBubbleBox) {
        throw new Error("Transcript or last message bubble did not produce a bounding box.");
      }

      const bottomGap = transcriptBox.y + transcriptBox.height - (lastBubbleBox.y + lastBubbleBox.height);
      expect(bottomGap).toBeLessThan(80);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("creates a new project conversation session from the desktop shell", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sessionTitle = "Desktop Session Alpha";
      await createConversationSession(page, sessionTitle);

      await expect(page.locator("body")).toContainText(sessionTitle);
      await expect(page.locator("body")).toContainText("Project-scoped conversation session created from the desktop shell.");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("creates and selects a governed project from the projects surface", async () => {
    const { app, page } = await launchDesktop();
    try {
      const projectTitle = "Governed Project Delta";

      await openWorkspace(page, "Projects");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: "New Project" });
      await expect(dialog).toBeVisible();
      await dialog.locator("input").first().fill(projectTitle);
      await dialog.getByRole("button", { name: "Create Project", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText(projectTitle, { timeout: 15000 });
      await expect(projectSurface).not.toContainText("No governed project selected", { timeout: 15000 });
      await expect(projectSurface).toContainText("Project Detail", { timeout: 15000 });
      await expect(projectSurface).toContainText("Project Registry", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces live alignment and corrective direction in operate and projects", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openWorkspaceSubpage(page, "Operate", "Orientation");
      const operateSurface = page.locator(".environment-grid");
      await expect(operateSurface).toContainText("Orientation Records", { timeout: 15000 });
      await page.locator(".operate-table-panel .browser-table-row").filter({
        hasText: "Alignment And Correction"
      }).first().click();
      await expect(operateSurface).toContainText("Alignment", { timeout: 15000 });
      await expect(operateSurface).toContainText("Corrective Direction", { timeout: 15000 });
      await expect(operateSurface).toContainText("Trigger Events", { timeout: 15000 });

      const projectTitle = "Governed Project Trust Surface";
      await openWorkspace(page, "Projects");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: "New Project" });
      await dialog.locator("input").first().fill(projectTitle);
      await dialog.getByRole("button", { name: "Create Project", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Trust Posture", { timeout: 15000 });
      await expect(projectSurface).toContainText("Alignment Status", { timeout: 15000 });
      await expect(projectSurface).toContainText("Corrective Direction", { timeout: 15000 });
      await expect(projectSurface).toContainText("Corrective Queue", { timeout: 15000 });
      await expect(projectSurface).toContainText("Trigger Events", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("routes corrective governed work into approval control directly from operate trust posture", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      const target = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const approvals = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
        const approval = approvals.data.find((item) => item.state === "awaiting") ?? null;
        return approval ? { approvalTitle: approval.title } : null;
      });
      expect(target).not.toBeNull();
      if (!target) {
        throw new Error("No awaiting corrective approval was available for operate trust routing.");
      }

      await openWorkspace(page, "Operate");
      const orientationRows = page.locator(".operate-table-panel .browser-table-row");
      await orientationRows.filter({ hasText: "Alignment And Correction" }).first().click();
      await expect(page.getByRole("button", { name: "Review Approval", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Approve Corrective Work", exact: true })).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: "Review Approval", exact: true }).click();
      await expect(page.locator(".approvals-grid")).toContainText(target.approvalTitle, { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("routes corrective governed work into approval control directly from projects trust posture", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      const projectTitle = "Corrective Governance Project";
      const target = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const approvals = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
        const approval = approvals.data.find((item) => item.state === "awaiting") ?? null;
        return approval ? { approvalTitle: approval.title } : null;
      });
      expect(target).not.toBeNull();
      if (!target) {
        throw new Error("No approval-bearing project trust posture was available for project routing.");
      }

      await openWorkspace(page, "Projects");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();
      const projectDialog = page.getByRole("dialog", { name: "New Project" });
      await projectDialog.locator("input").first().fill(projectTitle);
      await projectDialog.getByRole("button", { name: "Create Project", exact: true }).click();
      await expect(projectDialog).toBeHidden({ timeout: 15000 });
      const projectRows = page.locator(".configuration-pane .browser-table-row");
      await projectRows.filter({ hasText: projectTitle }).first().click();
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface.getByRole("button", { name: "Review Approval", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(projectSurface.getByRole("button", { name: "Approve Corrective Work", exact: true })).toBeVisible({ timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Review Approval", exact: true }).click();
      await expect(page.locator(".approvals-grid")).toContainText(target.approvalTitle, { timeout: 15000 });

      await openWorkspace(page, "Projects");
      await projectRows.filter({ hasText: projectTitle }).first().click();
      await projectSurface.getByRole("button", { name: "Approve Corrective Work", exact: true }).click();

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approval-action-panel")).toContainText("approved", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces corrective rationale and trigger evidence directly in approvals", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openWorkspace(page, "Work");
      const workRows = page.locator(".work-list-panel .browser-table-row");
      await expect(workRows.first()).toBeVisible({ timeout: 15000 });
      await workRows.filter({ hasText: "Desktop attention model refinement" }).first().click();
      await page.getByRole("button", { name: "Review Approval", exact: true }).click();

      const detailPanel = page.locator(".approval-detail-panel");
      await expect(detailPanel).toContainText("Corrective Posture", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approval Posture", { timeout: 15000 });
      await expect(detailPanel).toContainText("Trigger Events", { timeout: 15000 });
      await expect(detailPanel).toContainText("alignment-reconciliation", { timeout: 15000 });
      await expect(detailPanel).toContainText("directed_execution", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces corrective posture directly in the inspector for approval review", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openWorkspace(page, "Work");
      const workRows = page.locator(".work-list-panel .browser-table-row");
      await expect(workRows.first()).toBeVisible({ timeout: 15000 });
      await workRows.filter({ hasText: "Desktop attention model refinement" }).first().click();
      await page.getByRole("button", { name: "Review Approval", exact: true }).click();

      const detailPanel = page.locator(".approval-detail-panel");
      await expect(detailPanel).toContainText("Corrective Posture", { timeout: 15000 });
      await detailPanel.getByRole("button", { name: "Open Inspector", exact: true }).click();

      const inspector = page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first();
      await inspector.getByRole("tab", { name: "Selection", exact: true }).click();
      await expect(inspector).toContainText("Corrective Kind", { timeout: 15000 });
      await expect(inspector).toContainText("Approval Posture", { timeout: 15000 });
      await expect(inspector).toContainText("Trigger Events", { timeout: 15000 });
      await expect(inspector).toContainText("alignment-reconciliation", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces corrective posture in the inspector from browser governance", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      const target = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const [workItems, approvals] = await Promise.all([
          window.sbclAgentDesktop.query.workItemList(environmentId),
          window.sbclAgentDesktop.query.approvalRequestList(environmentId)
        ]);
        const workItem = workItems.data.find((item) => item.approvalCount > 0) ?? null;
        const approval = approvals.data.find((item) => item.state === "awaiting") ?? null;
        return workItem && approval
          ? {
              workTitle: workItem.title,
              approvalTitle: approval.title
            }
          : null;
      });
      expect(target).not.toBeNull();
      if (!target) {
        throw new Error("No approval-bearing governed work item was available for browser governance inspector routing.");
      }

      await openWorkspace(page, "Browser");
      await page.getByRole("button", { name: "Governance", exact: true }).first().click();
      const governanceRows = page.locator(".browser-domain-stack .browser-table-row");
      await expect(governanceRows.first()).toBeVisible({ timeout: 15000 });
      await governanceRows.filter({ hasText: target.workTitle }).first().click();
      await expect(page.getByRole("button", { name: "Review Approval", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Open Inspector", exact: true })).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: "Open Inspector", exact: true }).click();

      const inspector = page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first();
      await expect(inspector).toContainText("Corrective Kind", { timeout: 15000 });
      await expect(inspector).toContainText("Approval Posture", { timeout: 15000 });
      await expect(inspector).toContainText("Trigger Events", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("authors governed project artifacts directly from the projects panel", async () => {
    const { app, page } = await launchDesktop();
    try {
      const projectTitle = "Governed Project Panel Authoring";
      const projectSurface = page.locator(".projects-journey");

      await openWorkspace(page, "Projects");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();

      const projectDialog = page.getByRole("dialog", { name: "New Project" });
      await projectDialog.locator("input").first().fill(projectTitle);
      await projectDialog.getByRole("button", { name: "Create Project", exact: true }).click();
      await expect(projectDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText(projectTitle, { timeout: 15000 });
      await expect(projectSurface).not.toContainText("No governed project selected", { timeout: 15000 });
      await expect(projectSurface.getByRole("button", { name: "Edit Constitution", exact: true })).toBeVisible({ timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Constitution", exact: true }).click();
      const constitutionDialog = page.getByRole("dialog", { name: "Edit Project Constitution" });
      await constitutionDialog.locator("textarea").fill(JSON.stringify({
        purpose: "Drive governed panel authoring through the projects surface.",
        principles: ["panel parity", "governed persistence"]
      }, null, 2));
      await constitutionDialog.getByRole("button", { name: "Save Constitution", exact: true }).click();
      await expect(constitutionDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Drive governed panel authoring through the projects surface.", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add Requirement", exact: true }).click();
      const requirementDialog = page.getByRole("dialog", { name: "Add Project Requirement" });
      await requirementDialog.locator("input").nth(0).fill("Record governed panel mutations");
      await requirementDialog.locator("textarea").nth(0).fill("Persist direct panel-side project authoring into the governed project record.");
      await requirementDialog.getByRole("button", { name: "Add Requirement", exact: true }).click();
      await expect(requirementDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Record governed panel mutations", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add Feature Specification", exact: true }).click();
      const featureDialog = page.getByRole("dialog", { name: "Add Project Feature Specification" });
      await featureDialog.locator("input").nth(0).fill("Panel governance authoring");
      await featureDialog.locator("textarea").nth(0).fill("Enable governed project authoring directly from the projects panel.");
      await featureDialog.locator("textarea").nth(1).fill("Project records update immediately\nOperators can inspect the results");
      await featureDialog.getByRole("button", { name: "Add Feature Specification", exact: true }).click();
      await expect(featureDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Panel governance authoring", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add User Journey", exact: true }).click();
      const journeyDialog = page.getByRole("dialog", { name: "Add Project User Journey" });
      await journeyDialog.locator("input").nth(0).fill("Author governance from projects");
      const journeyTextareas = journeyDialog.locator("textarea");
      await journeyTextareas.nth(0).fill("An operator creates and refines governed project artifacts from the projects panel.");
      await journeyTextareas.nth(1).fill("Operator");
      await journeyTextareas.nth(2).fill("Projects workspace");
      await journeyTextareas.nth(3).fill("Open project\nEdit artifact\nReview updated detail");
      await journeyTextareas.nth(4).fill("Project state persists");
      await journeyTextareas.nth(5).fill("Malformed input rejected");
      await journeyDialog.getByRole("button", { name: "Add User Journey", exact: true }).click();
      await expect(journeyDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Author governance from projects", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add Architecture Decision", exact: true }).click();
      const architectureDialog = page.getByRole("dialog", { name: "Add Project Architecture Decision" });
      await architectureDialog.locator("input").nth(0).fill("Keep panel mutations governed");
      const architectureTextareas = architectureDialog.locator("textarea");
      await architectureTextareas.nth(0).fill("Panel mutations should use the same governed project command surface as chat mutations.");
      await architectureTextareas.nth(1).fill("parity\npersistence");
      await architectureTextareas.nth(2).fill("shared command paths");
      await architectureTextareas.nth(3).fill("desktop bridge\nproject service");
      await architectureDialog.getByRole("button", { name: "Add Architecture Decision", exact: true }).click();
      await expect(architectureDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Keep panel mutations governed", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Design System", exact: true }).click();
      const designSystemDialog = page.getByRole("dialog", { name: "Edit Project Design System" });
      await designSystemDialog.locator("textarea").fill(JSON.stringify({ mode: "operator", emphasis: ["evidence", "density"] }, null, 2));
      await designSystemDialog.getByRole("button", { name: "Save Design System", exact: true }).click();
      await expect(designSystemDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("mode: operator", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Style Guide", exact: true }).click();
      const styleGuideDialog = page.getByRole("dialog", { name: "Edit Project Style Guide" });
      await styleGuideDialog.locator("textarea").fill(JSON.stringify({ tone: "rigorous", guidance: ["high signal", "governed edits"] }, null, 2));
      await styleGuideDialog.getByRole("button", { name: "Save Style Guide", exact: true }).click();
      await expect(styleGuideDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("tone: rigorous", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("authors governed testing and release posture directly from the projects panel", async () => {
    const { app, page } = await launchDesktop();
    try {
      const projectTitle = "Governed Project Testing And Release Posture";
      const projectSurface = page.locator(".projects-journey");

      await openWorkspace(page, "Projects");
      await page.getByRole("button", { name: "Create Project", exact: true }).click();

      const projectDialog = page.getByRole("dialog", { name: "New Project" });
      await projectDialog.locator("input").first().fill(projectTitle);
      await projectDialog.getByRole("button", { name: "Create Project", exact: true }).click();
      await expect(projectDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText(projectTitle, { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Testing Strategy", exact: true }).click();
      const testingStrategyDialog = page.getByRole("dialog", { name: "Edit Project Testing Strategy" });
      await testingStrategyDialog.getByLabel("Required Evidence").fill("coverage\nperformance");
      await testingStrategyDialog.getByLabel("Known Harness").selectOption("full_suite");
      await testingStrategyDialog.getByLabel("Purpose").fill("governed regression");
      await testingStrategyDialog.getByLabel("Evidence Kinds").fill("coverage, performance");
      await testingStrategyDialog.getByLabel("Max Failed Tests").fill("1");
      await testingStrategyDialog.getByLabel("Max Say Turn Latency (s)").fill("0.5");
      await testingStrategyDialog.getByRole("button", { name: "Save Testing Strategy", exact: true }).click();
      await expect(testingStrategyDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Required Evidence", { timeout: 15000 });
      await expect(projectSurface).toContainText("coverage, performance", { timeout: 15000 });
      await expect(projectSurface).toContainText("governed regression", { timeout: 15000 });
      await expect(projectSurface).toContainText("max failed tests 1", { timeout: 15000 });
      await expect(projectSurface).toContainText("say latency <= 0.5s", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add Source Root", exact: true }).click();
      const sourceRootDialog = page.getByRole("dialog", { name: "Add Project Source Root" });
      await sourceRootDialog.locator("input").nth(0).fill("/tmp/panel-governed-project/src");
      await sourceRootDialog.getByRole("button", { name: "Add Source Root", exact: true }).click();
      await expect(sourceRootDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("/tmp/panel-governed-project/src", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Bind Testing Harness", exact: true }).click();
      const harnessDialog = page.getByRole("dialog", { name: "Bind Project Testing Harness" });
      await harnessDialog.locator("select").selectOption("full_suite");
      await harnessDialog.getByRole("button", { name: "Bind Harness", exact: true }).click();
      await expect(harnessDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Full Lisp Suite", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release Readiness", { timeout: 15000 });
      await expect(projectSurface).toContainText("./bin/run-tests", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Release Readiness", exact: true }).click();
      const releaseReadinessDialog = page.getByRole("dialog", { name: "Edit Project Release Readiness" });
      await releaseReadinessDialog.getByLabel("Stage").fill("candidate");
      await releaseReadinessDialog.getByLabel("Signoff Status").fill("pending");
      await releaseReadinessDialog.getByLabel("Target Window").fill("2026-05-15");
      await releaseReadinessDialog.getByLabel("Required Approvers").fill("platform\nops");
      await releaseReadinessDialog.getByLabel("Observation Plan").fill("watch latency\nreview incidents");
      await releaseReadinessDialog.getByLabel("Open Risks").fill("coverage regression risk");
      await releaseReadinessDialog.getByRole("button", { name: "Save Release Readiness", exact: true }).click();
      await expect(releaseReadinessDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("candidate", { timeout: 15000 });
      await expect(projectSurface).toContainText("pending", { timeout: 15000 });
      await expect(projectSurface).toContainText("2026-05-15", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release Review", { timeout: 15000 });
      await expect(projectSurface).toContainText("blocked", { timeout: 15000 });
      await expect(projectSurface).toContainText("Signoff Progress", { timeout: 15000 });
      await expect(projectSurface).toContainText("ownership_pending", { timeout: 15000 });
      await expect(projectSurface).toContainText("Signoff Ownership", { timeout: 15000 });
      await expect(projectSurface).toContainText("incomplete", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release Phase", { timeout: 15000 });
      await expect(projectSurface).toContainText("candidate", { timeout: 15000 });
      await expect(projectSurface).toContainText("Next Phase", { timeout: 15000 });
      await expect(projectSurface).toContainText("approved", { timeout: 15000 });
      await expect(projectSurface).toContainText("Transition Ready", { timeout: 15000 });
      await expect(projectSurface).toContainText("no", { timeout: 15000 });
      await expect(projectSurface).toContainText("Required Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("platform, ops", { timeout: 15000 });
      await expect(projectSurface).toContainText("Pending Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("Unassigned Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("platform", { timeout: 15000 });
      await expect(projectSurface).toContainText("Assign owned readiness obligations for: platform, ops.", { timeout: 15000 });
      await expect(projectSurface).toContainText("Satisfy project testing evidence requirements.", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Edit Readiness Obligations", exact: true }).click();
      const readinessObligationsDialog = page.getByRole("dialog", { name: "Edit Project Readiness Obligations" });
      await readinessObligationsDialog.getByLabel("Id", { exact: true }).fill("obl-panel-signoff");
      await readinessObligationsDialog.getByLabel("Status", { exact: true }).fill("blocked");
      await readinessObligationsDialog.getByLabel("Title", { exact: true }).fill("Complete panel signoff");
      await readinessObligationsDialog.getByLabel("Summary", { exact: true }).fill("Panel-authored release posture requires explicit signoff.");
      await readinessObligationsDialog.getByLabel("Owner", { exact: true }).fill("ops");
      await readinessObligationsDialog.getByLabel("Due Window", { exact: true }).fill("2026-05-15");
      await readinessObligationsDialog.getByLabel("Evidence Kinds", { exact: true }).fill("governed-approval, performance");
      await readinessObligationsDialog.getByRole("button", { name: "Save Readiness Obligations", exact: true }).click();
      await expect(readinessObligationsDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Complete panel signoff", { timeout: 15000 });
      await expect(projectSurface).toContainText("blocking", { timeout: 15000 });
      await expect(projectSurface).toContainText("Readiness Obligations", { timeout: 15000 });
      await expect(projectSurface).toContainText("Blocked Obligations", { timeout: 15000 });

      await projectSurface.getByRole("button", { name: "Add Quality Gate", exact: true }).click();
      const gateDialog = page.getByRole("dialog", { name: "Add Project Quality Gate" });
      const gateInputs = gateDialog.locator("input:not([type='checkbox'])");
      await gateInputs.nth(0).fill("Panel delivery gate");
      await gateDialog.locator("textarea").nth(0).fill("Ensure panel-authored governance artifacts remain verifiable.");
      await gateInputs.nth(1).fill("3");
      await gateInputs.nth(2).fill("1");
      await gateInputs.nth(3).fill("0");
      await gateInputs.nth(4).fill("2.5");
      await gateInputs.nth(5).fill("7.5");
      await gateDialog.locator("select").nth(1).selectOption("full_suite");
      await gateDialog.getByRole("button", { name: "Add Quality Gate", exact: true }).click();
      await expect(gateDialog).toBeHidden({ timeout: 15000 });
      await expect(projectSurface).toContainText("Testing Evidence", { timeout: 15000 });
      await expect(projectSurface).toContainText("Evidence Readiness", { timeout: 15000 });
      await expect(projectSurface).toContainText("Project Readiness", { timeout: 15000 });
      await expect(projectSurface).toContainText("Missing Evidence", { timeout: 15000 });
      await expect(projectSurface).toContainText("Panel delivery gate", { timeout: 15000 });
      await expect(projectSurface).toContainText("1 harnesses", { timeout: 15000 });
      await expect(projectSurface).toContainText("1 work items", { timeout: 15000 });
      await expect(projectSurface).toContainText("max failed tests 3", { timeout: 15000 });
      await expect(projectSurface).toContainText("say latency <= 2.5s", { timeout: 15000 });
      await expect(projectSurface).toContainText("save/load <= 7.5s", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps a completed live conversation thread conversational without governed approval pressure", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Environment Orientation");

      const detailPanel = page.locator(".conversation-browse-detail-panel");
      await expect(detailPanel).toContainText("Environment Orientation");
      await expect(detailPanel).toContainText("Linked Entities1");

      await openConversationTurnTabIfPresent(page);
      await expect(detailPanel).toContainText("completed");
      await expect(detailPanel).toContainText("ApprovalsNone");
      await expect(page.locator(".conversation-thread-transcript-panel")).toContainText(
        "The environment is warm, governed, and ready for supervised work."
      );
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces a governed live conversation thread as approval-gated work without a mock provider", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Mutation Review");

      const detailPanel = page.locator(".conversation-browse-detail-panel");
      await expect(detailPanel).toContainText("Governed Mutation Review");

      await openConversationTurnTabIfPresent(page);
      await expect(detailPanel).toContainText("background");
      await expect(detailPanel).toContainText("Approvals");
      await expect(detailPanel).toContainText("work-");
      await expect(detailPanel).toContainText("op-");
      await expect(page.locator(".conversation-thread-transcript-panel")).toContainText(
        "The patch is prepared and waiting for workspace-write approval."
      );

      await expect(page.locator("body")).toContainText("Prepare a workspace patch for the desktop attention model.");
      await expect(page.locator("body")).toContainText("workspace-write approval");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("authors governed early project artifacts through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Project Authoring Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");


      const initialApprovalIds = await approvalRequestIds(page);

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Project Authoring Session");
      await composer.fill("please create governed project artifacts");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const createApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, createApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Agent Governed Project", { timeout: 15000 });
      await expect(projectSurface).toContainText("Deliver an end-to-end governed SDLC loop.", { timeout: 15000 });
      await expect(projectSurface).toContainText("Capture governed requirements", { timeout: 15000 });
      await expect(projectSurface).toContainText("Author project governance through the thread", { timeout: 15000 });
      await expect(projectSurface).toContainText("Project artifact creation must use governed tool execution", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("augments governed early project artifacts through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Project Augment Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed thread augmentation."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Project Augment Session");
      await composer.fill("please augment governed project artifacts");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 8 proposed actions.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const augmentApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, augmentApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          return detailResult.data.designSystem?.mode === "governed"
            && Array.isArray(detailResult.data.qualityGateEvidence?.qualityGates)
            && detailResult.data.qualityGateEvidence.qualityGates.some((gate) => gate.title === "Governed delivery gate");
        });
      }, { timeout: 15000 }).toBeTruthy();

    } finally {
      await closeDesktop(app, page);
    }
  });

  test("revises governed project foundations through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Project Revision Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed foundation revision."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Project Revision Session");
      await composer.fill("please revise governed project foundations");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 2 proposed actions.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const reviseApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, reviseApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          return detailResult.data.constitution?.purpose === "Sustain governed SDLC closure through iterative evidence."
            && Array.isArray(detailResult.data.requirements)
            && detailResult.data.requirements.some((requirement) => requirement.title === "Track governed closure evidence");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Agent Governed Project", { timeout: 15000 });
      await expect(projectSurface).toContainText("Sustain governed SDLC closure through iterative evidence.", { timeout: 15000 });
      await expect(projectSurface).toContainText("Track governed closure evidence", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("revises governed project architecture through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Project Architecture Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed architecture revision."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Project Architecture Session");
      await composer.fill("please revise governed architecture posture");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const architectureApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, architectureApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          return Array.isArray(detailResult.data.architectureDecisions)
            && detailResult.data.architectureDecisions.some((decision) => decision.title === "Make closure evidence part of architecture governance");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Agent Governed Project", { timeout: 15000 });
      await expect(projectSurface).toContainText("Make closure evidence part of architecture governance", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("revises governed testing posture through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Testing Strategy Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed testing posture revision."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Testing Strategy Session");
      await composer.fill("please revise governed testing posture");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const testingApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, testingApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          const strategy = detailResult.data.testingStrategy;
          return Array.isArray(strategy?.requiredEvidence)
            && strategy.requiredEvidence.includes("governed-approval")
            && Array.isArray(strategy?.suiteExpectations)
            && strategy.suiteExpectations.length >= 2
            && strategy.thresholdPolicy?.maxFailedTests === 1
            && strategy.thresholdPolicy?.requireRecoveryReady === true;
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("coverage, performance, governed-approval", { timeout: 15000 });
      await expect(projectSurface).toContainText("governed regression");
      await expect(projectSurface).toContainText("operator sanity");
      await expect(projectSurface).toContainText("max failed tests 1");
      await expect(projectSurface).toContainText("recovery ready required");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("revises governed release readiness through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Release Readiness Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed release readiness revision."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Release Readiness Session");
      await composer.fill("please revise governed release readiness");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const releaseApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, releaseApprovalId);
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          const readiness = detailResult.data.releaseReadiness;
          const readinessSummary = detailResult.data.readinessSummary;
          return readiness?.stage === "candidate"
            && readiness?.signoffStatus === "pending"
            && readiness?.targetWindow === "2026-05-15"
            && Array.isArray(readiness?.requiredApprovers)
            && readiness.requiredApprovers.includes("platform")
            && readiness.requiredApprovers.includes("ops")
            && readinessSummary?.releaseReadinessStatus === "blocked";
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Release Readiness", { timeout: 15000 });
      await expect(projectSurface).toContainText("candidate", { timeout: 15000 });
      await expect(projectSurface).toContainText("pending", { timeout: 15000 });
      await expect(projectSurface).toContainText("2026-05-15", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release Review", { timeout: 15000 });
      await expect(projectSurface).toContainText("blocked", { timeout: 15000 });
      await expect(projectSurface).toContainText("Signoff Progress", { timeout: 15000 });
      await expect(projectSurface).toContainText("ownership_pending", { timeout: 15000 });
      await expect(projectSurface).toContainText("Signoff Ownership", { timeout: 15000 });
      await expect(projectSurface).toContainText("incomplete", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release Phase", { timeout: 15000 });
      await expect(projectSurface).toContainText("candidate", { timeout: 15000 });
      await expect(projectSurface).toContainText("Next Phase", { timeout: 15000 });
      await expect(projectSurface).toContainText("approved", { timeout: 15000 });
      await expect(projectSurface).toContainText("Transition Ready", { timeout: 15000 });
      await expect(projectSurface).toContainText("no", { timeout: 15000 });
      await expect(projectSurface).toContainText("Required Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("Pending Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("platform, ops", { timeout: 15000 });
      await expect(projectSurface).toContainText("Unassigned Approvers", { timeout: 15000 });
      await expect(projectSurface).toContainText("Assign owned readiness obligations for: platform, ops.", { timeout: 15000 });
      await expect(projectSurface).toContainText("Release cannot advance until readiness blockers are cleared.", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("revises governed readiness obligations through the conversation chat interface", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Readiness Obligations Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed readiness-obligation revision."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Readiness Obligations Session");
      await composer.fill("please revise governed readiness obligations");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();

      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      const obligationsApprovalId = await approveNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, obligationsApprovalId);

      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          const obligations = detailResult.data.readinessObligations;
          const readiness = detailResult.data.readinessSummary;
          return Array.isArray(obligations)
            && obligations.some((obligation) => obligation.title === "Complete operator release signoff" && obligation.blocking)
            && readiness?.blockedReadinessObligationCount === 1;
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Release Readiness", { timeout: 15000 });
      await expect(projectSurface).toContainText("Complete operator release signoff", { timeout: 15000 });
      await expect(projectSurface).toContainText("blocking", { timeout: 15000 });
      await expect(projectSurface).toContainText("Blocked Obligations", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("denies governed release readiness revisions through the conversation chat interface without persisting them", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Release Readiness Denial Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");
      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed release-readiness denial."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Release Readiness Denial Session");
      await composer.fill("please revise governed release readiness");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();
      await expect(transcript).toContainText("I have prepared 1 proposed action.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const denyApprovalId = await denyNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.denyRequest({ environmentId, requestId });
      }, denyApprovalId);

      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          return detailResult.data.releaseReadiness == null;
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("No release readiness record is defined for this project yet.", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("denies governed project foundation revisions through the conversation chat interface without persisting them", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock"
    });
    try {
      await createConversationSession(page, "Governed Project Denial Session");

      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      const transcript = page.locator(".conversation-thread-transcript-panel");
      const detailPanel = page.locator(".conversation-browse-detail-panel");

      const initialApprovalIds = await approvalRequestIds(page);

      await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const project = await window.sbclAgentDesktop.command.createProject({
          environmentId,
          title: "Agent Governed Project",
          summary: "Selected project for governed foundation denial."
        });
        await window.sbclAgentDesktop.command.updateProjectConstitution({
          environmentId,
          projectId: project.data.projectId,
          constitution: {
            purpose: "Deliver an end-to-end governed SDLC loop."
          }
        });
        await window.sbclAgentDesktop.command.appendProjectRequirement({
          environmentId,
          projectId: project.data.projectId,
          id: "req-governed-capture",
          title: "Capture governed requirements",
          summary: "Preserve the governed baseline requirement set."
        });
      });
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const result = await window.sbclAgentDesktop.query.projectList(environmentId);
          return result.data.projects.some((project) => project.title === "Agent Governed Project");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Governed Project Denial Session");
      await composer.fill("please revise governed project foundations");
      await page.getByRole("button", { name: "Send message", exact: true }).last().click();
      await expect(transcript).toContainText("I have prepared 2 proposed actions.", { timeout: 15000 });
      await expect(detailPanel).toContainText("Approvals", { timeout: 15000 });
      const denyApprovalId = await denyNewRequest(page, initialApprovalIds);
      await page.evaluate(async (requestId) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        await window.sbclAgentDesktop.command.denyRequest({ environmentId, requestId });
      }, denyApprovalId);

      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const environmentId = summary.data.environmentId;
          const listResult = await window.sbclAgentDesktop.query.projectList(environmentId);
          const projectId = listResult.data.projects[0]?.projectId;
          if (!projectId) {
            return false;
          }
          const detailResult = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
          return detailResult.data.constitution?.purpose === "Deliver an end-to-end governed SDLC loop."
            && !detailResult.data.requirements.some((requirement) => requirement.requirementId === "req-governed-closure");
        });
      }, { timeout: 15000 }).toBeTruthy();

      await openWorkspace(page, "Projects");
      const projectSurface = page.locator(".projects-journey");
      await expect(projectSurface).toContainText("Deliver an end-to-end governed SDLC loop.", { timeout: 15000 });
      await expect(projectSurface).not.toContainText("Sustain governed SDLC closure through iterative evidence.");
      await expect(projectSurface).not.toContainText("Track governed closure evidence");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders configuration preferences and switches themes", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Configuration");

      await expect(page.locator("body")).toContainText("Configuration Categories");
      await expect(page.locator("body")).toContainText("Themeappearance");
      await expect(page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first()).toContainText(
        "Control how the desktop resolves light and dark appearance for this project shell."
      );

      const html = page.locator("html");

      await page.getByRole("button", { name: "Light", exact: true }).click();
      await expect(html).toHaveAttribute("data-theme", "light");

      await page.getByRole("button", { name: "Dark", exact: true }).click();
      await expect(html).toHaveAttribute("data-theme", "dark");

      const expectedSystemTheme = await page.evaluate(() =>
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      );

      await page.getByRole("button", { name: "System", exact: true }).click();
      await expect(html).toHaveAttribute("data-theme", expectedSystemTheme);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders the published user documentation inside the desktop shell", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Documentation");

      await expect(page.locator("body")).toContainText("BrowserDocumentation");
      await expect(page.locator("body")).toContainText("Conversation Attachment");
      await expect(page.locator("body")).toContainText("Package Context");
      await expect(
        page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first()
      ).toContainText("DomainDocumentation");
      await expect(
        page.locator("aside.inspector").filter({ hasNot: page.locator(".inspector-embedded") }).first()
      ).toContainText("TitleNo page selected");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders approval, incident, and governed work surfaces from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Approvals");
      await expect(page.locator("body")).toContainText("workspace_write");
      await expect(page.locator("body")).toContainText("Decision Context");
      await expect(page.locator("body")).toContainText("Grant workspace_write and resume governed work");
      await expect(page.locator("body")).toContainText("Desktop bootstrap seeded a governed write candidate.");
      await expect(page.locator("body")).toContainText("Approving this request clears the approval gate so the work item can be resumed.");

      await openWorkspace(page, "Incidents");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");
      await expect(page.locator("body")).toContainText("capture_checkpoint_and_validate");

      await openWorkspace(page, "Work");
      await expect(page.locator("body")).toContainText("Reconcile Work");
      await expect(page.locator("body")).toContainText("Runtime reload recovery");
      await expect(page.locator("body")).toContainText("Desktop attention model refinement");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders a concrete dashboard action queue and routes into the selected operational target", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const rows = queuePanel.locator(".browser-table-body .browser-table-row");

      await expect(queuePanel).toContainText("Ranked Governed Queue");
      await expect(queuePanel).toContainText("Runtime reload interrupted");
      await expect(queuePanel).toContainText("Recover runtime listener posture");
      await expect(queuePanel).not.toContainText("Runtime reload recovery");
      await expect(rows.nth(0)).toContainText("Runtime reload interrupted");
      await expect(rows.nth(1)).toContainText("Recover runtime listener posture");

      await rows.nth(0).locator(".table-row-action").evaluate((element: HTMLElement) => element.click());
      await expect(page.locator("body")).toContainText("Recovery Journey");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("suppresses derivative queue items when canonical recovery targets are present", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const rows = queuePanel.locator(".browser-table-body .browser-table-row");

      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Runtime reload interrupted");
      await expect(rows.nth(0)).toContainText("Recovery");
      await expect(rows.nth(1)).toContainText("Recover runtime listener posture");
      await expect(rows.nth(1)).toContainText("Runtime");
      await expect(rows.nth(2)).toContainText("Desktop attention model refinement");

      await expect(queuePanel).not.toContainText("Runtime reload recovery");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps the footer next target aligned with the top dashboard recommendation", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const topRow = queuePanel.locator(".browser-table-body .browser-table-row").nth(0);
      const journeysPanel = page.locator(".operate-parallel-panel").first();

      await expect(topRow).toContainText("Runtime reload interrupted");
      await expect(journeysPanel).toContainText("Recommended Route");
      await expect(journeysPanel).toContainText("Runtime reload interrupted");

      await topRow.locator(".table-row-action").evaluate((element: HTMLElement) => element.click());
      await expect(page.locator("body")).toContainText("Recovery Journey");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps runtime recovery ahead of runtime listener stabilization in dashboard ordering", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const rows = queuePanel.locator(".browser-table-body .browser-table-row");

      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Runtime reload interrupted");
      await expect(rows.nth(1)).toContainText("Recover runtime listener posture");
      await expect(rows.nth(0)).toContainText("Recovery");
      await expect(rows.nth(1)).toContainText("Runtime");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("prioritizes awaiting approvals in the approval-heavy dashboard scenario", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const queuePanel = operateJourneyPanel(page);
      const rows = queuePanel.locator(".browser-table-body .browser-table-row");

      await expect(queuePanel).toContainText("Desktop attention model refinement", { timeout: 15000 });
      await expect(queuePanel).toContainText("Stabilize host transport contract", { timeout: 15000 });
      await expect(rows.nth(0)).toContainText("Desktop attention model refinement");
      await expect(rows.nth(0)).toContainText("work");
      await expect(rows.nth(0)).toContainText("approvalRequired");
      await expect(rows.nth(1)).toContainText("Desktop attention model refinement");
      await expect(rows.nth(1)).toContainText("approval");
      await expect(rows.nth(1)).toContainText("awaiting");
      await expect(queuePanel).not.toContainText("Runtime reload interrupted");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces evidence items when the dashboard scenario is calm", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "calm-evidence"
    });
    try {
      await openOperateEvidence(page);

      const evidencePanel = operateEvidencePanel(page);
      const rows = evidencePanel.locator(".browser-table-body .browser-table-row");

      await expect(evidencePanel).toContainText("Artifact Summary", { timeout: 15000 });
      await expect(rows.first()).toBeVisible({ timeout: 15000 });
      await expect(rows.first()).toContainText("Artifact Summary");
      await expect(evidencePanel).not.toContainText("Desktop attention model refinement");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps recovery and runtime ahead of approvals in the mixed-pressure dashboard scenario", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateQueuePanel(page).locator(".browser-table-body .browser-table-row");

      await expect(rows.nth(0)).toContainText("Runtime reload interrupted");
      await expect(rows.nth(0)).toContainText("Recovery");
      await expect(rows.nth(1)).toContainText("Recover runtime listener posture");
      await expect(rows.nth(1)).toContainText("Runtime");
      await expect(operateQueuePanel(page)).toContainText("Desktop attention model refinement");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("explains why a mid-queue dashboard item sits between its neighbors", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateQueuePanel(page).locator(".browser-table-body .browser-table-row");
      await expect(rows.nth(1)).toBeVisible({ timeout: 15000 });
      await expect(rows.nth(0)).toContainText("Runtime reload interrupted");
      await expect(rows.nth(1)).toContainText("Recover runtime listener posture");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("refreshes the dashboard queue after approving a governed request", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const journeyRows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");
      await expect(journeyRows.nth(1)).toBeVisible({ timeout: 15000 });
      await expect(journeyRows.nth(0)).toContainText("Desktop attention model refinement");
      await expect(operateJourneyPanel(page)).toContainText("Stabilize host transport contract");
      await openWorkspace(page, "Approvals");

      const approvalRows = page.locator(".approvals-list-panel .browser-table-body .browser-table-row");
      await approvalRows.filter({ hasText: "Desktop attention model refinement" }).first().click();
      await page.getByRole("button", { name: "Approve Request", exact: true }).click();

      await expect(page.locator(".approval-action-panel")).toContainText("approved");

      await openOperateJourneys(page);

      await expect(operateJourneyPanel(page)).toContainText("Stabilize host transport contract");
      await expect(operateJourneyPanel(page)).toContainText("Desktop attention model refinement");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("can approve an awaiting request directly from the dashboard", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");

      await expect(rows.nth(1)).toBeVisible({ timeout: 15000 });
      await openWorkspace(page, "Approvals");

      const approvalRows = page.locator(".approvals-list-panel .browser-table-body .browser-table-row");
      await approvalRows.filter({ hasText: "Desktop attention model refinement" }).first().click();
      await page.getByRole("button", { name: "Approve Request", exact: true }).click();

      await expect(page.locator(".approval-action-panel")).toContainText("approved");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("updates the selected dashboard action after a direct approval without stale detail state", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");
      const detailPanel = operateDetailPanel(page);

      await expect(rows.nth(0)).toBeVisible({ timeout: 15000 });
      await rows.nth(0).evaluate((element: HTMLElement) => element.click());
      await expect(detailPanel).toContainText("Desktop attention model refinement");
      await expect(detailPanel).toContainText("Dependency");
      await expect(detailPanel).toContainText("Next Step");
      await expect(detailPanel.getByRole("button", { name: "Open Work", exact: true })).toBeVisible();
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("can continue a retained thread directly from the dashboard", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "thread-work-pressure"
    });
    try {
      await openWorkspace(page, "Conversations");
      await expect(page.locator(".conversation-list-panel")).toContainText("Interrupted Reconciliation", { timeout: 15000 });
      await selectConversationThread(page, "Interrupted Reconciliation");
      await expect(page.locator(".conversation-composer-dock .conversation-draft-editor")).toBeVisible();
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("can continue a governed work item directly from the dashboard", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "thread-work-pressure"
    });
    try {
      await openWorkspace(page, "Work");
      await expect(page.locator("body")).toContainText("Quarantined mutation follow-through");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("mutates governed work item lifecycle directly from the work panel", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Work");

      const workRows = page.locator(".work-list-panel .browser-table-body .browser-table-row");
      await expect(workRows.first()).toBeVisible({ timeout: 15000 });
      await workRows.first().click();

      const selectedWorkItem = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const items = await window.sbclAgentDesktop.query.workItemList(environmentId);
        return items.data[0];
      });

      await expect(page.locator(".work-detail-panel")).toContainText(selectedWorkItem.title);
      await page.getByRole("button", { name: "Quarantine", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: "Quarantine Work Item" });
      await dialog.locator("textarea").fill("Operator forced explicit recovery review from the Work panel.");
      await dialog.getByRole("button", { name: "Quarantine Work", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      await expect(page.locator(".work-detail-panel")).toContainText("quarantined", { timeout: 15000 });
      await expect(page.locator(".work-detail-panel")).toContainText("operator_review", { timeout: 15000 });

      const updatedWorkItem = await page.evaluate(async ({ workItemId }) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const detail = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
        return detail.data;
      }, { workItemId: selectedWorkItem.workItemId });

      expect(updatedWorkItem.state).toBe("quarantined");
      expect(updatedWorkItem.waitingReason).toBe("operator_review");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("routes corrective governed work into approval control directly from the work panel", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openWorkspace(page, "Work");
      const workTitle = "Desktop attention model refinement";
      const approvalTitle = "Desktop attention model refinement";

      await page.locator(".work-list-panel .browser-table-row").filter({ hasText: workTitle }).first().click();
      await expect(page.locator(".work-detail-panel")).toContainText(workTitle, { timeout: 15000 });
      await expect(page.getByRole("button", { name: "Review Approval", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Approve Corrective Work", exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Review Approval", exact: true }).click();
      await expect(page.locator(".approvals-grid")).toContainText(approvalTitle, { timeout: 15000 });

      await openWorkspace(page, "Work");
      await page.locator(".work-list-panel .browser-table-row").filter({ hasText: workTitle }).first().click();
      await page.getByRole("button", { name: "Approve Corrective Work", exact: true }).click();

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approval-action-panel")).toContainText("approved", { timeout: 15000 });

      await openWorkspace(page, "Work");
      await page.locator(".work-list-panel .browser-table-row").filter({ hasText: workTitle }).first().click();
      await expect(page.locator(".work-detail-panel")).not.toContainText("Approve Corrective Work", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("auto-creates corrective governed work from a live runtime event and routes it through approval", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "calm-evidence"
    });
    try {
      const baseline = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const workItems = await window.sbclAgentDesktop.query.workItemList(environmentId);
        return {
          environmentId,
          existingWorkItemIds: workItems.data.map((item) => item.workItemId)
        };
      });

      await page.evaluate(async ({ environmentId }) => {
        await window.sbclAgentDesktop.command.createIntent({
          environmentId,
          description: "Keep runtime behavior aligned with the approved contract.",
          scope: {
            symbols: ["SBCL-AGENT::RUN-CONVERSATION-TURN"]
          },
          constraints: [
            {
              policy: "governance-required"
            }
          ],
          status: "deprecated",
          linkedEventIds: ["event-missing"],
          linkedMutationIds: ["mutation-missing"]
        });
      }, { environmentId: baseline.environmentId });

      const sidebar = page.locator("aside.sidebar").first();
      await sidebar.getByRole("button", { name: "Listener", exact: true }).first().click();
      await page.locator(".runtime-eval-panel").scrollIntoViewIfNeeded();
      await page.locator(".runtime-editor").fill("(+ 20 22)");
      await page.getByRole("button", { name: "Run Form", exact: true }).click();

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, existingWorkItemIds }) => {
          const workItems = await window.sbclAgentDesktop.query.workItemList(environmentId);
          const target = workItems.data.find((item) =>
            item.correctiveContext
            && !existingWorkItemIds.includes(item.workItemId)
            && item.approvalCount > 0
          );
          return target
            ? JSON.stringify({
                workItemId: target.workItemId,
                title: target.title,
                approvalCount: target.approvalCount
              })
            : "";
        }, baseline);
      }, { timeout: 15000 }).not.toBe("");

      const correctiveTarget = JSON.parse(await page.evaluate(async ({ environmentId, existingWorkItemIds }) => {
        const [workItems, approvals] = await Promise.all([
          window.sbclAgentDesktop.query.workItemList(environmentId),
          window.sbclAgentDesktop.query.approvalRequestList(environmentId)
        ]);
        const target = workItems.data.find((item) =>
          item.correctiveContext
          && !existingWorkItemIds.includes(item.workItemId)
          && item.approvalCount > 0
        );
        const approval = approvals.data.find((item) => item.state === "awaiting" && item.title === target?.title);
        if (!target || !approval) {
          throw new Error("No auto-created approval-bearing corrective work item was found.");
        }
        return JSON.stringify({
          workItemId: target.workItemId,
          title: target.title,
          approvalTitle: approval.title,
          requestId: approval.requestId
        });
      }, baseline)) as { workItemId: string; title: string; approvalTitle: string; requestId: string };

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approvals-list-panel")).toContainText("Governed Decisions", { timeout: 15000 });
      await page.evaluate(async ({ environmentId, requestId }) => {
        await window.sbclAgentDesktop.command.approveRequest({ environmentId, requestId });
      }, { environmentId: baseline.environmentId, requestId: correctiveTarget.requestId });

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, approvalTitle }) => {
          const approvals = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
          return approvals.data.some((item) => item.title === approvalTitle && item.state === "awaiting");
        }, { environmentId: baseline.environmentId, approvalTitle: correctiveTarget.approvalTitle });
      }, { timeout: 15000 }).toBe(false);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("reopens corrective governed work from later live runtime events after the earlier correction is no longer actionable", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "calm-evidence"
    });
    try {
      const baseline = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const workItems = await window.sbclAgentDesktop.query.workItemList(environmentId);
        return {
          environmentId,
          existingWorkItemIds: workItems.data.map((item) => item.workItemId)
        };
      });

      await page.evaluate(async ({ environmentId }) => {
        await window.sbclAgentDesktop.command.createIntent({
          environmentId,
          description: "Keep runtime behavior aligned with the approved contract.",
          scope: {
            symbols: ["SBCL-AGENT::RUN-CONVERSATION-TURN"]
          },
          constraints: [
            {
              policy: "governance-required"
            }
          ],
          status: "deprecated",
          linkedEventIds: ["event-missing"],
          linkedMutationIds: ["mutation-missing"]
        });
      }, { environmentId: baseline.environmentId });

      async function triggerRuntimeEvent(form: string): Promise<void> {
        const sidebar = page.locator("aside.sidebar").first();
        await sidebar.getByRole("button", { name: "Listener", exact: true }).first().click();
        await page.locator(".runtime-eval-panel").scrollIntoViewIfNeeded();
        await page.locator(".runtime-editor").fill(form);
        await page.getByRole("button", { name: "Run Form", exact: true }).click();
      }

      async function findCorrectiveTarget(excludedWorkItemIds: string[]): Promise<{
        workItemId: string;
        title: string;
        approvalTitle: string;
        requestId: string;
      }> {
        await expect.poll(async () => {
          return page.evaluate(async ({ environmentId, excludedWorkItemIds }) => {
            const [workItems, approvals] = await Promise.all([
              window.sbclAgentDesktop.query.workItemList(environmentId),
              window.sbclAgentDesktop.query.approvalRequestList(environmentId)
            ]);
            const target = workItems.data.find((item) =>
              item.correctiveContext
              && !excludedWorkItemIds.includes(item.workItemId)
              && item.approvalCount > 0
            );
            const approval = approvals.data.find((item) => item.state === "awaiting" && item.title === target?.title);
            return target && approval
              ? JSON.stringify({
                  workItemId: target.workItemId,
                  title: target.title,
                  approvalTitle: approval.title,
                  requestId: approval.requestId
                })
              : "";
          }, { environmentId: baseline.environmentId, excludedWorkItemIds });
        }, { timeout: 15000 }).not.toBe("");

        return JSON.parse(await page.evaluate(async ({ environmentId, excludedWorkItemIds }) => {
          const [workItems, approvals] = await Promise.all([
            window.sbclAgentDesktop.query.workItemList(environmentId),
            window.sbclAgentDesktop.query.approvalRequestList(environmentId)
          ]);
          const target = workItems.data.find((item) =>
            item.correctiveContext
            && !excludedWorkItemIds.includes(item.workItemId)
            && item.approvalCount > 0
          );
          const approval = approvals.data.find((item) => item.state === "awaiting" && item.title === target?.title);
          if (!target || !approval) {
            throw new Error("No approval-bearing corrective target was found.");
          }
          return JSON.stringify({
            workItemId: target.workItemId,
            title: target.title,
            approvalTitle: approval.title,
            requestId: approval.requestId
          });
        }, { environmentId: baseline.environmentId, excludedWorkItemIds })) as {
          workItemId: string;
          title: string;
          approvalTitle: string;
          requestId: string;
        };
      }

      await triggerRuntimeEvent("(+ 20 22)");
      const firstCorrective = await findCorrectiveTarget(baseline.existingWorkItemIds);

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approvals-list-panel")).toContainText("Governed Decisions", { timeout: 15000 });
      await page.evaluate(async ({ environmentId, requestId }) => {
        await window.sbclAgentDesktop.command.approveRequest({
          environmentId,
          requestId
        });
      }, { environmentId: baseline.environmentId, requestId: firstCorrective.requestId });
      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, approvalTitle }) => {
          const approvals = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
          return approvals.data.some((item) => item.title === approvalTitle && item.state === "awaiting");
        }, { environmentId: baseline.environmentId, approvalTitle: firstCorrective.approvalTitle });
      }, { timeout: 15000 }).toBe(false);

      await page.evaluate(async ({ environmentId, workItemId }) => {
        await window.sbclAgentDesktop.command.resumeWorkItem({
          environmentId,
          workItemId,
          note: "Approved corrective execution should continue."
        });
      }, { environmentId: baseline.environmentId, workItemId: firstCorrective.workItemId });

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, workItemId }) => {
          const detail = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
          return detail.data.state;
        }, { environmentId: baseline.environmentId, workItemId: firstCorrective.workItemId });
      }, { timeout: 15000 }).toBe("active");

      await triggerRuntimeEvent("(+ 30 12)");
      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, workItemId }) => {
          const workItems = await window.sbclAgentDesktop.query.workItemList(environmentId);
          return workItems.data.filter((item) => item.correctiveContext && item.workItemId !== workItemId).length;
        }, { environmentId: baseline.environmentId, workItemId: firstCorrective.workItemId });
      }, { timeout: 10000 }).toBe(0);

      await page.evaluate(async ({ environmentId, workItemId }) => {
        await window.sbclAgentDesktop.command.rollbackWorkItem({
          environmentId,
          workItemId,
          reason: "Close the earlier corrective path before validating reopening.",
          note: "Terminalize the first corrective execution before the next runtime trigger."
        });
      }, { environmentId: baseline.environmentId, workItemId: firstCorrective.workItemId });

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, workItemId }) => {
          const detail = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
          return detail.data.state;
        }, { environmentId: baseline.environmentId, workItemId: firstCorrective.workItemId });
      }, { timeout: 15000 }).toBe("blocked");

      await triggerRuntimeEvent("(+ 50 8)");
      const secondCorrective = await findCorrectiveTarget([
        ...baseline.existingWorkItemIds,
        firstCorrective.workItemId
      ]);

      expect(secondCorrective.workItemId).not.toBe(firstCorrective.workItemId);

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, workItemId }) => {
          const detail = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
          return detail.data.correctiveContext?.kind ?? "";
        }, { environmentId: baseline.environmentId, workItemId: secondCorrective.workItemId });
      }, { timeout: 15000 }).toBe("alignment_reconciliation");

      await expect.poll(async () => {
        return page.evaluate(async ({ environmentId, requestId }) => {
          const approvals = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
          return approvals.data.find((item) => item.requestId === requestId)?.state ?? "";
        }, { environmentId: baseline.environmentId, requestId: secondCorrective.requestId });
      }, { timeout: 15000 }).toBe("awaiting");

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approvals-list-panel")).toContainText("Governed Decisions", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("routes corrective governed work into approval control directly from browser governance", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      const target = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const [workItems, approvals] = await Promise.all([
          window.sbclAgentDesktop.query.workItemList(environmentId),
          window.sbclAgentDesktop.query.approvalRequestList(environmentId)
        ]);
        const workItem = workItems.data.find((item) => item.approvalCount > 0) ?? null;
        const approval = approvals.data.find((item) => item.state === "awaiting") ?? null;
        return workItem && approval
          ? {
              workTitle: workItem.title,
              approvalTitle: approval.title
            }
          : null;
      });
      expect(target).not.toBeNull();
      if (!target) {
        throw new Error("No approval-bearing governed work item was available for browser governance routing.");
      }

      await openWorkspace(page, "Browser");
      await page.getByRole("button", { name: "Governance", exact: true }).first().click();
      const governanceRows = page.locator(".browser-domain-stack .browser-table-row");
      await expect(governanceRows.first()).toBeVisible({ timeout: 15000 });
      await governanceRows.filter({ hasText: target.workTitle }).first().click();
      const governanceActions = page.locator(".browser-action-strip").last();
      await expect(governanceActions.getByRole("button", { name: "Review Approval", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(governanceActions.getByRole("button", { name: "Approve Corrective Work", exact: true })).toBeVisible({ timeout: 15000 });

      await governanceActions.getByRole("button", { name: "Review Approval", exact: true }).click();
      await expect(page.locator(".approvals-grid")).toContainText(target.approvalTitle, { timeout: 15000 });

      await openWorkspace(page, "Browser");
      await page.getByRole("button", { name: "Governance", exact: true }).first().click();
      await expect(governanceRows.first()).toBeVisible({ timeout: 15000 });
      await governanceRows.filter({ hasText: target.workTitle }).first().click();
      await page.locator(".browser-action-strip").last().getByRole("button", { name: "Approve Corrective Work", exact: true }).click();

      await openWorkspace(page, "Approvals");
      await expect(page.locator(".approval-action-panel")).toContainText("approved", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders and steers the governed work-item plan directly from the work panel", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Work");

      const workRows = page.locator(".work-list-panel .browser-table-body .browser-table-row");
      await expect(workRows.first()).toBeVisible({ timeout: 15000 });
      await workRows.first().click();

      const selectedWorkItem = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const items = await window.sbclAgentDesktop.query.workItemList(environmentId);
        return items.data[0];
      });

      await expect(page.locator(".work-detail-panel")).toContainText("Plan", { timeout: 15000 });
      await page.getByRole("button", { name: "Steer Work", exact: true }).click();

      const dialog = page.getByRole("dialog", { name: "Steer Work Item" });
      const fields = dialog.locator("input, textarea");
      await fields.nth(0).fill("validate");
      await fields.nth(1).fill("run-cold-validation");
      await fields.nth(2).fill("Validation first");
      await dialog.getByRole("button", { name: "Steer Work", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      await expect(page.locator(".work-detail-panel")).toContainText("Operator Phase", { timeout: 15000 });
      await expect(page.locator(".work-detail-panel")).toContainText("validate", { timeout: 15000 });
      await expect(page.locator(".work-detail-panel")).toContainText("run-cold-validation", { timeout: 15000 });
      await expect(page.locator(".work-detail-panel")).toContainText("Validation first", { timeout: 15000 });

      const updatedPlan = await page.evaluate(async ({ workItemId }) => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const plan = await window.sbclAgentDesktop.query.workItemPlan(workItemId, environmentId);
        return plan.data;
      }, { workItemId: selectedWorkItem.workItemId });

      expect(updatedPlan.planSteering?.operatorDirectedPhase).toBe("validate");
      expect(updatedPlan.planSteering?.operatorDirectedNextStep).toBe("run-cold-validation");
      expect(updatedPlan.operatorSteeringHistory.length).toBeGreaterThan(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("can continue a recovery item directly from the dashboard", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const row = queuePanel.locator(".browser-table-row").filter({ hasText: "Runtime reload interrupted" }).first();

      await expect(queuePanel).toContainText("Runtime reload interrupted", { timeout: 15000 });
      await row.getByRole("button").evaluate((element: HTMLElement) => element.click());

      await expect(page.locator("body")).toContainText("Incidents");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");
      await expect(page.locator(".incident-detail-panel")).toBeVisible();
      await expect(page.locator(".incident-detail-panel")).toContainText("Runtime reload interrupted");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("authors governed incident remediation directly from the incidents panel", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await expect.poll(async () => {
        return page.evaluate(async () => {
          const summary = await window.sbclAgentDesktop.query.environmentSummary();
          const result = await window.sbclAgentDesktop.query.incidentList(summary.data.environmentId);
          return result.data.length;
        });
      }, { timeout: 15000 }).toBeGreaterThan(0);
      await openWorkspace(page, "Incidents");
      const incidentList = page.locator(".incidents-list-panel");
      await expect(incidentList).toContainText("Runtime reload interrupted", { timeout: 15000 });

      await incidentList.locator(".thread-row").filter({ hasText: "Runtime reload interrupted" }).first().click();
      const detailPanel = page.locator(".incident-detail-panel");
      await expect(detailPanel).toContainText("Runtime reload interrupted", { timeout: 15000 });

      await page.getByRole("button", { name: "Edit Remediation Plan", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Edit Incident Remediation Plan" });
      const fields = dialog.locator("textarea");
      await dialog.locator("select").first().selectOption("active");
      await dialog.locator("input").first().fill("ops");
      await fields.nth(0).fill("Restore trust in the guarded runtime path.");
      await fields.nth(1).fill("Inspect runtime guard evidence\nResume the safer binding path");
      await fields.nth(2).fill("Confirm cold validation passed\nVerify no open recovery blockers remain");
      await fields.nth(3).fill("Pending approval");
      await dialog.getByRole("button", { name: "Save Remediation Plan", exact: true }).click();
      await expect(dialog).toBeHidden({ timeout: 15000 });

      await expect(detailPanel).toContainText("Restore trust in the guarded runtime path.", { timeout: 15000 });
      await expect(detailPanel).toContainText("ops");
      await expect(page.locator("body")).toContainText("Inspect runtime guard evidence");

      const remediationPlan = await page.evaluate(async () => {
        const summary = await window.sbclAgentDesktop.query.environmentSummary();
        const environmentId = summary.data.environmentId;
        const incidents = await window.sbclAgentDesktop.query.incidentList(environmentId);
        const target = incidents.data.find((incident) => incident.title === "Runtime reload interrupted");
        if (!target) {
          throw new Error("Target incident not found");
        }
        const detail = await window.sbclAgentDesktop.query.incidentDetail(target.incidentId, environmentId);
        return detail.data.remediationPlan;
      });

      expect(remediationPlan?.status).toBe("active");
      expect(remediationPlan?.owner).toBe("ops");
      expect(remediationPlan?.actions).toContain("Inspect runtime guard evidence");
      expect(remediationPlan?.validationSteps).toContain("Confirm cold validation passed");
      expect(remediationPlan?.blockers).toContain("Pending approval");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps dashboard direct actions specific to the selected object type", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");
      const detailPanel = operateDetailPanel(page);

      await expect(rows.filter({ hasText: "Runtime reload interrupted" }).first()).toBeVisible();
      await expect(rows.filter({ hasText: "Desktop attention model refinement" }).first()).toBeVisible();

      await rows.filter({ hasText: "Runtime reload interrupted" }).first().evaluate((element: HTMLElement) => element.click());
      await expect(detailPanel).toContainText("Runtime reload interrupted");
      await expect(detailPanel.getByRole("button", { name: "Open Recovery", exact: true })).toBeVisible();
      await expect(detailPanel.getByRole("button", { name: "Open Approvals", exact: true })).toHaveCount(0);
      await expect(detailPanel.getByRole("button", { name: "Open Work", exact: true })).toHaveCount(0);

      await rows.filter({ hasText: "Desktop attention model refinement" }).first().evaluate((element: HTMLElement) => element.click());
      await expect(detailPanel).toContainText("Desktop attention model refinement");
      await expect(detailPanel.getByRole("button", { name: "Open Work", exact: true })).toBeVisible();
      await expect(detailPanel.getByRole("button", { name: "Open Recovery", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("marks calm artifact-only queue items as route-only from the dashboard", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "calm-evidence"
    });
    try {
      await openOperateEvidence(page);

      const rows = operateEvidencePanel(page).locator(".browser-table-body .browser-table-row");
      const detailPanel = operateDetailPanel(page);

      await expect(rows).toHaveCount(1, { timeout: 15000 });
      await rows.nth(0).evaluate((element: HTMLElement) => element.click());

      await expect(detailPanel).toContainText("Artifact Summary");
      await expect(detailPanel).toContainText("Artifact Summary");
      await expect(detailPanel.getByRole("button", { name: "Open Artifacts", exact: true })).toBeVisible();
      await expect(detailPanel.getByRole("button", { name: "Open Approvals", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps the dashboard coherent after a direct approval round-trip", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");
      const detailPanel = operateDetailPanel(page);

      await expect(rows.nth(1)).toBeVisible({ timeout: 15000 });
      await expect(operateJourneyPanel(page)).toContainText("Desktop attention model refinement");
      await expect(operateJourneyPanel(page)).toContainText("Stabilize host transport contract");
      await openWorkspace(page, "Approvals");

      const approvalRows = page.locator(".approvals-list-panel .browser-table-body .browser-table-row");
      await approvalRows.filter({ hasText: "Desktop attention model refinement" }).first().click();
      await page.getByRole("button", { name: "Approve Request", exact: true }).click();

      await openWorkspace(page, "Operate");
      await expect(page.locator("body")).toContainText("Operate Snapshot");

      await openOperateJourneys(page);

      await expect(rows.nth(2)).toBeVisible({ timeout: 15000 });
      await expect(operateJourneyPanel(page)).toContainText("Desktop attention model refinement");
      await expect(operateJourneyPanel(page)).toContainText("Stabilize host transport contract");
      await expect(operateJourneyPanel(page)).toContainText("awaiting");
      await rows.filter({ hasText: "Desktop attention model refinement" }).first().evaluate((element: HTMLElement) => element.click());
      await expect(detailPanel).toContainText("Desktop attention model refinement");
      await expect(detailPanel.getByRole("button", { name: "Open Work", exact: true })).toBeVisible();
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps dashboard trust and direct actions coherent after a recovery round-trip", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "mixed-pressure"
    });
    try {
      await openOperateJourneys(page);

      const queuePanel = operateQueuePanel(page);
      const detailPanel = operateDetailPanel(page);
      await queuePanel
        .locator(".browser-table-row")
        .filter({ hasText: "Runtime reload interrupted" })
        .first()
        .getByRole("button")
        .evaluate((element: HTMLElement) => element.click());

      await expect(page.locator("body")).toContainText("Incidents");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");

      await openOperateJourneys(page);

      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");
      await expect(rows.filter({ hasText: "Runtime reload interrupted" }).first()).toBeVisible();
      await rows.filter({ hasText: "Runtime reload interrupted" }).first().evaluate((element: HTMLElement) => element.click());
      await expect(detailPanel).toContainText("Runtime reload interrupted");
      await expect(detailPanel.getByRole("button", { name: "Open Recovery", exact: true })).toBeVisible();
      await expect(detailPanel.getByRole("button", { name: "Open Approvals", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps dashboard thread continuation coherent after a conversations round-trip", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "thread-work-pressure"
    });
    try {
      await openWorkspace(page, "Conversations");
      await selectConversationThread(page, "Interrupted Reconciliation");
      await expect(page.locator(".conversation-composer-dock .conversation-draft-editor")).toBeVisible();

      await openWorkspace(page, "Conversations");
      await expect(page.locator(".conversation-list-panel")).toContainText("Interrupted Reconciliation");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps dashboard work continuation coherent after an execution round-trip", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "thread-work-pressure"
    });
    try {
      await openWorkspace(page, "Work");
      await expect(page.locator("body")).toContainText("Quarantined mutation follow-through");

      await openWorkspace(page, "Work");
      await expect(page.locator("body")).toContainText("Quarantined mutation follow-through");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("surfaces interrupted threads alongside quarantined work in the thread-work-pressure scenario", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "thread-work-pressure"
    });
    try {
      await openWorkspace(page, "Conversations");
      await expect(page.locator(".conversation-list-panel")).toContainText("Interrupted Reconciliation", { timeout: 15000 });
      await openWorkspace(page, "Work");
      await expect(page.locator("body")).toContainText("Quarantined mutation follow-through");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps the conversations workspace in a conversational posture without execution decision controls", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");

      await expect(page.locator(".conversation-list-panel")).toContainText("Conversations >> Threads");
      await expect(page.locator(".conversation-browse-detail-panel")).toContainText("Conversations >> Threads");
      await expect(page.locator("body")).toContainText("No Thread Selected");
      await expect(page.locator("body")).toContainText("Select a thread from Browse to continue the session here.");
      await expect(page.getByRole("button", { name: "Approve Request", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Approve from Dashboard", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Continue Work from Dashboard", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Continue Recovery from Dashboard", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps the browser workspace in an inspection posture without governed action controls", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await expect(page.locator(".browser-secondary-card")).toContainText("Direct Runtime Query");
      await expect(page.locator(".browser-secondary-card").getByRole("button", { name: "Hide", exact: true })).toBeVisible();

      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const domainPane = page.locator(".browser-domain-pane");
      await expect(domainPane).toContainText("PRINT-OBJECT");
      await expect(domainPane).toContainText("Direct Runtime Query");
      await expect(page.getByRole("button", { name: "Approve Request", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Approve from Dashboard", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Continue from Dashboard", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Continue Work from Dashboard", exact: true })).toHaveCount(0);
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders dashboard node posture and top operator pressure from the workspace summary", async () => {
    const { app, page } = await launchDesktop({
      SBCL_AGENT_DESKTOP_SCENARIO: "approval-heavy"
    });
    try {
      await openOperateJourneys(page);

      const dashboard = page.locator(".operate-overview-panel");
      const rows = operateJourneyPanel(page).locator(".browser-table-body .browser-table-row");

      await expect(dashboard).toContainText("Pressure");
      await expect(dashboard).toContainText("Runtime");
      await expect(dashboard).toContainText("Evidence");
      await expect(dashboard).toContainText("Next Move");
      await expect(rows.nth(1)).toBeVisible({ timeout: 15000 });
      await expect(rows.nth(0)).toContainText("Desktop attention model refinement");

      await rows.nth(0).evaluate((element: HTMLElement) => element.click());
      const detailPanel = operateDetailPanel(page);
      await expect(detailPanel).toContainText("Desktop attention model refinement");
      await expect(detailPanel).toContainText("Dependency");
      await expect(detailPanel).toContainText("Next Step");
      await expect(detailPanel.getByRole("button", { name: "Open Work", exact: true })).toBeVisible();
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders runtime summary and direct evaluation shell from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sidebar = page.locator("aside.sidebar").first();
      await sidebar.getByRole("button", { name: "Listener", exact: true }).first().click();

      await expect(page.locator("body")).toContainText("Execution Journey");
      await expect(page.locator("body")).toContainText("Current Execution Objective");
      await expect(page.locator("body")).toContainText("SBCL-AGENT-USER");
      await expect(page.locator("body")).toContainText("Runtime Id");
      await expect(page.locator("body")).toContainText("Loaded Systems");
      await expect(page.locator("body")).toContainText("Inspection Scopes");
      await expect(page.locator("body")).toContainText("Listener");
      await expect(page.locator("body")).toContainText("Listener Runtime Context");
      await expect(page.getByRole("button", { name: "Run Form" })).toBeVisible();
      await expect(page.locator("body")).toContainText("Run a form to see governed runtime results here.");

      await page.locator(".runtime-eval-panel").scrollIntoViewIfNeeded();
      await page.locator(".runtime-editor").fill("(+ 20 22)");
      await page.getByRole("button", { name: "Run Form" }).focus();
      await page.keyboard.press("Enter");

      await expect(page.locator(".runtime-result-panel")).toContainText("42", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("creates a new live editor buffer and preserves it through the buffers view", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");

      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorTabs = page.getByLabel("Editor views");
      await editorTabs.getByRole("tab", { name: "Buffers", exact: true }).click();
      const bufferTable = page.locator(".editor-buffer-table").first();
      const bufferPanel = page.locator(".editor-tab-panel .runtime-result-stack").first();
      await expect(bufferPanel.getByRole("button", { name: "New Buffer", exact: true })).toBeEnabled({ timeout: 15000 });
      await bufferPanel.getByRole("button", { name: "New Buffer", exact: true }).click();
      await expect(bufferTable).toContainText("Main", { timeout: 15000 });
      await expect(bufferTable.locator("tbody tr")).toHaveCount(2, { timeout: 15000 });
      await expect(bufferTable.locator("tbody tr").filter({ hasText: "Current" })).toHaveCount(1, { timeout: 15000 });
      await expect(bufferTable).toContainText("Clean", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("sends the live editor draft into the listener workspace", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");
      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorSessionPanel = page.locator(".runtime-session-panel").first();
      await editorSessionPanel.getByRole("button", { name: "Send To Listener", exact: true }).click();

      const sidebar = page.locator("aside.sidebar").first();
      await sidebar.getByRole("button", { name: "Listener", exact: true }).first().click();

      const runtimeEditor = page.locator(".runtime-eval-panel .runtime-editor").first();
      await expect(runtimeEditor).toBeVisible({ timeout: 15000 });
      await expect(runtimeEditor).toHaveValue(/;; Editor/i, { timeout: 15000 });
      await expect(runtimeEditor).toHaveValue(/in-package :cl-user/i, { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("opens the live editor draft in the conversation repl workspace", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");
      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorSessionPanel = page.locator(".runtime-session-panel").first();
      await editorSessionPanel.getByRole("button", { name: "Open In REPL", exact: true }).click();

      await expect(page.locator("body")).toContainText("Conversations >> REPL", { timeout: 15000 });
      await expect(page.locator("body")).toContainText("Direct Eval", { timeout: 15000 });
      await expect(page.locator("body")).toContainText("No Runtime Surface", { timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("opens the save-as dialog from the live editor surface", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");
      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorSessionPanel = page.locator(".runtime-session-panel").first();
      const saveAsButton = editorSessionPanel.getByRole("button", { name: "Save As", exact: true });
      await expect(saveAsButton).toBeEnabled({ timeout: 15000 });
      await saveAsButton.click();

      const dialog = page.getByRole("dialog", { name: "Save Source File From Editor" });
      await expect(dialog).toBeVisible({ timeout: 15000 });
      await expect(dialog).toContainText("Save Source File", { timeout: 15000 });
      await expect(dialog.getByRole("button", { name: "Save Source File", exact: true })).toBeVisible({ timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("opens the load-source dialog from the live editor surface", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");
      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorSessionPanel = page.locator(".runtime-session-panel").first();
      const loadButton = editorSessionPanel.getByRole("button", { name: "Load Source File", exact: true });
      await expect(loadButton).toBeEnabled({ timeout: 15000 });
      await loadButton.click();

      const dialog = page.getByRole("dialog", { name: "Load Source File Into Editor" });
      await expect(dialog).toBeVisible({ timeout: 15000 });
      await expect(dialog).toContainText("Load Source File", { timeout: 15000 });
      await expect(dialog).toContainText("Directories", { timeout: 15000 });
      await expect(dialog).toContainText("Files", { timeout: 15000 });
      await expect(dialog.getByRole("button", { name: "Open Directory", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(dialog.getByRole("button", { name: "Load Source File", exact: true })).toBeVisible({ timeout: 15000 });
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("accepts edits from both the upper and lower visible regions of the live editor source pane", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Editor");
      await expect(page.locator(".editor-journey")).toBeVisible({ timeout: 15000 });

      const editorShell = page.locator(".lisp-editor-shell").first();
      await expect(editorShell).toBeVisible({ timeout: 15000 });

      const beforeText = await page.locator(".cm-content").first().textContent();

      await editorShell.click({ position: { x: 24, y: 24 } });
      await page.keyboard.type(" ;top-edit-probe");

      const topEditedText = await page.locator(".cm-content").first().textContent();
      expect(topEditedText).toContain(";top-edit-probe");

      const shellBox = await editorShell.boundingBox();
      if (!shellBox) {
        throw new Error("Editor shell box was not available.");
      }

      await editorShell.click({
        position: {
          x: Math.min(32, Math.max(8, shellBox.width - 8)),
          y: Math.max(8, shellBox.height - 24)
        }
      });
      await page.keyboard.type(" ;lower-edit-probe");

      const afterText = await page.locator(".cm-content").first().textContent();
      expect(beforeText).not.toBeNull();
      expect(afterText).toContain(";top-edit-probe");
      expect(afterText).toContain(";lower-edit-probe");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders runtime-backed browser entity detail for inspected symbols", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const domainPane = page.locator(".browser-domain-pane");
      await expect(domainPane).toContainText("PRINT-OBJECT");
      await expect(domainPane).toContainText("Methods");
      await expect(domainPane).toContainText("Direct Runtime Query");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders class relationships in the browser entity detail", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("PROVIDER");
      await packageInput.fill("SBCL-AGENT");
      await modeSelect.selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const domainPane = page.locator(".browser-domain-pane");
      await expect(domainPane).toContainText("PROVIDER");
      await expect(domainPane).toContainText("function");
      await expect(domainPane).toContainText("Direct Runtime Query");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps manual inspect secondary while updating browser inspector context", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);
      const manualInspectCard = page.locator(".browser-secondary-card");

      await expect(manualInspectCard).toContainText("Direct Runtime Query");
      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await expect(modeSelect).toHaveValue("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      await modeSelect.selectOption("callers");
      await expect(modeSelect).toHaveValue("callers");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const inspector = workspaceInspector(page);
      await expect(inspector).toContainText("Context");
      await expect(inspector).toContainText("Mode");
      await expect(modeSelect).toHaveValue("callers");
      await expect(manualInspectCard.getByRole("button", { name: "Hide", exact: true })).toBeVisible();
      await manualInspectCard.getByRole("button", { name: "Hide", exact: true }).click();
      await expect(manualInspectCard).toContainText("Ad hoc symbol, package, and XREF queries stay available here when needed.");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("syncs browser symbol tables to the inspected package", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      await expect(page.locator(".browser-domain-pane")).toContainText("PRINT-OBJECT");
      await expect(page.locator(".browser-domain-pane")).toContainText("Generic Functions");
      await expect(page.locator(".browser-domain-pane")).toContainText("internal");
      await expect(packageInput).toHaveValue("COMMON-LISP");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders documentation and linked conversation browser domains", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Documentation");
      await expect(page.locator(".browser-domain-pane")).toContainText("Reference");
      await expect(page.locator(".browser-domain-pane")).toContainText("Current Focus");
      await expect(page.locator(".browser-domain-pane")).toContainText("Package Context");

      await openWorkspaceSubpage(page, "Browser", "Linked Conversations");
      await expect(page.locator(".browser-domain-pane")).toContainText("Thread");
      const linkedConversationsPane = page.locator(".browser-domain-pane");
      const linkedThreadRow = linkedConversationsPane.getByRole("button", { name: /Environment Orientation/i }).first();
      if (await linkedThreadRow.count()) {
        await linkedThreadRow.click({ force: true });
        await expect(linkedConversationsPane).toContainText("active");
        await openWorkspace(page, "Conversations");
        await expect(page.locator("body")).toContainText("Environment Orientation");
      } else {
        await expect(linkedConversationsPane).toContainText("No linked conversation entities are loaded yet.");
        await expect(workspaceInspector(page)).toContainText("Domain");
        await expect(workspaceInspector(page)).toContainText("Linked Conversations");
      }
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders system type in the browser systems domain", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Systems");

      const domainPane = page.locator(".browser-domain-pane");
      await expect(domainPane).toContainText("Type");
      const domainText = (await domainPane.textContent()) ?? "";
      if (domainText.includes("No loaded systems are available.")) {
        await expect(domainPane).toContainText("No loaded systems are available.");
      } else {
        await expect(domainPane).toContainText("ASDF System");
        await expect(domainPane).toContainText("sbcl-agent");
        await expect(domainPane).toContainText("Page 1 / 1");
      }
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("prefills the listener from browser selections", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const inspector = workspaceInspector(page);
      await expect(inspector).toContainText("Handoff");
      await page.getByRole("tab", { name: "Handoff", exact: true }).click();
      await expect(inspector).toContainText("Listener Input");
      await expect(inspector).toContainText("COMMON-LISP::PRINT-OBJECT");
      await expect(inspector).toContainText("Draft Continuation");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("keeps browser tables first and inspector context separate", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Systems");

      const domainPane = page.locator(".browser-domain-pane");
      const inspector = workspaceInspector(page);

      await expect(domainPane.getByText("Browser")).toBeVisible();
      await expect(domainPane.getByRole("heading", { name: "Systems", exact: true })).toBeVisible();
      await expect(domainPane.locator(".browser-table-shell")).toBeVisible();
      await expect(inspector).toContainText("Context");

      const domainBox = await domainPane.boundingBox();
      const inspectorBox = await inspector.boundingBox();

      expect(domainBox).not.toBeNull();
      expect(inspectorBox).not.toBeNull();

      if (domainBox && inspectorBox) {
        expect(Math.abs(domainBox.y - inspectorBox.y)).toBeLessThan(420);
        expect(domainBox.x).toBeLessThan(inspectorBox.x);
      }
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("renders activity and artifact observation surfaces from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sidebar = page.locator("aside.sidebar").first();
      await sidebar.getByRole("button", { name: "Artifacts", exact: true }).first().click();
      await expect(page.locator("body")).toContainText("Durable Evidence");
      await expect(page.locator("body")).toContainText("No Artifact Selected");
      await expect(page.locator("body")).toContainText("No evidence selected");

      await sidebar.getByRole("button", { name: "Observation", exact: true }).first().click();
      await expect(page.locator("body")).toContainText("Observation");
      await expect(page.locator("body")).toContainText("Visible Events");
      await expect(page.locator("body")).toContainText("Observed Event");
      await expect(page.locator("body")).toContainText("Why Evidence Flows");
      await expect(page.locator("body")).toContainText("Observed Payload");
    } finally {
      await closeDesktop(app, page);
    }
  });

  test("supports keyboard journey switching across the primary workspaces", async () => {
    const { app, page } = await launchDesktop();
    try {
      await page.locator("body").click();
      await page.keyboard.press("2");
      await expect(page.locator("body")).toContainText("No project selected");

      await page.locator("body").click();
      await page.keyboard.press("3");
      await expect(page.locator("body")).toContainText("No Thread Selected");

      await page.locator("body").click();
      await page.keyboard.press("7");
      await expect(page.locator("body")).toContainText("Inspect packages, symbols, source, and governed attachments from one live system view.");

      await page.locator("body").click();
      await page.keyboard.press("8");
      await expect(page.locator("body")).toContainText("Control how the desktop resolves light and dark appearance for this project shell.");
      await expect(page.locator("body")).toContainText("Light");

      await page.locator("body").click();
      await page.keyboard.press("1");
      await expect(page.locator("body")).toContainText("Operate from the environment root, keep governed work explicit, and preserve durable evidence.");
      await expect(page.locator("body")).toContainText("SBCL-AGENT-USER");
    } finally {
      await closeDesktop(app, page);
    }
  });
});
