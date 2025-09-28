# Repository Guidelines

## Project Structure & Module Organization
- `app/(dashboard)` serves authenticated layouts for invoices, payments, and settings; `app/(auth)/sign-in` holds the login flow.
- API routes live in `app/api`, with Stripe helpers in `lib/stripe` and database access through `lib/db`.
- Shared UI primitives, forms, and shells sit in `components`; keep reusable utilities and config in `lib`, Prisma schema + seeds in `prisma`, and automation scripts in `scripts`.
- Place static assets in `public`, domain types in `types`, and cross-cutting rules in `eslint.config.mjs` and `tsconfig.json`.

## Build, Test, and Development Commands
- Install deps via `pnpm install`; regenerate the Prisma client after schema edits with `pnpm prisma:generate`.
- Apply local schema changes using `pnpm db:push` (SQLite) or `pnpm prisma:migrate` when coordinating shared databases; load demo data through `pnpm db:seed`.
- Use `pnpm dev` (or `pnpm dev:turbopack`) for the Next.js dev server; validate production output with `pnpm build` and `pnpm start`.
- Run `pnpm lint` before every PR, resorting to `pnpm lint:fix` only for mechanical cleanups.

## Coding Style & Naming Conventions
- Default to 2-space indentation; adopt `PascalCase` for components, `camelCase` for helpers/hooks, and `SCREAMING_SNAKE_CASE` for env constants.
- Prefer module aliases (`@/...`) configured in `tsconfig.json`; avoid deep relative imports.
- Compose Tailwind v4 utilities inline in JSX, extracting reusable patterns into `components/_shared` when needed.
- Keep components lean, documenting props with TypeScript interfaces or `zod` schemas when validation is required.

## Testing Guidelines
- Automated coverage is minimal; colocate new tests beside features (`feature.test.ts`) or in `app/.../__tests__` and add runner scripts to `package.json`.
- Execute the credential smoke test with `pnpm tsx scripts/test-login.ts` after seeding data.
- Seed fixtures should stay deterministic—update `prisma/seed.ts` comments and PR notes when they change.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat(app): add invoice filters`) to keep history searchable.
- Surface database migrations, Stripe configuration updates, and new env keys in commit bodies and PR descriptions.
- PRs should link issues, summarise behavioural changes, and include UI screenshots or recordings when visuals shift.
- Before review, confirm `pnpm lint`, `pnpm build`, and any relevant manual flows (invoice draft, payment link) and state the results.

## Security & Configuration Tips
- Do not commit secrets; copy `.env.example`, store values in `.env`, and document new keys in the PR.
- Stripe webhooks require current signing secrets—note rotation or dashboard prerequisites whenever behaviour changes.
