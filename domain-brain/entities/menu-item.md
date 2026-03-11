# MenuItem

## Definition

A purchasable catalog entry owned by `menu-service`.

## Canonical Fields

- `id: long`
- `name: string`
- `description: string`
- `price: monetary value exposed as API double`

## Ownership

- Source of truth: `menu-service`
- Persistence: MongoDB

## Notes

- Mongo persistence should use a long id strategy instead of `ObjectId`.
- Internal monetary calculations should avoid binary floating-point where possible.
