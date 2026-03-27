# ui-common-libs

Shared React component library for the web UI applications in this repository.

## Why this package exists

- `orders-client` and `staff-client` currently use separate ad hoc markup and styles.
- This package is the single approved surface for shared UI primitives, theme tokens, and app-shell layout behavior.
- We wrap Material UI instead of exposing raw styling choices in each app so both clients converge on the same interaction and visual language.

## Rules

- Import shared UI primitives from `@agentic-restaurant/ui-common-libs`.
- Do not import raw `@mui/material` components directly inside app code unless the needed primitive is first added to this package.
- Put cross-app layout, typography, buttons, cards, fields, badges, and future navigation patterns here.

## Included components

- `RestaurantUiProvider`
- `AppShell`
- `AppNavigationMenu`
- `ChoiceCard`
- `InfoCard`
- `ActionButton`
- `FormTextField`
- `StatusBadge`
- `TextSizeControl`

## Local development

1. Add the package to an app with `"@agentic-restaurant/ui-common-libs": "file:../ui-common-libs"`.
2. Run `npm install` in that app.
3. Wrap the app root with `RestaurantUiProvider`.
4. Replace app-local primitives with shared exports from this package.

## Build and test

- `npm run build`
- `npm run test`