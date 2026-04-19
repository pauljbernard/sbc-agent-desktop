# Multi-Actor And Conversation Model

## Purpose

This document defines how the `sbcl-agent` desktop application should model multi-threaded, multi-conversation, and multi-actor development.

This is a foundational product concern, not an advanced add-on.

Modern development is increasingly concurrent:

- multiple engineering tasks progress in parallel
- multiple conversations remain active over long periods
- humans, workers, tools, and agents contribute simultaneously
- long-running work continues while the operator focuses elsewhere

The desktop application must make that reality legible and governable.

## Why This Matters

The older SDLC model quietly assumes:

- one foreground task
- one primary conversation
- one active debugging session
- one operator in immediate control

That assumption is increasingly false.

The `sbcl-agent` desktop app must therefore support:

- multiple active threads
- multiple active turns
- background governed work
- multiple actors with explicit identity and scope
- durable context across interruptions and handoffs

## Comparative Reference: Codex App

As a comparative reference, the official OpenAI Codex app describes itself as a command center for agents and emphasizes:

- multiple agents working in parallel
- separate threads organized by projects
- long-running task supervision
- worktree-based isolation
- background automations

This is useful reference material because it validates that development tooling is moving toward multi-threaded, multi-conversation supervision rather than single-thread request/response interaction.

However, `sbcl-agent` must go further in a different direction:

- environment is the root object, not project threading alone
- runtime truth is first-class
- workflow governance is intrinsic
- conversation is one native medium, not the only organizing structure

## Core Model

The desktop app must assume the user may have all of the following active at once:

- one environment
- many threads
- many turns in different lifecycle states
- queued or running tasks
- active workers
- open incidents
- pending approvals
- background agentic activity

The product should be optimized for supervised concurrency, not single-thread linearity.

## Model Elements

### Environment As Concurrency Container

The environment is the top-level container for concurrent work.

It owns the cross-thread and cross-actor posture of:

- active conversations
- runtime activity
- governed work
- incidents
- approvals
- tasks and workers

### Thread As Durable Work Context

A thread is not just a chat log.

It is a durable work context that can:

- hold many turns
- accumulate artifacts
- link to work-items and incidents
- remain idle, active, blocked, or resumed later

### Turn As Interaction Lifecycle

A turn is one bounded lifecycle within a thread.

Many turns may be in play across the environment at once, including:

- active streaming turns
- awaiting approval turns
- interrupted turns
- completed turns awaiting follow-up

### Task And Worker As Background Execution

Tasks and workers make background execution explicit.

They allow the environment to show:

- what is still running
- which actor owns it
- whether it is blocked or failing

### Agent As Explicit Actor

Agents must appear as real actors with:

- identity
- scope
- authority
- active work

The app must not reduce agent activity to “assistant messages.”

## Product Rules

### Rule 1: Never Assume One Active Conversation

The app must support concurrent conversational work as a first-class condition.

### Rule 2: Never Hide Background Work

Long-running or delegated work must remain visible through:

- activity surfaces
- attention surfaces
- entity state

### Rule 3: Preserve Cross-Thread Orientation

The user must be able to understand:

- which threads are active
- which are waiting
- which contain incidents or approvals
- which are background only

### Rule 4: Keep Conversation Structured

Multi-conversation support must not degrade into many transcript panes.

Threads, turns, operations, artifacts, and governed state must remain structured.

### Rule 5: Show Ownership Explicitly

Every important active item should reveal:

- human owner if relevant
- agent or worker actor if relevant
- current state
- next attention requirement

## UX Implications

The application should provide:

- a strong global attention model
- multi-thread visibility from the Environment workspace
- thread state summaries in the Conversations workspace
- active and waiting filters
- actor-aware activity views
- quick pivot between active conversations without context loss

The goal is not tab proliferation. The goal is supervised concurrency.

## Technical Implications

The architecture must support:

- event-driven updates across many active entities
- durable thread and turn state
- environment-scoped concurrency summaries
- low-latency switching among active contexts
- strong relationship indexing between turns, operations, tasks, and incidents

## Acceptance Criteria

The multi-actor and conversation model is acceptable when:

1. the app handles multiple active threads and turns as a normal condition
2. background work remains visible and attributable
3. users can pivot across active contexts without losing environment orientation
4. conversation remains structured rather than devolving into many transcript streams
5. the design reflects the reality of supervised parallel development rather than one-task linear interaction
