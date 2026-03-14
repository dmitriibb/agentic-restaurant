# Production Item Lifecycle

## States

- `QUEUED`
- `IN_PROGRESS`
- `BLOCKED`
- `READY`
- `CANCELLED`

## Transitions

- `QUEUED -> IN_PROGRESS`
  - when a staff member picks up the item
- `QUEUED -> BLOCKED`
  - when a problem is detected before work starts
- `QUEUED -> CANCELLED`
  - when the item or order is cancelled before work begins
- `IN_PROGRESS -> READY`
  - when preparation is complete
- `IN_PROGRESS -> BLOCKED`
  - when work cannot continue
- `IN_PROGRESS -> CANCELLED`
  - when supervisory cancellation removes the item from work
- `BLOCKED -> IN_PROGRESS`
  - when the issue is resolved and staff resumes work
- `BLOCKED -> CANCELLED`
  - when the item is abandoned or cancelled

## Notes

- `READY` is terminal in the first version.
- Mutations must use conditional updates or optimistic locking to prevent double claims and stale writes.
- Duplicate lifecycle events are ignored through idempotency checks.
