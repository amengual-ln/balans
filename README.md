# Freya Balans

Minimalist personal finance app with complete transaction traceability. Part of Freya ecosystem (tasks, projects, finances, agenda, goals). Name from Nordic "balance."

## Features

- Complete traceability of all money movements
- Daily dashboard with balances, compact monthly summary, automatic monthly checklist, ARS expense breakdown, and upcoming payments
- Multi-account and multi-currency support
- Credit cards with installment tracking
- Debt and investment management
- Recurring subscriptions with manual payment registration
- Discount fund system for gastos (direct and card purchases)
- Monthly movement navigation with type, category, description, account, and card filters
- Contextual actions for transfers, balance adjustments, card payments, and subscription payments
- Installable PWA shell (network-only; no offline cache)
- Ultra-fast expense logging (<5 seconds)
- Minimalist Nordic-inspired design

### Planned

- Informative budgets
- AI-powered financial insights
- Supabase Auth and dark mode

## Tech Stack

| Layer    | Technology                                                                  |
| -------- | --------------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, SWR, React Hook Form + Zod        |
| Backend  | Express, TypeScript, Supabase JS, Zod                                       |
| Database | Supabase PostgreSQL (`freya_balans`) with RLS; Prisma for schema/migrations |
| Auth     | Supabase Auth (placeholder: x-user-id header)                               |
| AI       | Anthropic Claude API (future)                                               |

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (`npm install -g pnpm`)
- Supabase account and project

## Setup (5 minutes)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Supabase

Create project at [supabase.com](https://supabase.com), get credentials from **Settings → API**.

Application tables live in PostgreSQL schema `freya_balans`, not `public`. Backend client is already configured for that schema; direct SQL must qualify tables as `freya_balans.<table>`.

### 3. Backend environment

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?schema=freya_balans&pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=freya_balans"
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key  # optional, for AI insights
```

### 4. Frontend environment

```bash
cd apps/web
cp .env.example .env
```

Edit `apps/web/.env`:

```env
VITE_USER_ID=demo-user-id
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Database setup

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:push  # dev only; use migrate for production
```

### 6. Start development

```bash
pnpm dev
```

Opens:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health

## Common Commands

```bash
# All projects
pnpm dev          # frontend + backend
pnpm build        # build all
pnpm lint         # lint all
pnpm format       # prettier
pnpm type-check   # typescript check

# Frontend
cd apps/web && pnpm dev

# Backend
cd apps/api && pnpm dev

# Database
cd apps/api && pnpm prisma:studio   # GUI
cd apps/api && pnpm prisma:migrate  # migrations
cd apps/api && pnpm prisma:generate # regenerate client
```

## Project Structure

```
freya-balans/
├── apps/
│   ├── web/                    # React frontend
│   │   └── src/
│   │       ├── components/     # QuickAdd, MovementsList, EditMovementModal, BottomNav + others
│   │       ├── pages/          # Dashboard, Movements, Accounts, Cards, Debts, Subscriptions, Investments
│   │       ├── hooks/          # useAccounts, useCards, useMovements, useStats, useAPI, etc.
│   │       └── lib/            # utilities
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # accounts, movements, cards, debts, suscripciones, inversiones
│       │   ├── services/       # business logic and balance updates
│       │   └── schemas/        # Zod schemas for validation
│       └── prisma/
│           └── schema.prisma
├── CLAUDE.md                   # agent context
├── PLAN.md                     # status dashboard
└── freya-balans-spec-v2.md     # full spec
```

## Key Business Rules

1. **Balance** = sum of all movements (transfers excluded from monthly)
2. **Card limit** = `limite_total - limite_comprometido`
3. **Monthly balance** = ingresos - gastos; subscription/card/debt payments count, transfers and card purchases don't
4. **Installments** = each payment releases portion of committed credit
5. **Budgets** = informative only, never block transactions
6. **Currency** = immutable if account has movements
7. **No delete** = accounts/cards with movements protected
8. **Discount fund** = applies % to gasto, subsidizes FONDO_DESCUENTO account, remainder goes to payment method
9. **Card purchases with discount** = GASTO_TARJETA_CON_DESCUENTO + SUBSIDIO, limit increased by discounted amount only

## Troubleshooting

**Cannot find module 'prisma'**

```bash
cd apps/api && pnpm prisma:generate
```

**Database connection error**

- Check DATABASE_URL in `apps/api/.env`
- Verify Supabase project is active
- Confirm password and project reference

**Port in use**

```bash
lsof -ti:3000 | xargs kill -9  # frontend
lsof -ti:3001 | xargs kill -9  # backend
```

**Frontend can't reach backend**

- Backend running on port 3001?
- Vite dev proxy running on port 3000?
- Production host routes `/api` to backend?

## Environment Variables

### Backend (apps/api/.env)

| Variable                    | Required | Description                                              |
| --------------------------- | -------- | -------------------------------------------------------- |
| `PORT`                      | No       | Server port (default: 3001)                              |
| `DATABASE_URL`              | Yes      | Pooled PostgreSQL connection using schema `freya_balans` |
| `DIRECT_URL`                | Yes      | Direct PostgreSQL connection for Prisma migrations       |
| `SUPABASE_URL`              | Yes      | Supabase project URL                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Backend/maintenance access; never expose to frontend     |
| `ANTHROPIC_API_KEY`         | No       | Claude API (AI insights)                                 |

### Frontend (apps/web/.env)

| Variable                 | Required | Description                                           |
| ------------------------ | -------- | ----------------------------------------------------- |
| `VITE_USER_ID`           | No       | Temporary `x-user-id` value (default: `demo-user-id`) |
| `VITE_SUPABASE_URL`      | No       | Reserved for future Supabase Auth integration         |
| `VITE_SUPABASE_ANON_KEY` | No       | Reserved for future Supabase Auth integration         |

Frontend uses relative `/api` URLs. Vite proxies them to `http://localhost:3001` during development.

## Next Steps for New Developers

1. Review `freya-balans-spec-v2.md` for full feature spec
2. Check `PLAN.md` for implementation status and gaps
3. Run `pnpm dev` and explore the app
4. See `CLAUDE.md` for development patterns and conventions

## Contributing

- Follow existing code style (ESLint + Prettier)
- TypeScript types required
- Respect business rules in spec
- Add Zod schemas for any new API inputs

---

**Built as part of the Freya ecosystem**
