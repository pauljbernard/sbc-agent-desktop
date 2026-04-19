# Information Architecture

## Purpose

This document defines the detailed information architecture for the `sbcl-agent` desktop application.

It extends the higher-level [Desktop Information Architecture](desktop-ia.md) document into a more implementation-oriented structure for navigation, workspace composition, entity access, and cross-workspace consistency.

The application is macOS-first, but the information architecture must remain portable to a future Windows desktop implementation.

## IA Goals

The information architecture must:

- make the environment the visible root object
- preserve source truth, image truth, and workflow truth as distinct but related domains
- keep runtime and governance central rather than secondary
- support expert desktop workflows with high information density where useful
- avoid browser-style page navigation and file-first mental models
- remain portable across desktop platforms

## IA Layers

The application should be understood as four nested IA layers:

1. environment frame
2. workspace domains
3. entity views
4. inspectors and utility surfaces

## Layer 1: Environment Frame

The environment frame is the persistent top-level structure of the application.

It contains:

- environment selector
- primary navigation
- global attention strip
- workspace canvas
- contextual inspector region
- command surface entry

The environment frame must persist across navigation so users remain grounded in one environment even as they move across domains.

## Layer 2: Workspace Domains

Workspace domains are the primary navigable product areas.

The initial workspace set is:

- Environment
- Conversations
- Runtime
- Work
- Incidents
- Artifacts
- Activity
- Approvals

These workspaces must support concurrent use. The product should never assume the user is dealing with only one active thread or one active task at a time.

These are not arbitrary menu items. They are the principal environment domains that must remain quickly reachable.

## Layer 3: Entity Views

Entity views are the stable detail surfaces for governed objects.

Initial entity view types:

- environment detail
- thread detail
- turn detail
- runtime scope detail
- work-item detail
- workflow record detail
- incident detail
- artifact detail
- approval request detail
- task detail
- worker detail

Entity views must be linkable, pinnable, and inspectable without breaking the user’s environment context.

## Layer 4: Inspectors And Utility Surfaces

Inspectors and utility surfaces support depth without forcing full workspace switches.

Inspectors:

- relationship inspector
- policy inspector
- event detail inspector
- artifact evidence inspector
- linked context inspector

Utility surfaces:

- command palette
- direct evaluation surface
- search surface
- quick-open entity surface

## Primary Navigation Structure

### Global Navigation

The global navigation should be environment-scoped and persistent.

Required navigation groups:

- core posture
- live interaction
- runtime and execution
- governed work
- observation and oversight

Recommended initial grouping:

- Environment
- Conversations
- Runtime
- Work
- Incidents
- Artifacts
- Activity
- Approvals

### Secondary Navigation

Each workspace may define local navigation for:

- subviews
- filters
- saved scopes
- recently opened entities

Secondary navigation must never obscure the global domain structure.

## Workspace Definitions

### Environment Workspace

Purpose:

- orient the user to the whole environment

Primary content:

- environment summary
- source posture
- image posture
- workflow posture
- current attention
- active context
- recent evidence
- active tasks and workers

### Conversations Workspace

Purpose:

- manage durable interaction as structured governed activity

Primary content:

- thread list
- thread summary
- selected thread detail
- selected turn timeline
- linked operations and artifacts

The thread list must support stateful supervision at scale, including views for:

- active
- waiting
- blocked
- incident-bearing
- approval-bearing
- background-only

### Runtime Workspace

Purpose:

- inspect and act on image truth

Primary content:

- runtime summary
- package browser
- symbol browser
- selected scope detail
- source divergence posture
- linked incidents and operations

### Work Workspace

Purpose:

- manage governed engineering progress

Primary content:

- work-item queue
- selected work-item
- workflow state
- waiting reasons
- validation posture
- reconciliation posture
- linked artifacts and incidents

### Incidents Workspace

Purpose:

- manage failure and recovery

Primary content:

- incident queue
- selected incident
- recovery posture
- linked runtime, turn, and work context
- evidence and closure state

### Artifacts Workspace

Purpose:

- browse durable evidence and outputs

Primary content:

- artifact list
- artifact filters
- artifact detail
- lineage and relationships

### Activity Workspace

Purpose:

- observe the live evented environment

Primary content:

- event stream
- family filters
- active operations
- background tasks and workers

This workspace should also provide actor-aware and thread-aware filtering so users can supervise concurrent work rather than only view a flat feed.

### Approvals Workspace

Purpose:

- manage governed authorization

Primary content:

- approval inbox
- approval detail
- scope and consequence explanation
- linked entities

## Entity Access Patterns

Users must be able to access entities through at least four routes:

1. workspace-native lists
2. linked navigation from related entities
3. global search or quick open
4. event and attention surfaces

## Cross-Domain Relationship Rules

The IA must make the following relationships easy to traverse:

- thread -> turn
- turn -> operation
- turn -> artifact
- turn -> incident
- operation -> approval request
- operation -> incident
- runtime scope -> source asset
- runtime scope -> workflow posture
- work-item -> workflow record
- work-item -> artifact
- incident -> runtime
- incident -> work-item
- artifact -> producing entity

## Attention Architecture

The attention model is a global IA concern, not a local widget.

Attention categories:

- awaiting approval
- active operation
- active streaming turn
- interrupted
- failed
- quarantined
- awaiting colder validation

Attention should also be aggregatable by thread, actor, and work type so users can supervise concurrent development rather than chase isolated notifications.

## State Persistence

The desktop app should persist, where appropriate:

- current environment selection
- last-open workspace
- recent entity history
- pinned inspectors
- local workspace filters
- window layout state

This persistence is a desktop usability concern only. It must not become a competing source of durable product truth.

## Platform Portability Rule

The information architecture must separate:

- product structure
- interaction semantics
- platform-specific presentation conventions

The same domain structure must work on:

- macOS now
- Windows later

without rethinking the product model.

## Acceptance Criteria

The information architecture is acceptable when:

1. the environment remains the visible root object
2. runtime and workflow are first-tier domains
3. no important governed entity is stranded in a single workspace
4. users can traverse relationships without browser-style context loss
5. the structure can be implemented on macOS now and Windows later without product-model rewrites
