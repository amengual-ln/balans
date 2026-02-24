# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Freya Balans** is a minimalist personal finance management web application for tracking all money movements with complete traceability. Part of the Freya ecosystem, the name "Balans" comes from Nordic languages meaning "balance."

### Core Principles
- Complete traceability: Every money movement is recorded and auditable
- Multi-account and multi-currency support
- Future commitments management (installments, recurring payments)
- Informative budgets (non-restrictive)
- AI-powered insights
- Minimalist and fast UX: Clean interface optimized for quick data entry (<5 seconds target for expense logging)

## Technology Stack

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling (minimalist Nordic design)
- **Zustand** for state management
- **React Hook Form + Zod** for form validation
- Mobile-first responsive design

### Backend
- **Node.js** with **Express** or **Fastify**
- **Prisma ORM** connected to Supabase PostgreSQL
- **Zod** for validation
- **Supabase Auth** for authentication

### Database
- **Supabase PostgreSQL** (existing instance)
- Uses Row Level Security (RLS) for user data isolation
- Extends existing database that contains a `productos` table (shopping list)

### AI/Insights
- **Anthropic Claude API** for financial insights generation

### Hosting
- Frontend: **Vercel** (auto-deployment)
- Backend: **Vercel Serverless Functions** or **Railway**
- Database: **Supabase** (existing)

## Development Commands

Since this is a new project, common commands will be:

### Once project structure is set up:

**Frontend (apps/web):**
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
npm run type-check   # TypeScript type checking
```

**Backend (apps/api):**
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio GUI
```

**Testing:**
```bash
npm test             # Run all tests
npm test -- --watch  # Run tests in watch mode
npm run test:e2e     # Run end-to-end tests
```

## Architecture

### Data Model Structure

**Core Entities:**
- `Usuario`: User with email, name, and primary currency
- `Cuenta`: Accounts (bank, virtual wallet, broker, cash)
- `Tarjeta`: Credit cards with installment tracking
- `Movimiento`: All money movements (income, expenses, transfers, payments)
- `CompraEnCuotas`: Installment purchases on credit cards
- `Cuota`: Individual installments with payment tracking
- `Deuda`: Debts with payment tracking
- `Inversion`: Investments tracking
- `Presupuesto`: Budget categories (informative, non-blocking)
- `ConfiguracionMoneda`: Currency exchange rate configuration

### Movement Types (Movimiento.tipo)
- `INGRESO`: Income
- `GASTO`: Expense
- `TRANSFERENCIA`: Transfer between accounts (doesn't affect monthly balance)
- `PAGO_TARJETA`: Credit card payment (counts as expense)
- `GASTO_TARJETA`: Credit card purchase
- `PAGO_DEUDA`: Debt payment (counts as expense)
- `INVERSION`: Investment
- `RETORNO_INVERSION`: Investment return
- `AJUSTE`: Balance adjustment
- `INGRESO_INICIAL`: Initial balance

### Critical Business Rules

**RN-001: Account Balance Calculation**
```
saldo_actual = saldo_inicial
  + SUM(ingresos)
  + SUM(retornos_inversion)
  - SUM(gastos)
  - SUM(pagos_tarjeta)
  - SUM(pagos_deuda)
  - SUM(inversiones)
  - SUM(transferencias_salida)
  + SUM(transferencias_entrada)
  + SUM(ajustes)
```

**RN-002: Credit Card Limit**
```
limite_comprometido = SUM(compras_en_cuotas.monto_total WHERE cuotas_pagadas < cantidad_cuotas)
limite_disponible = limite_total - limite_comprometido
```

**RN-003: Monthly Balance**
```
ingresos_mes = SUM(movimientos WHERE tipo IN (INGRESO, RETORNO_INVERSION))
gastos_mes = SUM(movimientos WHERE tipo IN (GASTO, GASTO_TARJETA, PAGO_TARJETA, PAGO_DEUDA, INVERSION))
balance_mes = ingresos_mes - gastos_mes
```

**RN-004: Installment Purchase Flow**
When registering an installment purchase:
1. Create a GASTO_TARJETA movement with total amount
2. Create CompraEnCuotas record
3. Create N Cuota records with monthly due dates
4. Increase card's limite_comprometido by monto_total
5. Add first installment to current period's balance due

**RN-005: Card Payment Flow**
When paying a credit card:
1. Create PAGO_TARJETA movement
2. Reduce source account balance
3. Mark installments as paid (oldest to newest)
4. Reduce limite_comprometido for fully paid purchases
5. Each installment paid releases its portion of the limit

### Key Architectural Patterns

**Database Integrity:**
- Account balances are calculated from movements, not stored directly (except via calculated fields)
- All operations that modify balances must be atomic transactions
- Transfers create two linked movements (movimiento_relacionado_id)
- Currency conversion rates are stored with each movement for audit trail

**Validation:**
- Use Zod schemas on both frontend and backend
- Backend must validate:
  - Sufficient balance before expenses/payments
  - Available credit limit before card purchases
  - Account/card is active before operations
  - Amount doesn't exceed debt when paying debts

**Security:**
- Supabase Row Level Security (RLS) ensures users only see their own data
- All queries must filter by `usuario_id`
- JWT tokens handled by Supabase Auth
- Never modify git config or run destructive git commands unless explicitly requested

**Currency Handling:**
- Each account/card has a fixed currency
- Cannot change currency if account has movements
- Conversions use ConfiguracionMoneda rates at time of operation
- Conversion rate stored in movement for historical accuracy

## UI/UX Design Guidelines

### Minimalist Design Philosophy
- Clean Nordic-inspired interface
- Prominent display of numbers (balances, amounts)
- Generous whitespace
- Single accent color (Nordic blue #3B82F6)
- Semantic colors: green (positive), red (negative), yellow (warning)
- Simple outline icons, no gradients, subtle shadows

### Quick Add Feature (Critical)
The most important UX feature - target: <5 seconds to log an expense
- Floating Action Button (FAB) always visible
- Modal with auto-focused amount field
- Category quick-select pills (frequently used categories)
- Smart defaults: last used account pre-selected
- Keyboard shortcuts: `+` (income), `-` (expense), `Enter` (save), `Esc` (cancel)
- Numpad optimized for mobile

### Responsive Breakpoints
- Mobile: < 768px (stack vertical, bottom nav, full-width cards)
- Tablet: 768px - 1024px (2-column grid)
- Desktop: > 1024px (3-column grid, fixed sidebar)

### Animation Principles
- Subtle and fast (<200ms)
- Modal transitions: fade + slide up
- No animations on page changes or number updates
- Skeleton loaders instead of spinners

## Project Structure (to be created)

```
/
├── apps/
│   ├── web/              # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/              # Express backend
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   └── repositories/
│       └── package.json
├── packages/
│   └── shared/           # Shared types and utilities
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

## API Endpoints

### Authentication (Supabase)
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Accounts
- `GET /api/cuentas`
- `POST /api/cuentas`
- `GET /api/cuentas/:id`
- `PUT /api/cuentas/:id`
- `DELETE /api/cuentas/:id`
- `POST /api/cuentas/:id/ajustar` - Adjust balance

### Cards
- `GET /api/tarjetas`
- `POST /api/tarjetas`
- `GET /api/tarjetas/:id`
- `PUT /api/tarjetas/:id`
- `DELETE /api/tarjetas/:id`
- `GET /api/tarjetas/:id/cuotas-pendientes`
- `GET /api/tarjetas/:id/saldo-a-pagar`

### Movements (Quick Add optimized)
- `GET /api/movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tipo=GASTO`
- `POST /api/movimientos/quick` - Optimized endpoint for quick-add
- `POST /api/movimientos/ingreso`
- `POST /api/movimientos/gasto`
- `POST /api/movimientos/transferencia`
- `POST /api/movimientos/compra-tarjeta`
- `POST /api/movimientos/pago-tarjeta`
- `POST /api/movimientos/inversion`
- `POST /api/movimientos/retorno-inversion`
- `DELETE /api/movimientos/:id`

### Debts
- `GET /api/deudas`
- `POST /api/deudas`
- `GET /api/deudas/:id`
- `PUT /api/deudas/:id`
- `DELETE /api/deudas/:id`
- `POST /api/deudas/:id/pagar`

### Budgets
- `GET /api/presupuestos`
- `POST /api/presupuestos`
- `PUT /api/presupuestos/:id`
- `DELETE /api/presupuestos/:id`
- `GET /api/presupuestos/estado?periodo=YYYY-MM`

### Balance & Reports
- `GET /api/balance/mensual?periodo=YYYY-MM`
- `GET /api/balance/anual?year=YYYY`
- `GET /api/dashboard`

### Configuration
- `GET /api/config/monedas`
- `PUT /api/config/monedas/:moneda`
- `GET /api/config/categorias`

### AI Insights
- `POST /api/insights/generar`
- `GET /api/insights/ultimos`

## Database Integration

### Supabase Connection
The project extends an existing Supabase instance that contains a `productos` table (shopping list).

**Environment Variables:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # backend only
DATABASE_URL=postgresql://... # Prisma connection string
```

### Migration Strategy
- Do NOT modify existing `productos` table
- Add new tables for Freya Balans entities
- Use Prisma migrations to manage schema
- Apply Row Level Security (RLS) policies for all new tables

### Required Indexes
```sql
CREATE INDEX idx_movimientos_usuario_fecha ON movimientos(usuario_id, fecha DESC);
CREATE INDEX idx_movimientos_cuenta ON movimientos(cuenta_id);
CREATE INDEX idx_cuotas_fecha_vencimiento ON cuotas(fecha_vencimiento) WHERE pagada = false;
```

## Testing Requirements

### Critical Test Scenarios
1. **Installment calculations**: Verify limit committed/available after purchases and payments
2. **Balance integrity**: Account balance must match sum of movements
3. **Atomic transactions**: Transfers, card payments must be all-or-nothing
4. **Currency conversions**: Verify correct conversion and rate storage
5. **Monthly balance**: Verify transfers don't affect monthly balance but card/debt payments do

## AI Insights Integration

### Data Privacy
- Only send aggregated data to Claude API (no personal identifiers)
- Format: monthly totals, category breakdowns, budget status
- Never include transaction descriptions or account names

### Insight Types
1. Spending pattern observations
2. Month-over-month comparisons
3. Budget alerts (exceeded or near limit)
4. Concrete saving suggestions
5. Simple balance projection for next month

## Implementation Phases

### Phase 1: MVP Core (4-6 weeks)
1. Project setup (monorepo, Vite, Express, Prisma, Supabase)
2. Core entities (accounts, basic movements)
3. Credit cards with installments
4. Advanced movements (transfers, categorization)
5. Debts and budgets
6. Responsive design, Quick Add optimization, deployment

### Phase 2: Advanced Features (2-3 weeks)
- Investments
- AI insights
- Custom categories
- Advanced keyboard shortcuts
- CSV export

### Phase 3: Optimizations (2 weeks)
- Simple visualizations
- Performance optimization
- PWA for mobile
- Dark mode

## Important Constraints

- Budgets are informative only - they NEVER block transactions
- Transfers between accounts do NOT affect monthly balance
- Card and debt payments DO count as expenses in monthly balance
- Account currency cannot be changed if it has movements
- Card payment must not exceed debt amount
- Cannot delete accounts/cards with associated movements
- All financial operations must be validated for sufficient balance/limit

## Success Metrics

### Technical
- Initial load time: <2s
- API response time: <200ms (p95)
- Uptime: >99.5%

### UX
- Expense logging time: <5 seconds (Quick Add)
- Dashboard load time: <1 second
- Max clicks for common action: 3

### Product
- Balance accuracy: must match real bank statements
- Complete traceability: every peso has origin/destination
- Future commitments visibility: all upcoming installments shown
