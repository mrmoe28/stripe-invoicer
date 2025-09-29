# Ledgerflow

Ledgerflow is a Stripe-connected invoicing dashboard built with Next.js 15, Stripe, and Prisma. It helps service teams draft invoices, automate payment links, and monitor cashflow from one workspace.

## Stack
- Next.js 15 (App Router) & TypeScript
- Prisma ORM with PostgreSQL (NeonDB)
- Stripe API + Payment Links (webhook-ready)
- Tailwind CSS v4 with a shadcn-inspired component kit
- Zustand, React Hook Form, Zod (planned for upcoming flows)

## Local setup
```bash
pnpm install
pnpm prisma:generate
pnpm db:push        # sync schema to PostgreSQL database
pnpm db:seed        # clear existing data
pnpm dev
```

Environment variables live in `.env`; copy `.env.example` and fill in your Stripe keys and base URL.

## Authentication
- Credentials-based auth provided by NextAuth + Prisma Adapter.
- Users can create accounts and workspaces through the sign-up flow
- Each user belongs to a workspace via `Membership`; data queries scope by `workspaceId`.

### Available workflows
- Draft, send, and review invoices with Stripe-hosted payment links.
- Create customers, capture billing details, and review lifetime invoice history.
- Monitor dashboard KPIs (outstanding balance, payment velocity) powered by Prisma queries.
- REST endpoints: `GET/POST /api/invoices`, `GET /api/invoices/:id`, and `POST /api/stripe/webhook` for Stripe event ingestion.

## Project layout
- `app/(dashboard)/*` — authenticated dashboard routes (layout, invoices, payments, settings)
- `app/(auth)/sign-in` — standalone auth entry point
- `app/api/*` — API routes (Stripe webhooks, health checks)
- `components/` — UI kit, forms, layout shell, charts
- `lib/` — utilities, Prisma client, site configuration
- `prisma/` — schema & seed script

## Next steps
- Workspace invites & role management (Owner/Admin/Member) beyond single-user seeds
- Invoice editing lifecycle (edit, void, duplicate) plus PDF/email exports
- Stripe webhook reconciliation with realtime UI updates & payment timelines
- Advanced analytics (cashflow forecasts, retention insights) and automated reminders

Contributions and feedback welcome as we expand the invoicing experience.
