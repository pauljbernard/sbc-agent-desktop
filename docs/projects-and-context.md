---
title: Projects And Context
---

# Projects And Context

`Surface` is no longer only a window onto transcripts, runtime inspection, and approvals.

The backend now carries a stronger context model, and the desktop increasingly reflects it through environment, project, conversation, execution, and orchestration surfaces.

## Project Authority

The `Projects` workspace now works with governed project records rather than loose metadata.

Project detail can carry:

- constitution
- requirements
- feature specifications
- user journeys
- architecture decisions
- design system guidance
- style guide guidance
- testing strategy
- quality gates
- release readiness
- readiness obligations
- linked work-items
- linked incidents

That means the desktop can anchor work to a project that is much richer than a folder name or a title.

## Project Workspace Role

The `Projects` workspace is now the canonical desktop surface for:

- selecting the active governed project
- reviewing readiness posture
- understanding linked governed work
- inspecting testing evidence and quality gates
- moving between project definition and live workflow state

This is one of the key ways the desktop reflects the newer backend context-engineering model.

## Environment Context

The backend environment summary is now richer than earlier docs suggested. It includes:

- environment identity
- host and binding posture
- runtime state
- workflow and incident posture
- provider posture
- capability and dependency posture
- project-aware context

The desktop consumes that environment truth rather than reconstructing it from individual widgets.

## Context Chat And Project Framing

The backend now supports explicit Context Chat project targeting, including zero, one, or many selected projects plus an optional primary project.

That capability matters because provider-bound planning and governed execution can now be grounded in:

- explicit project targeting
- ambient project selection
- inferred project alignment

The desktop already reflects project-aware context through the `Projects` workspace and environment-backed summaries. A more direct dedicated UI affordance for explicit Context Chat targeting may still evolve, but the underlying project-aware planning substrate is already part of the live backend contract.

## Why This Matters

Long-horizon agent work depends on more than having a transcript and a REPL.

It depends on keeping these things aligned:

- what project is in scope
- what constraints govern that project
- what readiness or validation burden still exists
- what work-items and incidents are attached to the project
- what environment and capability posture makes the next step safe or unsafe

The desktop is now operating against a backend that preserves those distinctions explicitly.
