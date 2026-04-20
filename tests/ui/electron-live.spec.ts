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
}>;
async function launchDesktop(envOverrides: Record<string, string> = {}): Promise<{
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
      ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
      ...envOverrides
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
    await expect(page.locator("body")).toContainText("Environment Shell", { timeout: 15000 });
    await expect(page.locator(".status-dock")).toContainText("Host", { timeout: 15000 });
    await expect(page.locator(".status-dock")).toContainText("ready", { timeout: 15000 });
    await expect(page.locator("body")).toContainText("Current Binding", { timeout: 15000 });
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
      await app.close();
    }
  });

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

      await expect(page.locator(".conversation-list-panel")).toContainText("New Conversation Session");
      await expect(page.locator(".conversation-detail-panel")).toContainText("Draft Next Message");
      await expect(page.getByRole("button", { name: "Send Message", exact: true })).toBeVisible();
      await expect(page.locator(".conversation-detail-panel")).toContainText("Selected Thread");
    } finally {
      await app.close();
    }
  });

  test("streams assistant text into the selected conversation before final completion", async () => {
    const { app, page } = await launchDesktop({
      TUTOR_CODEX_PROVIDER: "mock",
      TUTOR_CODEX_MOCK_STREAM_DELAY_MS: "600"
    });
    try {
      const prompt = "stream verification prompt";
      await openWorkspace(page, "Conversations");
      await expect(page.locator(".conversation-thread-transcript-panel")).toContainText("Default Thread");
      const composer = page.locator(".conversation-composer-panel .conversation-draft-editor");
      await composer.fill(prompt);
      await page.getByRole("button", { name: "Send Message", exact: true }).click();

      const transcript = page.locator(".conversation-thread-transcript-panel");
      await expect(page.getByRole("button", { name: "Sending...", exact: true })).toBeVisible();
      await expect(transcript).toContainText(`Mock response: ${prompt}`, { timeout: 3000 });
      const partialTranscript = await transcript.textContent();
      expect(partialTranscript ?? "").not.toContain("Replace the mock provider with a real model adapter next.");
      await expect(transcript).toContainText("Replace the mock provider with a real model adapter next.", {
        timeout: 8000
      });
    } finally {
      await app.close();
    }
  });

  test("anchors short transcript history against the composer instead of the top of the transcript panel", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspace(page, "Conversations");

      await page.locator(".conversation-list-panel").getByRole("button", { name: /Environment Orientation/ }).click();

      const transcript = page.locator(".conversation-thread-transcript-panel");
      const lastBubble = transcript.locator(".message-bubble").last();

      await expect(lastBubble).toBeVisible();

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
      await app.close();
    }
  });

  test("creates a new project conversation session from the desktop shell", async () => {
    const { app, page } = await launchDesktop();
    try {
      const sessionTitle = "Desktop Session Alpha";
      await openWorkspace(page, "Conversations");

      await page.locator(".conversation-thread-actions .runtime-session-create input").fill(sessionTitle);
      await page.getByRole("button", { name: "New Conversation Session", exact: true }).click();

      await expect(page.locator("body")).toContainText(sessionTitle);
      await expect(page.locator("body")).toContainText("Project-scoped conversation session created from the desktop shell.");
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
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("PRINT-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("methods");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const inspector = page.locator(".inspector");
      await expect(inspector).toContainText("Runtime Entity Detail");
      await expect(inspector).toContainText("PRINT-OBJECT");
      await expect(inspector).toContainText("Kind");
      await expect(inspector).toContainText("live generic function");
      await expect(inspector).toContainText("Execution Handoff");
      await expect(inspector).toContainText("COMMON-LISP::PRINT-OBJECT");
    } finally {
      await app.close();
    }
  });

  test("renders class relationships in the browser entity detail", async () => {
    const { app, page } = await launchDesktop();
    try {
      const { symbolInput, packageInput, modeSelect, browseButton } = await openBrowserManualInspect(page);

      await symbolInput.fill("STANDARD-OBJECT");
      await packageInput.fill("COMMON-LISP");
      await modeSelect.selectOption("definitions");
      await browseButton.focus();
      await page.keyboard.press("Enter");

      const inspector = page.locator(".inspector");
      await expect(inspector).toContainText("Runtime Entity Detail");
      await expect(inspector).toContainText("STANDARD-OBJECT");
      await expect(inspector).toContainText("class");
      await expect(inspector).toContainText("Related Items");
    } finally {
      await app.close();
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

      const inspector = page.locator(".inspector");
      await expect(inspector).toContainText("Browser Context");
      await expect(inspector).toContainText("Mode");
      await expect(inspector).toContainText("callers");
      await expect(manualInspectCard.getByRole("button", { name: "Hide", exact: true })).toBeVisible();
      await manualInspectCard.getByRole("button", { name: "Hide", exact: true }).click();
      await expect(manualInspectCard).toContainText("Ad hoc symbol, package, and XREF queries stay available here when needed.");
    } finally {
      await app.close();
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
      await expect(page.locator(".browser-domain-pane")).toContainText("live runtime focus is available");
      await expect(page.locator(".inspector")).toContainText("Package");
      await expect(page.locator(".inspector")).toContainText("COMMON-LISP");
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
      await openWorkspace(page, "Conversations");
      await expect(page.locator(".inspector")).toContainText("Conversation Context");
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
    } finally {
      await app.close();
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

      const inspector = page.locator(".inspector");
      await expect(inspector).toContainText("Execution Handoff");
      await expect(inspector).toContainText("COMMON-LISP::PRINT-OBJECT");
      await expect(inspector).toContainText("fdefinition");
      await expect(inspector).toContainText("Conversation Handoff");
      await expect(inspector).toContainText("Continue the linked thread");
    } finally {
      await app.close();
    }
  });

  test("keeps browser tables first and inspector context separate", async () => {
    const { app, page } = await launchDesktop();
    try {
      await openWorkspaceSubpage(page, "Browser", "Systems");

      const domainPane = page.locator(".browser-domain-pane");
      const inspector = page.locator(".inspector");

      await expect(domainPane.getByText("Browser")).toBeVisible();
      await expect(domainPane.getByRole("heading", { name: "Systems", exact: true })).toBeVisible();
      await expect(domainPane.locator(".browser-table-shell")).toBeVisible();
      await expect(inspector).toContainText("Browser Context");

      const domainBox = await domainPane.boundingBox();
      const inspectorBox = await inspector.boundingBox();

      expect(domainBox).not.toBeNull();
      expect(inspectorBox).not.toBeNull();

      if (domainBox && inspectorBox) {
        expect(Math.abs(domainBox.y - inspectorBox.y)).toBeLessThan(200);
        expect(domainBox.x).toBeLessThan(inspectorBox.x);
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
