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

1. Declare the dependency from another workspace app with the local package version, for example `"@agentic-restaurant/ui-common-libs": "0.0.1"`.
2. Run `npm install` from the repository root.
3. Build or watch this package from the repository root with `npm run dev:ui-common-libs` or `npm run build --workspace @agentic-restaurant/ui-common-libs`.
4. Wrap the app root with `RestaurantUiProvider`.
5. Replace app-local primitives with shared exports from this package.

## Workspace artifact model

- Local development uses npm workspace linking instead of a global npm install.
- Built output is written to `apps/ui-common-libs/dist`.
- Package versions stay whatever is declared in `package.json` until you change them explicitly.

## Build and test

- `npm run build`
- `npm run test`