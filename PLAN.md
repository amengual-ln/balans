# Freya Balans - Project Status

> Last updated: 2026-04-11  
> Based on: `freya-balans-spec-v2.md` (v2.0, Feb 2025)

---

## Overview

**Freya Balans** is a minimalist personal finance management app with complete transaction traceability.

---

## Implementation Status

### Backend (apps/api) - IN PROGRESS

| Feature                     | Status     | Notes                                            |
| --------------------------- | ---------- | ------------------------------------------------ |
| Express + TypeScript setup  | ✅ Done    |                                                  |
| Prisma ORM + PostgreSQL     | ✅ Done    | Schema has all entities                          |
| Accounts CRUD               | ✅ Done    | `apps/api/src/routes/accounts.ts`                |
| Movements CRUD              | ✅ Done    | Quick-add, transfers, card purchases             |
| Credit Cards + Installments | ✅ Done    | `apps/api/src/routes/cards.ts`                   |
| Debts CRUD                  | ✅ Done    | `apps/api/src/routes/debts.ts`                   |
| Subscriptions CRUD          | ✅ Done    | `apps/api/src/routes/suscripciones.ts`           |
| Investments CRUD            | ✅ Done    | `apps/api/src/routes/inversiones.ts`             |
| **Budgets CRUD**            | ❌ Missing |                                                  |
| **Balance Endpoints**       | ❌ Missing | `/api/balance/mensual`, `/api/balance/anual`     |
| **Dashboard Endpoint**      | ❌ Missing | `/api/dashboard`                                 |
| **AI Insights**             | ❌ Missing | `/api/insights/generar`, `/api/insights/ultimos` |
| **Currency Config**         | ❌ Missing | `/api/config/monedas`                            |
| Supabase Auth               | ⚠️ Partial | Using x-user-id header (not JWT)                 |
| Zod Validation              | ✅ Done    | All routes                                       |
| Health Check                | ✅ Done    | `/health`                                        |

### Frontend (apps/web) - IN PROGRESS

| Feature                       | Status     | Notes                    |
| ----------------------------- | ---------- | ------------------------ |
| React + Vite + TypeScript     | ✅ Done    |                          |
| Tailwind CSS                  | ✅ Done    | Nordic-inspired design   |
| State Management (Zustand)    | ✅ Done    |                          |
| Data Fetching (SWR)           | ✅ Done    |                          |
| Forms (React Hook Form + Zod) | ✅ Done    |                          |
| **Dashboard Page**            | ❌ Missing | Redirects to /movements  |
| Movements Page                | ✅ Done    | With monthly balance     |
| Accounts Page                 | ✅ Done    |                          |
| Cards Page                    | ✅ Done    |                          |
| Debts Page                    | ✅ Done    |                          |
| Subscriptions Page            | ✅ Done    |                          |
| Investments Page              | ✅ Done    |                          |
| **Budgets Page**              | ❌ Missing |                          |
| **QuickAdd FAB**              | ✅ Done    | Income/expense/transfer  |
| **Keyboard Shortcuts**        | ✅ Done    | `+`, `-`, `Enter`, `Esc` |
| Bottom Navigation             | ✅ Done    | 4 tabs                   |
| Toast Notifications           | ✅ Done    |                          |
| Loading Skeletons             | ✅ Done    |                          |
| Mobile Responsive             | ✅ Done    |                          |
| **Dark Mode**                 | ❌ Missing |                          |
| **AI Insights UI**            | ❌ Missing |                          |

### Database (Prisma Schema) - DONE

All entities from spec are implemented:

- ✅ Usuario
- ✅ Cuenta (with FONDO_DESCUENTO type added)
- ✅ Tarjeta
- ✅ Movimiento (all movement types)
- ✅ CompraEnCuotas
- ✅ Cuota
- ✅ Deuda (with DireccionDeuda enum)
- ✅ PagoDeuda
- ✅ Inversion (with ticker, sector, tipo_liquidez)
- ✅ PrecioMercado
- ✅ Presupuesto
- ✅ ConfiguracionMoneda
- ✅ Suscripcion

---

## Spec Requirements vs Implementation

### Phase 1: MVP Core - PARTIAL (80%)

| Requirement                                               | Status                         |
| --------------------------------------------------------- | ------------------------------ |
| Project setup (monorepo, Vite, Express, Prisma, Supabase) | ✅ Done                        |
| Core entities (accounts, basic movements)                 | ✅ Done                        |
| Credit cards with installments                            | ✅ Done                        |
| Advanced movements (transfers, categorization)            | ✅ Done                        |
| Debts and budgets                                         | ⚠️ Debts done, Budgets missing |
| Responsive design, Quick Add, deployment                  | ✅ Done                        |

### Phase 2: Advanced Features - NOT STARTED

| Feature                     | Status                       |
| --------------------------- | ---------------------------- |
| Investments CRUD            | ✅ Done                      |
| AI insights (Claude API)    | ❌ Missing                   |
| Custom categories           | ⚠️ Hardcoded categories only |
| Advanced keyboard shortcuts | ✅ Basic done                |
| CSV export                  | ❌ Missing                   |

### Phase 3: Optimizations - NOT STARTED

| Feature                                  | Status                                   |
| ---------------------------------------- | ---------------------------------------- |
| Visualizations (bar charts, mini-graphs) | ❌ Missing                               |
| PWA                                      | ⚠️ PWA deps installed but not configured |
| Dark mode                                | ❌ Missing                               |
| ML for category suggestions              | ❌ Missing                               |

---

## Critical Gaps

1. **No Dashboard page** - The app redirects from `/` to `/movements`. The spec requires a Dashboard showing:
   - Total balance
   - Card limits summary
   - Budget status
   - Upcoming commitments
   - AI insights

2. **No Budgets implementation** - Budgets are a core feature but:
   - No CRUD API endpoints
   - No frontend page
   - No progress bars or visual alerts

3. **No AI Insights** - Listed as MVP feature but completely missing

4. **Auth is not real** - Using x-user-id header instead of proper JWT from Supabase Auth

5. **No tests** - No E2E tests, no unit tests

---

## Quick Win Opportunities

1. Add Dashboard page with existing data (use useStats hook)
2. Implement Budgets CRUD (simple given existing patterns)
3. Add dark mode toggle
4. Enable PWA manifest

---

## Recommended Next Steps

### Immediate (Quick Wins)

- [ ] Create Dashboard page (`/`) aggregating all data
- [ ] Add Budgets page + API endpoints
- [ ] Implement dark mode

### Short Term

- [ ] Set up proper Supabase Auth integration
- [ ] Add basic unit tests
- [ ] Configure PWA

### Medium Term

- [ ] Implement AI Insights endpoint + UI
- [ ] Add CSV export
- [ ] Category management

---

## File Inventory

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/         ✅ 6 routes (accounts, movements, cards, debts, suscripciones, inversiones)
│   │   ├── services/       ✅ 6 services
│   │   ├── schemas/        ✅ 5 schemas
│   │   ├── lib/            ✅ supabase.ts, db.ts
│   │   ├── types/          ✅ index.ts
│   │   └── app.ts          ✅ Express setup
│   └── prisma/
│       └── schema.prisma   ✅ Complete schema
│
└── web/
    └── src/
        ├── pages/          ✅ 6 pages
        ├── components/     ✅ 16 components
        ├── hooks/          ✅ 8 hooks
        ├── lib/            ✅ supabase.ts
        └── App.tsx         ✅ Router setup
```

---

## Testing Status

| Area                  | Status                     |
| --------------------- | -------------------------- |
| Manual testing        | ✅ Users have been testing |
| E2E tests             | ❌ Missing                 |
| Unit tests            | ❌ Missing                 |
| API integration tests | ❌ Missing                 |

---

## Environment

```
Node.js: >= 18.0.0
pnpm: >= 8.0.0
Package Manager: pnpm@10.12.1
```

### Key Dependencies

- Frontend: React 18, Vite 5, Tailwind 3.4, Zustand 4.5, SWR 2.4, Supabase 2.39
- Backend: Express 4.18, Prisma 5.9, Zod 3.22, Supabase 2.39

---

## Notes

- Project follows spec closely for data model
- QuickAdd component exceeds spec requirements (includes discount fund feature)
- Investments module was recently completed (last commits)
- Some custom additions: `FONDO_DESCUENTO` account type, `DireccionDeuda` enum
- Auth is placeholder - needs Supabase Auth integration

---

## Bug Fixes

### 2026-04-12: Subscription Payment Not Updating Account Balance

**Symptoms:** Subscription payment succeeds and creates a movement, but account balance doesn't reflect the change.

**Root Cause:**

1. Migration file didn't specify `freya_balans` schema (tables created in `public` by default)
2. Migration was incomplete - missing `SUSCRIPCION` type in `TipoMovimiento` enum
3. Missing `suscripciones` and `precios_mercado` tables in migration
4. `SUSCRIPCION` type not included in `calculateAccountBalance` switch statement

**Fixes Applied:**

1. Created new migration `20260412000000_freya_balans_schema` with:
   - All tables in `freya_balans` schema
   - Complete enum types including `SUSCRIPCION`
   - All tables: `usuarios`, `cuentas`, `tarjetas`, `movimientos`, `compras_en_cuotas`, `cuotas`, `deudas`, `pagos_deuda`, `inversiones`, `precios_mercado`, `presupuestos`, `configuraciones_moneda`, `suscripciones`
2. Updated `apps/api/src/services/accounts.service.ts`:
   - Added `SUSCRIPCION` to balance calculation switch statement
3. Updated `apps/api/src/services/suscripciones.service.ts`:
   - Added console logging for balance updates
   - Better error handling with explicit error messages

**To Apply Fix:**

```bash
cd apps/api
# Option 1: Run the new migration (if tables don't exist)
npx prisma migrate deploy

# Option 2: If tables exist but missing columns:
# Use Supabase SQL Editor to run the missing ALTER statements

# Option 3: Fresh start (WARNING: deletes all data)
npx prisma migrate reset
```
