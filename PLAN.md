# PLAN.md

> Status dashboard. 2026-04-26

---

## Implementation Status

### Backend (apps/api) — 80%

| Feature              | Status    | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| Express + TypeScript | ✅ Done  |                                             |
| Prisma schema        | ✅ Done  | All entities                                |
| Accounts CRUD        | ✅ Done  |                                             |
| Movements CRUD       | ✅ Done  | Quick-add, transfers, card purchases        |
| Cards + Installments | ✅ Done  |                                             |
| Debts CRUD           | ✅ Done  |                                             |
| Subscriptions CRUD   | ✅ Done  |                                             |
| Investments CRUD     | ✅ Done  |                                             |
| **Budgets CRUD**     | ❌ Missing |                                           |
| **Balance endpoints**| ❌ Missing | `/balance/mensual`, `/balance/anual`        |
| **Dashboard endpoint** | ❌ Missing | `/dashboard`                              |
| **AI Insights**      | ❌ Missing |                                           |
| **Currency config**  | ❌ Missing | `/config/monedas`                          |
| Auth                 | ⚠️ Partial | x-user-id header (not Supabase JWT)        |

### Frontend (apps/web) — 80%

| Feature              | Status    | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| React + Vite + TS    | ✅ Done  |                                             |
| Tailwind             | ✅ Done  |                                             |
| Zustand + SWR        | ✅ Done  |                                             |
| React Hook Form + Zod| ✅ Done  |                                             |
| **Dashboard page**   | ❌ Missing | `/` → `/movimientos`                       |
| Movements page       | ✅ Done  |                                             |
| Accounts page        | ✅ Done  |                                             |
| Cards page           | ✅ Done  |                                             |
| Debts page           | ✅ Done  |                                             |
| Subscriptions page   | ✅ Done  |                                             |
| Investments page     | ✅ Done  |                                             |
| **Budgets page**     | ❌ Missing |                                           |
| QuickAdd FAB         | ✅ Done  | Income/expense/transfer                     |
| BottomNav            | ✅ Done  | 4 tabs                                      |
| Loading skeletons    | ✅ Done  |                                             |
| Mobile responsive    | ✅ Done  |                                             |
| **Dark mode**        | ❌ Missing |                                           |
| **AI Insights UI**  | ❌ Missing |                                           |
| **PWA**             | ⚠️ Deps installed | Not configured                           |

### Database — ✅ DONE

All entities in Prisma schema:
Usuario, Cuenta, Tarjeta, Movimiento, CompraEnCuotas, Cuota, Deuda, PagoDeuda, Inversion, PrecioMercado, Presupuesto, ConfiguracionMoneda, Suscripcion

---

## Critical Gaps

1. **No Dashboard** — `/` redirects to `/movimientos`. Needs: total balance, card limits, budget status, upcoming payments, AI insights
2. **No Budgets** — No CRUD API, no frontend page, no progress bars
3. **No AI Insights** — MVP feature completely missing
4. **Auth placeholder** — x-user-id header instead of Supabase JWT
5. **No tests** — E2E, unit tests missing

---

## Quick Wins

- [ ] Create Dashboard page aggregating existing data
- [ ] Implement Budgets CRUD (follows existing patterns exactly)
- [ ] Add dark mode toggle
- [ ] Enable PWA manifest

---

## Recommended Next Steps

### Immediate
- Dashboard page (`/`)
- Budgets page + API endpoints

### Short Term
- Supabase Auth integration
- Basic unit tests
- PWA config

### Medium Term
- AI Insights endpoint + UI
- Balance endpoints (`/balance/mensual`, `/balance/anual`)
- CSV export

---

## File Inventory

```
apps/api/src/routes/      # 6 routes
apps/api/src/services/    # 6 services
apps/api/prisma/schema    # complete
apps/web/src/pages/        # 6 pages (no Dashboard, no Budgets)
apps/web/src/components/   # 17 components
apps/web/src/hooks/       # 8 hooks
```

---

## Env

```
Node.js: >= 18.0.0
pnpm: >= 8.0.0
```

### Key Deps
- Frontend: React 18, Vite 5, Tailwind 3.4, Zustand 4.5, SWR 2.4
- Backend: Express 4.18, Prisma 5.9, Zod 3.22
