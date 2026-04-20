# sbcl-agent-desktop

`sbcl-agent-desktop` is the specification-first macOS desktop frontend program for the capabilities and services implemented in `sbcl-agent`.

This repository does not begin with screens. It begins with the operating model that the frontend must faithfully express:

- the product is a persistent environment, not a chat shell and not an IDE clone
- source truth, image truth, and workflow truth are distinct and must remain explicit
- governance is intrinsic to the system, not layered on after the fact
- the shell, REPL, conversation runtime, and future UI are all presentation surfaces over the same governed service layer

## Frontend Role

This repository defines the future UX as the frontend for the `sbcl-agent` repository.

That means the frontend must not invent a simpler product story than the one `sbcl-agent` already articulates and implements. Its job is to make the underlying system legible, powerful, and governable for developers and engineers.

The frontend is therefore a presentation adapter over the `sbcl-agent` environment kernel and public services. It is not a separate application model.

The primary target is a native macOS desktop application for developers and engineers. The shell remains an important peer adapter, but this repository is defining the desktop product.

## Licensing

This repository is licensed under the [Apache License 2.0](LICENSES/APACHE-2.0.txt).

## The Shift It Must Accept

The frontend must start from the premise that software development is changing in a structural way.

`sbcl-agent` argues and implements a shift away from a purely source-first, file-proxy, after-the-fact reconstruction model toward an environment where:

- the live runtime is part of the engineering substrate
- humans and agents can inspect and mutate the same running system they are reasoning about
- workflow governance is captured during execution rather than reconstructed later
- conversation is durable and native, but not the only control surface
- evidence, approvals, incidents, and reconciliation are first-class engineering objects

The frontend succeeds only if it helps users operate inside that shift without collapsing back into older metaphors.

## Documentation Model

This repository now separates documentation into two domains:

- [`docs/`](docs/index.md): user-facing GitHub Pages documentation for developers and engineers using the desktop application
- [`eng-docs/`](eng-docs/constitution.md): engineering documentation for designing, implementing, and extending the application itself

Use `docs/` when you want to understand how to operate the desktop product.

Use `eng-docs/` when you want architecture, specifications, delivery plans, implementation slices, or internal design rationale.

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
sbcl-agent-desktop/
├── LICENSE.md
├── README.md
├── docs/
│   ├── _config.yml
│   ├── index.md
│   ├── getting-started.md
│   ├── desktop-tour.md
│   ├── browser.md
│   ├── conversations.md
│   ├── execution.md
│   ├── recovery.md
│   ├── evidence.md
│   ├── configuration.md
│   ├── live-connection.md
│   ├── troubleshooting.md
│   └── faq.md
└── eng-docs/
    ├── constitution.md
    ├── requirements.md
    ├── capabilities.md
    ├── technical-architecture.md
    ├── design-system.md
    ├── desktop-ia.md
    ├── service-contracts.md
    ├── features/
    └── implementation-slices...
```

## How To Use This Repo

If you are evaluating or using the product:

1. Start at the [user documentation home](docs/index.md).
2. Read [Getting Started](docs/getting-started.md).
3. Take the [Desktop Tour](docs/desktop-tour.md).
4. Use the workspace guides for Browser, Conversations, Execution, Recovery, Evidence, and Configuration.
5. Use [Troubleshooting](docs/troubleshooting.md) and [FAQ](docs/faq.md) as needed.

If you are building or extending the product:

1. Start with the [engineering constitution](eng-docs/constitution.md).
2. Read [requirements](eng-docs/requirements.md), [capabilities](eng-docs/capabilities.md), and the [technical architecture](eng-docs/technical-architecture.md).
3. Continue into [design system](eng-docs/design-system.md), [desktop IA](eng-docs/desktop-ia.md), feature specs, and implementation slices.

That separation is intentional. User docs explain how to operate the desktop. Engineering docs explain how to design and implement it.

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

The repository is now past pure specification and skeleton work.

The immediate implementation priorities are:

- keep live adapter contracts aligned with the evolving `sbcl-agent` service layer
- preserve shell parity while moving more UX behavior onto stable service-backed surfaces
- keep the service tier distinct from direct shell execution paths while preserving the shell as a peer operator surface
- continue tightening documentation, naming, and metadata consistency across both repositories
- keep implementation passes aligned to the constitution, thesis guardrails, and feature specs
