import express from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Temporary auth: auto-upsert user row so FK constraints don't fail.
// When Supabase Auth is wired, this middleware is replaced by JWT verification.
const knownUserIds = new Set<string>()
app.use(async (req, _res, next) => {
  const userId = req.headers['x-user-id'] as string | undefined
  if (userId && !knownUserIds.has(userId)) {
    await prisma.usuario.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@demo.local`,
        nombre: 'Usuario demo',
      },
    }).catch(() => { /* ignore race conditions */ })
    knownUserIds.add(userId)
  }
  next()
})

// Health check with DB connectivity test
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', message: 'Freya Balans API is running', db: 'connected' })
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Import routes
import accountsRouter from './routes/accounts.js'
import movementsRouter from './routes/movements.js'
import cardsRouter from './routes/cards.js'
import debtsRouter from './routes/debts.js'
import suscripcionesRouter from './routes/suscripciones.js'

// Routes
app.get('/api', (_req, res) => {
  res.json({
    name: 'Freya Balans API',
    version: '0.1.0',
    status: 'running',
  })
})

// API Routes
app.use('/api/cuentas', accountsRouter)
app.use('/api/movements', movementsRouter)
app.use('/api/tarjetas', cardsRouter)
app.use('/api/deudas', debtsRouter)
app.use('/api/suscripciones', suscripcionesRouter)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

export default app
