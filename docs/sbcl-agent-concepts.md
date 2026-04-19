---
title: sbcl-agent Concepts
---

# sbcl-agent Concepts

This page explains the main operating concepts behind `sbcl-agent`.

If you understand these concepts, the desktop will make much more sense.

## Environment

The environment is the root object.

It is not just:

- a project folder
- a shell session
- a transcript
- a deployment target

It is the larger engineering world in which runtime, conversations, approvals, incidents, work-items, source, and evidence all exist together.

## Thread

A thread is a durable conversation context.

Threads are not just UI tabs. They preserve:

- intent
- continuity
- linked entities
- runtime-adjacent engineering context

## Turn

A turn is a specific supervised step inside a thread.

A turn can carry:

- operations
- artifacts
- approvals
- incidents
- work-items

This is important because it means conversation state can be treated as an engineering object, not just text.

## Operation

An operation is a concrete action performed in the environment.

Examples include:

- evaluation
- mutation
- approval decision
- source staging
- reload behavior

Operations matter because the system should be able to explain what happened, not just show output text.

## Artifact

An artifact is a durable result worth retaining.

Artifacts provide evidence and continuity. They are not just temporary command output.

## Work-Item

A work-item is governed engineering work.

It is where:

- waiting state
- validation burden
- reconciliation burden
- closure posture

become explicit.

## Approval

An approval is not a modal dialog.

It is a governed decision point attached to real engineering context.

That context should include:

- requested action
- rationale
- consequence summary
- linked runtime or workflow entities

## Incident

An incident is a durable recovery object.

It allows the system to keep recovery obligations visible instead of treating failures as temporary console events.

## Evidence

Evidence is retained operational proof.

This includes:

- artifacts
- event streams
- replayable environment history

## Browser

Browser is the semantic inspection surface over the live Lisp environment.

It is where you move through:

- systems
- packages
- symbols
- variables
- classes
- methods
- source
- xref
- documentation

## Listener

The listener is still a primary control surface.

In Lisp, direct evaluation matters. `sbcl-agent` keeps that directness, but it also attaches governed context to the resulting operations.

## Why These Concepts Matter

Contemporary developers are used to tool categories such as:

- editor
- terminal
- debugger
- CI system
- issue tracker
- deployment dashboard

`sbcl-agent` does not erase those needs. It re-anchors them around an environment model where those concerns are kept closer together.

That is why the desktop does not feel like a conventional IDE clone.
