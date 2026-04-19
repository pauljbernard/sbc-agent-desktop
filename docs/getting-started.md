---
title: Getting Started
---

# Getting Started

This guide is for developers and engineers using the desktop application.

If you are new to environment-first or agentic development, do not start here.

Start with:

1. [Development Model](development-model.md)
2. [How sbcl-agent Works](how-sbcl-agent-works.md)
3. [sbcl-agent Concepts](sbcl-agent-concepts.md)
4. [Transition Guide](transition-guide.md)

Then come back to this page for practical setup.

## What You Need

- macOS
- the `sbc-agent-desktop` repository
- Node.js and npm
- an available `sbcl-agent` environment if you want live integration

## Run The Desktop

From the repository root:

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## First Launch

On first launch, expect three things:

1. the application shell appears with the navigation rail, header, workspace canvas, inspector, and footer
2. the desktop may start in mock-backed mode if a live host is not configured
3. some workspaces will show placeholder or mock environment content until a live host is bound

## Mock Mode Vs Live Mode

The desktop has two main host-adapter modes:

- `mock`: useful for UI evaluation and UX iteration
- `live`: intended to connect the desktop to a real `sbcl-agent` host

If you are unsure which one you are in, check the footer and the visible host/binding posture in the shell.

## Recommended Reading Order

1. [Development Model](development-model.md)
2. [How sbcl-agent Works](how-sbcl-agent-works.md)
3. [sbcl-agent Concepts](sbcl-agent-concepts.md)
4. [Transition Guide](transition-guide.md)
5. [Desktop Tour](desktop-tour.md)
6. [Browser](browser.md)
7. [Conversations](conversations.md)
8. [Execution](execution.md)
9. [Recovery](recovery.md)
10. [Evidence](evidence.md)
11. [Configuration](configuration.md)

## Common First Tasks

- browse systems, packages, symbols, and source in [Browser](browser.md)
- inspect or resume structured work in [Conversations](conversations.md)
- use the listener and inspect runtime results in [Execution](execution.md)
- review incidents and recovery obligations in [Recovery](recovery.md)
- inspect artifacts and event history in [Evidence](evidence.md)

## If The App Looks Wrong

Go to [Troubleshooting](troubleshooting.md) first. Common issues are renderer staleness, theme mismatch, unbound environment state, or a live-host transport problem.
