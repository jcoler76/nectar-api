SDK Generation from OpenAPI

Summary
- Provides `/api/documentation/sdk/:roleId` endpoints to assist and automate client SDK generation from OpenAPI.
- Server can generate SDKs when `openapi-generator-cli` is available; otherwise returns instructions.

Endpoints
- GET `/api/documentation/sdk/:roleId`
  - Returns the conventional OpenAPI URL and example commands for TypeScript and Python.
- POST `/api/documentation/sdk/:roleId`
  - Body: `{ lang: 'typescript'|'python'|'java'|'csharp', openapiUrl?: string, openapiSpec?: object }`
  - Generates SDK into `artifacts/sdk/<roleId>/<lang>`.
  - Requires `openapi-generator-cli` on PATH or `OPENAPI_GENERATOR_CLI` env var.

Blueprints Integration
- GET `/api/documentation/sdk`
  - Returns Blueprints OpenAPI URL and ready-to-run commands.
- Blueprints OpenAPI is available at `GET /api/documentation/blueprints/openapi` when blueprints are enabled.
- Example:
  - `openapi-generator-cli generate -i http://localhost:3001/api/documentation/blueprints/openapi -g typescript-axios -o ./artifacts/sdk/blueprints/typescript`

Prerequisites
- Install generator globally: `npm i -g @openapitools/openapi-generator-cli`
  - Or set `OPENAPI_GENERATOR_CLI` to a local binary path.

OpenAPI Source
- If documentation routes are disabled, provide `openapiUrl` or inline `openapiSpec` in POST.

Notes
- This feature is additive and does not alter runtime APIs.
- Extend `lang` mapping as needed for additional languages.
