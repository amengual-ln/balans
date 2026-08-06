# AGENTS.md

Instructions for AI agents working on Freya Balans.

## Required modes and skills

- **Ponytail mode is required.** Always operate in ponytail mode (full intensity by default). If it is not active, activate it first by invoking `/ponytail full`.
- **Caveman mode is required alongside ponytail.** Use caveman communication to keep responses terse and token-efficient while maintaining technical accuracy.
- **Frontend/design tasks use the `design-taste-frontend` skill.** For any web component, page, UI, or design task, load and follow `design-taste-frontend`. If unavailable, use the installed `frontend-design` skill as fallback.

## Before you start

1. Read this file first.
2. Check `README.md`, `CLAUDE.md`, `PLAN.md`, `freya-balans-spec-v2.md`, and any relevant docs for project context.
3. Read relevant code before editing. Trace actual flow end-to-end.

## How to work

- **Understand first.** Do not edit until you know what code does and who calls it.
- **Prefer small diffs.** Edit existing files; do not rewrite them from scratch unless asked.
- **Use standard tools.** Use stdlib or already-installed dependencies before adding new ones.
- **No speculative abstractions.** No interface with one implementation, no factory for one product, no config for a value that never changes.
- **Reuse existing patterns.** Match naming, structure, and conventions already in repo.
- **Fix root causes.** One guard in shared function beats one guard in every caller.
- **Leave a check.** For non-trivial logic, add one small runnable check so next person can verify it still works.
- **Verify before finishing.** Run relevant tests, linter, type-check, or build before declaring done.
- **Rework sparingly.** Avoid unrelated refactors or auto-fixes.
- **Challenge assumptions.** Question weak plans and suggest better approaches or architecture when useful.

## What to avoid

- Boilerplate or scaffolding "for later."
- Clever one-liners that require explanation.
- New dependencies for functionality a few lines can cover.
- Patching only reported symptom without checking sibling callers.
- Explanations, comments, or extra data unless needed or requested.

## Security and safety

- Never skip input validation at trust boundaries.
- Never expose secrets, tokens, or credentials.
- Do not weaken error handling that prevents data loss.
- If request conflicts with safety or ethics, explain why and stop.

## Communication

- Be concise. Explain change and any skipped alternatives in few lines.
- Show file paths clearly when modifying files.
- Ask for clarification when request is vague or could cause harm.

## Git policy

- **NEVER commit, push, or open PRs unless explicitly asked.**
- **NEVER ask** "¿querés que commitee?" / "shall I commit?" / "should I push?"
- If user wants a commit or push, they will ask.

## Testing

- All new features require tests to maintain coverage and avoid regressions.
- Keep tests focused: one small runnable check per non-trivial logic path.

## Dev commands

```bash
pnpm dev          # frontend (3000) + backend (3001) in parallel
pnpm build        # build all
pnpm lint         # lint all
pnpm type-check   # tsc all
pnpm format       # prettier write

cd apps/web && pnpm dev
cd apps/api && pnpm dev
cd apps/api && pnpm prisma:generate
```

## Architecture

- **Monorepo:** pnpm workspaces (`apps/web`, `apps/api`).
- **Backend:** Express + Supabase JS + Zod, port 3001, ESM; Prisma defines schema/migrations.
- **Frontend:** React + Vite + Tailwind + SWR, port 3000.
- **Database:** Supabase PostgreSQL with RLS; Prisma binary targets `native` + `rhel-openssl-3.0.x`.
- **Auth:** `x-user-id` header (placeholder; no real auth yet).

## Supabase access

- Application data lives in PostgreSQL schema **`freya_balans`**, not `public`.
- Backend client already sets `db: { schema: 'freya_balans' }` in `apps/api/src/lib/supabase.ts`.
- Manual Supabase JS queries must use `.schema('freya_balans')` before `.from(...)`.
- Direct SQL must qualify tables, for example `freya_balans.movimientos`.
- Backend credentials live in `apps/api/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`. Never print or expose their values.
- Service-role key is backend/maintenance only; never send it to frontend code.
- Before maintenance updates: query exact rows first, scope by user/date/type/IDs, update only confirmed rows, then verify affected count and values.

## Project patterns

- Frontend SWR hooks live in `apps/web/src/hooks/`.
- Frontend uses relative `/api`; Vite proxies it to `http://localhost:3001` in development.
- Every API request must include `x-user-id`.
- Shared money/date formatting lives in `apps/web/src/lib/financeFormat.ts`.
- `/` is the daily dashboard; operational screens can open filtered movements with `cuenta_id` or `tarjeta_id`, and QuickAdd intents with `quick=transfer|card`.
- CRUD flow:
  1. Route: `apps/api/src/routes/{feature}.ts`
  2. Service: `apps/api/src/services/{feature}.service.ts`
  3. Schema: `apps/api/src/schemas/{feature}.schema.ts`
  4. Frontend page: `apps/web/src/pages/{Feature}.tsx`
  5. Route registration in `apps/web/src/App.tsx`

## Business rules

- **Balance:** sum of movements; transfers excluded from monthly balance.
- **Card/debt payments:** expenses.
- **Subscription payments:** expenses; payment movement inherits subscription category.
- **Card purchases:** `GASTO_TARJETA` does not affect monthly balance; `PAGO_TARJETA` does.
- **Budgets:** informative only; never block transactions.
- **Account currency:** immutable after account has movements.
- **Deletion:** accounts/cards with movements cannot be deleted.
- **Discount fund:** applies percentage to `GASTO`, subsidizes `FONDO_DESCUENTO` account, and charges remainder to payment method. Supports direct account expenses and card purchases.
- **Discounted card purchase:** creates `GASTO_TARJETA_CON_DESCUENTO` + `SUBSIDIO`; committed card limit increases by discounted amount only.

## Movement types

`INGRESO`, `GASTO`, `TRANSFERENCIA`, `PAGO_TARJETA`, `GASTO_TARJETA`, `GASTO_TARJETA_CON_DESCUENTO`, `PAGO_DEUDA`, `COBRO_DEUDA`, `SUSCRIPCION`, `INVERSION`, `RETORNO_INVERSION`, `AJUSTE`, `INGRESO_INICIAL`, `GASTO_CON_DESCUENTO`, `SUBSIDIO`

## Existing project docs

- `CLAUDE.md` — development patterns and conventions.
- `PLAN.md` — implementation status and gaps.
- `freya-balans-spec-v2.md` — full feature spec.
