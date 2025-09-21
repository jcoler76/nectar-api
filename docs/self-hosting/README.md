Self-Hosting Quick Start (Simple Approach)

Overview
- Keep internal header fixed and map vanity headers at the gateway.
- Make header name and CORS allowed headers configurable via env.

Key Env Vars (server/.env)
- `API_AUTH_HEADER` (default: `x-nectarstudio-api-key`)
- `API_HEADER_ALIASES` (comma-separated, optional)
- `CORS_ORIGIN` (comma-separated list)

Nginx Header Mapping Example
- See `nginx-header-map.conf` for a snippet that maps `x-theirco-api-key` to `x-nectarstudio-api-key` while proxying to the app.

Envoy Header Mapping Example
- See `envoy-header-map.yaml` for a basic HTTP filter chain that sets the canonical header from a custom header if present.

PM2 Process Manager
- Use PM2 ecosystem configuration for production deployment setup.

Steps
- Configure your reverse proxy (Nginx/Envoy) to forward the API key in header `x-nectarstudio-api-key`. Optionally accept a vanity header and map it.
- Set `CORS_ORIGIN` to your frontend/app domains.
- Optionally set `API_HEADER_ALIASES` to accept additional header names directly by the app.

Runtime admin (no restart)
- Authenticated admin can read/update security settings via API:
  - GET `/api/admin/settings/security` → returns `apiAuthHeader`, `apiHeaderAliases`, `corsAllowedOrigins`.
  - PUT `/api/admin/settings/security` with `{ apiAuthHeader, apiHeaderAliases }` to update header names at runtime.
  - CORS allowed headers update automatically per request; SDKs/clients must send the header you configure.

Security Notes
- Prefer mapping vanity headers at the proxy rather than changing the canonical header across environments.
- Ensure TLS termination and pass `X-Forwarded-*` headers from the proxy.

API key self-service
- Regenerate key: POST `/api/applications/:id/regenerate-key` (admin).
- Set a specific key: POST `/api/applications/:id/set-key` with `{ "apiKey": "your-strong-key" }` (admin).
- Reveal last key for a short time (cached): GET `/api/applications/:id/reveal-key` (admin).
