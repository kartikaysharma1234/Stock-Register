# Stock Register Backend

TypeScript, Express, MongoDB, Redis, Bull, Passport, Zod, and Winston backend for
multi-organization inventory management.

## Setup

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Run `npm install`.
3. Start MongoDB and Redis.
4. Run `npm run dev`.
5. Run `npm run worker` in a separate process for email and report jobs.

MongoDB must run as a replica set because stock fulfillment and GRN receipt use
transactions.

The API is mounted at `/api/v1`. Health checks are available at `/health`.

## Main Modules

- `/organizations`: SaaS onboarding, tenant profile, usage, plan upgrades, and
  Razorpay webhooks
- `/auth`: login, refresh rotation, password reset, and invitations
- `/organisations`: organizations, departments, warehouses, and categories
- `/users`: scoped user administration
- `/inventory`: items, balances, stock movements, low stock, stock in/out
- `/requests`: department request approval and fulfillment workflow
- `/procurement`: vendors, purchase orders, approvals, and GRNs
- `/reports`: movement, consumption, stock status, and queued exports
- `/notifications`: in-app notification inbox
- `/audit-logs`: organization-scoped audit trail

All protected routes use Passport JWT authentication and route-level RBAC.
Organization, department, and warehouse scope is enforced again in services.
MJML source templates are retained beside precompiled HTML templates used by
the notification worker.

## Multi-Tenancy And Billing

Module 1 provides:

- Transactional organization registration with an initial Admin and FREE plan
- Redis-cached organization context from the authenticated JWT
- FREE, PRO, and ENTERPRISE usage limits and request-rate limits
- Razorpay subscription checkout and signed, idempotent webhook processing
- Automatic paid-plan activation and FREE-plan fallback after termination

Configure Razorpay credentials, webhook secret, and the PRO/ENTERPRISE plan IDs
from `.env.example`. The webhook URL is:

`POST /api/v1/organizations/webhook/razorpay`

Razorpay signature validation requires the exact raw request body. The server
captures it before JSON parsing.

The `Organization` collection is the tenant root and therefore does not contain
an `organizationId`; all tenant-owned collections, including `Subscription`, do.
