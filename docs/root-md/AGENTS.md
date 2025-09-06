# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React frontend (components, hooks, services, utils, tests).
- `server/`: Express + GraphQL backend (controllers, middleware, services, tests).
- `scripts/`: Node scripts for quality checks, analysis, and utilities.
- `docs/`: Architecture, security, and operational guides.
- `public/`, `build/`, `coverage/`: Static assets, build outputs, coverage reports.

## Build, Test, and Development Commands
- Frontend dev: `npm run start:frontend` (CRA via react-app-rewired).
- Backend dev: `npm run start:backend` (from repo root) or `cd server && npm run dev`.
- Frontend build: `npm run build` (outputs to `build/`).
- Tests (frontend): `npm test` or `npm run test:changed`.
- Tests (backend): `cd server && npm test` (Jest; coverage in `coverage/server`).
- Lint/format: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- Type check: `npm run type-check`.
- Security audit (backend): `npm run security:audit` (or `cd server && npm run security:audit`).

## Coding Style & Naming Conventions
- Formatting: Prettier enforced (2 spaces, 100-char line length, single quotes, semicolons).
- Linting: ESLint (`react-app`, import ordering). Fix before PRs.
- Naming: React components PascalCase (e.g., `UserTable.tsx`); hooks start with `use*` (e.g., `useUsers.ts`); utilities/services camelCase (e.g., `authService.js`). Tests end with `.test.js`/`.test.ts`.

## Testing Guidelines
- Frontend: Jest + Testing Library (`src/setupTests.js`). Place tests near code (e.g., `utils/stringUtils.test.js`).
- Backend: Jest (`server/jest.config.js`), integration tests under `server/tests/**`. Aim to keep coverage green; add tests for new logic and bug fixes.

## Commit & Pull Request Guidelines
- Commits: Follow Conventional Commits: `feat(auth): add 2FA` | `fix(workflow): handle race condition` | `docs: update README`.
- PRs: Include a clear summary, linked issues, test evidence (commands or screenshots), and any config or migration notes. Ensure `npm run quality:check` passes.

## Security & Configuration
- Env: Copy `server/.env.example` to `server/.env` and set secrets. Do not commit secrets.
- Rate limits, headers, and file upload hardening live under `server/middleware/` and `server/docs/` — follow existing patterns.
- Optional: Use Docker (`docker-compose.yml`) for local services if needed.

