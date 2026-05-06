---
title: Configuration
---

# Configuration

The Configuration workspace is for desktop preferences and presentation-level behavior.

## Preferences

The first configuration surface is `Preferences`.

Current preference areas include:

- theme selection
- system, light, and dark theme behavior
- Lisp code-view color settings
- desktop-surface presentation scaling
- shell chrome and code-surface readability preferences

## Theme System

The desktop supports:

- `System`
- `Light`
- `Dark`

`System` follows the host operating-system theme when available.

## Lisp Code View

The desktop includes a configurable Lisp source view with:

- formatted source display
- parenthesis depth colorization
- adjustable colors by nesting depth

This is useful when working with Browser source views and any other code-oriented surfaces in the desktop.

## Desktop Surface

The desktop also exposes shell-surface preferences for how the application reads at a distance.

Current desktop-surface controls include values such as:

- tooltip scale
- control icon scale
- dock icon scale
- conversation text scale
- source-code text scale

These settings matter because the application is now a denser shell with rails, floating panels, and multiple concurrent surfaces rather than a single narrow page view.

## Goal

Configuration should make the desktop easier to operate without turning preferences into a second engineering domain.
