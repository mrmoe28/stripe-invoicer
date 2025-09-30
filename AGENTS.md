# Repository Guidelines

## Project Structure & Module Organization
- Next.js app routes live under `app/`; `app/(dashboard)` handles authenticated layouts for invoices, payments, and settings, while `app/(auth)/sign-in` provides the login flow.
- API handlers sit in `app/api`; Stripe helpers are in `lib/stripe`, database utilities in `lib/db`, and shared UI primitives in `components`.
- Persist Prisma schema, seeds, and migrations in `prisma`; place reusable configs and utilities in `lib`, static assets in `public`, and domain types in `types`.
- Limit automation scripts to `scripts/` and keep cross-cutting rules in `eslint.config.mjs` and `tsconfig.json`.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies; run after cloning or changing lockfiles.
- `pnpm dev` (or `pnpm dev:turbopack`) launches the Next.js dev server; `pnpm build` + `pnpm start` validate the production bundle.
- Database edits require `pnpm prisma:generate` to refresh the client, `pnpm db:push` for local schema sync, and `pnpm db:seed` for deterministic fixtures.
- Execute the credential smoke test with `pnpm tsx scripts/test-login.ts` after seeding data.

## Coding Style & Naming Conventions
- Use 2-space indentation and TypeScript/React best practices; prefer module aliases like `@/components/Button` over deep relative paths.
- Components are `PascalCase`, helpers/hooks stay `camelCase`, and environment constants use `SCREAMING_SNAKE_CASE`.
- Compose Tailwind v4 utilities inline; extract repeated combinations into `components/_shared`. Rely on `pnpm lint` before submitting changes.

## Testing Guidelines
- Co-locate new tests beside features (e.g., `app/payments/__tests__/summary.test.ts`) or use `feature.test.ts` naming.
- Maintain deterministic seeds and extend coverage gradually; document new scenarios in PR notes.
- Run `pnpm lint` and any relevant test scripts locally before review.

## Commit & Pull Request Guidelines
- Follow Conventional Commits, e.g., `feat(app): add invoice filters`; highlight database migrations, Stripe updates, or new env keys in bodies.
- PRs should link issues, summarise behavioural changes, and include UI screenshots or recordings when visuals shift.
- Confirm `pnpm lint`, `pnpm build`, and core manual flows (invoice draft, payment link) before requesting review.

## Security & Configuration Tips
- Never commit secrets; copy `.env.example` to `.env` and document new keys in PRs.
- Keep Stripe webhook signing secrets current and note any dashboard prerequisites when behaviour changes.
