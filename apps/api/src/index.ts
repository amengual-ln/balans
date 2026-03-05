import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { prisma } from './lib/prisma'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Freya Balans API is running' })
})

// Import routes
import accountsRouter from './routes/accounts'
import movementsRouter from './routes/movements'
import cardsRouter from './routes/cards'
import debtsRouter from './routes/debts'

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

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
