# CLAUDE.md

Freya Balans — personal finance app. Monorepo `apps/web` + `apps/api`.

## Tech Stack

### Frontend (apps/web)
React + TypeScript + Vite + Tailwind + Zustand + SWR + React Hook Form + Zod

### Backend (apps/api)
Express + TypeScript + Prisma + Zod + Supabase

### Database
Supabase PostgreSQL. RLS for user isolation.

## Commands

```bash
# Frontend
cd apps/web && npm run dev

# Backend
cd apps/api && npm run dev

# DB migrations
cd apps/api && npx prisma migrate dev && npx prisma generate
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
- API base: `http://localhost:3001/api`
- Auth: `x-user-id` header (placeholder)

### Business Rules
- Balance = sum of movements (transfers excluded from monthly)
- Card/debt payments = expenses
- Budgets = informative only, never block
- Account currency = immutable if has movements

### Movement Types
`INGRESO`, `GASTO`, `TRANSFERENCIA`, `PAGO_TARJETA`, `GASTO_TARJETA`, `PAGO_DEUDA`, `SUSCRIPCION`, `INVERSION`, `RETORNO_INVERSION`, `AJUSTE`, `INGRESO_INICIAL`

## File Map

```
apps/api/src/routes/     # accounts, movements, cards, debts, suscripciones, inversiones
apps/api/src/services/   # same 6
apps/web/src/pages/      # Movements, Accounts, Cards, Debts, Subscriptions, Investments
apps/web/src/components/ # 17 components
apps/web/src/hooks/      # 8 hooks
```

## Constraints

- Budgets: never block transactions
- Transfers: excluded from monthly balance
- Card/debt payments: count as expenses
- Cannot delete accounts/cards with movements
- Account currency: cannot change if has movements

## Quick Win

Implement Budgets — follows existing CRUD patterns exactly.
