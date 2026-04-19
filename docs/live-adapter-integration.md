# Live Adapter Integration

The Electron desktop now has two host-adapter modes:

- `mock` (default)
- `live`

## Environment Variables

Use these when launching the desktop in live mode:

```bash
SBCL_AGENT_ADAPTER=live
SBCL_AGENT_TRANSPORT=socket
SBCL_AGENT_SOCKET_ENDPOINT=127.0.0.1:4017
node node_modules/electron-vite/bin/electron-vite.js dev
```

Or for a future pipe-based bridge:

```bash
SBCL_AGENT_ADAPTER=live
SBCL_AGENT_TRANSPORT=pipe
SBCL_AGENT_PIPE_COMMAND=./bin/sbcl-agent
node node_modules/electron-vite/bin/electron-vite.js dev
```

## Current State

The live adapter is intentionally a contract seam, not a finished transport bridge.

What exists now:

- adapter selection in `src/main/host-adapter.ts`
- a dedicated `LiveSbclAgentHostAdapter`
- transport mode resolution for `socket` and `pipe`
- persisted desktop preferences shared with both adapter modes

What remains:

- implement request/response transport for the public service envelope
- map service query operations to the live contract names
- map governed commands to the live command boundary
- connect the cursor-based event stream contract for activity updates

## Contract Sources

The live adapter should be implemented against the real `sbcl-agent` service boundary documented in:

- `sbcl-agent/docs/public-service-interfaces.md`
- `sbcl-agent/docs/service-event-contract.md`
- `sbcl-agent/tests/service-contracts.lisp`

The UX should treat these contracts as the canonical integration surface rather than shell internals.
