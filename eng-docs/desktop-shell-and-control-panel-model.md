# Desktop Shell And Control Panel Model

## Purpose

This document defines the next structural step for `sbcl-agent-ux`.

The current product already does meaningful work as an environment-oriented operational UI. It should not be discarded. It should, however, stop pretending to be the entire desktop shell for IntentOS.

The correct architectural move is:

- build a real desktop shell over the governed execution-kernel model
- preserve the current `sbcl-agent-ux` experience as the first hosted application inside that shell

In this model, the current application becomes the **control panel** for the broader system.

## Why This Shift Is Required

The existing UX shape still combines two concerns:

1. system-shell concerns
2. application-specific operational workflow concerns

That combination made sense when the product was primarily a front end for a standalone governed agent environment. It is no longer the right center of gravity if the target is an agentic operating system.

The constitution and requirements already require:

- a system shell rather than an application shell
- a workspace of governed executions and related system objects
- a desktop that does not remain a feature dashboard over ad hoc state

The live UX now proves that the environment-oriented operational model is valuable. It does not prove that the whole desktop should be identical to that control-plane experience.

## Revised Product Model

### Desktop Shell

IntentOS desktop shell is the top-level environment.

It owns:

- environment switching and desktop binding
- open execution surfaces
- window and panel orchestration
- global inspector
- object browser
- governance queue and attention posture
- display-surface management
- application launching and app lifecycle
- desktop-wide evidence and status posture

The shell is the operating context.

It must also be a proactive operating context.

That means the shell does not only react to user navigation. It may also:

- surface emerging attention before the user asks
- stage likely continuations
- recommend next governed actions
- monitor live conditions
- initiate governed recovery and resume posture

This is a fundamental operating-system difference, not a cosmetic assistant feature.

### Control Panel Application

The current `sbcl-agent-ux` application becomes the first hosted application inside the shell.

Its responsibilities become:

- environment posture and orientation
- operational overview
- approvals and blocked-work visibility
- incidents and recovery coordination
- evidence and artifact review
- conversation and workflow coordination
- guided next actions for the operator

It is the system control panel, not the whole operating system.

### Future Applications

Other hosted applications can then emerge on the same architecture, for example:

- runtime listener / Lisp workbench
- runtime browser
- package and platform manager
- compatibility app launcher and manager
- artifact explorer
- recovery console
- workflow control surface

These applications share the same kernel, service boundary, object model, and inspector.

## Core Distinction

### Shell Objects

The desktop shell should primarily reason about:

- environments
- execution surfaces
- windows
- displays
- hosted applications
- inspector targets
- governance pressure
- launchable capabilities
- proactive monitors
- staged continuations
- recommendations
- recovery proposals

### Control Panel Objects

The control panel should primarily reason about:

- current operational posture
- active continuation
- incidents
- approvals
- evidence
- workflow state
- current runtime and conversation context

Both sets are valid. They are not the same layer.

## Architectural Boundary

### Shell Responsibilities

The shell must provide:

- application discovery
- launch / open / restore behavior
- global object switching
- window and display routing
- global inspection
- desktop attention and governance posture
- desktop-wide proactive posture
- system-wide navigation across environments, executions, and apps

That proactive posture must remain governed.

The shell should expose proactive system behavior as:

- visible attention
- recommendations
- staged actions
- resumable continuations
- governed monitors
- recovery proposals

It must not expose proactivity as silent app magic.

### Application Responsibilities

A hosted application must provide:

- domain-specific presentation
- focused workflows
- richer context for a subset of system objects
- application-local navigation within that subset

Applications must not become shadow desktop shells.

## UX Consequences

### What Must Change

The current left-rail workspace taxonomy cannot remain the top-level desktop identity forever.

It is too application-shaped.

The next desktop should instead expose:

- shell-level app launching
- shell-level window and surface switching
- shell-level system posture
- shell-level inspector and object access
- shell-level proactive posture

The current Operate / Browser / Evidence / Recovery structure can remain, but as navigation inside the control panel application.

### What Should Be Preserved

The existing environment-first orientation work is valuable and should remain intact.

Preserve:

- environment posture landing
- operational brief
- attention pressure model
- evidence visibility
- recovery visibility
- structured next actions

Those become the initial experience of the control panel app after it is launched inside the shell.

## Service And Object Implications

The shell will likely need first-class read/command surfaces for:

- desktop application registry
- launchable application descriptors
- open surface inventory
- display/window inventory
- focused application
- focused execution surface
- desktop-wide inspector target
- staged proactive actions
- recommendation summaries
- monitor inventory
- recovery/resume proposals

The control panel can continue to consume:

- environment summary
- workspace summary
- desktop model
- incident detail
- approval detail
- workflow and artifact read models

But the shell should stop being represented only as one big control-panel read model.

## Migration Strategy

### Phase 1

Name the current application honestly as the control panel.

Required outcomes:

- specs distinguish desktop shell from control panel
- IA docs stop implying that the current workspace taxonomy is the entire desktop

### Phase 2

Introduce a desktop-shell frame above the current app.

Required outcomes:

- app launcher or application rail
- shell-level inspector and object access
- shell-level display and execution-surface switching

### Phase 3

Move the current workspace navigation under the control panel boundary.

Required outcomes:

- current navigation becomes app-internal
- shell navigation becomes system-object and app oriented

### Phase 4

Add second and third hosted applications.

This is where the architecture proves itself. If the system cannot host additional meaningful apps cleanly, the shell boundary is still wrong.

## Acceptance Criteria

This model is correctly implemented only when:

- the desktop is visibly a shell over multiple hosted apps or app-capable surfaces
- the current `sbcl-agent-ux` experience is clearly one hosted control-plane application
- shell-level inspection, switching, and governance do not depend on entering the control panel first
- shell-level proactive behavior is visible and governed rather than hidden inside the control panel
- conversation is one control medium among several, not the assumed center of the desktop
- new hosted applications can be introduced without expanding the control panel into a monolith again

## Design Review Questions

Every future desktop feature should answer:

1. Is this shell behavior or control-panel behavior?
2. Does this belong to the desktop as a whole or to the first hosted application?
3. If another application existed tomorrow, would this still be in the right layer?
4. Does this strengthen the operating-system metaphor or regress into a single-app dashboard?
