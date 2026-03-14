# Test Report

## Commands
- `npm test` (workdir: `apps/orders-client`)
- `npm run build` (workdir: `apps/orders-client`)

## Results
- `npm test`: PASS
  - test files: 2 passed
  - tests: 6 passed, 0 failed
- `npm run build`: PASS
  - TypeScript compile passed
  - Vite production build completed

## Coverage Added
- `src/App.test.tsx`
  - home screen renders both auth entry buttons
  - registered login flow still works end-to-end
  - guest login flow (name input -> guest API call -> menu load)
  - session restore flow still works
- `src/features/auth/appToken.test.ts`
  - concurrent app-token calls are deduplicated
  - automatic refresh before expiry is triggered
