# Quick Start Guide

Get Freya Balans up and running in 5 minutes.

## Prerequisites

```bash
# Install Node.js 18+ (if not installed)
# Download from https://nodejs.org or use nvm

# Install pnpm
npm install -g pnpm

# Verify installations
node --version  # Should be >= 18.0.0
pnpm --version  # Should be >= 8.0.0
```

## Setup Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your credentials from **Settings** → **API**

### 3. Configure Backend Environment

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Configure Frontend Environment

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

### 5. Set Up Database

```bash
cd apps/api
pnpm prisma:generate
pnpm prisma:push
```

### 6. Start Development

```bash
# From root directory
pnpm dev
```

🎉 Done! Open:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/health

## Next Steps

1. Check out the full [README.md](./README.md) for detailed documentation
2. Review [CLAUDE.md](./CLAUDE.md) for architecture details
3. Read the [spec](./freya-balans-spec-v2.md) to understand the business logic

## Common Commands

```bash
# Development
pnpm dev              # Run both frontend and backend
pnpm build            # Build all projects
pnpm lint             # Lint all code
pnpm format           # Format with Prettier

# Database
cd apps/api
pnpm prisma:studio    # Open database GUI
pnpm prisma:migrate   # Create a migration
pnpm prisma:generate  # Generate Prisma client
```

## Troubleshooting

**"Cannot find module 'prisma'"**
```bash
cd apps/api && pnpm prisma:generate
```

**Database connection error**
- Double-check your DATABASE_URL
- Ensure Supabase project is active
- Verify password and project reference

**Port already in use**
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Need help? Check the full [README.md](./README.md)
