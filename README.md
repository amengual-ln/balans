# Freya Balans

> Minimalist personal finance management application with complete transaction traceability.

**Freya Balans** is part of the Freya ecosystem - a personal system for life management (tasks, projects, finances, agenda, goals). The name "Balans" comes from Nordic languages (Norwegian/Swedish) meaning "balance," reflecting the app's core mission: maintaining a complete and traceable balance of your finances.

## Features

- ✅ Complete traceability of all money movements
- 💳 Multi-account and multi-currency support
- 📊 Credit cards with installment tracking
- 💰 Debt and investment management
- 📈 Informative budgets (non-restrictive)
- 🤖 AI-powered financial insights
- ⚡ Ultra-fast expense logging (<5 seconds target)
- 🎨 Minimalist Nordic-inspired design

## Tech Stack

### Frontend (apps/web)
- **React** 18 with **TypeScript**
- **Vite** for blazing-fast builds
- **Tailwind CSS** for minimalist styling
- **Zustand** for state management
- **React Hook Form + Zod** for forms and validation
- **Supabase Client** for authentication

### Backend (apps/api)
- **Node.js** with **Express**
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL
- **Supabase PostgreSQL** database
- **Zod** for runtime validation
- **Anthropic Claude API** for AI insights

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 (LTS recommended)
- **pnpm** >= 8.0.0 (Install with: `npm install -g pnpm`)
- **Git**
- A **Supabase** account and project (free tier works)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd freya-balans
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install dependencies for all workspaces (root, web, and api).

### 3. Configure Environment Variables

#### Backend (apps/api)

1. Copy the example environment file:
```bash
cd apps/api
cp .env.example .env
```

2. Edit `apps/api/.env` and configure your Supabase credentials:

```env
# Get these from your Supabase project settings
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: For AI insights
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**Where to find Supabase credentials:**
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to **Settings** > **API**
- Copy the **URL** and **service_role key** (anon key won't work for backend)
- For DATABASE_URL, go to **Settings** > **Database** and copy the connection string

#### Frontend (apps/web)

1. Copy the example environment file:
```bash
cd apps/web
cp .env.example .env
```

2. Edit `apps/web/.env`:

```env
VITE_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
```

**Where to find Supabase anon key:**
- Same location as above (**Settings** > **API**)
- Copy the **anon/public key** (this is safe for frontend use)

### 4. Set Up the Database

From the root directory:

```bash
cd apps/api

# Generate Prisma client
pnpm prisma:generate

# Push the schema to your Supabase database
# (For development, use push. For production, use migrate)
pnpm prisma:push

# OR create and run migrations (recommended for production)
pnpm prisma:migrate

# Optional: Open Prisma Studio to view your database
pnpm prisma:studio
```

**Note:** The database extends an existing Supabase instance. If you have existing tables (like `productos`), they won't be affected.

### 5. Run the Development Servers

From the **root directory**, you can run both frontend and backend simultaneously:

```bash
pnpm dev
```

This will start:
- **Frontend** at [http://localhost:3000](http://localhost:3000)
- **Backend** at [http://localhost:3001](http://localhost:3001)

Or run them separately:

```bash
# Terminal 1 - Backend
cd apps/api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev
```

### 6. Verify Everything Works

1. Open [http://localhost:3000](http://localhost:3000) - you should see the Freya Balans welcome page
2. Open [http://localhost:3001/health](http://localhost:3001/health) - you should see `{"status":"ok"}`
3. Check Prisma Studio: `cd apps/api && pnpm prisma:studio`

## Development Workflow

### Common Commands

```bash
# Install all dependencies
pnpm install

# Run both frontend and backend in dev mode
pnpm dev

# Build all projects
pnpm build

# Run linters
pnpm lint

# Format code with Prettier
pnpm format

# Type checking
pnpm type-check
```

### Frontend Commands (apps/web)

```bash
cd apps/web

pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript type checking
```

### Backend Commands (apps/api)

```bash
cd apps/api

pnpm dev                # Start dev server with auto-reload
pnpm build              # Build for production
pnpm start              # Run production build
pnpm lint               # Run ESLint
pnpm type-check         # TypeScript type checking

# Prisma commands
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Create and run migrations
pnpm prisma:push        # Push schema without migrations (dev only)
pnpm prisma:studio      # Open Prisma Studio GUI
```

### Database Migrations

When you modify the Prisma schema:

```bash
cd apps/api

# Option 1: For rapid prototyping (development only)
pnpm prisma:push

# Option 2: For production-ready changes (recommended)
pnpm prisma:migrate
# This will prompt you to name the migration

# After migration, generate the client
pnpm prisma:generate
```

## Project Structure

```
freya-balans/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities and libraries
│   │   │   ├── App.tsx         # Root component
│   │   │   ├── main.tsx        # Entry point
│   │   │   └── index.css       # Tailwind imports
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── controllers/    # Request handlers
│       │   ├── services/       # Business logic
│       │   ├── repositories/   # Data access layer
│       │   ├── middleware/     # Express middleware
│       │   ├── types/          # TypeScript types
│       │   └── index.ts        # Entry point
│       ├── prisma/
│       │   └── schema.prisma   # Database schema
│       └── package.json
│
├── packages/                   # Shared packages (future)
├── pnpm-workspace.yaml         # pnpm workspace config
├── package.json                # Root package.json
├── .prettierrc                 # Prettier config
├── .eslintrc.json              # ESLint config
└── README.md
```

## Architecture Overview

### Data Flow

```
Frontend (React)
    ↓ HTTP/REST
Backend (Express)
    ↓ Prisma ORM
Supabase PostgreSQL
```

### Key Entities

- **Usuario**: User accounts
- **Cuenta**: Bank accounts, wallets, brokers
- **Tarjeta**: Credit cards with installment tracking
- **Movimiento**: All money movements (income, expenses, transfers)
- **CompraEnCuotas**: Installment purchases
- **Cuota**: Individual installments
- **Deuda**: Debts
- **Inversion**: Investments
- **Presupuesto**: Budget categories

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## Key Business Rules

1. **Balance Integrity**: Account balances are calculated from movements, not stored directly
2. **Credit Card Limits**: `limite_disponible = limite_total - limite_comprometido`
3. **Monthly Balance**: Transfers don't affect monthly balance, but card/debt payments do
4. **Installment Tracking**: Each payment releases a portion of the committed credit limit
5. **Currency Conversion**: Exchange rates are stored with each transaction for audit trail

## Development Tips

### Quick Add Feature
The most important UX feature - optimized for <5 second expense logging:
- Always auto-focus the amount field
- Remember last used account
- Provide quick-select category pills
- Support keyboard shortcuts

### Database Changes
After modifying `prisma/schema.prisma`:
1. Run `pnpm prisma:push` (dev) or `pnpm prisma:migrate` (prod)
2. Run `pnpm prisma:generate` to update the Prisma client
3. Restart the backend server

### Styling with Tailwind
The app uses a minimalist Nordic-inspired design:
- Primary color: `#3B82F6` (blue)
- Use semantic colors: `positive` (green), `negative` (red), `warning` (yellow)
- Generous whitespace
- Clean typography (Inter font)

## Troubleshooting

### "Cannot find module 'prisma'"
```bash
cd apps/api
pnpm install
pnpm prisma:generate
```

### Database connection errors
- Verify your DATABASE_URL in `apps/api/.env`
- Check that your Supabase project is active
- Ensure you're using the correct password and project reference

### Frontend can't connect to backend
- Ensure backend is running on port 3001
- Check VITE_API_URL in `apps/web/.env`
- Verify CORS settings in backend

### Port already in use
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

## Environment Variables Reference

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `DATABASE_URL` | PostgreSQL connection string | **Yes** |
| `SUPABASE_URL` | Supabase project URL | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **Yes** |
| `ANTHROPIC_API_KEY` | Claude API key (for insights) | No |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | **Yes** |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | **Yes** |
| `VITE_API_URL` | Backend API URL | **Yes** |

## Next Steps

1. **Set up authentication**: Implement Supabase Auth integration
2. **Create core entities**: Build CRUD for accounts and movements
3. **Implement Quick Add**: Build the <5 second expense logging feature
4. **Add credit card logic**: Implement installment tracking
5. **Build dashboard**: Create the minimalist main view
6. **Add AI insights**: Integrate Claude API for financial insights

## Contributing

This is a personal project, but contributions are welcome! Please ensure:
- Code follows the existing style (Prettier + ESLint)
- TypeScript types are properly defined
- Business rules are respected (see CLAUDE.md)

## License

MIT

---

**Built with ❤️ as part of the Freya ecosystem**
