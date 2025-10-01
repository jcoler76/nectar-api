Feature Gap Analysis: Sails.js & DreamFactory vs. Nectar API

Overview
- Nectar API provides: Express + GraphQL (Apollo), Prisma (PostgreSQL) and MongoDB, JWT auth with 2FA, RBAC, rate limiting, OpenAPI generation, SQL Server stored-procedure exposure via public API, workflow engine, notifications, and an admin frontend.
- Purpose: Identify key features present in Sails.js and DreamFactory that are currently absent or only partially implemented in Nectar API, to guide roadmap work.

Sails.js Parity Gaps
- Blueprint auto-CRUD + real-time: Auto-generated REST endpoints and pub/sub over websockets for every model. Nectar exposes many resources via custom routes but lacks a generic, model-driven blueprint layer tied to Prisma/Mongoose.
- Policy mapping (declarative authorization): Centralized, route/controller policy maps. Nectar uses middleware (e.g., adminOnly) but not a global, declarative policy registry per route/action.
- Generators/CLI scaffolding: Sails CLI scaffolds models/controllers/policies/tests. Nectar lacks a CLI to scaffold Prisma models, REST/GraphQL resolvers, route stubs, and tests in a cohesive way.
- i18n/localization: Sails includes server-side i18n. Nectar has limited UI-level date localization; no server-side locale negotiation or message catalogs.
- First-class socket pub/sub model: Sails sockets auto-subscribe to model rooms with lifecycle events. Nectar uses GraphQL subscriptions but not a standardized model lifecycle pub/sub with rooms and verbs.

DreamFactory Parity Gaps
- Auto-generated REST for databases: Point at a DB and auto-expose tables/views as REST with filtering, pagination, field selection, and relations. Nectar exposes SQL Server stored procedures via `/api/:service/_proc/:proc` but lacks general table/view CRUD auto-APIs across external datasources.
- Broad connector catalog: DreamFactory ships connectors for MySQL/Postgres/SQL Server/SQLite/Oracle/DB2/MongoDB/Elasticsearch/S3 and more. Nectar supports Postgres (app data), Mongo, and SQL Server (procs) but does not have a pluggable connector framework with breadth and uniform capabilities.
- External auth providers and SSO: OAuth2/OpenID Connect (Google, GitHub, Microsoft), SAML, LDAP/Active Directory, Azure AD. Nectar currently lacks built-in external identity provider integrations and SSO flows.
- Event scripting and request/response transforms: Per-endpoint pre/post scripts, validation, and payload transformation at the gateway layer. Nectar has workflows and webhooks but not a generic, per-endpoint scripting pipeline.
- SDK generation per app/role: DreamFactory generates downloadable SDKs (JS, Python, PHP, etc.) from OpenAPI. Nectar generates OpenAPI but does not produce language SDKs/packages automatically.
- Centralized API management features at gateway scope: Per-endpoint caching, response shaping, field-level masking, record-level filters, and systematic request validation via declarative policies. Nectar has rate limiting and validation in routes, but not a unified gateway policy and caching layer.

Assumptions and Evidence
- SQL Server stored-procedure public API exists with legacy DreamFactory-compatible modes (server/routes/publicApi.js). OpenAPI is generated per role (server/routes/documentation.js). RBAC, rate limiting, and Prisma/Mongo are present (README, routes, middleware).
- No repository-wide signs of Sails-style blueprints/policies/i18n or DreamFactory-like generic table CRUD generation, scripting, or external auth connectors (code search across server/). If some items exist but are incomplete or in progress (e.g., schemaIntelligence), they are not end-to-end exposed as general auto APIs.

Prioritized TODOs with Coding Assistant Prompts

1) Blueprint-style Auto-CRUD for Models
- Goal: Auto-generate REST endpoints (CRUD, filtering, pagination, sorting) for Prisma and Mongo models and register them under a versioned prefix with access policies.
- Prompt: "Create a blueprint auto-CRUD layer that inspects Prisma models and Mongoose schemas, mounts REST routes with standard query operators (filter, select, sort, page, limit), and emits CRUD events over GraphQL subscriptions. Include config to enable/disable per model and per organization."

2) Declarative Policy Mapping
- Goal: Central policy registry mapping routes/actions to policies (e.g., auth, RBAC checks, field-level guards) configurable per environment/tenant.
- Prompt: "Introduce a policy registry (e.g., `server/policies/policyMap.js`) and a middleware to resolve and enforce policies per route/action. Migrate existing `adminOnly` and auth checks to fit into this registry. Add tests for policy resolution and denials."

3) Connector Framework for External Datasources
- Goal: A pluggable connector interface (SQL/NoSQL/object stores) with standardized capabilities (introspection, CRUD, query translation, pagination, security rules).
- Prompt: "Design a `connectors/` abstraction with a base interface (introspect, list, read, create, update, delete) and implement adapters for Postgres/MySQL/SQL Server (tables/views) and S3 (objects). Wire to a registry and persist connection metadata in Prisma."

4) Auto-Generated REST for Tables/Views
- Goal: From a configured connection, auto-expose selected tables/views as REST endpoints with OpenAPI docs, role scoping, and safe query features.
- Prompt: "Build an ‘exposure’ service that, given a connection and selected tables, mounts REST endpoints with filtering (operators), projection, sorting, and pagination. Enforce role-based column visibility and row-level filters. Emit OpenAPI per exposure and add tests."

5) External Auth Providers and SSO
- Goal: Add OAuth2/OIDC (Google, GitHub, Microsoft), SAML, and LDAP/AD with role mapping to organizations and apps.
- Prompt: "Integrate Passport-based OAuth2/OIDC providers and add SAML + LDAP/AD strategies. Implement account linking, tenant-aware role mapping, and just-in-time user provisioning. Add admin UI to configure providers, redirect URIs, and default roles."

6) Per-Endpoint Scripting and Transforms
- Goal: Allow pre-request and post-response scripts (Node.js) for validation, enrichment, and transformation without touching core handlers.
- Prompt: "Create a scripting pipeline that loads sandboxed Node scripts per endpoint (pre and post stages) with a safe API surface and timeouts. Provide admin UI to edit scripts, version them, and audit changes. Include unit tests for sandboxing and failure isolation."

7) SDK Generation from OpenAPI
- Goal: Generate client SDKs (TypeScript/JS, Python, Java, C#) per application/role from OpenAPI and publish as downloadable artifacts.
- Prompt: "Add a build step that uses OpenAPI Generator to produce language SDKs for a selected app/role. Store artifacts, expose a download API, and optionally publish to private registries. Include CI workflow and minimal usage docs."

8) Unified Gateway Caching and Response Shaping
- Goal: Configurable per-endpoint caching with cache keys, TTL, and invalidation; response shaping for masking fields and consistent pagination envelopes.
- Prompt: "Implement a gateway layer with per-endpoint caching (Redis), configurable TTLs, and cache busting hooks. Add response shaping to standardize envelopes, mask sensitive fields, and apply field-level policies. Provide admin controls and metrics."

9) Server-side i18n
- Goal: Locale negotiation and message catalogs for error messages and system responses; propagate locale to downstream services.
- Prompt: "Introduce server-side i18n using a library like i18next. Add locale detection (header/query) and replace hardcoded messages with translation keys. Provide catalogs for en-US initially and add tests for locale switching."

10) Model Lifecycle Pub/Sub
- Goal: Standardized pub/sub events (created, updated, deleted) for exposed models with subscription filters and rooms/channels.
- Prompt: "Emit model lifecycle events on a channel namespace and add GraphQL subscription fields for them. Support subscription filters (model, organization, user) and document channel naming conventions."

Notes
- Start with 1–4 to unlock DreamFactory-like auto APIs and Sails-like productivity, then add auth providers (5) and scripting (6) for enterprise parity.
- Reuse existing OpenAPI generation for SDKs (7) and policy/rate limiting infrastructure when implementing gateway features (8).

