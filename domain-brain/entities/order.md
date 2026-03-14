# Order

## Definition

An immutable record of a submitted basket owned by `orders-service`.
Operational production progress for that order is tracked separately by `production-service`.

## Canonical Fields

- `id: long`
- `externalRequestId: string`
- `userId: long`
- `submissionStatus: string`
- `productionStatus: string?` (nullable projection when a read model needs operational state)
- `totalAmount: decimal`
- `userDisplayName: string?`
- `createdAt: timestamp`
- `lines: OrderLine[]`

## OrderLine Fields

- `lineNumber: int`
- `menuItemId: long`
- `menuItemName: string snapshot`
- `unitPrice: decimal snapshot`
- `quantity: int`
- `lineTotal: decimal`

## Ownership

- Source of truth for order payload: `orders-service`
- Source of truth for production progression: `production-service`
- Persistence: MySQL

## Notes

- The order stores item snapshots so historical orders remain stable after menu changes.
- Multiple input lines may reference the same menu item id.
- `orders-service` publishes production handoff events only after the order commit succeeds.
- Production tracking expands each line quantity into per-unit `ProductionItem` records without mutating the original order lines.
