# CLAUDE.md

Freya Balans — personal finance app. Monorepo `apps/web` + `apps/api`.

## Tech Stack

### Frontend (apps/web)

React + TypeScript + Vite + Tailwind + SWR + React Hook Form + Zod

### Backend (apps/api)

Express + TypeScript + Supabase JS + Zod. Prisma defines schema and migrations; runtime services query Supabase.

### Database

Supabase PostgreSQL schema `freya_balans` (not `public`). RLS for user isolation. Backend Supabase client sets schema in `apps/api/src/lib/supabase.ts`.

## Commands

```bash
# Frontend
cd apps/web && pnpm dev

# Backend
cd apps/api && pnpm dev

# DB migrations
cd apps/api && pnpm prisma:migrate && pnpm prisma:generate
```

## Key Patterns

### Add new feature (CRUD)

1. Route: `apps/api/src/routes/{feature}.ts`
2. Service: `apps/api/src/services/{feature}.service.ts`
3. Schema: `apps/api/src/schemas/{feature}.schema.ts`
4. Frontend page: `apps/web/src/pages/{Feature}.tsx`
5. Add to `App.tsx` routing

### Data fetching (frontend)

- SWR hooks in `apps/web/src/hooks/`
- Frontend uses relative `/api`; Vite proxies to `http://localhost:3001` in development
- Auth: `x-user-id` header (placeholder)

### Business Rules

- Balance = sum of movements (transfers excluded from monthly)
- Card/debt payments = expenses
- Subscription payments = expenses and inherit the subscription category
- Card purchases (`GASTO_TARJETA`) do not affect monthly balance; `PAGO_TARJETA` does
- Budgets = informative only, never block
- Account currency = immutable if has movements
- Discount fund: applies % to gasto, subsidizes fondo_descuento (FONDO_DESCUENTO account), remainder goes to payment method
- Discount fund: supports both direct account gastos and card purchases
- Card purchases with discount: GASTO_TARJETA_CON_DESCUENTO + SUBSIDIO, limit increased by discounted amount only

### Movement Types

`INGRESO`, `GASTO`, `TRANSFERENCIA`, `PAGO_TARJETA`, `GASTO_TARJETA`, `GASTO_TARJETA_CON_DESCUENTO`, `PAGO_DEUDA`, `COBRO_DEUDA`, `SUSCRIPCION`, `INVERSION`, `RETORNO_INVERSION`, `AJUSTE`, `INGRESO_INICIAL`, `GASTO_CON_DESCUENTO`, `SUBSIDIO`

## File Map

```
apps/api/src/routes/     # accounts, movements, cards, debts, suscripciones, inversiones
apps/api/src/services/   # accounts, movements, cards, debts, suscripciones, inversiones, cuentas, inversiones
apps/api/src/schemas/    # movements.schema, accounts.schema, investments.schema, etc.
apps/web/src/pages/      # Dashboard, Movements, Accounts, Cards, Debts, Subscriptions, Investments
apps/web/src/components/ # QuickAdd, MovementsList, EditMovementModal, BottomNav, etc.
apps/web/src/hooks/      # useAccounts, useCards, useMovements, useStats, useAPI, etc.
```

## Constraints

- Budgets: never block transactions
- Transfers: excluded from monthly balance
- Card/debt payments: count as expenses
- Cannot delete accounts/cards with movements
- Account currency: cannot change if has movements

## Daily UX

- `/` is the dashboard: available balance, current-month flow, expense categories, upcoming payments.
- Movement page supports month navigation and filters by type, category, description, account, and card.
- Account/card actions deep-link to `/movements` with `cuenta_id`, `tarjeta_id`, and optional `quick` intent.
- Shared money/date formatting lives in `apps/web/src/lib/financeFormat.ts`.
