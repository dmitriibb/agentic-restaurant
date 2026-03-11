# Order Lifecycle

## States

- `SUBMISSION_RECEIVED`
- `ACCEPTED`
- `REJECTED`

## Transitions

- `SUBMISSION_RECEIVED -> ACCEPTED`
  - when token is valid, request data is valid, all menu items resolve, and persistence succeeds
- `SUBMISSION_RECEIVED -> REJECTED`
  - when authentication fails, validation fails, menu items do not resolve, or persistence cannot complete

## Notes

- The first implementation only needs to persist accepted orders.
- Rejected submissions are response outcomes, not long-lived records, unless audit requirements appear later.
