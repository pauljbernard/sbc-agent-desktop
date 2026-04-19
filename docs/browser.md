---
title: Browser
---

# Browser

The Browser workspace is the live-system browser for the `sbcl-agent` environment.

It is the closest thing in the desktop to a Common Lisp image browser:

- systems
- packages
- symbols
- variables
- classes and methods
- runtime objects
- source
- xref
- documentation
- governance and linked conversations

## What The Browser Is For

Use Browser when you need to inspect the living system directly rather than reason from files alone.

Typical tasks:

- find a loaded system
- inspect a package and its visible symbols
- inspect a function, variable, class, or generic function
- view source attached to runtime entities
- explore callers, methods, or semantic references
- review documentation or governance linkage for a selected entity

## How The Pages Work

Each Browser subpage follows the same structure:

1. a searchable, sortable, pageable table at the top
2. selected-row detail below
3. actions and supporting context below that

## Source Viewing

Source panels in Browser are Lisp-aware:

- code is formatted for readability
- parentheses are colorized by depth
- the view is vertically scrollable

Parenthesis color settings are available in [Configuration](configuration.md).

## Recommended Workflow

1. start in `Systems` to confirm the loaded environment
2. move into `Packages` or `Symbols`
3. inspect detail and source
4. jump into `XREF` or `Documentation`
5. use linked context to move into Conversations, Execution, or Evidence as needed

## Important Distinction

Browser is not a detached file tree.

It is a semantic browser over a live Lisp environment and its governed context.
