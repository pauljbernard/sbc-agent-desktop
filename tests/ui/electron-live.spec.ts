import { expect, test } from "@playwright/test";
import { _electron as electron, type ElectronApplication, type Page } from "playwright";
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
}> {
  const stateDir = mkdtempSync(join(tmpdir(), "sbcl-agent-ux-ui-"));
  const environmentStatePath = join(stateDir, "live-environment.sexp");

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
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true"
    }
  });

  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("Environment Shell")).toBeVisible();
  await expect(page.getByText(/Live .* Adapter/i)).toBeVisible();
  await expect(page.locator("body")).toContainText("Current Binding");

  return { app, page };
}

async function openWorkspace(page: Page, name: string): Promise<void> {
  await page
    .locator('nav[aria-label="Workspace navigation"] button.workspace-link-main')
    .filter({ hasText: name })
    .click();
}

async function openWorkspaceSubpage(page: Page, parent: string, child: string): Promise<void> {
  const nav = page.locator('nav[aria-label="Workspace navigation"]');
  const parentButton = nav.getByRole("button", { name: parent, exact: true }).first();
  await parentButton.click();
  const parentNode = parentButton.locator("xpath=ancestor::div[contains(@class,'workspace-tree-node')][1]");
  await parentNode.getByRole("button", { name: child, exact: true }).click();
}

test.describe("live sbcl-agent desktop shell", () => {
  test("shows bound environment identity from the live adapter", async () => {
    const { app, page } = await launchDesktop();
    try {
      await expect(page.locator("body")).toContainText("Current Binding");
      await expect(page.locator("body")).toContainText("sbcl-agent", { ignoreCase: true });
      await expect(page.locator("body")).toContainText("Runtime Posture");
      await expect(page.locator("body")).toContainText("SBCL-AGENT-USER");
      await expect(page.locator("body")).toContainText("Live Service Adapter");
      await expect(page.locator("body")).toContainText("Open Pressure");
      await expect(page.locator("body")).toContainText("Incidents");
    } finally {
      await app.close();
    }
  });

  test("renders live structured conversations from sbcl-agent state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");

      await expect(page.getByText("Environment Orientation")).toBeVisible();
      await expect(page.getByText("Governed Mutation Review")).toBeVisible();
      await expect(page.getByText("Runtime Recovery")).toBeVisible();

      await page.getByRole("button", { name: /Runtime Recovery/i }).click();
      await expect(page.locator("body")).toContainText("A runtime failure is preserved as durable recovery work.");
      await expect(page.locator("body")).toContainText("failed");
    } finally {
      await app.close();
    }
  });

  test("renders configuration preferences and switches themes", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Configuration");

      await expect(page.locator("body")).toContainText("Desktop Preferences");
      await expect(page.locator("body")).toContainText("Preferences");
      await expect(page.locator("body")).toContainText("Resolved Theme");

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
      await app.close();
    }
  });

  test("renders the published user documentation inside the desktop shell", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Documentation");

      await expect(page.locator("body")).toContainText("User Documentation");
      await expect(page.locator("body")).toContainText("Documentation Pages");
      await expect(page.locator("body")).toContainText("Development Model");
      await expect(page.locator(".documentation-detail-panel")).toContainText("Development Model");
      await expect(page.locator(".documentation-detail-panel")).toContainText("The Three Truths");
      await expect(page.locator(".documentation-detail-panel")).toContainText("Open Published Site");
    } finally {
      await app.close();
    }
  });

  test("renders approval, incident, and governed work surfaces from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Execution");
      await expect(page.locator("body")).toContainText("Desktop attention model refinement");
      await expect(page.locator("body")).toContainText("Current Execution Objective");
      await expect(page.locator("body")).toContainText("Execution Journey");

      await openWorkspaceSubpage(page, "Execution", "Approvals");
      await expect(page.locator("body")).toContainText("workspace_write");
      await expect(page.locator("body")).toContainText("Decision Context");
      await expect(page.locator("body")).toContainText("Grant workspace_write and resume governed work");
      await expect(page.locator("body")).toContainText("Desktop bootstrap seeded a governed write candidate.");
      await expect(page.locator("body")).toContainText("Approving this request clears the approval gate so the work item can be resumed.");

      await openWorkspace(page, "Recovery");
      await expect(page.locator("body")).toContainText("Runtime reload interrupted");
      await expect(page.locator("body")).toContainText("capture_checkpoint_and_validate");

      await openWorkspaceSubpage(page, "Execution", "Work");
      await expect(page.locator("body")).toContainText("Reconcile Work");
      await expect(page.locator("body")).toContainText("Runtime reload recovery");
      await expect(page.locator("body")).toContainText("Desktop attention model refinement");
    } finally {
      await app.close();
    }
  });

  test("opens the command center and jumps into active supervised work", async () => {
    const { app, page } = await launchDesktop();
    try {
      await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
      await expect(page.getByRole("dialog", { name: "Command Center" })).toBeVisible();
      await page.getByPlaceholder("Search current work surfaces").fill("Runtime reload recovery");
      await expect(page.locator(".command-center-item")).toContainText("Runtime reload recovery");
      await page.locator(".command-center-item").first().click();
      await expect(page.locator("body")).toContainText("Reconcile Work");
      await expect(page.locator("body")).toContainText("Runtime reload recovery");
    } finally {
      await app.close();
    }
  });

  test("renders runtime summary and direct evaluation shell from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Execution");

      await expect(page.locator("body")).toContainText("Runtime And Governed Work");
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

      await expect(page.locator("body")).toContainText("Evaluated (+ 20 22) in SBCL-AGENT-USER.");
      await expect(page.locator("body")).toContainText("42");
    } finally {
      await app.close();
    }
  });

  test("renders runtime-backed browser entity detail for inspected symbols", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");

      await inspectorInputs.nth(0).fill("PRINT-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await page.locator(".runtime-inspector-controls select").selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      await expect(page.locator("body")).toContainText("Runtime Entity Detail");
      await expect(page.locator("body")).toContainText("Entity Facets");
      await expect(page.locator("body")).toContainText("Related Runtime Structure");
      await expect(page.locator("body")).toContainText("generic-function");
    } finally {
      await app.close();
    }
  });

  test("renders class relationships in the browser entity detail", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");

      await inspectorInputs.nth(0).fill("STANDARD-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await page.locator(".runtime-inspector-controls select").selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      await expect(page.locator("body")).toContainText("Runtime Entity Detail");
      await expect(page.locator("body")).toContainText("Superclass Count");
      await expect(page.locator("body")).toContainText("Related Runtime Structure");
      await expect(page.locator("body")).toContainText("Superclass");
    } finally {
      await app.close();
    }
  });

  test("supports direct browser action pivots for the focused entity", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("PRINT-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await expect(modeSelect).toHaveValue("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".browser-focus-card")).toContainText("methods in COMMON-LISP");

      await modeSelect.selectOption("callers");
      await expect(modeSelect).toHaveValue("callers");
      await browseButton.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".browser-focus-card")).toContainText("callers in COMMON-LISP");
      await expect(page.locator(".browser-objective-panel")).toContainText("Current Browser Objective");
      await expect(page.locator(".browser-objective-panel")).toContainText("callers");

      await page.locator(".browser-action-strip").getByRole("button", { name: "Definitions", exact: true }).click({ force: true });
      await expect(page.locator("body")).toContainText("source definitions are available");

      await inspectorInputs.nth(0).fill("START-SHELL");
      await inspectorInputs.nth(1).fill("SBCL-AGENT-USER");
      await modeSelect.selectOption("definitions");
      await expect(modeSelect).toHaveValue("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Open Source" })).toBeEnabled();
      await page.getByRole("button", { name: "Open Source" }).click();
      await expect(page.locator("body")).toContainText("Source Pane");
      await expect(page.locator("body")).toContainText("line");
    } finally {
      await app.close();
    }
  });

  test("supports source pane edit mode without executing a live mutation", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("START-SHELL");
      await inspectorInputs.nth(1).fill("SBCL-AGENT-USER");
      await modeSelect.selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("button", { name: "Open Source" })).toBeEnabled();
      await page.getByRole("button", { name: "Open Source" }).click();

      const sourceActionButtons = page.locator(".browser-source-actions .starter-chip");
      await expect(sourceActionButtons.filter({ hasText: "Edit" })).toBeVisible();
      await sourceActionButtons.filter({ hasText: "Edit" }).click();
      await expect(page.locator(".source-editor")).toBeVisible();
      await expect(page.getByRole("button", { name: "Reload File" })).toBeDisabled();

      await page.locator(".source-editor").fill("(in-package #:sbcl-agent-user)\n\n(defun staged-edit-test () :ok)\n");
      await expect(page.getByRole("button", { name: "Stage Change" })).toBeEnabled();

      await sourceActionButtons.filter({ hasText: "Cancel" }).click();
      await expect(sourceActionButtons.filter({ hasText: "Edit" })).toBeVisible();
    } finally {
      await app.close();
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
      await expect(page.locator(".browser-domain-pane")).toContainText("Environment Orientation");
      await page.locator(".browser-domain-pane").getByRole("button", { name: /Environment Orientation/i }).click({ force: true });
      await expect(page.locator(".browser-domain-pane")).toContainText("active");
      await page.keyboard.press("2");
      await expect(page.locator("body")).toContainText("Conversation Threads");
      await expect(page.locator("body")).toContainText("Conversation Context");
      await expect(page.locator("body")).toContainText("Environment Orientation");
    } finally {
      await app.close();
    }
  });

  test("renders system type in the browser systems domain", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Systems");

      await expect(page.locator(".browser-domain-pane")).toContainText("Type");
      await expect(page.locator(".browser-domain-pane")).toContainText("ASDF System");
      await expect(page.locator(".browser-domain-pane")).toContainText("sbcl-agent");
      await expect(page.locator(".browser-domain-pane")).toContainText("Page 1 / 1");
      await expect(page.locator(".browser-domain-pane")).toContainText("Type");
      await expect(page.locator(".browser-domain-pane")).toContainText("Page Size");
    } finally {
      await app.close();
    }
  });

  test("prefills the listener from browser selections", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("PRINT-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      await expect(page.locator(".browser-focus-card")).toContainText("methods in COMMON-LISP");
      await expect(page.locator(".browser-listener-preview")).toContainText("COMMON-LISP::PRINT-OBJECT");
      await expect(page.locator(".browser-listener-preview")).toContainText("fdefinition");

      await page.getByRole("button", { name: "Open In Listener" }).click();
      await expect(page.locator("body")).toContainText("Current Execution Objective");
      await expect(page.locator(".runtime-editor")).toHaveValue(/COMMON-LISP::PRINT-OBJECT/);
    } finally {
      await app.close();
    }
  });

  test("projects source-backed browser focus into listener and conversation handoffs", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("START-SHELL");
      await inspectorInputs.nth(1).fill("SBCL-AGENT-USER");
      await modeSelect.selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Open Source" }).click();

      await expect(page.locator(".browser-listener-preview")).toContainText("Source:");
      await expect(page.locator(".browser-listener-preview")).toContainText("SBCL-AGENT-USER::START-SHELL");
      await expect(page.locator(".browser-conversation-preview")).toContainText("Review source artifact");
      await expect(page.locator(".browser-conversation-preview")).toContainText("START-SHELL");

      const detailStack = page.locator(".browser-detail-stack");
      await detailStack.getByRole("button", { name: "Reload In Listener" }).click({ force: true });
      await page.getByRole("button", { name: "Open In Listener" }).click();
      await expect(page.locator(".runtime-editor")).toHaveValue(/Reload request/);

      await page.keyboard.press("3");
      await page.getByRole("button", { name: "Open In Conversations" }).click();
      await expect(page.locator("body")).toContainText("Conversation Threads");
      await expect(page.locator("body")).toContainText("Conversation Context");
      await openWorkspaceSubpage(page, "Conversations", "Draft");
      await expect(page.locator(".conversation-draft-editor")).toHaveValue(/Review source artifact/);
    } finally {
      await app.close();
    }
  });

  test("offers entity-aware listener quick actions for class focus", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("STANDARD-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await modeSelect.selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const detailStack = page.locator(".browser-detail-stack");
      await expect(detailStack.getByRole("button", { name: "Inspect Class Slots" })).toBeVisible();
      await detailStack.getByRole("button", { name: "Inspect Class Slots" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".browser-listener-preview")).toContainText("find-class 'COMMON-LISP::STANDARD-OBJECT");
      await detailStack.getByRole("button", { name: "Open In Listener" }).click({ force: true });
      await expect(page.locator(".runtime-editor")).toHaveValue(/find-class 'COMMON-LISP::STANDARD-OBJECT/);
    } finally {
      await app.close();
    }
  });

  test("offers entity-aware listener quick actions for generic function focus", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Browser");
      const inspectorInputs = page.locator(".runtime-inspector-controls input");
      const browseButton = page.locator(".runtime-inspector-controls .action-button");
      const modeSelect = page.locator(".runtime-inspector-controls select");

      await inspectorInputs.nth(0).fill("PRINT-OBJECT");
      await inspectorInputs.nth(1).fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const detailStack = page.locator(".browser-detail-stack");
      await expect(detailStack.getByRole("button", { name: "Inspect Dispatch" })).toBeVisible();
      await detailStack.getByRole("button", { name: "Inspect Dispatch" }).click({ force: true });
      await detailStack.getByRole("button", { name: "Open In Listener" }).click({ force: true });
      await expect(page.locator(".runtime-editor")).toHaveValue(/type-of \(fdefinition 'COMMON-LISP::PRINT-OBJECT\)/);
    } finally {
      await app.close();
    }
  });

  test("renders browser tables ahead of the stacked detail workspace", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Systems");

      const domainPane = page.locator(".browser-domain-pane");
      const detailStack = page.locator(".browser-detail-stack");

      await expect(domainPane.getByText("Domain Workspace")).toBeVisible();
      await expect(domainPane.locator(".browser-table")).toBeVisible();
      await expect(detailStack.getByText("Active Work Context")).toBeVisible();

      const domainBox = await domainPane.boundingBox();
      const detailBox = await detailStack.boundingBox();

      expect(domainBox).not.toBeNull();
      expect(detailBox).not.toBeNull();

      if (domainBox && detailBox) {
        expect(domainBox.y).toBeLessThan(detailBox.y);
      }
    } finally {
      await app.close();
    }
  });

  test("renders activity and artifact observation surfaces from live state", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Evidence");
      await expect(page.locator("body")).toContainText("Durable Evidence");
      await expect(page.locator("body")).toContainText("Environment Orientation Brief");
      await expect(page.locator("body")).toContainText("Selected Evidence");
      await expect(page.locator("body")).toContainText("Producing Context");

      await page
        .locator('nav[aria-label="Workspace navigation"]')
        .getByRole("button", { name: "Observation", exact: true })
        .click();
      await expect(page.locator("body")).toContainText("Event Replay");
      await expect(page.locator("body")).toContainText("Visible Events");
      await expect(page.locator("body")).toContainText("Observed Event");
      await expect(page.locator("body")).toContainText("Why Evidence Flows");
      await expect(page.locator("body")).toContainText("Observed Payload");
    } finally {
      await app.close();
    }
  });

  test("supports keyboard journey switching across the primary workspaces", async () => {
    const { app, page } = await launchDesktop();
    try {
      await page.keyboard.press("2");
      await expect(page.locator("body")).toContainText("Thread Continuity");
      await expect(page.locator("body")).toContainText("Conversation Threads");

      await page.keyboard.press("3");
      await expect(page.locator("body")).toContainText("Live System Browser");
      await expect(page.locator("body")).toContainText("Domain Workspace");

      await page.keyboard.press("4");
      await expect(page.locator("body")).toContainText("Current Execution Objective");
      await expect(page.locator("body")).toContainText("Execution Journey");

      await page.keyboard.press("5");
      await expect(page.locator("body")).toContainText("Current Recovery Objective");
      await expect(page.locator("body")).toContainText("Recovery Journey");

      await page.keyboard.press("6");
      await expect(page.locator("body")).toContainText("Artifacts And Observation");
      await expect(page.locator("body")).toContainText("Durable Evidence");

      await page.keyboard.press("7");
      await expect(page.locator("body")).toContainText("User Documentation");
      await expect(page.locator("body")).toContainText("Documentation Pages");

      await page.keyboard.press("8");
      await expect(page.locator("body")).toContainText("Desktop Preferences");
      await expect(page.locator("body")).toContainText("Configuration Workspace");

      await page.keyboard.press("1");
      await expect(page.locator("body")).toContainText("Operational Brief");
      await expect(page.locator("body")).toContainText("Orientation Records");
    } finally {
      await app.close();
    }
  });
});
