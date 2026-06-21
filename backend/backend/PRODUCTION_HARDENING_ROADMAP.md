# Production Hardening Roadmap

This backend is feature-complete for the 12-module SaaS inventory spec, but it should go through this hardening roadmap before real customers use it in production.

Use this file as the step-by-step pick list. Complete one step at a time, run verification, then mark the step done.

## Working Rule

- Do not mix unrelated hardening steps in one change.
- Every step must keep `npm run build` green.
- Every step that changes behavior should add or update tests.
- Prefer small pull-request-sized changes.
- After each step, update the checklist status in this file.

## Current Baseline

- Backend modules 1-12 are implemented.
- `npm run build` passes.
- `npm test` passes.
- Real credentials and external provider setup are intentionally out of scope for this roadmap.

## Priority Legend

- `P0`: Must fix before production launch.
- `P1`: Strongly recommended before paid customers.
- `P2`: Market polish and operational maturity.

---

## Step 1: Production Environment Safety

Priority: `P0`

Goal: The server must refuse to start in production with unsafe defaults.

Scope:

- Tighten environment validation in `src/config/index.ts`.
- Require strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` when `NODE_ENV=production`.
- Require explicit `MONGODB_URI`, `REDIS_URL`, and `APP_URL` in production.
- Prevent development fallback secrets in production.
- Add tests for production env validation.

Done Criteria:

- Production startup fails fast if required secrets are missing.
- Development/test defaults still work for local use.
- Error messages clearly say which env var is invalid.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 2: CORS, Proxy, and HTTP Security Policy

Priority: `P0`

Goal: Lock public HTTP behavior for real deployments.

Scope:

- Replace open `cors()` in `src/app.ts` with an allowlist from env.
- Add env variables such as `CORS_ORIGINS` and `TRUST_PROXY`.
- Enable `app.set("trust proxy", ...)` for hosted deployments.
- Review Helmet config for API-safe defaults.
- Add request size limits for JSON and URL-encoded payloads from env.

Done Criteria:

- Unknown browser origins are rejected in production.
- Localhost origins still work in development.
- Rate limiting uses the correct client IP behind a proxy.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 3: Protect Generated Report Downloads

Priority: `P0`

Goal: Reports must not be publicly downloadable by guessing a URL.

Scope:

- Remove or restrict unauthenticated `express.static("/generated-reports")`.
- Add authenticated report download route.
- Enforce tenant ownership before download.
- Prefer signed, short-lived download tokens for email links.
- Store generated report metadata with organization, requester, format, file path, expiry.

Suggested Route:

```text
GET /api/v1/reports/download/:token
```

Done Criteria:

- A user from another organization cannot download a report.
- A public static URL cannot expose generated reports.
- Expired download tokens are rejected.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 4: Wire API Key Authentication to Public API Routes

Priority: `P0`

Goal: API keys should authenticate real API requests, not only be manageable records.

Scope:

- Decide which routes support API key access.
- Add middleware that accepts either JWT or API key for selected routes.
- Reuse `authenticateApiKey` from `src/middlewares/api-key.middleware.ts`.
- Keep API key management routes JWT-only.
- Ensure `req.organization` is attached for API-key-authenticated requests.
- Add integration-style tests for API key access.

Done Criteria:

- `X-API-Key` can access allowed inventory/report endpoints.
- API key scopes are enforced through existing RBAC permission middleware.
- API key usage is logged for successful and failed requests.
- JWT auth behavior remains unchanged.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 5: API Key Rate Limits

Priority: `P0`

Goal: Enforce per-key rate limits from the API key model/spec.

Scope:

- Add rate-limit fields to API key schema if not present.
- Validate rate-limit input in `apiKey.validation.ts`.
- Enforce per-minute and per-day limits in Redis.
- Return `429` with rate-limit headers.
- Add tests for exhausted API key limits.

Done Criteria:

- Per-key rate limit is independent from organization plan rate limit.
- Revoked/expired API keys cannot bypass rate limits or usage logging.
- Enterprise plan does not disable explicit API key limits unless configured.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 6: CSV Export Support

Priority: `P1`

Goal: Reports should support Excel, PDF, and CSV as required by market expectations.

Scope:

- Add `csv` to `ReportFormat`.
- Add validation support for CSV export.
- Implement CSV writer in report worker.
- Ensure CSV escaping is correct for commas, quotes, and new lines.
- Add tests for CSV format validation and job output selection.

Done Criteria:

- `/api/v1/reports/export` accepts `format: "csv"`.
- Scheduled reports can use CSV.
- CSV output has stable headers.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 7: HTTP Integration Test Suite

Priority: `P1`

Goal: Prove the backend works through real HTTP boundaries, not only unit/module validation.

Scope:

- Add `supertest`.
- Use a test MongoDB strategy such as Mongo memory server or a dedicated test database.
- Add integration tests for:
  - organization onboarding
  - login and refresh token rotation
  - RBAC permission denial
  - tenant isolation
  - inventory create/list/update
  - request approval and fulfillment
  - report export queueing
  - webhook create/test flow
  - API key authenticated access

Done Criteria:

- Core happy paths and security denial paths are covered.
- Tests can run locally with one command.
- Test data is isolated and cleaned up.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 8: OpenAPI Documentation

Priority: `P1`

Goal: The API should be easy for frontend, mobile, and integration developers to consume.

Scope:

- Generate or hand-maintain an OpenAPI 3 spec.
- Document auth, API key auth, pagination, response format, errors, and all module routes.
- Add examples for common flows.
- Add docs route only if safe for the deployment environment.

Done Criteria:

- Every public route is documented.
- Request/response schemas match Zod validation.
- Auth requirements and permissions are visible per route.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 9: Observability and Operational Logging

Priority: `P1`

Goal: Production issues should be diagnosable without guessing.

Scope:

- Add request ID middleware.
- Include request ID in logs and response headers.
- Add structured error logs with method, path, status, user, organization.
- Add queue job lifecycle logs.
- Add health endpoints:
  - liveness
  - readiness with MongoDB/Redis checks

Suggested Routes:

```text
GET /health/live
GET /health/ready
```

Done Criteria:

- A failing request can be traced through HTTP logs and job logs.
- Readiness fails when MongoDB or Redis is unavailable.
- Sensitive values remain redacted.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 10: Deployment Packaging

Priority: `P1`

Goal: The backend should be deployable consistently across environments.

Scope:

- Add production `Dockerfile`.
- Add `.dockerignore`.
- Add `docker-compose.yml` for local MongoDB, Redis, API, and worker.
- Document build/start commands.
- Add separate process command for API server and queue worker.
- Ensure graceful shutdown works for both.

Done Criteria:

- New developer can run API, worker, MongoDB, and Redis with Docker Compose.
- Production image installs only needed dependencies.
- Container healthcheck is available.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 11: CI Quality Gate

Priority: `P1`

Goal: Broken code should not reach deployment branches.

Scope:

- Add CI workflow for install, build, test, and lint/type checks.
- Add dependency audit step.
- Add migration script smoke check where possible.
- Cache dependencies safely.

Done Criteria:

- Pull requests must pass build and tests.
- CI output is clear enough to debug failures.
- No secrets are committed or printed.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 12: Database and Migration Runbook

Priority: `P1`

Goal: Schema/index changes should be safe to operate in real environments.

Scope:

- Document required migration commands.
- Add one command to run all module migrations in order.
- Verify all required indexes are declared or created.
- Add backup/restore notes.
- Add rollback notes for each migration where possible.

Done Criteria:

- A production operator knows exactly how to migrate a fresh or existing database.
- Migrations are idempotent.
- Index creation is safe for existing data.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 13: Security Review Pass

Priority: `P1`

Goal: Reduce common SaaS attack surface before launch.

Scope:

- Review NoSQL injection risk in query filters.
- Validate all ObjectId params consistently.
- Add stricter URL validation for webhooks to avoid SSRF.
- Consider blocking private/internal IPs for webhook URLs in production.
- Review file/path handling for report output.
- Add password policy and login throttling.
- Add account lockout or progressive delay for repeated login failures.

Done Criteria:

- Public inputs are validated before database use.
- Webhooks cannot target obvious internal network addresses in production.
- Auth endpoints have abuse protection.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 14: Performance and Load Testing

Priority: `P2`

Goal: Understand real-world behavior before customers discover limits for us.

Scope:

- Add seed script for realistic organizations, users, items, stock, requests, and movements.
- Add load test scripts for common endpoints.
- Measure:
  - login throughput
  - item listing latency
  - stock movement write latency
  - report generation time
  - queue processing throughput
- Tune indexes and pagination where needed.

Done Criteria:

- Baseline performance numbers are documented.
- Slow endpoints are identified and improved or accepted with clear limits.
- Large report generation does not block API requests.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Step 15: Final Launch Audit

Priority: `P0`

Goal: Decide whether the backend can be called production-ready.

Scope:

- Re-run complete test suite.
- Run build from a clean checkout.
- Review env configuration.
- Review deployment config.
- Review auth/RBAC/API-key behavior.
- Review tenant isolation.
- Review report download security.
- Review queue worker behavior.
- Review logs and health checks.

Done Criteria:

- All `P0` items are complete.
- All `P1` items are complete or explicitly accepted as launch risks.
- No known critical or high security gaps remain.
- The README has a clear production startup guide.

Verification:

```bash
npm run build
npm test
```

Status: `TODO`

---

## Launch Readiness Checklist

- [ ] Step 1: Production Environment Safety
- [ ] Step 2: CORS, Proxy, and HTTP Security Policy
- [ ] Step 3: Protect Generated Report Downloads
- [ ] Step 4: Wire API Key Authentication to Public API Routes
- [ ] Step 5: API Key Rate Limits
- [ ] Step 6: CSV Export Support
- [ ] Step 7: HTTP Integration Test Suite
- [ ] Step 8: OpenAPI Documentation
- [ ] Step 9: Observability and Operational Logging
- [ ] Step 10: Deployment Packaging
- [ ] Step 11: CI Quality Gate
- [ ] Step 12: Database and Migration Runbook
- [ ] Step 13: Security Review Pass
- [ ] Step 14: Performance and Load Testing
- [ ] Step 15: Final Launch Audit

## Suggested Order

1. Finish all `P0` items first: steps 1, 2, 3, 4, 5, and 15.
2. Then complete `P1` items: steps 6, 7, 8, 9, 10, 11, 12, and 13.
3. Then complete `P2` item: step 14.

The next recommended step is Step 1: Production Environment Safety.
