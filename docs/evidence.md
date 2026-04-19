---
title: Evidence
---

# Evidence

The Evidence workspace exists so artifacts and operational events can be inspected as engineering evidence, not incidental logs.

## What It Covers

- durable artifacts
- event observation and replay
- linkage from evidence back to runtime, work, and recovery

## Artifacts

Use artifacts when you need durable outputs:

- staged source changes
- generated evidence
- workflow-related outputs
- recovery-related artifacts

## Event Observation

Use event observation when you need to reconstruct what happened:

- visible events
- operator-facing events
- event family and visibility filters
- event payload and replay context

## Recommended Workflow

1. inspect the artifact table first
2. inspect selected artifact detail
3. use event observation when you need runtime or workflow reconstruction
4. move back into Recovery or Execution when evidence clarifies the next move

## Important Distinction

Evidence is not just debugging output.

It is retained operational proof attached to governed work.
