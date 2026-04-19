---
title: Live Connection
---

# Live Connection

The desktop can run in mock mode or connect to a real `sbcl-agent` host.

## Modes

- `mock`: useful for UI development and UX review
- `live`: intended to talk to a real environment host

## Typical Live Environment Variables

Socket-based launch:

```bash
SBCL_AGENT_ADAPTER=live
SBCL_AGENT_TRANSPORT=socket
SBCL_AGENT_SOCKET_ENDPOINT=127.0.0.1:4017
npm run dev
```

Pipe-based launch:

```bash
SBCL_AGENT_ADAPTER=live
SBCL_AGENT_TRANSPORT=pipe
SBCL_AGENT_PIPE_COMMAND=./bin/sbcl-agent
npm run dev
```

## What To Check First

- host posture in the footer
- binding posture in the footer
- whether the environment is mock-backed or live-backed
- whether Browser, Conversations, and Execution surfaces are returning real data

## If The Connection Fails

Go to [Troubleshooting](troubleshooting.md).

In practice, most failures come from:

- host process not running
- wrong transport mode
- wrong socket endpoint or pipe command
- environment not bound yet
