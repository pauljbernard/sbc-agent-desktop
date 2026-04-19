# Protocol Message Schemas

## Purpose

This document defines the first concrete JSON schema shapes for messages exchanged between:

- the Electron main process
- the `sbcl-agent` service host

It builds on the external protocol specification and makes the message model concrete enough for implementation.

## Design Goals

The schemas must:

- map cleanly onto the `sbcl-agent` service envelope model
- preserve explicit binding
- support both control-plane and event-plane traffic
- remain transport-neutral
- support replay and reconnect

## Control Plane Schemas

### Request Schema

```json
{
  "protocol_version": 1,
  "request_id": "string",
  "message_type": "request",
  "binding": {
    "environment_id": "string",
    "session_id": "string|null"
  },
  "target": {
    "domain": "string",
    "operation": "string"
  },
  "payload": {}
}
```

Required fields:

- `protocol_version`
- `request_id`
- `message_type`
- `target`

Optional but usually required in practice:

- `binding`
- `payload`

### Response Schema

```json
{
  "protocol_version": 1,
  "request_id": "string",
  "message_type": "response",
  "response": {
    "contract_version": 1,
    "domain": "string",
    "operation": "string",
    "kind": "query|command",
    "status": "ok|awaiting_approval|rejected|error",
    "data": {},
    "metadata": {}
  }
}
```

## Event Plane Schemas

### Subscribe Schema

```json
{
  "protocol_version": 1,
  "message_type": "subscribe",
  "binding": {
    "environment_id": "string"
  },
  "subscription": {
    "after_cursor": 0,
    "family": "string|null",
    "visibility": "string|null"
  }
}
```

### Event Schema

```json
{
  "protocol_version": 1,
  "message_type": "event",
  "event": {
    "cursor": 0,
    "kind": "string",
    "timestamp": "ISO-8601 string",
    "family": "string",
    "entity_id": "string|null",
    "thread_id": "string|null",
    "turn_id": "string|null",
    "visibility": "string|null",
    "payload": {},
    "metadata": {},
    "run_id": "string|null",
    "operation_id": "string|null",
    "work_item_id": "string|null",
    "incident_id": "string|null",
    "artifact_id": "string|null",
    "task_id": "string|null",
    "worker_id": "string|null"
  }
}
```

### Subscription Ack Schema

```json
{
  "protocol_version": 1,
  "message_type": "subscription_ack",
  "subscription": {
    "environment_id": "string",
    "after_cursor": 0,
    "family": "string|null",
    "visibility": "string|null"
  }
}
```

## Error Schema

```json
{
  "protocol_version": 1,
  "request_id": "string|null",
  "message_type": "error",
  "error": {
    "code": "string",
    "category": "client|transport|protocol|service|host",
    "message": "string",
    "details": {}
  }
}
```

## Health Schema

### Health Request

```json
{
  "protocol_version": 1,
  "request_id": "string",
  "message_type": "request",
  "target": {
    "domain": "host",
    "operation": "health"
  },
  "payload": {}
}
```

### Health Response

```json
{
  "protocol_version": 1,
  "request_id": "string",
  "message_type": "response",
  "response": {
    "contract_version": 1,
    "domain": "host",
    "operation": "health",
    "kind": "query",
    "status": "ok",
    "data": {
      "host_state": "ready",
      "supported_contract_version": 1,
      "supported_protocol_version": 1
    },
    "metadata": {}
  }
}
```

## Schema Rules

### Rule 1: Snake Case On The Wire

Protocol fields should use snake_case consistently.

### Rule 2: Explicit Nullability

Optional ids that may be absent should either be omitted or explicitly set to `null`, but the implementation should choose one convention consistently.

Recommended initial rule:

- include known fields and use `null` when no value exists

### Rule 3: DTOs In `data`, Not Ad Hoc Fields

Domain payloads should remain inside `response.data`, not spill into top-level message fields.

### Rule 4: Version Fields Are Mandatory

Both protocol and service contract versioning must remain explicit.

## Initial Operation Targets

Recommended first targets:

- `host.health`
- `host.current_binding`
- `environment.summary`
- `environment.status`
- `conversation.thread_list`
- `conversation.thread_detail`
- `conversation.turn_detail`
- `runtime.summary`
- `runtime.eval`
- `approval.approve`
- `approval.deny`

## Acceptance Criteria

The schema set is acceptable when:

1. control and event messages are unambiguous
2. message schemas map cleanly onto service envelopes
3. replay and reconnect semantics can be implemented from the schemas alone
4. host, protocol, and service errors are distinguishable
5. the same schemas can be used on macOS and Windows transports unchanged
