# Feature Proposal Template

## Purpose

Use this template for any major product, UX, architecture, or capability proposal in `sbcl-agent-ux`.

This template exists to make thesis review operational. A proposal is incomplete if it explains only the feature and not how the feature relates to the `sbcl-agent` thesis.

## Template

### Title

Short, specific feature name.

### Summary

One or two paragraphs describing the proposed feature and why it exists.

### Problem

What user, product, or system problem does this solve?

### User Outcome

What should a developer, engineer, or operator be able to do better after this feature exists?

### Primary Entities

Which domain entities are involved?

Select from:

- environment
- runtime
- source asset
- thread
- message
- turn
- operation
- artifact
- work-item
- workflow record
- incident
- task
- worker
- agent
- policy
- approval request
- event

### Truth Domains Affected

Which truth domains does the feature touch?

- source truth
- image truth
- workflow truth

### Service Families Affected

Which public service families does the feature depend on or extend?

- environment service
- conversation service
- runtime service
- workflow service
- artifact service
- incident service
- task service
- approval service

### Thesis Classification

Classify the proposal as one of:

- thesis-strengthening
- thesis-compatible
- thesis-risking
- thesis-breaking

### Thesis Review

Answer all of the following:

1. How does this feature strengthen or preserve the environment-first model?
2. How does it treat source, image, and workflow truth?
3. How does it preserve or improve governed execution?
4. How does it avoid regressing into file-centric or transcript-centric interaction?
5. Does it make the `sbcl-agent` thesis more legible to the user?

### Regression Risk

Identify any risk that this feature could reintroduce old SDLC assumptions.

Common risks:

- source-first collapse
- runtime hidden as backend
- workflow as decoration
- chat as universal container
- approval as generic confirmation
- success as completion messaging
- human-only foreground assumptions

### Capability Benchmark Impact

Does this feature help the desktop app:

- match classic Lisp development power
- exceed it in environment and governance terms
- or merely add surface complexity?

### UX Shape

Describe the intended UX at a structural level.

Include:

- entry points
- primary view or workspace
- linked entity traversal
- live event behavior
- attention model implications
- primary surface ownership
- inspector and supporting-context placement
- collapse behavior for transient navigation or support panels
- explicit scroll ownership

### Primary View

Describe the main workspace or primary surface explicitly.

State:

- what the dominant work surface is
- what selected detail sits directly below or beside it
- what context belongs in inspector or collapsible support surfaces
- which region owns scroll as the main work object grows

Also answer:

1. What is the dominant work surface?
2. Which information is always visible?
3. Which information moves into inspector or selected detail?
4. What can collapse without harming orientation?
5. What should remain fixed while the main work object grows?

### Command And Query Shape

Describe the likely service-level interface:

- primary queries
- primary commands
- key returned state
- key event emissions

### Primary Queries

List the primary read/query calls that power the feature.

### Primary Commands

List the primary command/mutation calls that power the feature.

### Acceptance Criteria

Provide concrete acceptance criteria.

These must include:

- user-visible outcome
- domain or service correctness
- thesis-alignment check
- space and focus check
- scroll ownership check when the feature includes growing content
- metadata disclosure check when the feature includes dense records or transcripts

### Open Questions

List any unresolved design, service, or workflow questions.

## Proposal Quality Rule

A feature proposal should be rejected or revised if:

- thesis classification is omitted
- regression risk is ignored
- truth domains are not identified
- governed execution implications are unclear
- the proposal mainly describes familiar UI without domain reasoning
- the proposal does not identify the primary work surface
- the proposal leaves scroll behavior to page-default behavior
- the proposal depends on repeated explanatory text instead of structural clarity
