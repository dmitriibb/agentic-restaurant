# Order Lifecycle

## States

- `SUBMISSION_RECEIVED`
- `ACCEPTED`
- `REJECTED`
- `QUEUED`
- `IN_PROGRESS`
- `BLOCKED`
- `READY`
- `CANCELLED`

## Transitions

- `SUBMISSION_RECEIVED -> ACCEPTED`
  - when token is valid, request data is valid, all menu items resolve, and persistence succeeds
- `SUBMISSION_RECEIVED -> REJECTED`
  - when authentication fails, validation fails, menu items do not resolve, or persistence cannot complete
- `ACCEPTED -> QUEUED`
  - when `production-service` materializes production work for the accepted order
- `QUEUED -> IN_PROGRESS`
  - when any production item is picked up by staff
- `QUEUED -> BLOCKED`
  - when an issue blocks an item before active work begins
- `IN_PROGRESS -> BLOCKED`
  - when any active production item becomes blocked and the order is not yet ready
- `BLOCKED -> IN_PROGRESS`
  - when blocked items resume and the order still has active work
- `QUEUED -> READY`
  - when all active items become ready without an intermediate in-progress phase
- `IN_PROGRESS -> READY`
  - when all active items are ready
- `BLOCKED -> READY`
  - when all active items are ready after the blockage is resolved
- `QUEUED -> CANCELLED`
  - when all items are cancelled before work begins
- `IN_PROGRESS -> CANCELLED`
  - when all remaining active items are cancelled
- `BLOCKED -> CANCELLED`
  - when all remaining active items are cancelled while blocked

## Notes

- `ACCEPTED` remains owned by `orders-service`.
- `QUEUED`, `IN_PROGRESS`, `BLOCKED`, `READY`, and `CANCELLED` are operational states derived by `production-service`.
- Rejected submissions are response outcomes, not long-lived records, unless audit requirements appear later.
