import { describe, expect, it } from "vitest";

import { LiveSbclAgentHostAdapter } from "../../src/main/live-host-adapter";

describe("live host adapter desktop contract", () => {
  function makeAdapter() {
    return new LiveSbclAgentHostAdapter({
      transport: "pipe",
      endpoint: "/tmp/sbcl-agent.sock",
      projectDir: "/tmp",
      environmentStatePath: "/tmp/.sbcl-agent-ux-live-environment.sexp"
    });
  }

  it("adapts desktop display posture from desktop.show", async () => {
    const adapter = makeAdapter();

    (adapter as { invokeService: (operation: string) => Promise<unknown> }).invokeService = async (operation: string) => {
      expect(operation).toBe("desktop.show");
      return {
        contractVersion: 1,
        domain: "shell",
        operation,
        kind: "query",
        status: "ok",
        data: {
          activePanel: "display",
          displayCount: 1,
          topDisplaySurface: {
            executionId: "exec-42",
            appId: "linux.vscode",
            displaySurfaceKind: "desktop-window",
            status: "running"
          },
          panels: {
            display: {
              panelId: "display",
              title: "Display",
              selectedAppId: "linux.vscode",
              selectedExecutionId: "exec-42",
              selectedStatus: "running",
              selectedDisplaySurfaceKind: "desktop-window",
              actions: {
                show: {
                  actionKind: "show-panel",
                  panelId: "display",
                  params: {
                    appId: "linux.vscode"
                  }
                }
              }
            }
          }
        },
        metadata: {
          binding: {
            environmentId: "live-environment",
            sessionId: "desktop-session-live"
          }
        }
      };
    };

    const result = await adapter.desktopModel();

    expect(result.status).toBe("ok");
    expect(result.data.activePanel).toBe("display");
    expect(result.data.displayCount).toBe(1);
    expect(result.data.topDisplaySurface).toMatchObject({
      appId: "linux.vscode",
      executionId: "exec-42"
    });
    expect(result.data.panels.display.selectedAppId).toBe("linux.vscode");
  });

  it("forwards desktop action params to the live desktop.action bridge", async () => {
    const adapter = makeAdapter();

    (adapter as { invokeService: (operation: string, environmentId: string | undefined, params: Record<string, unknown>) => Promise<unknown> }).invokeService =
      async (operation: string, _environmentId: string | undefined, params: Record<string, unknown>) => {
        expect(operation).toBe("desktop.action");
        expect(params).toMatchObject({
          actionKind: "step-panel",
          panelId: "display",
          params: {
            direction: "next",
            appId: "linux.vscode"
          }
        });

        return {
          contractVersion: 1,
          domain: "shell",
          operation,
          kind: "command",
          status: "ok",
          data: {
            action: {
              actionKind: "step-panel",
              panelId: "display",
              params: {
                direction: "next",
                appId: "linux.vscode"
              }
            },
            desktopModel: {
              activePanel: "display",
              panels: {
                display: {
                  panelId: "display",
                  selectedAppId: "linux.vscode"
                }
              }
            }
          },
          metadata: {
            binding: {
              environmentId: "live-environment",
              sessionId: "desktop-session-live"
            }
          }
        };
      };

    const result = await adapter.desktopAction({
      environmentId: "live-environment",
      actionKind: "step-panel",
      panelId: "display",
      params: {
        direction: "next",
        appId: "linux.vscode"
      }
    });

    expect(result.status).toBe("ok");
    expect(result.data.action?.actionKind).toBe("step-panel");
    expect(result.data.action?.panelId).toBe("display");
  });

  it("extracts the human assistant message from kernelized conversation send responses", async () => {
    const adapter = makeAdapter();

    (
      adapter as {
        invokeStreamingService: (
          operation: string,
          environmentId: string | undefined,
          params: Record<string, unknown>,
          onEvent?: (event: unknown) => void
        ) => Promise<unknown>;
      }
    ).invokeStreamingService = async (
      operation: string,
      _environmentId: string | undefined,
      params: Record<string, unknown>,
      onEvent?: (event: unknown) => void
    ) => {
      expect(operation).toBe("conversation.send-message-stream");
      expect(params.threadId).toBe("thread-42");
      onEvent?.({
        cursor: 1,
        kind: "provider-stream",
        timestamp: new Date().toISOString(),
        family: "provider",
        summary: "provider / text-delta",
        entityId: "run-1",
        threadId: "thread-42",
        turnId: "turn-42",
        visibility: "user",
        payload: {
          canonicalType: "text-delta",
          payload: "Good afternoon! "
        }
      });

      return {
        contractVersion: 1,
        domain: "execution",
        operation,
        kind: "command",
        status: "ok",
        data: {
          thread: {
            id: "thread-42"
          },
          turn: {
            id: "turn-42"
          },
          response:
            "#S(ASSISTANT-RESPONSE :MESSAGE Good afternoon! How can I assist you today? :ACTIONS NIL :METADATA (PROVIDER OPENAI-COMPATIBLE MODEL gpt-5))"
        },
        metadata: {
          binding: {
            environmentId: "live-environment",
            sessionId: "desktop-session-live"
          }
        }
      };
    };

    const streamedEvents: unknown[] = [];
    const result = await adapter.sendConversationMessage(
      {
        environmentId: "live-environment",
        threadId: "thread-42",
        prompt: "Good afternoon"
      },
      (event) => {
        streamedEvents.push(event);
      }
    );

    expect(streamedEvents).toHaveLength(1);
    expect(result.status).toBe("ok");
    expect(result.data.threadId).toBe("thread-42");
    expect(result.data.turnId).toBe("turn-42");
    expect(result.data.assistantMessage).toBe("Good afternoon! How can I assist you today?");
    expect(result.data.summary).toBe("Good afternoon! How can I assist you today?");
  });
});
