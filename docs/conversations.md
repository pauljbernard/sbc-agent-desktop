---
title: Conversations
---

# Conversations

The Conversations workspace is for structured, durable conversation state.

It is not a simple transcript list.

The desktop treats conversations as governed runtime objects with:

- threads
- turns
- linked engineering entities
- durable continuation state
- selected-thread workspace persistence

The backend now also treats conversation planning context more explicitly than older docs implied. A conversation can carry not only transcript continuity but also:

- project-aware frame of reference
- linked runtime entities
- linked work-items and incidents
- governed continuation posture
- uncertainty that should block or shape the next step

## Threads

Use `Threads` when you want the broad conversation view.

The page starts with the thread table, then shows the selected thread below it:

- thread summary
- message history
- linked entities

Use this when you want to understand the larger supervised conversation.

The selected thread should remain stable while you inspect history and send the next message. If the thread changes, treat that as a bug rather than normal behavior.

## Turns

Use `Turns` when you want lifecycle detail on specific conversation turns.

The page starts with the turn table for the selected thread, then shows the selected turn below it:

- turn state
- associated operations
- artifacts
- approvals
- incidents
- work-items

Use this when you need to inspect a single conversation step as an engineering object.

## Draft

Use `Draft` when you want to prepare the next supervised conversation step.

The editor is the primary surface on this page. The selected thread context appears below it so the draft stays grounded in the current continuation.

Current draft behavior assumes:

- the selected thread remains active while you send
- transcript history stays visible after a send
- governed follow-up work can route from the same conversation context into approvals or work without losing thread orientation

## Recommended Workflow

1. pick the active thread
2. confirm the surrounding project or workflow context when the request is not self-evident
3. inspect the relevant turn if you need lifecycle detail
4. draft the next step only after you understand the linked context
5. move into Execution, Projects, or Evidence if the next action depends on direct runtime, governed project, or artifact inspection

## Important Distinction

Conversation is a native control surface, but it is not the entire application.

Use Browser, Execution, Recovery, and Evidence whenever the conversation needs direct runtime, workflow, or artifact context.
