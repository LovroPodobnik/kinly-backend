import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from '@my-app/auth'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/root'
import { createContext } from './trpc/context'
import { syncContentToDatabase } from '@my-app/content'

const app = new Hono()

// Sync content on startup
console.log('[Startup] Syncing content from filesystem to database...')
syncContentToDatabase().catch((err) => {
  console.error('[Startup] Failed to sync content:', err)
})

// Global CORS middleware
const allowedOrigins = new Set([
  'http://localhost:3000',      // Local dev
  'http://localhost:3001',      // Local dev
  'https://www.kinly.si',       // Production
  'https://kinly.si',           // Production (non-www)
]);

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin;
    // Allow Vercel preview deployments
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return origin;
    // Allow whitelisted origins
    if (allowedOrigins.has(origin)) return origin;
    // Default fallback
    return 'https://kinly.si';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}))

// Add global request logger to see ALL requests
app.use('*', async (c, next) => {
  console.log(`[REQUEST] ${c.req.method} ${c.req.path}`)
  await next()
})

app.get('/', (c) => c.text('Hello from Hono!'))

app.get('/health', (c) => c.json({ status: 'ok' }))

// Manual content sync endpoint (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/sync-content', async (c) => {
    try {
      console.log('[Manual Sync] Triggered via endpoint')
      await syncContentToDatabase()
      return c.json({ success: true, message: 'Content synced successfully' })
    } catch (err: any) {
      console.error('[Manual Sync] Failed:', err)
      return c.json({ success: false, error: err.message }, 500)
    }
  })
}

// Better Auth handler - create dedicated sub-app and mount it
const authApp = new Hono()
authApp.on(['POST', 'GET'], '/*', (c) => {
  return auth.handler(c.req.raw)
})
app.route('/api/auth', authApp)

// Mount tRPC with Better Auth context
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: ({ req }) => createContext({ req }),
  })
)

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
