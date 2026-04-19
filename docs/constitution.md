# Constitution

## Purpose

This constitution defines the non-negotiable principles for `sbcl-agent-ux`.

Every requirement, architecture decision, workflow, and interface in this repository must be evaluated against these rules. If a proposed feature violates the constitution, the feature is wrong unless the constitution itself is explicitly revised.

`sbcl-agent-ux` is the frontend for `sbcl-agent`. This constitution therefore governs how the frontend represents and extends the environment model already established in `/Volumes/data/development/sbcl-agent`.

The primary frontend is a macOS desktop application. This constitution applies to that desktop application first.

## Preamble: Accept The Development Model Shift

The frontend must accept the core shift articulated by `sbcl-agent`:

- software development is no longer adequately represented as source files plus delayed reconstruction
- the running image is part of the truth of the system
- workflow governance must be captured as work happens
- humans and agents operate within the same environment rather than across disconnected tools

The frontend must not resist this shift by reinterpreting `sbcl-agent` as a safer, simpler, more familiar interface category.

It must also not default to a browser-shaped architecture when the product intent is a desktop engineering environment.

## Article 1: The Product Is An Environment

`sbcl-agent-ux` must represent `sbcl-agent` as a persistent engineering environment.

It must not reduce the product to:

- a chatbot with tools
- a shell wrapper
- a conventional IDE clone
- a transcript viewer with action buttons

The UX must make it clear that runtime, conversation, workflow, artifacts, policy, and evidence all inhabit one larger world.

## Article 2: The Three Truths Must Remain Explicit

The UX must preserve the distinction between:

- source truth
- image truth
- workflow truth

The interface may relate these truths tightly, but it must never collapse them into one ambiguous surface.

Any meaningful workflow must be able to answer:

1. What changed in source?
2. What changed in the live image?
3. What governed record explains and validates those changes?

## Article 3: Governance Is Native

Approvals, policy, incidents, validation, reconciliation, and evidence are native product concepts.

They must not be treated as:

- secondary admin features
- hidden backend concerns
- optional enterprise add-ons
- paperwork generated after execution

Mutating work must remain visible as governed work.

## Article 4: Direct Operator Power Must Be Preserved

The system must preserve direct, expert-friendly operation through:

- REPL-like evaluation
- structured commands
- durable conversation
- explicit runtime inspection

The UX may add guidance, safety, and richer visibility, but it must not weaken the immediacy and power that come from the SBCL-native substrate.

The macOS application should feel like a serious engineering environment with direct access to the governed runtime, not like a website wrapped as a desktop shell.

## Article 5: Conversation Is Native, But Not Total

Conversation is a first-class interaction medium, not the architectural center of the whole product.

The UX must not imply that:

- all truth lives in the transcript
- all actions are just chat responses
- workflow and runtime are subordinate to messages

Threads, turns, operations, and artifacts must appear as structured entities, not merely rendered chat decorations.

## Article 6: Runtime Truth Must Be First-Class

The live runtime is part of the engineering substrate.

The UX must expose that reality through explicit support for:

- live definitions
- object and symbol inspection
- active workers, tasks, and threads
- execution state
- conditions, incidents, and recovery
- divergence between source and loaded image

The UX must not force operators to reason about the runtime only through file diffs and logs.

## Article 7: Capabilities Must Be Preserved, Not Metaphors

Classic Lisp tooling offers enduring powers that must be preserved:

- direct evaluation
- symbolic introspection
- incremental repair
- runtime debugging
- source-image navigation
- fast feedback loops

However, the UX must not adopt legacy editor metaphors as architectural drivers.

The product must preserve the capabilities while discarding assumptions such as:

- file buffers as the primary truth
- panes and windows as the primary model
- human-only control
- one foreground task at a time

## Article 8: The Service Boundary Is Real

The frontend must be built over stable public services, not shell internals or private state helpers.

The required layering is:

1. environment kernel
2. public service interface layer
3. presentation adapters

No presentation tier may be treated as the privileged source of business logic, policy enforcement, or cross-domain truth assembly.

The shell is a presentation adapter. The future UX is also a presentation adapter. Neither may redefine the kernel model for convenience.

## Article 9: Environment Authority Wins

The authoritative durable state belongs to the environment domain model.

Presentation-facing sessions, transient UI state, and compatibility adapters may exist, but they must not become co-equal durable authorities.

New UX work must always answer:

1. Which environment domain owns the truth?
2. Which service exposes it?
3. Which presentation surface renders it?

## Article 10: Event Evidence Must Be Legible

Operators must be able to observe meaningful work as it unfolds and after it completes.

The UX must surface:

- turn progression
- operation progression
- approval waits and approvals granted
- validation milestones
- incident creation and recovery
- artifact creation
- workflow state changes
- environment posture changes

Opaque "something happened" indicators are constitutionally insufficient.

## Article 11: Multi-Actor Operation Is Fundamental

The environment must be legible in a world where humans, background workers, tools, and agents all participate.

The UX must therefore account for:

- multiple active threads and turns
- queued and background work
- actor identity and scope
- explicit ownership of operations
- concurrent change visibility

The system must not assume one user, one foreground task, one response stream.

## Article 12: Evidence Before Aesthetics

The UX should be excellent, but clarity of authority, causality, and safety outranks visual novelty.

A polished UI that obscures:

- policy
- approvals
- provenance
- reconciliation state
- incident status

is a constitutional failure.

## Article 13: Specs Drive Delivery

This repository is spec-driven.

Major implementation work should not begin without:

- a defined problem
- a capabilities model
- explicit requirements
- acceptance criteria
- a declared relationship to this constitution

If implementation pressure exposes ambiguity, the specs must be improved rather than bypassed.

## Article 14: Thesis Regression Is A Design Failure

Any feature, workflow, or layout that quietly restores the old file-centric, reconstruction-heavy SDLC model as the default operating model is a design failure.

This includes regressions where:

- source becomes the de facto only truth
- runtime becomes secondary or hidden
- workflow becomes decorative
- approvals become generic confirmations
- incidents become transient error messages
- conversation becomes the universal container for all state

Familiarity is not a valid reason to reintroduce those assumptions.

## Article 15: Every Major Feature Requires Thesis Review

Major product decisions must be reviewed not only for usability and implementation feasibility, but also for alignment with the `sbcl-agent` thesis.

At minimum, each major proposal should state:

1. how it strengthens or preserves the environment-first model
2. how it treats source, image, and workflow truth
3. how it preserves governed execution
4. whether it introduces any thesis-regression risk

## Decision Test

Any meaningful UX or architecture proposal should be tested with these questions:

1. Does it strengthen the environment model or collapse it into a simpler but false metaphor?
2. Does it preserve the distinction among source, image, and workflow truth?
3. Does it keep governance intrinsic and visible?
4. Does it improve expert power without hiding system reality?
5. Does it rely on stable services instead of privileged UI logic?
6. Does it make evidence, state, and causality more legible?

If the answer to any of these is no, the proposal should not proceed unchanged.
