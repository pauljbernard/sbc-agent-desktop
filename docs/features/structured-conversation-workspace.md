# Feature Proposal: Structured Conversation Workspace

## Title

Structured Conversation Workspace

## Summary

Create the primary workspace for thread and turn-based interaction as structured governed work rather than as transcript-first chat.

This feature makes conversation a first-class medium inside the environment without allowing it to become the universal container for runtime, workflow, and evidence state.

## Problem

If the conversation surface is implemented as an ordinary chat client, the product will regress in several ways:

- turns will collapse into transcript replay
- operations and artifacts will become secondary decorations
- approvals and incidents will become interruptions to chat rather than governed state
- multi-conversation work will degrade into tab sprawl

That would violate the `sbcl-agent` thesis directly.

## User Outcome

A developer or engineer can use conversation as a durable work medium while still understanding:

- thread state
- turn lifecycle
- created operations
- produced artifacts
- linked approvals, incidents, and work-items

## Primary Entities

- thread
- message
- turn
- operation
- artifact
- incident
- approval request
- work-item

## Truth Domains Affected

- image truth
- workflow truth

## Service Families Affected

- conversation service
- workflow service
- artifact service
- incident service
- approval service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It keeps conversation inside the environment model rather than letting conversation redefine the product as a chat application.

### 2. How does it treat source, image, and workflow truth?

It primarily exposes image and workflow truth through the interaction lifecycle, while preserving links outward to source and other governed entities when relevant.

### 3. How does it preserve or improve governed execution?

It gives operations, approvals, artifacts, and incidents explicit structured representation within the turn lifecycle.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It rejects a transcript-only layout and instead uses threads, turns, operations, artifacts, and linked entities as the real structure.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It shows that conversation is native, but not total.

## Regression Risk

Primary risks:

- the workspace becomes a generic chat interface
- operations collapse into inline status text
- artifacts become attachments instead of evidence
- multi-thread support becomes tabs without stateful supervision

Mitigation:

- require explicit thread state and turn state models
- require operation and artifact panels
- require linked governed entity traversal

## Capability Benchmark Impact

This feature transforms conversation into something older Lisp tools did not provide directly, while ensuring it does not weaken Lisp-grade development power.

It complements, rather than replaces:

- direct evaluation
- runtime inspection
- symbolic navigation

## UX Shape

### Entry Points

- primary navigation to Conversations
- Environment workspace active context
- event and attention surfaces
- deep link to specific thread or turn

### Primary View

A multi-region workspace with:

- thread supervision list
- selected thread detail
- selected turn lifecycle region
- linked operations and artifacts inspector

### Linked Entity Traversal

The user must be able to move among:

- thread to turn
- turn to operation
- turn to artifact
- turn to approval request
- turn to incident
- turn to work-item

### Live Event Behavior

The workspace updates from conversation, operation, approval, incident, and artifact events.

### Attention Model Implications

The workspace must make visible:

- active turns
- awaiting approval turns
- interrupted turns
- failed turns
- threads with incidents
- threads with waiting governed work

## Command And Query Shape

### Primary Queries

- `list-threads`
- `get-thread`
- `get-turn`
- `list-turn-operations`
- `list-thread-artifacts`

### Primary Commands

- `create-thread`
- `start-turn`
- `resume-turn`
- `cancel-turn`

### Key Returned State

- thread summaries
- turn lifecycle detail
- operations summary
- artifact summary
- linked governed entity references

### Key Event Emissions Consumed

- turn state changed
- assistant message delta
- operation created
- operation status changed
- artifact created
- approval requested
- incident created

## Acceptance Criteria

- The Conversations workspace is structured around threads, turns, operations, and artifacts rather than transcript alone.
- Users can supervise multiple thread states without losing environment orientation.
- Turn detail exposes governed entities directly rather than hiding them in message text.
- Multi-conversation work remains structured and legible under concurrent use.
- A thesis review concludes the feature strengthens conversation as a native medium without letting it dominate the product model.

## Open Questions

- How much thread summary should be visible in the list versus in detail?
- What is the right balance between message readability and operation/evidence density?
- How should background-only threads be visually distinguished from operator-attended threads?
