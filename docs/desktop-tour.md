---
title: Desktop Tour
---

# Desktop Tour

The desktop shell is organized around a stable frame:

- a full-width shell header
- a left navigation rail
- a central workspace canvas
- a right inspector rail
- a compact footer status dock

## Shell Header

The header identifies the product and keeps shell continuity visible across workspace changes.

It is not where workspace-local operations happen.

## Navigation Rail

The navigation rail is hierarchical and space-efficient.

Top-level workspaces:

- Operate
- Conversations
- Browser
- Execution
- Recovery
- Evidence
- Configuration

Each top-level area expands to show subpages. This means the desktop keeps one navigation system instead of duplicating submenus inside the canvas.

## Workspace Canvas

The center canvas is where you do actual work.

The current information architecture follows one main rule:

- primary table or primary execution surface first
- selected-row detail or result directly below
- secondary summary and helper context after that

This keeps the main working surface at the top of the page instead of burying it under dashboard panels.

## Inspector Rail

The inspector is secondary context.

It should help you keep orientation, but it should not replace the main workspace surface.

## Footer

The footer carries compact shell-level status:

- host posture
- binding posture
- current workspace
- runtime state
- workflow state

It is intentionally short so the navigation rail can focus on navigation rather than shell status.

## How To Read The UI

When you enter a workspace, expect:

1. a primary surface at the top
2. selected detail below it
3. secondary context lower in the page

If the page feels like a dashboard with multiple competing first-row panels, that is usually a bug or a regression from the intended UX model.
