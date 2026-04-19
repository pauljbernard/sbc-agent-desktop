# sbcl-agent-ux

`sbcl-agent-ux` is the specification-first macOS desktop frontend program for the capabilities and services implemented in `sbcl-agent`.

This repository does not begin with screens. It begins with the operating model that the frontend must faithfully express:

- the product is a persistent environment, not a chat shell and not an IDE clone
- source truth, image truth, and workflow truth are distinct and must remain explicit
- governance is intrinsic to the system, not layered on after the fact
- the shell, REPL, conversation runtime, and future UI are all presentation surfaces over the same governed service layer

## Frontend Role

This repository defines the future UX as the frontend for `/Volumes/data/development/sbcl-agent`.

That means the frontend must not invent a simpler product story than the one `sbcl-agent` already articulates and implements. Its job is to make the underlying system legible, powerful, and governable for developers and engineers.

The frontend is therefore a presentation adapter over the `sbcl-agent` environment kernel and public services. It is not a separate application model.

The primary target is a native macOS desktop application for developers and engineers. The shell remains an important peer adapter, but this repository is defining the desktop product.

## The Shift It Must Accept

The frontend must start from the premise that software development is changing in a structural way.

`sbcl-agent` argues and implements a shift away from a purely source-first, file-proxy, after-the-fact reconstruction model toward an environment where:

- the live runtime is part of the engineering substrate
- humans and agents can inspect and mutate the same running system they are reasoning about
- workflow governance is captured during execution rather than reconstructed later
- conversation is durable and native, but not the only control surface
- evidence, approvals, incidents, and reconciliation are first-class engineering objects

The frontend succeeds only if it helps users operate inside that shift without collapsing back into older metaphors.

## Purpose

This repository exists to define the product before implementation pressure turns it into a thinner, more familiar tool.

The initial deliverables are:

- a [constitution](docs/constitution.md) that defines non-negotiable product and architecture rules
- a [requirements specification](docs/requirements.md) that defines user needs, UX obligations, and system requirements
- a [capabilities specification](docs/capabilities.md) that translates the `sbcl-agent` kernel into UX-facing capability domains and service contracts

## Working Position

The frontend goal is not:

- "build a modern dashboard"
- "wrap the shell in a web app"
- "recreate SLIME/LispWorks in a browser"
- "make a chatbot for Lisp"

The frontend goal is:

- expose the environment as a first-class engineering substrate
- let developers and engineers reason across source, runtime, and workflow in one coherent system
- make approvals, evidence, incidents, validation, and reconciliation legible instead of hidden
- preserve directness for expert operators while making the system more intelligible and navigable

## Repository Structure

```text
sbcl-agent-ux/
├── README.md
└── docs/
    ├── design-system.md
    ├── desktop-ia.md
    ├── desktop-capability-backlog.md
    ├── domain-model.md
    ├── feature-template.md
    ├── features/
    │   ├── approval-inbox-and-detail.md
    │   ├── direct-evaluation-surface.md
    │   ├── event-observation-surface.md
    │   ├── environment-posture-home.md
    │   ├── global-attention-model.md
    │   ├── incident-workspace.md
    │   ├── runtime-workspace.md
    │   ├── structured-conversation-workspace.md
    │   └── work-and-reconciliation-workspace.md
    ├── capabilities.md
    ├── common-lisp-capability-benchmark.md
    ├── constitution.md
    ├── information-architecture.md
    ├── integration-transport-recommendation.md
    ├── multi-actor-and-conversation-model.md
    ├── requirements.md
    ├── electron-desktop-core-specification.md
    ├── electron-main-process-connectivity-specification.md
    ├── electron-preload-bridge-specification.md
    ├── electron-renderer-state-specification.md
    ├── preload-bridge-typescript-interface.md
    ├── protocol-message-schemas.md
    ├── core-entity-dtos.md
    ├── service-host-implementation-plan.md
    ├── electron-app-skeleton-plan.md
    ├── implementation-slice-environment-posture-home.md
    ├── implementation-slice-host-health-and-binding.md
    ├── implementation-slice-approval-inbox-and-detail.md
    ├── implementation-slice-event-subscription-and-attention.md
    ├── implementation-slice-event-observation-surface.md
    ├── implementation-slice-incident-workspace.md
    ├── implementation-slice-runtime-summary-and-direct-eval.md
    ├── implementation-slice-thread-list-and-turn-detail.md
    ├── implementation-slice-work-and-reconciliation-workspace.md
    ├── p0-delivery-plan.md
    ├── service-contracts.md
    ├── desktop-stack-recommendation.md
    ├── technical-architecture.md
    ├── thesis-guardrails.md
    ├── user-journeys.md
    └── workflows.md
```

## How To Use This Repo

Use the documents in this order:

1. Read [Constitution](docs/constitution.md).
2. Read [Requirements](docs/requirements.md).
3. Read [Capabilities](docs/capabilities.md).
4. Read [Domain Model](docs/domain-model.md).
5. Read [Service Contracts](docs/service-contracts.md).
6. Read [Desktop Information Architecture](docs/desktop-ia.md).
7. Read [Critical Workflows](docs/workflows.md).
8. Read [Common Lisp Capability Benchmark](docs/common-lisp-capability-benchmark.md).
9. Read [Thesis Guardrails](docs/thesis-guardrails.md).
10. Read [Feature Proposal Template](docs/feature-template.md).
11. Read [Desktop Capability Backlog](docs/desktop-capability-backlog.md).
12. Read the first concrete feature specs:
    [Environment Posture Home](docs/features/environment-posture-home.md),
    [Runtime Workspace](docs/features/runtime-workspace.md),
    [Direct Evaluation Surface](docs/features/direct-evaluation-surface.md).
13. Read the remaining P0 feature specs:
    [Structured Conversation Workspace](docs/features/structured-conversation-workspace.md),
    [Approval Inbox And Detail](docs/features/approval-inbox-and-detail.md),
    [Incident Workspace](docs/features/incident-workspace.md),
    [Work And Reconciliation Workspace](docs/features/work-and-reconciliation-workspace.md),
    [Global Attention Model](docs/features/global-attention-model.md),
    [Event Observation Surface](docs/features/event-observation-surface.md).
14. Read [Information Architecture](docs/information-architecture.md).
15. Read [Design System](docs/design-system.md).
16. Read [User Journey Specification](docs/user-journeys.md).
17. Read [Technical Architecture](docs/technical-architecture.md).
18. Read [Multi-Actor And Conversation Model](docs/multi-actor-and-conversation-model.md).
19. Read [Desktop Stack Recommendation](docs/desktop-stack-recommendation.md).
20. Read [Integration And Event Transport Recommendation](docs/integration-transport-recommendation.md).
21. Read [Electron Desktop Core Specification](docs/electron-desktop-core-specification.md).
22. Read [Electron Preload Bridge Specification](docs/electron-preload-bridge-specification.md).
23. Read [Electron Main Process Connectivity Specification](docs/electron-main-process-connectivity-specification.md).
24. Read [Electron Renderer State Specification](docs/electron-renderer-state-specification.md).
25. Read [Preload Bridge TypeScript Interface](docs/preload-bridge-typescript-interface.md).
26. Read [Protocol Message Schemas](docs/protocol-message-schemas.md).
27. Read [Core Entity DTOs](docs/core-entity-dtos.md).
28. Read [Service Host Implementation Plan](docs/service-host-implementation-plan.md).
29. Read [Electron App Skeleton Plan](docs/electron-app-skeleton-plan.md).
30. Read [P0 Delivery Plan](docs/p0-delivery-plan.md).
31. Read [Implementation Slice: Host Health And Binding](docs/implementation-slice-host-health-and-binding.md).
32. Read [Implementation Slice: Environment Posture Home](docs/implementation-slice-environment-posture-home.md).
33. Read [Implementation Slice: Thread List And Turn Detail](docs/implementation-slice-thread-list-and-turn-detail.md).
34. Read [Implementation Slice: Runtime Summary And Direct Eval](docs/implementation-slice-runtime-summary-and-direct-eval.md).
35. Read [Implementation Slice: Approval Inbox And Detail](docs/implementation-slice-approval-inbox-and-detail.md).
36. Read [Implementation Slice: Event Subscription And Attention](docs/implementation-slice-event-subscription-and-attention.md).
37. Read [Implementation Slice: Incident Workspace](docs/implementation-slice-incident-workspace.md).
38. Read [Implementation Slice: Work And Reconciliation Workspace](docs/implementation-slice-work-and-reconciliation-workspace.md).
39. Read [Implementation Slice: Event Observation Surface](docs/implementation-slice-event-observation-surface.md).

That sequence matters. The constitution constrains the requirements. The requirements constrain the capability model. The capability model constrains the domain and service model. The domain and service model constrain desktop architecture and workflows.

## Source Basis

These specs are derived from the current `sbcl-agent` architecture and documentation, especially:

- the environment-first framing
- the three truth domains
- the conversation/runtime/workflow ownership rule
- the public service interface direction
- the capability translation rule of preserving powers while discarding old metaphors
- the service event contract
- the governed mutation lifecycle
- the safety and risk model

## Next Step

The specification foundation is now broad enough to move into implementation planning and app skeleton work.

The immediate implementation sequence should be:

- establish the Electron app skeleton and desktop shell
- implement service-host connectivity and environment binding first
- deliver the P0 implementation slices in dependency order
- keep every implementation pass aligned to the constitution, thesis guardrails, and feature specs
