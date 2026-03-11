# Coder Report

## Implemented Changes
- Added authentication business logic in `users-service` with explicit repository, service, and controller layers.
- Implemented `POST /api/v1/auth/login` with credential verification, active-user enforcement, and JWT issuance.
- Implemented `POST /api/v1/internal/auth/validate` with required `X-Service-Token` guard and claim return for valid JWTs.
- Added JWT signing/parsing via JJWT and externalized JWT secret + expiration configuration.
- Added PBKDF2 password hash verification utility.
- Added Liquibase seed changelog with five predefined users (four active, one disabled).
- Updated OpenAPI contract and README to reflect implemented behavior.
- Added integration tests covering valid login, invalid login, internal validation success, expired token, and missing service credential.

## Tests Added or Updated
- Replaced bootstrap-only tests with behavior tests in `UsersServiceApplicationTests`.
- Updated integration profile properties for deterministic service token/JWT test configuration.

## Domain Documentation Updates
- No `domain-brain/` updates needed; implementation aligns with current invariants:
  - users-service remains token owner
  - one-hour token lifetime is preserved
  - only active users can authenticate

## Assumptions
- Internal validation returns `200` with `valid=false` for invalid/expired tokens and `403` only for invalid service credentials.
- Seed users are local-development fixtures and not production identity data.

## Known Limitations
- No registration, password reset, or external identity provider integration.
- Internal endpoint browser-inaccessibility is currently enforced with service-token header guard only.
