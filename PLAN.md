# PLAN.md

> Status dashboard. 2026-08-05

---

## Implementation Status

### Backend (apps/api) — 85%

| Feature                             | Status     | Notes                                  |
| ----------------------------------- | ---------- | -------------------------------------- |
| Express + TypeScript                | ✅ Done    |                                        |
| Prisma schema                       | ✅ Done    | All entities                           |
| Accounts CRUD                       | ✅ Done    |                                        |
| Movements CRUD                      | ✅ Done    | Quick-add, transfers, card purchases   |
| Cards + Installments                | ✅ Done    |                                        |
| Debts CRUD                          | ✅ Done    |                                        |
| Subscriptions CRUD                  | ✅ Done    |                                        |
| Investments CRUD                    | ✅ Done    |                                        |
| **Discount fund on card purchases** | ✅ Done    | GASTO_TARJETA_CON_DESCUENTO + SUBSIDIO |
| **Budgets CRUD**                    | ❌ Missing |                                        |
| **Balance endpoints**               | ❌ Missing | `/balance/mensual`, `/balance/anual`   |
| **Dashboard endpoint**              | ❌ Missing | `/dashboard`                           |
| **AI Insights**                     | ❌ Missing |                                        |
| **Currency config**                 | ❌ Missing | `/config/monedas`                      |
| Auth                                | ⚠️ Partial | x-user-id header (not Supabase JWT)    |

### Frontend (apps/web) — 90%

| Feature                   | Status     | Notes                                                      |
| ------------------------- | ---------- | ---------------------------------------------------------- |
| React + Vite + TS         | ✅ Done    |                                                            |
| Tailwind                  | ✅ Done    |                                                            |
| SWR data fetching         | ✅ Done    |                                                            |
| React Hook Form + Zod     | ✅ Done    |                                                            |
| **Dashboard page**        | ✅ Done    | `/`: balances, monthly flow, categories, upcoming payments |
| Movements page            | ✅ Done    |                                                            |
| Accounts page             | ✅ Done    |                                                            |
| Cards page                | ✅ Done    |                                                            |
| Debts page                | ✅ Done    |                                                            |
| Subscriptions page        | ✅ Done    |                                                            |
| Investments page          | ✅ Done    |                                                            |
| **Budgets page**          | ❌ Missing |                                                            |
| QuickAdd FAB              | ✅ Done    | Income/expense/transfer + card purchases + discount fund   |
| BottomNav                 | ✅ Done    | Inicio, Movimientos, Suscripciones + overflow              |
| Monthly movement UX       | ✅ Done    | Month navigation, filters, account/card context            |
| Operational screen UX     | ✅ Done    | Summary banners, due states, contextual actions            |
| Loading skeletons         | ✅ Done    |                                                            |
| Mobile responsive         | ✅ Done    |                                                            |
| **Discount fund on card** | ✅ Done    | Card purchases with fondo descuento support                |
| **Dark mode**             | ❌ Missing |                                                            |
| **AI Insights UI**        | ❌ Missing |                                                            |
| **PWA**                   | ✅ Minimal | Manifest, icons, installable network-only service worker   |

### Database — ✅ DONE

All entities in Prisma schema:
Usuario, Cuenta, Tarjeta, Movimiento, CompraEnCuotas, Cuota, Deuda, PagoDeuda, Inversion, PrecioMercado, Presupuesto, ConfiguracionMoneda, Suscripcion

---

## Critical Gaps

1. **No Budgets** — No CRUD API, frontend page, or progress bars
2. **No AI Insights** — Feature not implemented
3. **Auth placeholder** — x-user-id header instead of Supabase JWT
4. **No dedicated dashboard endpoint** — Frontend aggregates existing endpoints
5. **Test coverage incomplete** — Unit/component tests exist; no E2E suite

---

## Quick Wins

- [ ] Implement Budgets CRUD (follows existing patterns exactly)
- [ ] Add dark mode toggle

---

## Recommended Next Steps

### Immediate

- Budgets page + API endpoints
- Stabilize existing tests and lint baseline

### Short Term

- Supabase Auth integration
- Expand unit/component coverage and add E2E tests

### Medium Term

- AI Insights endpoint + UI
- Balance endpoints (`/balance/mensual`, `/balance/anual`)
- CSV export

---

## File Inventory

```
apps/api/src/routes/      # 6 routes + movements/compra-tarjeta-descuento
apps/api/src/services/    # 6 services + movements.service (with discount fund methods)
apps/api/prisma/schema    # complete, all movement types
apps/web/src/pages/        # 7 pages (Dashboard included; no Budgets)
apps/web/src/components/   # QuickAdd, MovementsList, EditMovementModal, BottomNav + others
apps/web/src/hooks/        # 9 SWR/API hooks
```

---

## Env

```
Node.js: >= 18.0.0
pnpm: >= 8.0.0
```

### Key Deps

- Frontend: React 18, Vite 5, Tailwind 3.4, SWR 2.4
- Backend: Express 4.18, Prisma 5.9, Zod 3.22
