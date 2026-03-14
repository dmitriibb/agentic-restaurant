# ProductionItem

## Definition

One executable kitchen work unit derived from an accepted order line quantity and owned by `production-service`.

## Canonical Fields

- `id: string`
- `orderId: long`
- `lineNumber: int`
- `unitSequence: int`
- `sourceItemKey: string`
- `menuItemId: long`
- `menuItemName: string snapshot`
- `stationKey: string`
- `status: string`
- `claimedByUserId: long?`
- `claimedByDisplayName: string?`
- `blockedReason: string?`
- `createdAt: timestamp`
- `updatedAt: timestamp`
- `claimedAt: timestamp?`
- `readyAt: timestamp?`
- `version: long`

## Ownership

- Source of truth: `production-service`
- Persistence: MySQL

## Notes

- One `ProductionItem` represents exactly one unit of work with quantity `1`.
- A submitted order line with quantity `N` expands into `N` production items.
- `sourceItemKey` must stay unique for `(orderId, lineNumber, unitSequence)`.
