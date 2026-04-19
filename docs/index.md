---
title: Home
---

# sbc-agent-desktop

`sbc-agent-desktop` is a macOS desktop application for developers and engineers working inside an `sbcl-agent` environment.

This site is the user-facing documentation for operating the desktop.

It is not the engineering specification set for building the application itself. Those documents now live in [`../eng-docs/`](../eng-docs/constitution.md).

## What The Desktop Is

The desktop is an environment shell, not a file browser with chat attached.

It is designed to help you work across:

- the live Common Lisp image
- structured conversations with agents
- governed execution and approvals
- incidents, evidence, and reconciliation
- source, runtime, and workflow context at the same time

## Start Here

1. Read [Getting Started](getting-started.md).
2. Take the [Desktop Tour](desktop-tour.md).
3. Go directly to the workspace guide you need:
   - [Browser](browser.md)
   - [Conversations](conversations.md)
   - [Execution](execution.md)
   - [Recovery](recovery.md)
   - [Evidence](evidence.md)
   - [Configuration](configuration.md)
4. If you are connecting the desktop to a real host, read [Live Connection](live-connection.md).
5. If something is wrong, go to [Troubleshooting](troubleshooting.md) and [FAQ](faq.md).

## Core Operating Model

The desktop assumes:

- the environment is the root object, not a transcript and not a file tree
- runtime inspection is first-class
- conversation is durable, but it is not the only control surface
- approvals, incidents, work-items, and artifacts are engineering objects, not secondary metadata

## Documentation Map

- [Getting Started](getting-started.md): installation, launch, and first-run expectations
- [Desktop Tour](desktop-tour.md): the shell frame, navigation model, and workspace structure
- [Browser](browser.md): systems, packages, symbols, variables, source, xref, and documentation
- [Conversations](conversations.md): threads, turns, and drafting the next supervised step
- [Execution](execution.md): listener, approvals, and work reconciliation
- [Recovery](recovery.md): incident handling and recovery posture
- [Evidence](evidence.md): artifacts and event observation
- [Configuration](configuration.md): preferences, themes, and code-view customization
- [Live Connection](live-connection.md): connecting to a real `sbcl-agent` host
- [Troubleshooting](troubleshooting.md): common problems and what to check first
- [FAQ](faq.md): quick answers for common operator questions
