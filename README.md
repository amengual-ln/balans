# Freya Balans

Minimalist personal finance app with complete transaction traceability. Part of Freya ecosystem (tasks, projects, finances, agenda, goals). Name from Nordic "balance."

## Features

- Complete traceability of all money movements
- Multi-account and multi-currency support
- Credit cards with installment tracking
- Debt and investment management
- Informative budgets (non-restrictive)
- AI-powered financial insights
- Ultra-fast expense logging (<5 seconds)
- Minimalist Nordic-inspired design

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, SWR, React Hook Form + Zod |
| Backend | Express, TypeScript, Prisma ORM, Zod |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth (placeholder: x-user-id header) |
| AI | Anthropic Claude API (future) |

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

### 3. Backend environment

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
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
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
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
│   │       ├── components/     # 17 components
│   │       ├── pages/          # 6 pages
│   │       ├── hooks/          # 8 hooks
│   │       └── lib/            # utilities
│   └── api/                    # Express backend
│       └── src/
│           ├── routes/         # 6 routes
│           ├── services/       # 6 services
│           ├── schemas/        # Zod schemas
│           └── prisma/
│               └── schema.prisma
├── CLAUDE.md                   # agent context
├── PLAN.md                     # status dashboard
└── freya-balans-spec-v2.md     # full spec
```

## Key Business Rules

1. **Balance** = sum of all movements (transfers excluded from monthly)
2. **Card limit** = `limite_total - limite_comprometido`
3. **Monthly balance** = ingresos - gastos (card/debt payments count, transfers don't)
4. **Installments** = each payment releases portion of committed credit
5. **Budgets** = informative only, never block transactions
6. **Currency** = immutable if account has movements
7. **No delete** = accounts/cards with movements protected

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
- VITE_API_URL correct in `apps/web/.env`?
- CORS configured?

## Environment Variables

### Backend (apps/api/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For backend auth |
| `ANTHROPIC_API_KEY` | No | Claude API (AI insights) |

### Frontend (apps/web/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `VITE_API_URL` | Yes | Backend URL (default: http://localhost:3001) |

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
