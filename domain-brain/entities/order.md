# Order

## Definition

An immutable record of a submitted basket owned by `orders-service`.

## Canonical Fields

- `id: long`
- `externalRequestId: string`
- `userId: long`
- `status: string`
- `totalAmount: decimal`
- `createdAt: timestamp`
- `lines: OrderLine[]`

## OrderLine Fields

- `menuItemId: long`
- `menuItemName: string snapshot`
- `unitPrice: decimal snapshot`
- `quantity: int`
- `lineTotal: decimal`

## Ownership

- Source of truth: `orders-service`
- Persistence: MySQL

## Notes

- The order stores item snapshots so historical orders remain stable after menu changes.
- Multiple input lines may reference the same menu item id.
