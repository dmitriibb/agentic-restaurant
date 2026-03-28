# staff-client

React client for the kitchen and display production board workflows.

## Environment

Create `.env` from `.env.example` when overriding local defaults.

## Local Run

1. Install frontend workspace dependencies from the repository root:
   - `npm install`
2. Start dev server:
   - `npm run dev:staff-client`
3. Run tests:
   - `npm run test --workspace staff-client`
4. Build for production:
   - `npm run build --workspace @agentic-restaurant/ui-common-libs && npm run build --workspace staff-client`

## Workspace Notes

- This app consumes `@agentic-restaurant/ui-common-libs` through the repository npm workspace.
- Install dependencies from the repository root, not from this folder.
- Shared UI library output stays inside `apps/ui-common-libs/dist` during local development.