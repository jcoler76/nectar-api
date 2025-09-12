# NectarStudio.ai – Next Level Roadmap and Go‑To‑Market

## Overview

NectarStudio.ai focuses on instant, governed APIs over operational databases with explainable, safe AI copilots. The near‑term goal is parity with DreamFactory for MSSQL/SQL‑backed REST plus a standout AI flow: natural‑language‑to‑API generation with guardrails. Medium term, deliver Data and Workflow Copilots, enterprise governance, and on‑prem options — at a meaningfully better price point.

## Market Reality

- Buyer intent exists: Teams routinely pay 5–20k/yr for governed DB APIs and good DX; DreamFactory at 16k+/yr validates willingness to pay (especially MSSQL heavy orgs).
- Target ICP: Mid‑market teams and agencies needing instant REST over MSSQL/Postgres/MySQL, stored procedure support, OpenAPI, RBAC/ABAC, logs, and keys.
- Differentiators: Explainable, safe AI (NL→API, parameter inference, examples, guardrails), first‑class stored procedures, and BYO LLM keys to control costs.

## Pricing Strategy (Recommended)

- Free: $0 — 1 datasource, 50k API calls/month, community support, NL→API limited, BYO LLM keys.
- Team: $99/mo — 3 datasources, 1M API calls/mo, API keys/quotas, OpenAPI portal, hooks, audit logs, email support.
- Business: $399/mo — 10 datasources, 5M API calls/mo, advanced RBAC/ABAC, staging, workflow copilot, priority support.
- Enterprise: Contact Us (typical $12k–$18k/yr) — SSO/SAML/SCIM, on‑prem, private LLMs, VPC peering, SOC 2 addendum, HA SLAs, dedicated support.
- Overage: $3–$5 per additional 1M API calls; managed LLM (optional) with 10–15% margin; BYO LLM encouraged.

## Enterprise Readiness Gaps (Current State)

- Prisma/Postgres migration incomplete; several schema/AI routes are disabled pending parity.
- Governance: API key lifecycle, quotas, rotation, and usage UI require completion.
- Observability: Metrics/tracing/SIEM export and structured audits need wiring.
- Security/compliance: SSO/SAML, SCIM, key rotation policies, and SOC 2 controls not formalized.
- AI services: AISchemaGenerator and AIDocumentationService are scaffolds only; guardrails (PII, SQL sandbox) need production maturity.

## Phased Roadmap

### Phase 0 — Core Stabilization (2–3 weeks)

- Complete Prisma/Postgres parity and re‑enable disabled routes using Prisma.
- Database drivers: ensure MSSQL parity; add robust Postgres/MySQL drivers with consistent shapes via `DatabaseService`.
- Secrets/rotation: centralize encryption, rotation endpoints, and prevent secret logging.
- OpenAPI: generate deterministic spec for all active routes; publish at `/api/docs`; add CI validation.
- Observability baseline: structured logs with request IDs; minimal metrics and tracing hooks.

### Phase 1 — Parity + Governance (3–4 weeks)

- API keys: lifecycle (create, rotate, revoke), per‑route quotas, usage stats; admin UI and audits.
- RBAC/ABAC: role/attribute policies; field/row masking; policy simulator and dry‑run.
- Hook runner: pre/post hooks with VM2 sandbox, timeouts, and env scoping; full audit trail.
- Developer portal: branded nectarstudio.ai docs with OpenAPI console and Postman exports.

### Phase 2 — AI Copilots with Guardrails (3–5 weeks)

- NL→API Wizard: provider abstraction (OpenAI first); RAG over schema; generate endpoint code + validators + OpenAPI + tests; human review + risk scoring.
- Schema Intelligence: complete cataloging; persist normalized metadata; embed to vector store for retrieval‑augmented prompts.
- Data Copilot: safe SQL generation (allowlist, row caps, no DDL), explain plan, index suggestions, SQL↔GraphQL conversion tools.
- AI Docs/SDKs: finalize `AIDocumentationService` to generate markdown docs, code samples, and minimal SDKs (TS/JS/Python) via CI.

### Phase 3 — Enterprise Features (4–8 weeks)

- SSO/SAML + SCIM; org/tenant isolation tests; cross‑tenant enforcement.
- Compliance: SOC 2 control mapping, audit retention, incident runbooks; optional HIPAA addendum.
- HA/SRE: horizontal scaling, connection pool tuning, circuit breakers, global rate limits, canaries.
- On‑prem: Helm charts, air‑gapped mode, local LLM adapters (Ollama/llama.cpp), KMS integration.

### Phase 4 — Growth/Polish (ongoing)

- Templates marketplace (lead API, stored‑proc reporting, Slack alert workflows).
- Cost controls: per‑workspace LLM budgets, token accounting, BYO default.
- Performance auto‑tuning: SWR caching, background prefetch for common queries.

## Milestones and KPIs

- Month 1: Prisma parity, OpenAPI live, API keys v1, observability baseline, MySQL driver.
- Month 2: Hooks, RBAC/ABAC, dev portal GA; NL→API beta; schema intelligence GA.
- Month 3: Data Copilot GA; AI docs/SDKs beta; SSO/SAML; first enterprise pilot.
- Month 4+: On‑prem, compliance milestones, HA, and marketplace connectors.

Track: time‑to‑first‑API, generation acceptance/edit distance, P95 latency/error rate, API calls/workspace, overage conversion, and prompt cost budgets.

## Risks and Mitigations

- Crowded space: Lead with explainable AI + stored proc excellence; keep TCO low with BYO LLM.
- AI safety: Enforce SQL sandbox, human review, PII redaction; maintain eval sets.
- Connector breadth: Prioritize MSSQL/Postgres/MySQL; plan Snowflake/BigQuery as read‑only.
- Compliance lift: Stage SOC 2 Type I→II pragmatically; reuse standard control templates.

## Next Steps

- Confirm initial DB targets (MSSQL, Postgres, MySQL) and must‑have parity features.
- Approve pricing tiers and BYO‑LLM posture.
- Green‑light Phase 0/1 backlog; create issues with acceptance criteria.
- Identify 2–3 design partners (MSSQL heavy, DreamFactory users) for a private beta.

