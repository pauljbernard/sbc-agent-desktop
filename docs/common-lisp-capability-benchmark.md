# Common Lisp Capability Benchmark

## Purpose

This document compares the planned `sbcl-agent` macOS desktop application against the enduring capabilities associated with major Common Lisp development environments, especially:

- LispWorks
- SLIME
- Allegro CL

The purpose is not to copy those systems.

The purpose is to ensure the `sbcl-agent` desktop application delivers a world-class Common Lisp engineering capability set while remaining aligned with its actual architecture:

- environment-first
- image-native
- workflow-governed
- agentic-first
- multi-actor

This benchmark should also now be read alongside the current Codex app model as a comparative reference for multi-agent and multi-conversation supervision, while remaining grounded in official `sbcl-agent` principles rather than in Codex product parity.

## Benchmarking Rule

We are benchmarking capabilities, not UI metaphors.

The question is not:

- how closely can the desktop app resemble LispWorks, SLIME, or Allegro?

The question is:

- what powers do elite Lisp environments provide that serious Common Lisp development still requires?
- how should those powers be expressed in an `sbcl-agent` environment where runtime, conversation, workflow, artifacts, and agents coexist?

## Why These Systems Matter

Even though they are file-centric and editor-centric, LispWorks, SLIME, and Allegro CL remain important reference points because they each proved the value of:

- direct runtime intimacy
- symbolic introspection
- incremental development
- condition and debugger workflows
- fast feedback loops
- rich environment tooling for serious Common Lisp work

If `sbcl-agent-ux` fails to deliver comparable engineering power, it will not be world class, regardless of how strong its agentic model is.

## Additional Comparative Reference: Codex App

The official OpenAI Codex app is also relevant as a comparative reference because it explicitly validates several newer development patterns:

- multiple parallel agents
- separate threads for ongoing work
- long-running supervised tasks
- background automation

That reference matters because it confirms the market and tooling direction toward concurrent, supervised agentic development.

It does not replace the Lisp benchmark. It complements it.

The correct interpretation is:

- LispWorks, SLIME, and Allegro define the depth baseline for serious Lisp development power
- the Codex app helps validate the operating model for multi-thread, multi-conversation, multi-actor development
- `sbcl-agent` must integrate both while preserving its own environment-first and governance-first thesis

## Architectural Constraint

The benchmark must be interpreted through the `sbcl-agent` constitution.

That means:

- environment remains the root object
- source truth, image truth, and workflow truth remain distinct
- conversation is native but not total
- governance is intrinsic
- the app is a desktop presentation layer over governed services
- classic IDE surface patterns do not define the product architecture

## Capability Classes

### Class 1: Must Match Or Exceed

These are table-stakes capabilities for a serious Lisp development environment.

- evaluating code in context
- runtime inspection
- symbol and package navigation
- caller and callee visibility
- incremental redefinition
- condition and failure inspection
- fast live feedback

### Class 2: Must Transform

These matter, but in `sbcl-agent` they need a better form than classic IDEs provided.

- debugger becomes incident and recovery workspace
- inspector becomes queryable runtime graph
- notes panel becomes validation and evidence stream
- project/session becomes persistent environment
- human-only tooling becomes human-agent shared environment work

### Class 3: Must Deliberately Diverge

These are real strengths of older tools that should not become architectural anchors here.

- file buffer as primary truth
- editor pane layout as product model
- single foreground interaction as default assumption
- transcript-free, workflow-free mutation
- local ad hoc state as the only authority

## Benchmark Matrix

| Capability Area | Legacy Environments Provide | `sbcl-agent` Desktop Target | Expected Standard |
| --- | --- | --- | --- |
| REPL and listener | Strong direct eval and interactive development | Direct eval remains first-class, but unified with governed execution and conversation | Match directness, exceed in governance and linkage |
| Inspector | Object and runtime introspection | Runtime graph, entity inspectors, linked evidence, conversation-aware inspection | Exceed in relationship visibility |
| Debugger and condition handling | Rich condition inspection and restart workflows | Incident workspace plus runtime context, policy, evidence, and recovery workflow | Match low-level power, exceed in governed recovery |
| Incremental redefinition | Live code update in running image | Governed live mutation with validation and reconciliation posture | Match speed, exceed in trust model |
| Symbol/package navigation | Strong symbolic navigation | Symbol, package, runtime, artifact, workflow, and turn relationship navigation | Exceed in cross-domain navigation |
| Compilation and notes | Compile/load feedback and notes | Validation streams, mutation evidence, and workflow-linked validation posture | Exceed in evidence and lifecycle framing |
| Source navigation | Strong file and definition navigation | Source remains accessible, but linked to runtime and workflow truth | Match source utility, exceed in truth linkage |
| Background awareness | Often limited or secondary | First-class tasks, workers, agent activity, and concurrent work posture | Exceed materially |
| Workflow governance | Usually external to IDE core | Native approvals, incidents, work-items, reconciliation, and evidence | Exceed materially |
| Multi-actor operation | Mostly human-only | Human, worker, tool, and agent participation visible in one environment | Exceed materially |
| Multi-thread and multi-conversation supervision | Usually weak or incidental | Environment-scoped orchestration of many active threads, turns, tasks, and agents | Exceed materially |

## Capability Analysis By Area

### 1. Direct Evaluation

Legacy strength:

- immediate evaluation in the live Lisp environment
- minimal friction for experimentation and repair

`sbcl-agent` requirement:

- preserve direct eval as an expert surface
- support governed execution when mutation is risky
- expose the result as operation and evidence where appropriate

Implication for the desktop app:

- the app needs a first-class execution surface
- execution cannot be hidden behind chat-only workflows
- evaluation must feel fast and native

### 2. Runtime Inspection

Legacy strength:

- ability to inspect objects, bindings, packages, and loaded definitions in a running image

`sbcl-agent` requirement:

- preserve runtime intimacy
- represent inspection as part of an environment graph
- connect inspected runtime state to turns, incidents, work-items, and artifacts where relevant

Implication for the desktop app:

- runtime workspace must be one of the strongest parts of the product
- this cannot be treated as an advanced side panel feature

### 3. Debugging And Condition Handling

Legacy strength:

- rich condition display
- stack inspection
- restart-driven recovery

`sbcl-agent` requirement:

- keep condition visibility and recovery power
- transform debugging into incident-centered governed recovery
- preserve resumability, evidence, and policy context

Implication for the desktop app:

- incidents are not just logs
- recovery must feel operational and precise
- if the app weakens restart-oriented reasoning, it regresses below the Lisp baseline

### 4. Symbolic Navigation

Legacy strength:

- moving through definitions, callers, packages, methods, and symbol relationships

`sbcl-agent` requirement:

- preserve symbolic navigation
- extend it across source, image, conversation, artifacts, and workflow

Implication for the desktop app:

- navigation quality is strategic, not incidental
- linked traversal must become a flagship capability

### 5. Incremental Development

Legacy strength:

- fast edit-eval-redefine loops

`sbcl-agent` requirement:

- preserve fast loops
- add approval, validation, and reconciliation when needed
- distinguish warm runtime success from durable engineering closure

Implication for the desktop app:

- the app must not make mutation feel bureaucratic in the common case
- but it must never make governed work invisible

### 6. Environment Feedback

Legacy strength:

- compile notes
- interactive feedback
- strong development loop awareness

`sbcl-agent` requirement:

- move from notes-only feedback toward evidence-bearing feedback
- show active operations, validation posture, incidents, and waiting states

Implication for the desktop app:

- activity and attention models are essential
- users must see what is happening now and what still needs closure

### 7. Multi-Conversation And Parallel Work

Legacy strength:

- limited support at best; usually not the center of the product

Codex-app comparative strength:

- explicit parallel agent work and thread supervision

`sbcl-agent` requirement:

- support concurrent threads, turns, tasks, workers, and future agents as first-class environment behavior
- preserve orientation, ownership, governance, and evidence across all of them

Implication for the desktop app:

- the app must act like a supervised concurrency environment, not like a single-thread assistant interface

## Current Planned Strengths

Based on the current spec set, the desktop app is already aiming to exceed classic IDEs in these areas:

- environment-level posture and orientation
- explicit workflow governance
- artifact and evidence visibility
- approval-aware mutation
- incident-centered recovery
- background task and worker visibility
- multi-actor operation
- service-level event streaming
- multi-thread and multi-actor supervision

These are not small improvements. They are the strongest reasons the product should not collapse back into editor metaphors.

## Required Capability Commitments

To remain world class for Common Lisp developers, the desktop app should explicitly commit to the following capability outcomes.

### Commitment 1: World-Class Runtime Introspection

The runtime workspace must become a flagship feature with:

- package and symbol navigation
- loaded definition inspection
- object and execution context inspection
- condition and incident linkage
- strong source-image relationship views

### Commitment 2: World-Class Live Development Loop

The app must preserve fast iteration through:

- direct eval
- low-friction runtime inspection
- incremental redefinition
- immediate result visibility

while adding:

- policy awareness
- validation posture
- reconciliation state

### Commitment 3: World-Class Failure And Recovery Tooling

The app must support serious Lisp debugging-grade workflows through:

- incident workspaces
- recovery context
- linked operation and turn detail
- visible wait and interruption states
- evidence-backed closure

### Commitment 4: World-Class Symbolic Navigation

The app must treat symbolic navigation as a top-tier product feature, not a convenience:

- package to symbol
- symbol to definition
- definition to callers and methods
- definition to runtime state
- runtime state to artifacts, work-items, and incidents

### Commitment 5: World-Class Environment Comprehension

The app must provide something older Lisp environments did not:

- one coherent view of source, image, and workflow truth
- active work posture
- agent and worker visibility
- governed mutation lifecycle visibility

### Commitment 6: World-Class Parallel Work Supervision

The app must support modern multi-threaded development through:

- many active conversations
- many active turns
- visible task and worker state
- explicit actor identity
- low-friction switching among concurrent contexts

## Planned Differentiators

The following differentiators should remain explicit and intentional:

### Differentiator 1: Environment Root Instead Of Editor Root

Older tools are often editor-centered. `sbcl-agent` is environment-centered.

### Differentiator 2: Governance As Core Capability

Older tools assume expert operator control. `sbcl-agent` must also support accountable mutation, approvals, and evidence.

### Differentiator 3: Multi-Actor Native Operation

Older tools assume a human operator in foreground control. `sbcl-agent` must make humans, workers, and agents legible together.

### Differentiator 4: Workflow Closure Beyond Runtime Success

Older tools often stop at “the runtime now works.” `sbcl-agent` must make validation and reconciliation part of the outcome model.

## Gap Checklist

The desktop application should be considered underpowered if any of these remain weak:

- runtime inspection is thinner than what serious Lisp users expect
- symbolic navigation is shallow or file-only
- incident and recovery flows are less precise than legacy debugger experiences
- direct eval is buried behind chat workflows
- mutation loops are too cumbersome for expert use
- source-image divergence is poorly exposed
- cross-domain navigation is slower than classic Lisp development tools
- the app assumes one foreground conversation at a time

## Product Rule

When comparing the desktop app to LispWorks, SLIME, and Allegro, the correct product test is:

1. Does the app preserve or exceed their best engineering powers?
2. Does it transform those powers into an environment-native, workflow-governed, agentic-first form?
3. Does it avoid reintroducing file-centric and editor-centric architecture as the hidden default?

If the answer to any of these is no, the design is not yet good enough.
