---
title: How sbcl-agent Works
---

# How sbcl-agent Works

This page explains `sbcl-agent` as an operating model, not just as a user interface.

If you come from a conventional stack, you are probably used to separating:

- editor
- terminal
- runtime
- CI
- deployment tooling
- tickets
- incident tooling

`sbcl-agent` is built on a different assumption:

- these are not separate realities
- they are different views over one engineering environment

## The Root Object Is The Environment

In `sbcl-agent`, the environment is the thing you are actually working in.

That environment includes:

- the live SBCL image
- loaded ASDF systems and components
- packages, symbols, variables, classes, generic functions, and runtime objects
- structured agent and human conversations
- approvals, incidents, and work-items
- artifacts, evidence, and event history

This matters because modern engineering work is no longer just file manipulation.

Agents can inspect, evaluate, mutate, stage, and explain work across multiple layers. Once that becomes true, the user needs a system that keeps those layers aligned instead of scattering them across disconnected tools.

## The System Keeps Three Realities Together

`sbcl-agent` tries to keep three realities in view at the same time:

1. source reality
2. runtime reality
3. workflow reality

### Source Reality

Source reality includes:

- files
- forms
- definitions
- documentation
- durable edits

### Runtime Reality

Runtime reality includes:

- what is currently loaded
- what symbols are visible
- what objects exist now
- what values, methods, and dispatch behavior exist now
- what direct evaluation does now

### Workflow Reality

Workflow reality includes:

- what thread is carrying the work
- what turn produced which action
- what approvals are waiting
- what incidents were raised
- what artifacts and evidence exist
- whether the work is actually complete

In a conventional SDLC, developers often move through these realities one at a time and reconstruct the links manually. `sbcl-agent` is designed to preserve those links as first-class system state.

## The Basic Operating Loop

A typical `sbcl-agent` loop looks like this:

1. inspect the current environment
2. identify the relevant runtime or source entity
3. continue or open the relevant conversation thread when coordination is needed
4. evaluate, inspect, or mutate through a governed operation
5. review approvals, incidents, or work-items created by that action
6. inspect evidence before closing the work

That is different from:

1. edit files
2. run a build
3. deploy somewhere
4. search through logs to understand what happened

The difference is not cosmetic. It changes where engineering truth lives and how quickly humans and agents can converge on that truth.

## Conversations Are Not Just Chat

A common mistake is to assume the agent layer is simply a transcript UI.

In `sbcl-agent`, conversations are structured engineering continuations.

Threads and turns can carry:

- linked runtime entities
- operations
- artifacts
- approvals
- incidents
- work-items

That means a conversation is not just "discussion about the work." It can be part of the durable record of how the work was inspected, changed, governed, and resolved.

## The Browser Is A Live Image Browser

The Browser workspace is intentionally close to the classic Lisp notion of a system browser.

It is where you inspect:

- systems
- packages
- symbols
- variables
- classes and methods
- runtime objects
- source
- xref
- documentation

This is one of the largest conceptual shifts for developers coming from file-first tooling. You do not begin from a directory tree because the system wants you to inspect what the environment actually is before assuming what the files probably mean.

## The Listener Remains Central

Common Lisp development is still deeply interactive.

`sbcl-agent` does not remove the REPL model. It extends it.

The listener remains the direct control surface for:

- evaluation
- immediate inspection
- runtime reasoning
- rapid correction

What changes is that the consequences of those actions can remain attached to:

- approvals
- artifacts
- incidents
- work-items
- structured turns

This is why the desktop should not be understood as "chat plus a browser." It is a governed interactive engineering shell.

## Governance Is Inside The Workflow

Traditional workflows often keep governance outside the engineering surface.

Examples:

- approval in a ticket
- audit in CI
- failure notes in incident tooling
- evidence in logs or attachments

`sbcl-agent` tries to keep governance inside the operating flow itself.

That is why approvals, incidents, reconciliation, and evidence are visible as native objects instead of hidden implementation details.

The goal is not bureaucracy. The goal is continuity:

- what was requested
- why it was allowed or blocked
- what happened
- what still needs closure

## Why This Matters For Agentic Development

As agent capability increases, the weak point in software development is no longer just code generation speed.

The weak points become:

- context fragmentation
- poor runtime visibility
- weak linkage between action and consequence
- weak governance continuity
- expensive post-hoc reconstruction

`sbcl-agent` is built for a world where agents can act, not just suggest.

Once agents can act, the engineering system has to preserve trust, inspectability, and closure. That is the purpose of the broader environment model.

## What Gets Better

When this model is working well, developers should get:

- faster understanding of the current environment
- less confusion about what is loaded and active
- tighter linkage between runtime and source
- durable engineering context instead of disposable transcripts
- clearer approval and recovery posture
- better evidence for what actually happened

## What You Still Keep From Traditional Development

This model does not reject:

- source control
- testing
- builds
- release management
- deployment

It changes their position in the workflow.

They are no longer the only places where engineering truth becomes visible.

## The Main Transition To Accept

The main transition is this:

You are no longer primarily editing text that later becomes a system.

You are operating inside a live engineering system where source, runtime, agent coordination, governance, and evidence are all part of the same working environment.
