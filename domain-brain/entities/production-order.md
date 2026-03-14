# ProductionOrder

## Definition

The operational view of an accepted order owned by `production-service`.

## Canonical Fields

- `orderId: long`
- `externalRequestId: string`
- `userId: long`
- `userDisplayName: string?`
- `status: string`
- `totalItemCount: int`
- `readyItemCount: int`
- `blockedItemCount: int`
- `createdAt: timestamp`
- `updatedAt: timestamp`
- `readyAt: timestamp?`
- `version: long`

## Ownership

- Source of truth: `production-service`
- Persistence: MySQL

## Notes

- `ProductionOrder` is keyed by the `orderId` created in `orders-service`.
- The status is derived from the current `ProductionItem` states.
- `READY` means all active production items are ready.
