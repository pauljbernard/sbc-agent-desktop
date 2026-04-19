---
title: Transition Guide
---

# Transition Guide

This guide is for developers who are fluent in conventional software development and need help understanding how to work effectively in an environment-first, agentic system.

## The Old Mental Model

Most developers start from something like:

- code
- build
- environment
- deploy

And then they layer on:

- chat tools
- CI logs
- tickets
- incident tools
- dashboards

That model trains you to treat the running environment as downstream from source code and to treat workflow state as external to development itself.

## The New Mental Model

In `sbcl-agent`, the better model is:

- environment
- source
- runtime
- conversation
- workflow
- evidence

You are not leaving source behind.

You are moving it into a larger engineering context.

## Direct Comparison

The practical difference looks like this:

| Traditional workflow | `sbcl-agent` workflow |
| --- | --- |
| Start from files | Start from the environment |
| Build to discover runtime truth | Inspect runtime truth directly |
| Use chat as separate discussion | Use threads and turns as structured engineering context |
| Handle approvals outside the flow | Keep approvals attached to the work |
| Reconstruct incidents from logs | Keep incidents and evidence as native objects |
| Treat environment as downstream target | Treat environment as the primary operating surface |

## How To Think Differently

### Instead Of: “Where Is The File?”

Ask:

- what environment am I in?
- what system or package am I inspecting?
- what thread or turn is carrying this work?
- what evidence or approval state already exists?

### Instead Of: “What Did The Log Say?”

Ask:

- what artifact was produced?
- what event sequence was retained?
- what operation happened?
- what workflow state changed?

### Instead Of: “What Should The Agent Generate?”

Ask:

- what environment truth should the human and agent share?
- what direct inspection surface should we use first?
- what governance needs to remain attached to the action?

## A Better Workflow

A more appropriate workflow for this system looks like:

1. establish the environment and current posture
2. inspect systems, packages, symbols, runtime objects, or source
3. continue work through structured threads and turns when conversation is useful
4. use the listener for direct runtime reasoning and execution
5. review approvals, work-items, and incidents as first-class engineering objects
6. inspect evidence before claiming closure

## Why Developers Struggle At First

Developers often expect:

- a file tree first
- a dashboard first
- a transcript first
- a conventional editor first

This desktop does not start there because the product thesis is different.

It starts with working surfaces that help you inspect and operate the environment directly.

## What Gets Better Over Time

Once you adopt the new model, several things improve:

- less context loss between runtime and source
- less duplication between conversation and engineering records
- more visible governance
- better continuity between action and consequence
- clearer recovery and closure state

## Recommended Learning Path

1. Read [Development Model](development-model.md).
2. Read [How sbcl-agent Works](how-sbcl-agent-works.md).
3. Read [sbcl-agent Concepts](sbcl-agent-concepts.md).
4. Read [Desktop Tour](desktop-tour.md).
5. Work through [Browser](browser.md), [Conversations](conversations.md), and [Execution](execution.md) in that order.
6. Use [Recovery](recovery.md) and [Evidence](evidence.md) once you need failure and proof workflows.

## The Main Habit To Change

Stop treating the environment as a downstream target.

Treat it as the place where engineering reality is inspected, modified, governed, and understood.
