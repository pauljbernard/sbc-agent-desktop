# Feature Proposal: Environment Posture Home

## Title

Environment Posture Home

## Summary

Create the default landing workspace for the macOS desktop application around environment posture rather than around chat, files, or a generic dashboard.

This feature gives the user immediate visibility into the current `sbcl-agent` environment across source truth, image truth, and workflow truth. Its purpose is to make the environment itself legible as the root object of the product.

## Problem

Without a strong environment-oriented landing experience, the desktop app will drift toward one of three regressions:

- chat becomes the implicit root
- source navigation becomes the implicit root
- status becomes fragmented across unrelated views

Any of those outcomes weakens the `sbcl-agent` thesis and makes the environment harder to understand than it should be.

## User Outcome

A developer or engineer can open the app and quickly answer:

- what environment am I in?
- what is active right now?
- what needs my attention?
- what is true in source, image, and workflow right now?

## Primary Entities

- environment
- event
- task
- worker
- incident
- approval request
- thread
- turn
- artifact
- work-item

## Truth Domains Affected

- source truth
- image truth
- workflow truth

## Service Families Affected

- environment service
- conversation service
- workflow service
- incident service
- task service
- approval service
- artifact service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It makes the environment the visible root object of the application. The user lands in the environment, not in a transcript, not in a file tree, and not in a neutral dashboard disconnected from domain truth.

### 2. How does it treat source, image, and workflow truth?

It presents them as distinct but related posture surfaces. The feature does not collapse them into one ambiguous summary number or one blended activity feed.

### 3. How does it preserve or improve governed execution?

It keeps governed state visible from the first screen:

- pending approvals
- blocked work
- incidents
- validation posture
- reconciliation posture

That makes governance part of the main flow, not an afterthought.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

The home view is not file-led and not chat-led. It is entity-led and posture-led.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It teaches the user that they are operating inside an environment composed of multiple truths, active work, and governed state.

## Regression Risk

Primary risks:

- the home screen degenerates into a generic project dashboard
- source metrics dominate the page and re-center file-first thinking
- activity becomes a cosmetic feed with no connection to entity state
- incidents and approvals are reduced to badges

Mitigation:

- require explicit sections for source, image, and workflow posture
- require explicit attention surfaces
- require linked navigation into entity detail

## Capability Benchmark Impact

This feature does not correspond directly to a classic Lisp IDE capability, but it creates a capability older tools generally lacked:

- coherent environment-level posture across runtime, workflow, and evidence

This is an exceed category feature, not merely parity.

## UX Shape

### Entry Points

- app launch
- environment switch
- explicit navigation to Environment

### Primary View

A desktop workspace with four main regions:

- environment summary header
- truth posture region
- attention region
- recent activity and evidence region

### Linked Entity Traversal

The user must be able to navigate from the home view directly into:

- active thread and turn
- pending approval request
- open incident
- waiting work-item
- active task or worker
- recent artifact

### Live Event Behavior

The workspace updates through environment-scoped service events.

It should react to:

- new incidents
- new approvals
- turn state changes
- workflow changes
- task and worker changes
- artifact creation

### Attention Model Implications

The view must foreground:

- awaiting approval
- interrupted
- failed
- quarantined
- awaiting colder validation
- active streaming or active operation state

## Command And Query Shape

### Primary Queries

- `get-environment-summary`
- `get-environment-posture`
- `get-active-context`
- `get-recent-evidence`
- `get-waiting-work-summary`
- `list-approval-requests`
- `list-incidents`

### Primary Commands

- `select-environment`
- `refresh-environment-posture`

### Key Returned State

- environment identity
- source posture summary
- image posture summary
- workflow posture summary
- active thread and turn
- urgent attention items
- recent evidence and artifacts

### Key Event Emissions Consumed

- environment posture changed
- approval requested
- incident created
- turn state changed
- workflow state changed
- task or worker state changed
- artifact created

## Acceptance Criteria

- On launch, the user lands in an environment-first workspace rather than a chat-first or file-first workspace.
- The view exposes distinct source, image, and workflow posture sections.
- The view exposes globally important waiting and risk states without requiring secondary navigation.
- The user can navigate directly from posture surfaces into linked entity detail.
- The workspace updates live from canonical service events.
- A design review concludes the feature is thesis-strengthening and does not re-center the old SDLC model.

## Open Questions

- What is the right density and layout for truth-domain posture on a Mac desktop?
- Which posture metrics should be globally visible versus available only on drill-in?
- How much event history belongs on the home surface versus the Activity workspace?
