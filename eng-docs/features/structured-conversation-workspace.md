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
- selected transcript body
- stable composition dock
- linked operations, artifacts, and metadata inspector

The dominant work surface is the selected transcript body, with the composition dock fixed against it and thread supervision kept subordinate as collapsible navigation.

The Conversations workspace must preserve strict spatial ownership:

- thread navigation is a transient supervision surface and may collapse
- the transcript body is the dominant growing work object
- the composition surface remains fixed relative to the latest transcript context
- metadata and linked governed entities move to the inspector rather than crowding the transcript

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

Streaming behavior must keep the latest response in view and keep the transcript anchored against the composition surface when history is short.

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
- Thread navigation can collapse without hiding urgent attention state.
- Only the transcript body owns scroll during active thread work.
- Short transcripts visually anchor near the composition surface rather than floating at the top of the page.
- Message metadata such as source and timestamp is available on selection through inspector detail rather than repeated on every transcript row.
- Composition controls remain compact and subordinate to the transcript rather than dominating the page width.

## Open Questions

- How much thread summary should be visible in the list versus in detail?
- What is the right balance between message readability and operation/evidence density?
- How should background-only threads be visually distinguished from operator-attended threads?

## Lessons To Preserve

This workspace must preserve the following learned constraints in future iterations:

- remove duplicated framing once a thread is selected
- treat the transcript as the primary work object, not the page header or transcript metadata
- move linked entities and metadata to the inspector before adding new inline panels
- protect working space by collapsing transient navigation and support surfaces aggressively
- validate scroll and anchoring behavior with end-to-end UI tests, not CSS reasoning alone
