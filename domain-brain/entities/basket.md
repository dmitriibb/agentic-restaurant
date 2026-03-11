# Basket

## Definition

A client-side working collection of menu items and quantities before submission as an order.

## Canonical Fields

- `items: BasketLine[]`
- `totalQuantity: int`
- `estimatedTotalAmount: decimal`

## BasketLine Fields

- `menuItemId: long`
- `name: string`
- `unitPrice: decimal`
- `quantity: int`

## Ownership

- Source of truth before submission: `orders-client`

## Notes

- Basket state is not persisted server-side in the initial version.
- Basket totals shown in the UI are provisional until the server validates and creates the order.
