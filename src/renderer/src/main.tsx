import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function logRendererBootstrap(label: string, detail?: string): void {
  const suffix = detail ? ` ${detail}` : "";
  console.log(`[intentos-renderer] ${label}${suffix}`);
}

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const firstArgument = args[0];
  if (typeof firstArgument === "string" && firstArgument.includes("Maximum update depth exceeded")) {
    const detail = args
      .slice(1)
      .map((value) => {
        if (typeof value === "string") {
          return value;
        }
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(" | ");
    originalConsoleError(
      ...args,
      `[intentos-renderer] maximum-update-depth-stack ${new Error().stack ?? "no-stack"}`,
      detail ? `[intentos-renderer] maximum-update-depth-detail ${detail}` : ""
    );
    return;
  }

  originalConsoleError(...args);
};

interface RendererErrorBoundaryProps {
  children: React.ReactNode;
}

interface RendererErrorBoundaryState {
  error: Error | null;
}

class RendererErrorBoundary extends React.Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  state: RendererErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logRendererBootstrap("error-boundary", error.message);
    console.error("Renderer startup failure", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <main className="renderer-startup-failure" role="alert">
          <section className="renderer-startup-failure-card">
            <p className="renderer-startup-failure-eyebrow">Renderer Recovery</p>
            <h1>IntentOS Shell could not finish starting.</h1>
            <p className="renderer-startup-failure-copy">
              The Electron window stayed live, but the renderer hit a startup fault. Reload the
              window after the host stabilizes.
            </p>
            <p className="renderer-startup-failure-detail">{this.state.error.message}</p>
            <button
              className="renderer-startup-failure-action"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload Window
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function RendererStartupFailure({
  detail,
  title = "IntentOS Shell could not finish starting."
}: {
  detail: string;
  title?: string;
}): React.ReactNode {
  return (
    <main className="renderer-startup-failure" role="alert">
      <section className="renderer-startup-failure-card">
        <p className="renderer-startup-failure-eyebrow">Renderer Recovery</p>
        <h1>{title}</h1>
        <p className="renderer-startup-failure-copy">
          The Electron window stayed live, but the renderer hit a startup fault. Reload the
          window after the host stabilizes.
        </p>
        <p className="renderer-startup-failure-detail">{detail}</p>
        <button
          className="renderer-startup-failure-action"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload Window
        </button>
      </section>
    </main>
  );
}

function AppBootstrap(): React.ReactNode {
  const [AppComponent, setAppComponent] = React.useState<React.ComponentType | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let active = true;
    logRendererBootstrap("bootstrap-import-start");

    void import("./App")
      .then((module) => {
        if (!active) {
          return;
        }
        logRendererBootstrap("bootstrap-import-success");
        setAppComponent(() => module.App);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }
        const resolvedError =
          nextError instanceof Error ? nextError : new Error("Failed to load the renderer shell.");
        logRendererBootstrap("bootstrap-import-failure", resolvedError.message);
        console.error("Renderer module load failure", resolvedError);
        setError(resolvedError);
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <RendererStartupFailure
        detail={error.message}
        title="IntentOS Shell could not load its renderer modules."
      />
    );
  }

  if (!AppComponent) {
    return (
      <main className="renderer-startup-failure renderer-startup-pending" aria-busy="true">
        <section className="renderer-startup-failure-card">
          <p className="renderer-startup-failure-eyebrow">Renderer Startup</p>
          <h1>IntentOS Shell is attaching to the live desktop host.</h1>
          <p className="renderer-startup-failure-copy">
            The renderer is loading its shell modules and establishing the Electron host boundary.
          </p>
        </section>
      </main>
    );
  }

  return <AppComponent />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to locate the renderer root element.");
}

logRendererBootstrap("create-root");

ReactDOM.createRoot(rootElement).render(
  <RendererErrorBoundary>
    <AppBootstrap />
  </RendererErrorBoundary>
);
