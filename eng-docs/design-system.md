# Design System

## Purpose

This document defines the design system principles for the `sbcl-agent` desktop application.

The design system must produce consistency in look and feel while staying aligned with the product thesis:

- environment-first
- image-aware
- workflow-governed
- desktop-native
- portable across macOS and future Windows implementations

This is not a marketing style guide. It is a product design system for serious engineering work.

## Design System Goals

The design system must:

- make complex governed state legible
- support dense, expert-oriented desktop workflows
- distinguish truth domains clearly
- present risk, waiting state, and closure state consistently
- feel intentional and modern without sliding into consumer-app softness
- remain portable across desktop platforms

## Core Visual Principles

### Principle 1: Legibility Over Ornament

The visual system should help users parse:

- truth domains
- governed state
- entity type
- live activity
- attention state

### Principle 2: Calm Precision

The product should feel:

- exact
- stable
- intelligent
- operational

It should not feel:

- playful
- generic SaaS-like
- marketing-driven

### Principle 3: Desktop Density With Restraint

The application should support high-value information density, but not crowding.

Density should come from:

- strong hierarchy
- stable layout regions
- reusable inspector patterns
- consistent state markers

### Principle 4: Compression Over Explanation

The interface should not narrate what the operator already understands from structure.

The design system should prefer:

- concise labels over explanatory paragraphs
- selected detail over repeated inline metadata
- inspector reveal over always-visible support panels
- compact controls over oversized calls to action

Repeated framing text is usually a product smell, not a product strength.

### Principle 5: State Is Part Of The Visual Language

Executed, blocked, awaiting approval, failed, interrupted, quarantined, and reconciled are part of the system’s visual grammar.

### Principle 6: Stable Spatial Ownership

Every screen should answer three questions clearly:

- what is navigation?
- what is the active work object?
- what is contextual inspection?

The layout should preserve stable ownership for those roles so the user can build spatial memory across long sessions.

## Design Tokens

The design system should be expressed through portable tokens rather than platform-specific hardcoding.

Token families:

- color
- typography
- spacing
- radius
- stroke and divider
- elevation
- motion
- iconography
- semantic state

## Color System

### Color Role Model

Color should be semantic and role-based.

Core roles:

- canvas
- surface
- elevated surface
- border
- text primary
- text secondary
- accent
- success
- warning
- danger
- info
- neutral activity

### Truth-Domain Expression

Truth domains should have subtle but consistent identity cues.

Recommended direction:

- source truth: grounded and durable
- image truth: live and active
- workflow truth: governed and procedural

### Attention State Colors

Critical states must have consistent semantic colors:

- active streaming or active work
- awaiting approval
- failed
- interrupted
- quarantined
- validated or reconciled

## Typography

The typography system should separate:

- product framing
- dense operational content
- code and symbolic identifiers
- supporting metadata

Recommended type roles:

- display
- section title
- body
- label
- metadata
- monospace code and identifiers

## Layout System

The design system should support a stable desktop layout vocabulary.

Primary layout primitives:

- shell
- sidebar
- shell header
- shell footer
- content canvas
- split pane
- inspector rail
- section stack
- card or panel
- table or list
- data table
- timeline
- inline status strip

### Workspace Ordering Rule

Workspace pages that present operational or runtime records must follow a strict vertical ordering model:

- primary data table first
- selected-row detail directly below the table
- secondary summary, helper actions, and supporting context below the detail
- row-specific context within the detail stage should also stack vertically rather than forming a competing multi-panel first row

This applies to Browser, Operate, Conversations, and any future runtime-facing workspace that foregrounds structured records.

For execution-native pages whose primary purpose is live interaction rather than record browsing, the same ordering logic still applies with the primary execution surface replacing the table:

- primary execution control first
- execution result or selected detail directly below
- runtime context and secondary support below that

This rule exists to preserve developer focus and scale across large runtime datasets.

It should:

- make the table the first thing the user can scan, sort, filter, and search
- keep row selection and row detail spatially coupled
- avoid forcing the user to parse multiple competing primary panels in the first row
- let dense runtime pages grow vertically rather than fragment horizontally
- keep selected-row facts, actions, and semantic context in a single stacked reading flow

It should avoid:

- placing the detail panel beside the main table as a competing first-row primary surface
- placing summary cards above the table when the developer needs record data first
- creating dashboard-like first rows that dilute the main operational task
- turning the row-detail region into another horizontal dashboard of equal-weight panels

### Primary Surface Rule

Every workspace must have one dominant primary surface.

Examples:

- a data table
- a transcript body
- a runtime evaluation surface
- an incident detail body

Supporting elements must subordinate themselves to that primary surface through:

- inspector placement
- collapse behavior
- smaller control footprint
- lower visual emphasis

No page should open with multiple competing first-class panels of equal weight.

### Scroll Ownership Rule

The design system must define scroll at the component level, not leave it to incidental page behavior.

Preferred pattern:

- shell chrome does not scroll with workspace bodies
- navigation scrolls independently when necessary
- inspectors scroll independently when necessary
- the primary growing work object owns scroll in the center canvas
- action docks and top navigation bands remain stable while the primary body grows

For transcript and feed-like work:

- short histories should visually anchor near the active input or action surface
- the content body should grow upward until scrolling becomes necessary
- streaming output should keep the latest response in view automatically

## Component Families

### Shell Components

- desktop shell frame
- global shell header
- workspace navigation rail
- footer status dock
- canvas workspace header
- contextual inspector rail

The shell itself is part of the design system and not merely application scaffolding.

It should provide:

- one stable application frame across all workspaces
- a reusable full-width top header for brand, product identity, and shell continuity
- a reusable left navigation rail dedicated to hierarchical workspace navigation
- a reusable bottom status dock dedicated to compact environment, binding, workspace, runtime, and inspector posture
- clear separation between global shell chrome and workspace-local content headers

It should avoid:

- duplicating shell status information inside the navigation rail
- allowing workspace pages to invent their own shell-level framing
- treating header, footer, and navigation as one-off page markup instead of shared components

Shell framing should also avoid repeating workspace-local summaries that are better expressed by the workspace itself.

### Data Presentation Components

- shared data table
- selected-row detail panel
- table toolbar with search, filter, sort, and pagination

The shared data table pattern is a canonical component family.

Its responsibilities are:

- render dense operational records in a consistent table surface
- provide the same search, filter, sort, pagination, and scroll behavior across browser and operate pages
- drive a selected-row detail panel rendered directly below the table

It should not:

- be paired with a competing first-row summary panel that weakens the table-first information architecture
- hide important row detail off to the right when vertical coupling is more scalable

### Transcript And Conversation Components

Conversation surfaces are a canonical component family, not ad hoc chat markup.

Their responsibilities are:

- separate thread navigation from transcript reading
- make the transcript body the primary growing surface
- keep composition controls stable and adjacent to the latest context
- reveal metadata, linked entities, and provenance through inspector or selected detail

They should avoid:

- top-of-page transcript framing that duplicates selected-thread context
- inline role and timestamp repetition on every bubble when color and selection already provide identity
- full-width action controls that visually overpower the transcript
- treating the whole conversation page as one scrolling column

### Navigation Components

- primary sidebar
- hierarchical workspace tree
- collapsible workspace group
- workspace leaf row
- workspace section disclosure
- workspace selection row
- breadcrumbs for entity context
- quick switcher

The primary navigation model should now be a single left-sidebar hierarchy.

It should:

- let top-level workspaces expand to reveal their subpages inline
- avoid spending horizontal space on duplicate submenu rails inside the content area
- preserve a stable tree structure so operators can build spatial memory
- support future growth in browser and configuration categories without changing the shell layout

It should avoid:

- page-local submenu regions that repeat information already present in the sidebar
- top-level navigation that forces the content area to reintroduce a second navigation system
- wide navigation treatments that reduce available space for dense runtime tables and inspectors

The left navigation rail should be treated as a canonical reusable component.

Its responsibilities are:

- render the full hierarchical workspace tree
- hold expand and collapse state for top-level workspace groups
- preserve active selection and spatial memory
- scale as browser, execution, evidence, and configuration categories continue to grow

Secondary navigation surfaces inside workspaces should be collapsible when their task is transient.

When collapsed, they must still expose:

- restore affordance
- critical attention indication
- minimal orientation state

It should not carry:

- shell status summaries that belong in the footer status dock
- page-specific explanatory copy
- duplicate controls already present in the active workspace body

### Shell Header Components

- brand mark
- product identity block
- shell continuity label

The global shell header should be a reusable component spanning the full application width.

Its role is to:

- anchor product identity
- reinforce that the desktop is an environment workspace rather than a document window
- remain visually stable while the active workspace changes below it

The shell header should not absorb workspace-specific controls or verbose status content. That material belongs in the canvas workspace header or footer status dock.

### Footer Components

- footer status dock
- status group
- status label
- inspector visibility control
- compact shortcut hint

The footer status dock should be treated as a reusable shell component.

Its role is to:

- present compact global status without consuming main workspace area
- expose the minimum persistent shell telemetry the operator needs across all pages
- keep inspector visibility control in a stable location

It should remain:

- short in height
- visually subordinate to the workspace content
- typographically denser and smaller than primary content panels

### Entity Components

- entity row
- entity summary card
- entity header
- entity timeline
- entity relationship list

### Status Components

- truth-domain badge
- state badge
- attention pill
- inline policy marker
- validation posture marker

### Activity Components

- event row
- operation row
- stream region
- progress strip

### Governance Components

- approval card
- approval detail sheet
- incident banner and incident header
- workflow state ladder
- reconciliation status block

### Utility Components

- search input
- filter chips
- filter select
- sortable table header
- pagination control
- result count indicator
- command palette item
- inline inspector section
- keyboard shortcut hint

### Data Table Components

- shared browser data table
- scrollable table body
- searchable toolbar
- filter controls
- sortable columns
- pagination footer
- selected-row state

The shared data table is now part of the canonical component inventory for entity-heavy browser surfaces.

It should be used when:

- the user is selecting from potentially long runtime-backed entity sets
- the same entity class needs consistent search, filtering, and sorting behavior
- the surface must remain scalable as the runtime image grows

It must provide the following default capabilities consistently:

- vertical scrolling within the table body
- text search
- at least one structured filter control
- sortable columns
- page size selection
- pagination
- explicit selected-row state

It should avoid:

- domain-specific one-off table behavior when a shared table pattern can be used
- static summary cards that simply repeat the selected row directly under the table
- forcing the user to rely on outer page scrolling to traverse long result sets

## Iconography

Icons should aid fast recognition of:

- entity type
- action type
- attention state
- truth-domain context

Icons should never be the only indicator of critical state.

## Motion

Motion should communicate:

- state transition
- workspace continuity
- streaming activity
- inspector reveal

Motion should be fast and controlled rather than decorative.

## Interaction Consistency

The design system must define consistent interaction patterns for:

- opening entities
- drilling into linked context
- invoking governed commands
- approving or denying actions
- inspecting incidents
- opening direct evaluation
- filtering activity and lists
- searching, sorting, filtering, paging, and scrolling large browser tables

## Platform Portability Rule

The design system must distinguish:

- brand and product tokens
- platform-adaptive control rendering
- platform-specific conventions

This means:

- product hierarchy, state semantics, and component roles must be portable
- low-level control styling may adapt between macOS and Windows
- keyboard conventions and window chrome can vary by platform without changing the product language

## Design Anti-Patterns

The design system should explicitly avoid:

- browser-dashboard aesthetics as the dominant visual model
- generic chatbot visual hierarchy
- overly soft consumer-product styling
- color-heavy full-screen domain theming
- inconsistent badges and state labels across workspaces
- platform-specific custom chrome that blocks future portability

## Acceptance Criteria

The design system is acceptable when:

1. truth domains and governed states are visually consistent across the app
2. the product feels like a serious desktop engineering environment
3. high-density views remain readable and navigable
4. component roles can be implemented on macOS now and adapted to Windows later
5. the system prevents visual drift toward either generic web SaaS or classic IDE imitation
