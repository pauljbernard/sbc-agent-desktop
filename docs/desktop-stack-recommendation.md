# Desktop Stack Recommendation

## Decision

Use **Electron** as the desktop runtime and application shell.

Recommended stack:

- desktop runtime: Electron
- shared application language: TypeScript
- renderer framework: React
- desktop integration boundary: Electron main process + preload bridge
- `sbcl-agent` integration: local service boundary over IPC

## Why This Is The Chosen Direction

This product has a specific set of constraints:

- it must be a real desktop application, not a browser product
- it must support dense, custom, engineering-oriented interaction
- it must remain portable to Windows
- it must coordinate live event streams, many active contexts, and background work
- it must move fast enough to make the product real

Electron best serves those constraints when used with discipline.

The key architectural rule is:

- **Electron is the desktop container, not the product model**

## Electron vs .NET MAUI

### Electron Strengths

- one cross-platform desktop runtime for macOS and Windows
- strong ecosystem maturity for custom desktop tools
- flexible renderer for dense, highly tailored engineering UI
- natural fit for a local service-host architecture
- good support for event-heavy, multi-context desktop interaction

### Electron Risks

- easy to devolve into a web app in a window
- renderer can become hidden product authority if boundaries are weak
- browser metaphors can leak into the UX

### .NET MAUI Strengths

- strong .NET ecosystem alignment
- native-oriented application development model
- viable cross-platform story for macOS and Windows

### .NET MAUI Weaknesses For This Product

- less natural fit for a highly custom, multi-pane engineering environment
- macOS support relies on Mac Catalyst, which is not the same as a true AppKit-native product model
- weaker fit for the specific renderer flexibility this product needs
- more likely to produce a conventional desktop app shape than the environment shell we are defining

## Recommendation Outcome

For `sbcl-agent-ux`, Electron is the better choice.

Not because it is inherently cleaner, but because it better supports:

- a custom environment-first UX
- multi-thread and multi-conversation supervision
- fast cross-platform desktop delivery
- a renderer-driven visual layer over a local service-hosted architecture

## Required Guardrails For Electron

Electron is acceptable only if the implementation follows these guardrails:

### Guardrail 1: Main Process Owns Desktop Runtime Authority

The Electron main process should own:

- app lifecycle
- transport client lifecycle
- event subscription lifecycle
- platform integration
- persistent desktop orchestration

### Guardrail 2: Renderer Is Presentation-Focused

The renderer should own:

- workspaces
- entity views
- inspectors
- design-system rendering
- local interaction state

It should not own:

- raw `sbcl-agent` transport
- platform APIs
- hidden governance logic

### Guardrail 3: Preload Bridge Must Be Narrow

The preload layer should expose:

- typed APIs
- explicit commands
- explicit subscriptions

It should not expose broad Node or Electron powers to the renderer.

### Guardrail 4: Product Structure Must Not Follow Browser Metaphors

The application must not default to:

- page navigation as the product model
- dashboard SaaS layout as the product model
- chat-client hierarchy as the product model

The environment remains the root object.

## Why Not Other Alternatives

### Not SwiftUI/AppKit As The Product Core

Why not:

- strong for macOS-specific polish
- weak fit for Windows portability
- encourages platform lock-in at the product-core level

### Not .NET MAUI As The Product Core

Why not:

- respectable option
- but weaker fit for this product’s custom engineering-environment demands
- less compelling than Electron for a highly tailored, event-dense desktop shell

### Not Tauri As The Primary Choice

Why not:

- still webview-first
- lower maturity and ecosystem leverage than Electron for this product shape

## Chosen Architecture Shape

The chosen stack implies:

1. `sbcl-agent` remains the environment authority
2. Electron main process owns desktop runtime orchestration
3. preload provides a narrow secure bridge
4. React renderer renders the product UI from derived application state
5. platform differences remain in thin adaptation seams

## Acceptance Criteria

This recommendation is acceptable when:

1. the product core remains cross-platform
2. Electron is used without turning the app into a web frontend in practice
3. macOS is well served now without blocking a Windows port later
4. the renderer remains presentation-oriented
5. the resulting architecture preserves the `sbcl-agent` thesis and service-boundary rules
