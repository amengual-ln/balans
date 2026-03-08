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
    console.log('[HEALTH] Testing DB connection...')
    console.log('[HEALTH] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'not set')
    console.log('[HEALTH] DIRECT_URL:', process.env.DIRECT_URL ? 'set' : 'not set')
    await prisma.$queryRaw`SELECT 1`
    console.log('[HEALTH] DB connected successfully')
    res.json({ status: 'ok', message: 'Freya Balans API is running', db: 'connected' })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[HEALTH] DB connection failed:', errorMsg)
    console.error('[HEALTH] Error code:', error instanceof Error && 'code' in error ? (error as any).code : 'unknown')
    res.status(503).json({
      status: 'degraded',
      message: 'Database connection failed',
      error: errorMsg
    })
  }
})

// Network test endpoint
app.get('/network-test', async (_req, res) => {
  const results: any = {}

  // Test DNS resolution
  try {
    const { resolve4, resolve6 } = await import('dns/promises')
    const ips4 = await resolve4('db.dgmveedhkarpnlbmtobu.supabase.co').catch(() => [])
    const ips6 = await resolve6('db.dgmveedhkarpnlbmtobu.supabase.co').catch(() => [])
    results.dns_supabase = { status: 'ok', ipv4: ips4, ipv6: ips6 }
  } catch (error) {
    results.dns_supabase = { status: 'error', error: error instanceof Error ? error.message : 'Unknown' }
  }

  // Test TCP connection to Supabase
  try {
    const net = await import('net')
    const socket = net.createConnection({ host: 'db.dgmveedhkarpnlbmtobu.supabase.co', port: 6543, timeout: 5000 })

    const connected = await new Promise((resolve) => {
      socket.on('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.on('error', () => {
        resolve(false)
      })
    })

    results.tcp_supabase_6543 = { status: connected ? 'ok' : 'failed' }
  } catch (error) {
    results.tcp_supabase_6543 = { status: 'error', error: error instanceof Error ? error.message : 'Unknown' }
  }

  // Test fetch to Supabase REST API
  try {
    const response = await fetch('https://dgmveedhkarpnlbmtobu.supabase.co/rest/v1/', {
      headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY || 'test' },
      timeout: 5000
    })
    results.fetch_supabase_rest = { status: 'ok', statusCode: response.status }
  } catch (error) {
    results.fetch_supabase_rest = { status: 'error', error: error instanceof Error ? error.message : 'Unknown' }
  }

  res.json(results)
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
