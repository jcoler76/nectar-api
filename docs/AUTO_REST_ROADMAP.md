# Auto‑Generated REST for External Databases — Build Roadmap

This roadmap guides an AI coding agent to implement DreamFactory‑style, auto‑generated REST endpoints for external databases in Nectar API. It is repo‑aware, prescribes concrete files, schemas, interfaces, tests, and acceptance criteria, and incrementally delivers safe, RBAC‑aware CRUD with filtering, pagination, field selection, and basic relations.

## Context & Goals

- Gap (from SAILS_DREAMFACTORY_GAP_ANALYSIS.md): Nectar exposes SQL Server stored procedures via `/api/:service/_proc/:proc` but lacks general table/view auto‑CRUD across external datasources.
- Goal: Point at a DB connection, select tables/views, and automatically expose REST endpoints under `/api/:service/_table/...` with:
  - Filtering (JSON filter AST), sorting, pagination
  - Field selection and masking
  - Role‑based column and row policies
  - CRUD for tables and read‑only for views
  - OpenAPI documentation generation
  - Activity logging and guardrails (caps, timeouts)

Non‑Goals (v1):
- Complex joins or arbitrary SQL; custom scripts (covered by separate scripting feature)
- Cross‑DB federated queries; deep nested include beyond 1 level
- Full Mongo parity (deliver read‑only later)

## Existing Assets to Reuse

- Drivers: `server/services/database/drivers/{PostgreSQLDriver,MySQLDriver,MSSQLDriver,MongoDBDriver}.js`
- Driver orchestrator: `server/services/database/DatabaseService.js`
- Auth/RBAC: `server/middleware/consolidatedAuthMiddleware.js`, Prisma `Role`, `Application`, `Service`
- Connections: Prisma `DatabaseConnection`; GraphQL resolvers for managing connections
- Activity logs: `ApiActivityLog` and public API logging patterns in `server/routes/publicApi.js`
- Utilities: `server/utils/sqlSafetyValidator.js`, `server/utils/logger.*`

## High‑Level Milestones

1. Foundations & Read‑Only (SQL) — filter/fields/sort/pagination, `_schema`, `_count` (Postgres first)
2. Mutations (Create/Update/Delete) — write protection, soft delete, per‑op RBAC
3. Relations & Include — simple 1:1 and 1:N expansion with caps; OpenAPI updates
4. Mongo Read‑Only Adapter — parity for list/by‑id with limitations documented

Each milestone concludes with integration tests, OpenAPI updates, and docs.

## Data Model Extensions (Prisma)

Add minimal exposure configuration to control what is auto‑exposed and how policies apply. New models:

```prisma
model ExposedEntity {
  id              String   @id @default(uuid())
  serviceId       String
  service         Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  connectionId    String
  connection      DatabaseConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  database        String
  schema          String?
  name            String
  type            ExposedEntityType  // TABLE or VIEW
  primaryKey      String?            // column name

  allowRead       Boolean  @default(true)
  allowCreate     Boolean  @default(false)
  allowUpdate     Boolean  @default(false)
  allowDelete     Boolean  @default(false)

  defaultSort     String?           // e.g. "-created_at,name"
  softDeleteEnabled Boolean @default(false)
  softDeleteColumn  String?
  softDeleteValue   String?

  pathSlug        String?           // optional override for URL segment

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  creator         User?    @relation(fields: [createdBy], references: [id])

  fieldPolicies   ExposedFieldPolicy[]
  rowPolicies     ExposedRowPolicy[]

  @@unique([serviceId, schema, name])
  @@index([organizationId])
}

enum ExposedEntityType {
  TABLE
  VIEW
}

model ExposedFieldPolicy {
  id              String   @id @default(uuid())
  exposedEntityId String
  exposedEntity   ExposedEntity @relation(fields: [exposedEntityId], references: [id], onDelete: Cascade)
  roleId          String?  // null → default for all roles
  role            Role?    @relation(fields: [roleId], references: [id])
  includeFields   String[] // allowlist; if empty → all except exclude
  excludeFields   String[] // denylist
  writeProtected  String[] // cannot be set on create/update
  maskedFields    String[] // masked in responses
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([exposedEntityId])
  @@index([roleId])
}

model ExposedRowPolicy {
  id              String   @id @default(uuid())
  exposedEntityId String
  exposedEntity   ExposedEntity @relation(fields: [exposedEntityId], references: [id], onDelete: Cascade)
  roleId          String?  // null → default for all roles
  role            Role?    @relation(fields: [roleId], references: [id])
  filterTemplate  Json     // JSON filter AST with placeholders (e.g., "{{organization.id}}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([exposedEntityId])
  @@index([roleId])
}
```

Agent tasks:
- Update `server/prisma/schema.prisma` with models above and run migration.
- Optionally: seed `ExposedEntity` from existing `DatabaseObject` (if present for a `Service`).

## API Specification

Base prefix (mounted): `/api/:service/_table`

Discovery
- `GET /api/:service/_table` — list exposed entities (name, schema, type, ops allowed)
- `GET /api/:service/_table/:entity/_schema` — columns, types, nullability, PK/FKs
- `GET /api/:service/_table/:entity/_count?filter=...` — total count with filter

CRUD
- `GET /api/:service/_table/:entity` — list with `filter`, `fields`, `sort`, `page`, `pageSize`, `include`
- `GET /api/:service/_table/:entity/:id` — single row by PK
- `POST /api/:service/_table/:entity` — insert row (TABLE only)
- `PATCH /api/:service/_table/:entity/:id` — update row
- `DELETE /api/:service/_table/:entity/:id` — soft/hard delete per entity config

Query params
- `filter` (URL‑encoded JSON):
  ```json
  {"and":[{"field":"status","op":"eq","value":"active"},{"field":"age","op":"gte","value":18}]}
  ```
- `fields`: `id,name,email`
- `sort`: `name,-created_at`
- `page`: integer (default 1), `pageSize`: integer (default 25, cap 200)
- `include`: relations (v2), e.g. `profile,orders`
- `count_only=true` — return `{ total }` only

Response envelope (list)
```json
{ "data": [ ...rows ], "page": 1, "pageSize": 25, "total": 123, "hasNext": true }
```

Errors: consistent JSON with `error.code`, `error.message`, and optional `details`.

## Module and File Layout

Add a focused auto‑REST layer and keep drivers isolated per dialect:

- `server/services/autoRest/filterParser.js`
  - Parse and validate `filter` JSON (AST) against allowed columns and ops
  - Normalize values; support ops: `eq,neq,gt,gte,lt,lte,in,like,ilike,between,isnull`
  - Output: internal AST for SQL builders

- `server/services/autoRest/dialects/postgres.js`
- `server/services/autoRest/dialects/mysql.js`
- `server/services/autoRest/dialects/mssql.js`
  - Quote identifiers, map operators, handle `LIMIT/OFFSET` vs `TOP`, `ILIKE` emulation
  - Build safe SQL + params from AST, fields, sort, pagination

- `server/services/autoRest/autoRestService.js`
  - Fetch `ExposedEntity` and effective policies for role
  - Merge row policy filter with user filter; compute allowed fields; enforce writeProtected
  - Call appropriate dialect builder; pass to driver via `DatabaseService.executeQuery`
  - Shape responses, mask fields, and compute envelopes

- `server/middleware/autoRestPolicy.js`
  - Resolve service (org‑aware), locate `ExposedEntity` by `:entity`
  - Load role from `consolidatedApiKeyMiddleware`
  - Attach computed policy context onto `req` (allowed ops/fields, row filter, PK)

- `server/routes/autoRest.js`
  - Routes for discovery, read, mutations (with guards)
  - Apply middlewares: `consolidatedApiKeyMiddleware`, rate limiting, tenant isolation, `autoRestPolicy`

- Mount in `server/app.js` under `/api` (similar to public API proc routes)

## Security & Guardrails

- Authentication: reuse `consolidatedApiKeyMiddleware` (supports legacy header/query and role resolution)
- Authorization:
  - Role permissions: `entity:<service>/<schema>.<name>:read|create|update|delete`
  - Enforce `ExposedFieldPolicy` and `ExposedRowPolicy`; default deny for columns not in schema
- Safety:
  - Strict identifier allowlist (only introspected columns); parameterize all values
  - `pageSize` cap (default 25, max 200), server‑side timeouts, and optional overall row cap per request
  - Deny mutations on `VIEW` entities; soft delete preferred for destructive ops
  - Sanitize outputs (mask fields) and log to `ApiActivityLog`

## OpenAPI Integration

- Extend existing docs generator to add paths for each `ExposedEntity` and allowed methods
- Generate schemas from `_schema` metadata (types, nullability)
- Document query params (`filter`, `fields`, `sort`, `page`, `pageSize`, `include`, `count_only`)

## Detailed Workplan (Phased)

### Phase 1 — Foundations & Read‑Only (Postgres first)

1. Schema & Migration
   - Add Prisma models (`ExposedEntity`, `ExposedFieldPolicy`, `ExposedRowPolicy`)
   - Migrate and add indexes; backfill or seed minimal entries for a test service

2. Introspection Wiring
   - Use `DatabaseService.getTableColumns()` and driver methods to capture schema metadata for configured entities
   - Persist PK and column list in `ExposedEntity.metadata` (optional) for quick validation

3. Filter & SQL Builders
   - Implement `filterParser.js` with operator support and validation
   - Implement `dialects/postgres.js` with:
     - Identifier quoting, operator mapping, LIMIT/OFFSET, ILIKE
     - Select builder: fields → projection, filter AST → WHERE, sort → ORDER BY
     - Pagination and count query

4. Policy Middleware
   - `autoRestPolicy.js` resolves service + entity per request, loads effective role policies, computes allowed fields and merged filters, and attaches context to `req`

5. Routes (Read)
   - `GET /_table`, `GET /_table/:entity`, `GET /_table/:entity/:id`, `GET /_schema`, `GET /_count`
   - Enforce caps and timeouts; log activity records

6. OpenAPI (Read‑Only)
   - Add paths and components for read endpoints

7. Tests
   - Unit: filter parser, postgres dialect translation
   - Integration: spin up Postgres fixtures (or use existing DB) to test list/by‑id, fields, filters, sort, pagination, `_schema`, `_count`

Acceptance Criteria (P1)
- Expose a Postgres table and retrieve data via list/by‑id with `filter/fields/sort/pagination`
- `_schema` and `_count` work; policies mask fields and enforce row filters
- OpenAPI includes new read endpoints; activity logs recorded

### Phase 2 — Mutations & Soft Delete

1. Write Guards
   - Enforce per‑op allow flags and role permissions
   - Deny mutations on `VIEW` entities

2. Create/Update/Delete
   - POST: strip writeProtected fields; return inserted row; handle default values
   - PATCH: enforce writeProtected and merged row policy in WHERE; return updated row
   - DELETE: soft delete if configured (UPDATE with softDeleteColumn/value), else hard delete; return affected count or row

3. Tests
   - Integration covering write scenarios, write protection, soft delete, and policy enforcement

4. OpenAPI
   - Document mutation request/response schemas

Acceptance Criteria (P2)
- CRUD works for TABLEs with role‑based op gating; soft delete behaves as configured; tests pass

### Phase 3 — Relations & Include

1. FK Introspection
   - Extend introspection to record simple FKs for included relations (1:1, 1:N)

2. Include Support
   - Add `include` param for related entities; for 1:N use batched second query limited by caps
   - Max depth 1; cap related rows per parent; document behavior

3. Tests & OpenAPI
   - Integration tests for include; doc parameters and response shape

Acceptance Criteria (P3)
- `include` returns related data within caps; documented in OpenAPI; performance guardrails enforced

### Phase 4 — Mongo Read‑Only

1. Adapter
   - Implement read list/by‑id via `MongoDBDriver` using collection and filter translation
   - Document limitations (no joins, different operators mapping)

2. Tests & Docs
   - Read‑only tests against a fixture Mongo

Acceptance Criteria (P4)
- Read‑only endpoints for Mongo tables/collections supported, with documented differences

## Filter Grammar (AST)

Shape (high level):
```json
{
  "and": [
    { "field": "status", "op": "eq", "value": "active" },
    { "or": [
      { "field": "age", "op": "gte", "value": 18 },
      { "field": "role", "op": "in", "value": ["admin", "editor"] }
    ]}
  ]
}
```

Allowed ops: `eq, neq, gt, gte, lt, lte, in, like, ilike, between, isnull`

Validation: fields must be in the entity’s column set and allowed by FieldPolicy; values coerced to basic types.

## Policy Evaluation Order

1. Resolve service and entity (org‑scoped)
2. Determine caller role (API key default role)
3. Load entity allow flags per operation
4. Load role‑specific FieldPolicy; compute allowed + masked + writeProtected sets
5. Load role‑specific RowPolicy; render placeholders (e.g., `{{organization.id}}`, `{{user.id}}`) with request context
6. Merge user filter AND row policy filter
7. Apply caps (pageSize max, includes max, timeout)

## Activity Logging & Metrics

- Mirror `publicApi` logging: record method, endpoint, status, request/response sizes, records processed, orgId, userId
- Add category `auto_rest`; include entity and service metadata in `metadata`

## Rollout, Flags, and Safety

- Feature flag per service to enable auto‑REST
- Read‑only rollout first, then writes; opt‑in per entity
- Server‑side caps (pageSize, includes count, total row cap, request timeout)
- Input size limits; reject oversized `filter` payloads

## Test Plan Summary

- Unit tests: filter parser, SQL builders per dialect
- Integration tests (Postgres baseline): list/by‑id, filters, sort, fields, pagination, `_schema`, `_count`, CRUD, soft delete, include
- Security tests: column allow/deny, masked fields, writeProtected enforcement, row policy filters, unauthorized ops

## Task Checklist (for Agent)

- [ ] Update Prisma schema with new models; run migration
- [ ] Implement `filterParser.js` with validation and AST
- [ ] Implement `dialects/postgres.js` (baseline); add mysql/mssql parity stubs
- [ ] Implement `autoRestService.js` orchestration
- [ ] Implement `autoRestPolicy.js` middleware
- [ ] Implement `routes/autoRest.js` with read endpoints; mount in `app.js`
- [ ] Add OpenAPI generation for read endpoints
- [ ] Add unit tests for parser and postgres dialect
- [ ] Add integration tests for read endpoints
- [ ] Implement mutations (POST/PATCH/DELETE) with soft delete
- [ ] Extend OpenAPI for mutations; add integration tests
- [ ] Implement relations include (v1) with caps; extend OpenAPI; tests
- [ ] Add Mongo read‑only adapter layer; tests and docs

## Implementation Notes & References

- Service resolution & auth: follow pattern in `server/routes/publicApi.js` and `server/middleware/consolidatedAuthMiddleware.js`
- SQL safety: adopt identifier allowlist + parameterization (no string concatenation)
- Use existing `DatabaseService` to get a connection/driver and execute queries (don’t duplicate pooling)
- Keep dialect‑specific logic isolated to `dialects/*` to simplify testing and support

## Acceptance Criteria (Overall v1)

- An admin can: (1) register a connection, (2) create a service for it, (3) expose a table, and (4) access endpoints:
  - `GET /api/:service/_table`, `GET /api/:service/_table/:entity`, `GET /api/:service/_table/:entity/:id`
  - `filter`, `fields`, `sort`, `page/pageSize`, `_schema`, and `_count` work
  - Field masking and row‑level filters enforced by role; ops blocked per configuration
  - OpenAPI includes endpoints and schemas; logs appear in `ApiActivityLog`

---

Authoring note for AI agent: keep changes minimal and consistent with code style; prefer Postgres first for end‑to‑end; reuse existing middleware and logging patterns; add tests adjacent to new modules under `server/tests`.

