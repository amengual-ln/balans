# Agents

## Dev Commands

```bash
pnpm dev          # frontend (3000) + backend (3001) in parallel
pnpm build        # build all
pnpm lint         # lint all
pnpm type-check   # tsc all
pnpm format       # prettier write

cd apps/web && pnpm dev     # frontend only
cd apps/api && pnpm dev     # backend only
cd apps/api && pnpm prisma:generate  # regenerate after schema change
```

## Architecture

- **Monorepo** with pnpm workspaces (`apps/web`, `apps/api`)
- **Backend**: Express + Prisma + Zod, port 3001, ESM
- **Frontend**: React + Vite + Tailwind + Zustand + SWR, port 3000
- **Database**: Supabase PostgreSQL with RLS; Prisma binary targets: `native` + `rhel-openssl-3.0.x`
- **Auth**: `x-user-id` header (placeholder — no real auth)

## Data Fetching (Frontend)

- SWR hooks in `apps/web/src/hooks/`
- API base: `http://localhost:3001/api`
- All requests must include `x-user-id` header

## CRUD Pattern

1. Route: `apps/api/src/routes/{feature}.ts`
2. Service: `apps/api/src/services/{feature}.service.ts`
3. Schema: `apps/api/src/schemas/{feature}.schema.ts`
4. Frontend page: `apps/web/src/pages/{Feature}.tsx`
5. Add to `App.tsx` routing

## Key Business Rules

- **Balance** = sum of movements (transfers excluded from monthly)
- **Card/debt payments** = expenses
- **Budgets** = informative only, never block transactions
- **Account currency** = immutable if has movements
- **Cannot delete** accounts/cards with movements
- **Discount fund**: applies % to GASTO, subsidizes FONDO_DESCUENTO account, remainder goes to payment method. Supports both direct account gastos and card purchases.
- **Card purchases with discount**: creates GASTO_TARJETA_CON_DESCUENTO + SUBSIDIO; limit increased by discounted amount only

## Movement Types

`INGRESO`, `GASTO`, `TRANSFERENCIA`, `PAGO_TARJETA`, `GASTO_TARJETA`, `GASTO_TARJETA_CON_DESCUENTO`, `PAGO_DEUDA`, `COBRO_DEUDA`, `SUSCRIPCION`, `INVERSION`, `RETORNO_INVERSION`, `AJUSTE`, `INGRESO_INICIAL`, `GASTO_CON_DESCUENTO`, `SUBSIDIO`

## Existing Instructions

- `CLAUDE.md` — development patterns and conventions
- `PLAN.md` — implementation status and gaps
- `freya-balans-spec-v2.md` — full feature spec