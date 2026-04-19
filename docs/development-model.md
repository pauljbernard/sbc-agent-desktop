---
title: Development Model
---

# Development Model

This page explains the core shift behind `sbcl-agent` and `sbc-agent-desktop`.

Most developers today are still trained on a model that looks roughly like this:

1. edit source files
2. build
3. run or inspect an environment
4. deploy
5. reconstruct what happened from logs, tests, and tickets

That model was appropriate when live runtime systems were hard to inspect, dangerous to modify, and poorly integrated with engineering governance.

`sbcl-agent` assumes those conditions are changing.

## The Traditional Model

In the traditional model:

- source files are treated as the primary truth
- the running environment is often treated as disposable or secondary
- workflow decisions are captured outside the actual execution path
- logs and transcripts are used to reconstruct events after the fact
- human intent, machine actions, and runtime consequences are spread across different tools

This works, but it has real costs:

- delayed understanding of system state
- weak continuity between intent and execution
- heavy dependence on proxies rather than the live system
- duplicated effort between code tools, chat tools, deployment tools, and governance tools

## The `sbcl-agent` Model

`sbcl-agent` uses a different development model:

- the environment is the root object
- the live runtime is part of the truth of the system
- conversation is durable and structured, not disposable chat
- workflow state is captured during engineering work, not reconstructed later
- approvals, incidents, work-items, artifacts, and evidence are native objects

This does not eliminate source code.

Instead, it stops pretending that source code is the only truth that matters.

## The Three Truths

The desktop is built around three truths:

- source truth
- image truth
- workflow truth

### Source Truth

This includes:

- files
- source edits
- diffs
- durable artifacts
- documentation

### Image Truth

This includes:

- the live SBCL image
- loaded systems
- packages
- symbols
- functions
- variables
- classes
- methods
- runtime objects

### Workflow Truth

This includes:

- threads and turns
- approvals
- work-items
- incidents
- validation and reconciliation posture
- evidence of what happened

Traditional tooling tends to separate these truths across different applications.

`sbcl-agent` tries to keep them legible within one operating environment.

## Why This Fits Agentic Development

Agentic development changes the cost structure of software work.

When agents can:

- inspect systems rapidly
- make source changes
- operate on runtime state
- create or update governed work artifacts

then the limiting problem is no longer just "how do I generate code quickly?"

It becomes:

- how do humans and agents share the same environment truth?
- how do we preserve trust while allowing direct action?
- how do we avoid reconstructing engineering reality from disconnected logs and transcripts?
- how do we keep governance attached to execution?

That is the problem `sbcl-agent` is designed to solve.

## Why This Is Better

This model is better when:

- the running system matters during development
- agents are making real changes instead of giving suggestions only
- the cost of losing context is high
- approvals and recovery obligations need to remain visible
- you want continuity between thought, action, consequence, and evidence

It gives you:

- direct runtime inspection
- durable structured conversations
- explicit execution and approval surfaces
- incident and evidence continuity
- less reliance on post-hoc reconstruction

## What This Does Not Mean

This does not mean:

- source code no longer matters
- builds and deployment disappear
- conversation replaces every other interface
- governance becomes optional

Instead, it means those things become part of a larger environment model.

## The Practical Shift

The shift for a developer is this:

Instead of thinking:

- "I edit files, then later see what the system did"

you start thinking:

- "I operate inside a live engineering environment where source, runtime, and workflow stay connected while I work"

That is the conceptual foundation for the desktop.
