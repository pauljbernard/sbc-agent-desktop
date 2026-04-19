---
title: Execution
---

# Execution

The Execution workspace covers:

- the listener and direct evaluation surface
- approvals
- governed work and reconciliation

## Listener

The Listener page is for live evaluation and runtime inspection.

The primary surface is the inspection-scope table at the top, followed by:

- selected scope and inspector detail
- REPL input
- listener result
- runtime context

Use Listener when you need to:

- inspect packages or symbols
- load a scope into the inspector
- evaluate forms directly in the running image
- inspect result artifacts or approval consequences

## Approvals

The Approvals page starts with the approvals table and then shows the selected approval below it.

Use this page when you need to:

- inspect requested action and scope
- review rationale and consequence summary
- inspect linked entities before deciding
- apply approve or deny decisions

## Work

The Work page starts with the work-item table and then shows the selected work item below it.

Use this page when you need to:

- inspect governed work-items
- understand waiting reasons
- see linked approvals, incidents, and artifacts
- inspect workflow and closure posture

## Recommended Workflow

1. start in Listener for direct runtime inspection and evaluation
2. move to Approvals when execution is blocked by policy or governance
3. move to Work when the question is closure, validation, or reconciliation

## Important Distinction

Execution is not just a console.

It is the governed interaction surface for runtime operations and the workflow consequences attached to them.
