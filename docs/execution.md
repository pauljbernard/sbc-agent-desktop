---
title: Execution
---

# Execution

The Execution workspace covers:

- the listener and direct evaluation surface
- actor-system and orchestration posture
- approvals
- governed work and reconciliation
- corrective and recovery routing after live runtime events

## Listener

The Listener page is for live evaluation and runtime inspection.

The primary surface is the inspection-scope table at the top, followed by:

- selected scope and inspector detail
- REPL input
- listener result
- runtime context

The source and listener surfaces are now expected to support real editing and continued interaction rather than behaving like a static code preview.

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

Approvals are not isolated records. They are part of the larger runtime and work-item flow, so you should expect direct navigation into related work, incidents, and evidence.

## Work

The Work page starts with the work-item table and then shows the selected work item below it.

Use this page when you need to:

- inspect governed work-items
- understand waiting reasons
- see linked approvals, incidents, and artifacts
- inspect workflow and closure posture

This is also where later corrective and reconciliation obligations should remain visible after an earlier action is no longer current.

## Actor System

The backend now exposes an actor-system panel that includes:

- actor hierarchy
- workflow edges
- runtime execution pressure
- supervision incidents

Where surfaced in `Surface`, this is part of the execution/orchestration picture rather than a separate toy visualization. It helps the operator understand where governed work is actually executing and where supervision or pressure is building.

## Recommended Workflow

1. start in Listener for direct runtime inspection and evaluation
2. move to Approvals when execution is blocked by policy or governance
3. move to Work when the question is closure, validation, or reconciliation
4. inspect actor-system or orchestration posture when execution continuity or failure routing is unclear
5. return to Conversations only after you understand the runtime and workflow consequences of the action you just took

## Important Distinction

Execution is not just a console.

It is the governed interaction surface for runtime operations and the workflow consequences attached to them.
