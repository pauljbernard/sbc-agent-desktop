# Implementation Slice: Thread List And Turn Detail

## Purpose

This slice defines the first real conversation-domain implementation in the desktop app.

It proves that conversation in the product is structured governed work rather than transcript-only chat.

## Scope

This slice includes:

- thread list query
- thread detail query
- turn detail query
- Conversations workspace list/detail structure
- turn lifecycle rendering

This slice does **not** include:

- full operation detail rendering
- full artifact detail rendering
- full approval and incident detail workspaces
- start/resume/cancel commands unless needed as stretch goals

## User-Visible Outcome

A user can open the Conversations workspace, see multiple threads, select one, and inspect a turn as a structured lifecycle rather than as plain transcript replay.

## `sbcl-agent` Touch Points

### Required Work

- expose `conversation.thread_list`
- expose `conversation.thread_detail`
- expose `conversation.turn_detail`
- normalize outputs to conversation DTOs

### Existing Internal Areas Likely Involved

- `src/conversation-service.lisp`
- thread summary builders
- thread detail and turn detail builders
- conversation DTO normalization layer

### Deliverables

- thread list externalization
- thread detail externalization
- turn detail externalization

## Electron Touch Points

### Main Process

- conversation query client integration
- route entity-open requests for threads and turns

### Preload

- `query.threadList(environmentId?)`
- `query.threadDetail(threadId, environmentId?)`
- `query.turnDetail(turnId, environmentId?)`

### Renderer

- Conversations workspace
- thread supervision list
- selected thread panel
- selected turn lifecycle panel

## Protocol Operations

### Required Targets

- `conversation.thread_list`
- `conversation.thread_detail`
- `conversation.turn_detail`

## DTOs Used

- `ThreadSummaryDto`
- `ThreadDetailDto`
- `MessageDto`
- `TurnSummaryDto`
- `TurnDetailDto`

## Renderer View Requirements

### Thread List

Must render:

- title
- summary
- state
- latest activity
- attention flags

### Thread Detail

Must render:

- thread identity
- messages
- turns
- linked artifact/work/incident references

### Turn Detail

Must render:

- lifecycle state
- linked operation ids
- linked artifact ids
- linked incident ids
- linked approval ids

The renderer may show linked entity ids or lightweight chips at first, with deeper detail slices coming later.

## Acceptance Tests

### Backend Acceptance

- thread list, thread detail, and turn detail all return stable DTO envelopes
- thread and turn states are normalized enough for consistent UI rendering

### Electron Acceptance

- Conversations workspace shows a real thread list
- selecting a thread loads real detail
- selecting a turn shows lifecycle state and linked governed references

### Thesis Acceptance

- conversation is rendered as threads and turns with structure
- the UI does not reduce the slice to chat transcript alone
- multi-thread supervision is visible in the list model

## Exit Criteria

This slice is complete when:

1. the Conversations workspace is backed by real host data
2. thread list and turn detail are visible and navigable
3. the app demonstrates structured conversation rather than chat-only rendering
