Blueprint Auto-CRUD (Minimal)

Summary
- Provides read/list endpoints for allowlisted Prisma models with filtering, selection, sorting, and pagination.
- Feature flag: `BLUEPRINTS_ENABLED=true`.

Endpoints
- GET `/api/blueprints` — discovery of allowlisted models
- GET `/api/blueprints/:model` — list with pagination
  - Query params:
    - `page` (default 1), `limit` (default 20, max from env)
    - `select` comma-separated fields (subset of allowed)
    - `sort` comma-separated fields, prefix `-` for descending
    - `where` JSON string of filters. Supported operators per field:
      - Equality: `{"name":"My Service"}` or `{"name":{"equals":"My Service"}}`
      - String: `contains`, `startsWith`, `endsWith`
      - Comparison: `gt`, `gte`, `lt`, `lte`
      - Set: `in` (array)
      - Negation: `not`
- GET `/api/blueprints/:model/:id` — fetch a single record

Security
- Protected by policy group `blueprints` (currently requires auth).
- Tenant scope is enforced for allowlisted models that include `organizationId`.
- Authorization header: `Authorization: Bearer <JWT>` is required by default; the OpenAPI spec defines `bearerAuth` security.

Allowed Models
- Configure in `server/config/blueprints.js` (`models` mapping). Defaults include `endpoints`, `services`, `applications`.

Notes
- Equality filtering only (no advanced operators yet).
- OpenAPI generation can be added later by extending documentation.
  - OpenAPI for blueprints is available at `GET /api/documentation/blueprints/openapi` (auth required) when enabled.
