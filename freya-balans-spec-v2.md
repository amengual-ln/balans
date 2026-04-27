# SPEC - Freya Balans

> v2.0 condensed. opencode/minimax adaptation. 2026-04-26

---

## Core Features

### Done
- Account management (bank, wallet, broker, cash, discount fund)
- Movement tracking (income, expense, transfer, card purchase, debt payment, subscription)
- Credit cards with installment tracking
- Debt management
- Subscriptions (recurring payments)
- Investments (stocks, bonds, crypto, fixed deposits)

### Missing
- Budgets CRUD + UI
- Dashboard page + endpoint
- AI Insights
- Balance endpoints (monthly, annual)
- Currency config endpoint
- Dark mode
- PWA

---

## Data Model

### Entities
```
Usuario { id, email, nombre, moneda_principal }
Cuenta { id, usuario_id, nombre, tipo, moneda, saldo_actual, activa }
Tarjeta { id, cuenta_id, nombre, tipo, limite_total, limite_comprometido, dia_cierre, dia_vencimiento }
Movimiento { id, tipo, cuenta_id, monto, descripcion, categoria, fecha, moneda, tasa_conversion, movimiento_relacionado_id }
CompraEnCuotas { id, tarjeta_id, movimiento_id, monto_total, cantidad_cuotas, monto_por_cuota, cuotas_pagadas }
Cuota { id, compra_id, numero_cuota, monto, fecha_vencimiento, pagada }
Deuda { id, tipo, acreedor, monto_total, monto_pendiente, cantidad_cuotas, monto_cuota }
Suscripcion { id, nombre, monto, frecuencia, dia_pago, proxima_fecha_pago, activa }
Inversion { id, tipo, ticker, descripcion, sector, monto_invertido, monto_recuperado, cantidad, precio_por_unidad, estado }
Presupuesto { id, categoria, monto_limite, periodo, moneda, activo }
ConfiguracionMoneda { id, moneda, tasa_a_principal }
```

### Movement Types
`INGRESO`, `GASTO`, `TRANSFERENCIA`, `PAGO_TARJETA`, `GASTO_TARJETA`, `PAGO_DEUDA`, `SUSCRIPCION`, `INVERSION`, `RETORNO_INVERSION`, `AJUSTE`, `INGRESO_INICIAL`

---

## Business Rules

### RN-001: Account Balance
```
saldo_actual = saldo_inicial
  + SUM(ingresos) + SUM(retornos_inversion)
  - SUM(gastos) - SUM(pagos_tarjeta) - SUM(pagos_deuda) - SUM(inversiones)
  - SUM(transferencias_salida) + SUM(transferencias_entrada) + SUM(ajustes)
```

### RN-002: Card Limit
```
limite_comprometido = SUM(compras_en_cuotas.monto_total WHERE cuotas_pagadas < cantidad_cuotas)
limite_disponible = limite_total - limite_comprometido
```

### RN-003: Monthly Balance
```
ingresos_mes = SUM(movimientos WHERE tipo IN (INGRESO, RETORNO_INVERSION))
gastos_mes = SUM(movimientos WHERE tipo IN (GASTO, GASTO_TARJETA, PAGO_TARJETA, PAGO_DEUDA, INVERSION, SUSCRIPCION))
balance_mes = ingresos_mes - gastos_mes
```
**Transfers excluded from monthly balance.**

### RN-004: Installment Purchase
1. Create `GASTO_TARJETA` movement
2. Create `CompraEnCuotas` + N `Cuota` records
3. Increase `limite_comprometido` by `monto_total`
4. First installment counts toward current period balance

### RN-005: Card Payment
1. Create `PAGO_TARJETA` movement
2. Reduce account balance
3. Mark installments paid (oldest first)
4. Release `limite_comprometido` for fully paid purchases

### RN-006: Subscription Payment
1. User triggers via `/pagar` endpoint (no auto-charging)
2. Create `SUSCRIPCION` movement
3. Advance `proxima_fecha_pago` by frequency

---

## API Endpoints

### Accounts
```
GET    /api/cuentas
POST   /api/cuentas
GET    /api/cuentas/:id
PUT    /api/cuentas/:id
DELETE /api/cuentas/:id
POST   /api/cuentas/:id/ajustar
```

### Cards
```
GET    /api/tarjetas
POST   /api/tarjetas
GET    /api/tarjetas/:id
PUT    /api/tarjetas/:id
DELETE /api/tarjetas/:id
GET    /api/tarjetas/:id/cuotas-pendientes
GET    /api/tarjetas/:id/saldo-a-pagar
```

### Movements
```
GET    /api/movimientos
POST   /api/movimientos/quick
POST   /api/movimientos/ingreso
POST   /api/movimientos/gasto
POST   /api/movimientos/transferencia
POST   /api/movimientos/compra-tarjeta
POST   /api/movimientos/pago-tarjeta
DELETE /api/movimientos/:id
```

### Debts
```
GET    /api/deudas
POST   /api/deudas
PUT    /api/deudas/:id
DELETE /api/deudas/:id
POST   /api/deudas/:id/pagar
```

### Subscriptions
```
GET    /api/suscripciones
POST   /api/suscripciones
PUT    /api/suscripciones/:id
DELETE /api/suscripciones/:id
POST   /api/suscripciones/:id/pagar
GET    /api/suscripciones/proximos?dias=30
```

### Investments
```
GET    /api/inversiones
POST   /api/inversiones
PUT    /api/inversiones/:id
DELETE /api/inversiones/:id
POST   /api/inversiones/:id/retorno
POST   /api/inversiones/:id/precio
GET    /api/inversiones/:id/precio-history
```

### MISSING (not implemented)
```
GET    /api/presupuestos
POST   /api/presupuestos
PUT    /api/presupuestos/:id
DELETE /api/presupuestos/:id
GET    /api/presupuestos/estado

GET    /api/balance/mensual?periodo=YYYY-MM
GET    /api/balance/anual?year=YYYY
GET    /api/dashboard

POST   /api/insights/generar
GET    /api/insights/ultimos

GET    /api/config/monedas
PUT    /api/config/monedas/:moneda
```

---

## Tech Stack

### Frontend
React + TypeScript + Vite + Tailwind + Zustand + SWR + React Hook Form + Zod

### Backend
Express + TypeScript + Prisma + Zod + Supabase

### Database
Supabase PostgreSQL with RLS

---

## UI Principles

- Minimalist Nordic design
- Numbers prominent (balances, amounts)
- Generous whitespace
- Semantic colors: green (positive), red (negative), yellow (warning)
- Mobile-first responsive
- QuickAdd FAB: <5 sec to log expense
- Skeleton loaders, toast notifications
- BottomNav: 4 tabs

---

## Constraints

- Budgets: informative only, never block transactions
- Transfers: excluded from monthly balance
- Card/debt payments: count as expenses
- Account currency: cannot change if has movements
- Card payment: cannot exceed debt
- Cannot delete accounts/cards with movements

---

## Success Metrics

- Expense logging: <5 seconds
- Initial load: <2s
- API response: <200ms p95
- Balance accuracy: matches bank statements
