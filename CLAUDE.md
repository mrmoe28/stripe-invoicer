# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Ledgerflow is a Stripe-connected invoicing dashboard that helps service teams draft invoices, automate payment links, and monitor cashflow from one workspace.

## Tech Stack
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: Prisma ORM with PostgreSQL (NeonDB)
- **Payment Processing**: Stripe API + Payment Links (webhook-ready)
- **Styling**: Tailwind CSS v4 with shadcn-inspired component kit
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NextAuth v4 with Prisma Adapter (credentials-based)

## Essential Commands

### Development
```bash
pnpm dev              # Start development server
pnpm dev:turbopack    # Start with Turbopack (experimental faster bundler)
```

### Database
```bash
pnpm prisma:generate  # Generate Prisma client after schema changes
pnpm prisma:migrate   # Create and apply migrations
pnpm db:push         # Push schema to database (development)
pnpm db:seed         # Seed database with sample data
```

### Build & Deployment
```bash
pnpm build           # Production build
pnpm start           # Start production server
```

### Code Quality
```bash
pnpm lint            # Run ESLint
pnpm lint:fix        # Fix auto-fixable linting issues
```

## Architecture

### Route Structure
- **`app/(dashboard)/*`**: Authenticated dashboard routes with shared layout
  - Core sections: invoices, customers, payments, settings
  - Protected by auth middleware
  - Workspace-scoped data queries
  
- **`app/(auth)/sign-in`**: Standalone authentication page
  - Users can create accounts or sign in with existing credentials
  
- **`app/api/*`**: API endpoints
  - `/api/auth/*`: NextAuth handlers
  - `/api/invoices`: Invoice CRUD operations
  - `/api/stripe/webhook`: Stripe event processing
  - `/api/health`: Health check endpoint

### Data Model & Multi-tenancy
- **Workspace-based isolation**: All business data (customers, invoices, payments) belongs to a Workspace
- **User membership**: Users access workspaces through Membership records with role-based permissions (OWNER/ADMIN/MEMBER)
- **Session enhancement**: NextAuth session includes `workspaceId` and `workspaceName` for efficient queries
- **Scoped queries**: All data fetching uses `getCurrentWorkspace()` to ensure proper isolation

### Key Services (`lib/services/`)
- **`invoice-service.ts`**: Invoice creation, status updates, Stripe payment link generation
- **`customer-service.ts`**: Customer management with Stripe customer sync
- **`payment-service.ts`**: Payment tracking and webhook reconciliation
- **`workspace-service.ts`**: Workspace and membership management

### Authentication Flow
- Built on NextAuth with custom credentials provider
- Session includes workspace context for all requests
- Protected routes use `getCurrentUser()` and `getCurrentWorkspace()` utilities
- Automatic redirection to sign-in for unauthenticated requests

### Stripe Integration
- Payment Links for invoice collection (no embedded checkout)
- Webhook endpoint at `/api/stripe/webhook` for event processing
- Customer sync between local database and Stripe
- Invoice status reconciliation based on payment events
- Payment success redirect to `/payment-success?invoice=<invoiceId>`

#### Payment Flow
1. Invoice created with `enablePaymentLink: true`
2. Stripe Payment Link generated via `maybeCreateStripePaymentLink()`
3. Payment link stored in `invoice.paymentLinkUrl`
4. Email sent with "Pay Invoice Now" button linking to Stripe payment page
5. After payment, Stripe redirects to `/payment-success?invoice=<invoiceId>`
6. Stripe webhook updates invoice status to PAID

#### Development Payment Testing
For local development with real Stripe payments:
1. Use ngrok to expose localhost: `ngrok http 3001`
2. Set `STRIPE_REDIRECT_BASE_URL` to your ngrok URL in `.env`
3. This ensures Stripe can redirect back after payment completion

## Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string (NeonDB)
- `NEXTAUTH_URL`: Base URL for authentication callbacks
- `NEXTAUTH_SECRET`: Secret for JWT signing
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook endpoint secret
- `NEXT_PUBLIC_APP_URL`: Public-facing application URL

## Testing Locally
1. Set up environment variables in `.env` file
2. Initialize database: `pnpm prisma:generate && pnpm db:push`
3. Clear/reset data: `pnpm db:seed`
4. Start dev server: `pnpm dev`
5. Access at `http://localhost:3001`
6. Create new account and workspace