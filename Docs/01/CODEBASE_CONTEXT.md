# Codebase Context & Onboarding Guide

## Project Overview

This is a **Better-T-Stack** monorepo application using:
- **Runtime**: Bun
- **Backend**: Hono (web framework)
- **Auth**: Better Auth
- **Database**: SQLite with Drizzle ORM
- **API**: tRPC with end-to-end type safety
- **Monorepo**: Turborepo with workspaces
- **Package Manager**: Bun

## Project Structure

```
my-better-t-app/
├── apps/
│   └── api/                    # Backend API application
│       ├── src/
│       │   ├── index.ts        # Main Hono app with routes
│       │   └── trpc/           # tRPC routers and config
│       │       ├── context.ts  # tRPC context with Better Auth session
│       │       ├── middleware.ts # Protected procedure middleware
│       │       ├── root.ts     # Root router combining all routers
│       │       └── routers/
│       │           └── user.ts # User-related tRPC procedures
│       ├── drizzle.config.ts   # Drizzle configuration
│       └── package.json
├── packages/
│   ├── auth/                   # Better Auth configuration
│   │   └── src/
│   │       └── index.ts        # Better Auth instance & config
│   ├── db/                     # Database schema and connection
│   │   ├── src/
│   │   │   ├── index.ts        # Drizzle DB connection
│   │   │   └── schema.ts       # Database tables (users, sessions, accounts, verifications)
│   │   ├── migrations/         # SQL migration files
│   │   └── migrate.ts          # Migration runner script
│   └── ...
├── sqlite.db                   # SQLite database file (project root)
├── package.json                # Root workspace config
└── turbo.json                  # Turborepo configuration
```

## Critical Lessons Learned

### 1. Better Auth + Hono Integration

**Problem**: Better Auth's handler expects full request paths, but Hono's `app.route()` strips prefixes when mounting sub-apps, causing 404 errors.

**Solution**: Mount Better Auth handler directly on the main app using wildcard patterns:

```typescript
// ✅ CORRECT: Direct mounting with wildcard
app.use('/api/auth/**', async (c) => {
  return auth.handler(c.req.raw)
})

// ❌ WRONG: Using sub-app mounting (strips paths)
const authHandler = new Hono()
authHandler.on(['GET', 'POST'], '/*', (c) => auth.handler(c.req.raw))
app.route('/api/auth', authHandler) // This breaks routing!
```

**Key Points**:
- Better Auth endpoints follow pattern: `/api/auth/{action}` (e.g., `/api/auth/sign-up/email`)
- The `basePath` config in Better Auth must match the mounted path
- Use `app.use('/api/auth/**', ...)` to catch all nested paths including `/sign-up/email`

### 2. Better Auth Endpoint Structure

**Email/Password Auth Endpoints**:
- Sign up: `POST /api/auth/sign-up/email` (requires: `name`, `email`, `password`)
- Sign in: `POST /api/auth/sign-in/email` (requires: `email`, `password`)
- Sign out: `POST /api/auth/sign-out`
- Get session: `GET /api/auth/session`

**Important**: The path is `/sign-up/email`, NOT just `/sign-up`!

### 3. Drizzle Schema for Better Auth

Better Auth requires specific database tables:

```typescript
// Required tables (all use TEXT primary keys, not integers)
- users: id (text), email, emailVerified, name, image, createdAt, updatedAt
- sessions: id (text), userId, expiresAt, token, ipAddress, userAgent
- accounts: id (text), userId, accountId, providerId, accessToken, refreshToken, etc.
- verifications: id (text), identifier, value, expiresAt
```

**Critical Configuration**:
```typescript
// In packages/auth/src/index.ts
database: drizzleAdapter(db, {
  provider: 'sqlite',
  schema: schema,
  usePlural: true,  // Tables use plural names (users, sessions, etc.)
})
```

**Common Pitfall**: If you get "model 'user' not found", you forgot to:
1. Pass the schema to the adapter
2. Set `usePlural: true` if using plural table names

### 4. Database Path Resolution

**Problem**: SQLite database path is relative, causing "no such table" errors when the app runs from different directories.

**Solution**: Use relative path from where the API runs:

```typescript
// In packages/db/src/index.ts
const sqlite = new Database('../../sqlite.db'); // Relative to apps/api
```

The database file (`sqlite.db`) lives in the **project root**, and the API runs from `apps/api`.

### 5. tRPC + Better Auth Integration

**Session Context Pattern**:

```typescript
// In apps/api/src/trpc/context.ts
export async function createContext({ req }: { req: Request }) {
  // Extract session from request headers (Better Auth reads cookies automatically)
  const sessionResult = await auth.api.getSession({ headers: req.headers });

  const user = sessionResult?.user ?? null;
  const session = sessionResult?.session ?? null;

  return { req, user, session, db };
}
```

**Protected Procedures**:

```typescript
// In apps/api/src/trpc/middleware.ts
export const protectedProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    if (!opts.ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
  })
);
```

**Mounting tRPC in Hono**:

```typescript
// In apps/api/src/index.ts
import { trpcServer } from '@hono/trpc-server'

app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req }),
}))
```

### 6. CORS Configuration

**Critical for Cross-Origin Requests**:

```typescript
app.use('*', cors({
  origin: 'http://localhost:3001',  // Frontend origin
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,  // Required for cookies/sessions
}))
```

Client must send `credentials: 'include'` to pass cookies.

## Running Migrations

**Generate migration**:
```bash
bun run db:generate
```

**Apply migration** (use custom script, as drizzle-kit push has issues with Bun):
```bash
cd packages/db && bun migrate.ts
```

The migration script uses Drizzle's `migrate()` function:
```typescript
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
migrate(db, { migrationsFolder: "./migrations" });
```

## Available Endpoints

### Authentication (Better Auth)
- `POST /api/auth/sign-up/email` - Create account
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### tRPC API
- `GET /trpc/user.getCurrentUser` - Get authenticated user (protected)
- `GET /trpc/user.getUsers` - Get all users (protected)
- `POST /trpc/user.updateUser` - Update user (protected)

## Testing Authentication Flow

### 1. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 2. Sign In (save cookies)
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### 3. Call Protected tRPC Endpoint
```bash
curl -X GET "http://localhost:3000/trpc/user.getCurrentUser" \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

### 4. Without Authentication (should return 401)
```bash
curl -X GET "http://localhost:3000/trpc/user.getCurrentUser" \
  -H "Content-Type: application/json"
```

## Common Issues & Solutions

### Issue: "no such table: users"
**Cause**: Database path is incorrect or migrations not applied.
**Solution**:
1. Verify `sqlite.db` exists in project root
2. Run migrations: `cd packages/db && bun migrate.ts`
3. Check database path in `packages/db/src/index.ts`

### Issue: "BetterAuthError: model 'user' not found in schema"
**Cause**: Schema not passed to Drizzle adapter or wrong table names.
**Solution**:
```typescript
database: drizzleAdapter(db, {
  provider: 'sqlite',
  schema: schema,        // Pass the schema
  usePlural: true,       // Use plural table names
})
```

### Issue: 404 on all auth routes
**Cause**: Using `app.route()` for sub-app mounting (strips paths).
**Solution**: Use direct mounting with `app.use('/api/auth/**', ...)`

### Issue: tRPC returns UNAUTHORIZED even when logged in
**Cause**:
1. Cookies not being sent (missing `credentials: true` in CORS)
2. Headers not passed to `auth.api.getSession()`
**Solution**:
1. Add CORS with `credentials: true`
2. Pass `req.headers` to getSession: `auth.api.getSession({ headers: req.headers })`

### Issue: Session returns null in tRPC context
**Cause**: Request headers not properly forwarded.
**Solution**: Ensure `createContext` receives the raw Request and passes headers to Better Auth:
```typescript
const sessionResult = await auth.api.getSession({ headers: req.headers });
```

## Type Safety

The stack provides end-to-end type safety:
- **Drizzle**: Type-safe SQL queries with `$inferSelect` and `$inferInsert`
- **tRPC**: Shared types between frontend and backend via `AppRouter` export
- **Zod**: Runtime validation with compile-time type inference
- **Better Auth**: Type-safe session with `auth.$Infer.Session`

Export types from the API for use in frontend:
```typescript
// In apps/api/src/trpc/root.ts
export type AppRouter = typeof appRouter;

// In frontend (once added)
import type { AppRouter } from '@my-app/api';
```

## Development Commands

```bash
bun dev              # Start all workspaces in dev mode (uses Turborepo)
bun run db:generate  # Generate Drizzle migrations
bun run db:push      # Apply migrations (use custom script instead)
bun install          # Install dependencies
```

## Key Package Versions

- `better-auth`: 1.3.32
- `hono`: 4.9.0
- `@trpc/server`: 11.6.0
- `drizzle-orm`: Latest
- `bun`: 1.1.22+

## Architecture Decisions

1. **Monorepo with Turborepo**: Shared packages for auth, db, and potential frontend
2. **SQLite for simplicity**: Easy to set up, good for development and small-to-medium apps
3. **Better Auth over NextAuth**: Modern, framework-agnostic, better TypeScript support
4. **tRPC over REST**: End-to-end type safety, no code generation needed
5. **Drizzle over Prisma**: Closer to SQL, better performance, Bun-native support

## Next Steps for Development

1. **Add Frontend**: Tanstack Router + React
2. **Add tRPC Client**: Type-safe API calls from frontend
3. **Add More Providers**: GitHub, Google OAuth
4. **Add Email Verification**: Use Better Auth's email verification feature
5. **Add Password Reset**: Implement forgot password flow
6. **Add Role-Based Access**: Extend user table with roles
7. **Add API Rate Limiting**: Protect endpoints from abuse

## Resources

- [Better Auth Docs](https://www.better-auth.com/docs)
- [Hono Documentation](https://hono.dev)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Better-T-Stack Template](https://github.com/better-auth/better-t-stack)

---

**Last Updated**: 2025-10-27
**Status**: ✅ Fully functional authentication + tRPC integration
