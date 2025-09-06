# Workflow Builder Upgrades Plan

This living plan tracks enterprise-grade additions to the Workflow Builder and records progress. We will keep this checklist updated as items are implemented.

## Legend

- [ ] pending, [x] done, [~] in progress

## 1) Backend engine parity and fixes

- [ ] Router/Filter parity: ensure `logic:router` multi-output pathing is fully supported and retire `logic:filter` remnants. Tests for branching and fallback.
- [x] Logger action: backend executor, engine registry, and UI panel.
- [~] Approval action: backend executor with pause/resume, callback endpoint, UI panel with assignees/SLA. (Skeleton executor + pause + decision route + resume flow added)
- [ ] Database trigger: incremental polling + optional CDC integration with queue; adaptive polling and checkpoints.
- [ ] Email trigger: O365/IMAP listener, attachments via temp storage, filters.
- [ ] File trigger: monitor upload area/object storage, prefix/pattern filter, batching.
- [ ] Scheduler enhancements: business calendar, concurrency keys, last-run persistence.

## 2) Template20-first nodes

- [x] Execute Recommended Procedure: discover and run high-confidence Template20 stored procedures by entity.
- [ ] Prisma entity action: type-safe CRUD with includes and transactions.
- [~] GraphQL execute: run generated selections/mutations.
- [ ] Entity-change trigger: fire on `gsCustomers`, `tblInvoice`, etc. via CDC, map to entities.

## 3) Enterprise triggers

- [ ] Queue triggers: Kafka, SQS, Service Bus, Pub/Sub.
- [ ] CRM/IDP triggers: Salesforce, Dynamics, NetSuite, Okta/AzureAD.
- [ ] Storage triggers: GCS, Azure Blob.
- [ ] Verified Webhook trigger: HMAC verification and replay protection.

## 4) Enterprise actions

- [ ] Queue publish: Kafka/SNS/SQS/Service Bus/PubSub with idempotency and schema validation.
- [ ] Cloud storage actions: S3/GCS/Azure with KMS/SSE.
- [ ] SFTP process: get, checksum, archive, PGP decrypt/encrypt.
- [ ] ERP/CRM actions: Salesforce/Dynamics/NetSuite with throttling backoff.
- [ ] Security: DLP/redact, sign/encrypt via Vault/KMS.
- [ ] Notifications: Slack/Teams/SMS with action buttons (approval integration).
  - [~] Teams notify via webhook implemented as `action:teams:notify` (basic message card).
- [ ] Observability: emits metrics/logs per node to Datadog/Splunk/ELK.

## 5) Logic and control nodes

- [ ] Retry/backoff wrapper.
- [ ] Circuit breaker with fallback path.
- [ ] Rate limit / concurrency keys (Redis-backed).
- [ ] Batch/window aggregator.
- [ ] Idempotency key and store.
  - [x] Idempotency node with Redis-backed key implemented as `action:idempotency`.
- [ ] Transform/map/validate (JSONPath + JSON Schema).
  - [x] Basic Transform (mapping + required fields) implemented as `action:transform`.

## 6) UI builder updates

- [ ] Panels for new nodes with shared inputs (Auth, Retry, Concurrency, Idempotency, Secrets).
- [ ] Extract shared UI components to avoid duplication.

## 7) Security/compliance and platform

- [ ] Global audit trail with entity/procedure metadata and confidence scores.
- [ ] Secret management via Vault/Azure Key Vault references.
- [ ] Data masking/residency controls on nodes handling sensitive data.

## 8) QA, tests, docs

- [ ] Unit tests for each executor; integration tests for engine pathing and CDC/queue flows.
- [ ] Documentation for all nodes; update AI docs to include Template20 nodes and examples.
- [ ] Migration: convert legacy `logic:filter` nodes to `logic:router` in saved workflows.

---

## Completed

- [x] Logger action
  - Backend: `server/services/workflows/nodes/logger.js`
  - Engine registry updated: `server/services/workflows/engine.js`
  - UI: `src/features/workflows/nodes/panels/LoggerPanel.jsx`, `src/features/workflows/nodes/nodeTypes.js`
  - Notes: Uses centralized `logger` and returns structured result.
