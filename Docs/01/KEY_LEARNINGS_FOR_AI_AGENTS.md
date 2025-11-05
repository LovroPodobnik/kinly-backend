# Key Learning Points for AI Agents - Better Auth + Hono + tRPC Stack

> This document contains critical implementation details and non-obvious patterns specific to Better Auth integration with Hono and tRPC. These are things that may not be in a general LLM knowledge base but are essential for working with this stack.

---

## 1. Better Auth Handler Mounting in Hono

### The Critical Problem

Better Auth's handler expects to receive the FULL request path, but Hono's `app.route()` strips path prefixes when mounting sub-apps, causing 404 errors on all auth endpoints.

### The Solution

```typescript
// ✅ CORRECT: Use app.use() with wildcard
app.use('/api/auth/**', async (c) => {
  return auth.handler(c.req.raw)
})

// ❌ WRONG: Using app.route() strips paths
const authHandler = new Hono()
authHandler.on(['GET', 'POST'], '/*', (c) => auth.handler(c.req.raw))
app.route('/api/auth', authHandler) // Breaks routing!

// ⚠️ ALTERNATIVE: Use app.on() with single asterisk
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})
```

**Why This Matters**: Better Auth internally routes based on the full path (e.g., `/api/auth/sign-up/email`). If you use `app.route('/api/auth', handler)`, Hono strips `/api/auth` and Better Auth only sees `/sign-up/email`, causing route mismatches.

**Use double asterisk `**`** to catch all nested paths including multi-level routes like `/sign-up/email`.

---

## 2. Better Auth Endpoint Structure

### Key Pattern

Better Auth endpoints follow the pattern: `/api/auth/{action}/{method}`

```
POST /api/auth/sign-up/email    ← Note: /email suffix
POST /api/auth/sign-in/email    ← Not just /sign-in
POST /api/auth/sign-out
GET  /api/auth/session
```

**Why**: The `/email` suffix differentiates authentication methods. This allows Better Auth to support multiple auth strategies (email/password, OAuth providers, magic links, etc.) on the same base path.

**Critical**: If you try to call `/api/auth/sign-up` without `/email`, it will 404.

---

## 3. Drizzle Adapter Configuration for Better Auth

### The Schema Mapping Issue

Better Auth expects singular table names (`user`, `session`, `account`, `verification`) by default, but most developers use plural names (`users`, `sessions`, etc.).

### The Solution

```typescript
import { drizzleAdapter } from "better-auth/adapters/drizzle";

database: drizzleAdapter(db, {
  provider: "sqlite",
  schema: schema,        // MUST pass your schema
  usePlural: true,       // MUST set to true for plural table names
})
```

**Without `usePlural: true`**: You'll get the error `BetterAuthError: model 'user' not found in schema`

**Without `schema` parameter**: Better Auth can't map your tables at all

### Alternative Manual Mapping

```typescript
database: drizzleAdapter(db, {
  provider: "sqlite",
  schema: {
    ...schema,
    user: schema.users,      // Manual mapping
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verifications,
  }
})
```

---

## 4. Better Auth Database Schema Requirements

### Critical Detail: TEXT Primary Keys

Better Auth uses **TEXT (string) primary keys by default**, NOT auto-incrementing integers.

```typescript
// ✅ CORRECT
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),  // TEXT, not integer
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }),
  name: text("name").notNull(),
  image: text("image"),
  createdAt: integer("createdAt").notNull(),
  updatedAt: integer("updatedAt").notNull(),
});

// ❌ WRONG
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }), // Won't work with Better Auth
  // ...
});
```

**Why**: Better Auth generates string-based IDs for compatibility across databases and providers. You can configure custom ID generation, but TEXT is the default.

---

## 5. Better Auth Session in tRPC Context

### The Pattern

Better Auth sessions are extracted from request headers (cookies) using `auth.api.getSession()`.

```typescript
// In apps/api/src/trpc/context.ts
export async function createContext({ req }: { req: Request }) {
  // MUST pass headers to extract session cookie
  const sessionResult = await auth.api.getSession({
    headers: req.headers  // Critical: Pass the headers
  });

  const user = sessionResult?.user ?? null;
  const session = sessionResult?.session ?? null;

  return { req, user, session, db };
}
```

**Critical**: The `headers` parameter is required because Better Auth reads the session token from the cookie in the `Authorization` or `Cookie` header.

### Without Headers

If you call `auth.api.getSession()` without headers, it returns `null` because there's no cookie to read.

### Forcing Database Fetch

```typescript
// Bypass cookie cache and force DB fetch
await auth.api.getSession({
  query: { disableCookieCache: true },
  headers: req.headers,
});
```

---

## 6. CORS Configuration for Session Cookies

### The Requirement

For Better Auth to work across origins (e.g., API on port 3000, frontend on port 3001), you MUST enable credentials in CORS.

```typescript
import { cors } from 'hono/cors'

app.use('*', cors({
  origin: 'http://localhost:3001',  // Frontend origin
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,  // REQUIRED for cookies
}))
```

**Client Side**: Must send `credentials: 'include'` in fetch requests

```typescript
fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  credentials: 'include',  // Required
  // ...
})
```

**Why**: Session tokens are stored in HTTP-only cookies. Without `credentials: true`, browsers won't send or accept cookies in cross-origin requests.

---

## 7. Better Auth API Object Structure

### Key Concept

The `auth.api` object exposes every endpoint as a callable function. Endpoints are dynamic and depend on your configuration and plugins.

```typescript
// Server-side API calls
await auth.api.getSession({ headers: req.headers })
await auth.api.signInEmail({
  body: { email: "...", password: "..." },
  headers: req.headers  // Optional but recommended for IP/user agent
})
await auth.api.verifyEmail({ query: { token: "..." } })
```

### Parameters

- `body`: Request body data (for POST endpoints)
- `headers`: Request headers (for cookie extraction, IP, user agent)
- `query`: URL query parameters
- `asResponse: true`: Returns a Response object instead of parsed data
- `returnHeaders: true`: Returns headers along with the response

### Discovering Available Endpoints

```typescript
// Generate OpenAPI schema to see all available endpoints
const schema = auth.api.generateOpenAPISchema()
console.log(schema)
```

**Why This Matters**: You can't rely on a static list of endpoints because plugins dynamically add new ones.

---

## 8. Session Management Specifics

### Session Expiration vs Session Freshness

These are TWO DIFFERENT concepts:

**Session Expiration**: How long a session is valid before it must be renewed
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days (default)
  updateAge: 60 * 60 * 24,      // Update expiration every 1 day
}
```

**Session Freshness**: How recently the session was created (for sensitive operations)
```typescript
session: {
  freshAge: 60 * 60 * 24, // 1 day (default)
  // Fresh if created within last 24 hours
}
```

**Use Case**: Password changes or sensitive operations might require a "fresh" session (recently created), not just a non-expired one.

### Session Cookie Caching

Better Auth can cache session data in a signed cookie to avoid database hits on every request.

```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60  // Cache for 5 minutes
  }
}
```

**Critical Caveat**: Custom session fields (from `customSession` plugin) are NOT cached. The custom function runs on every request even with cookie caching enabled.

---

## 9. Better Auth Hooks Context Structure

### The Nested Context Object

Hooks receive a `ctx` object with a nested `context` property containing auth-specific data:

```typescript
import { createAuthMiddleware } from "better-auth/api";

const hook = createAuthMiddleware(async (ctx) => {
  // Request data
  ctx.path          // Current endpoint path: "/sign-up/email"
  ctx.body          // Request body (POST requests)
  ctx.headers       // Request headers
  ctx.query         // Query parameters
  ctx.request       // Raw request object

  // Auth-specific context (nested)
  ctx.context.newSession        // After hook: newly created session
  ctx.context.returned          // Value from previous hook
  ctx.context.responseHeaders   // Headers from previous hooks
  ctx.context.authCookies       // Better Auth cookie config
  ctx.context.secret            // Auth instance secret
  ctx.context.password.hash()   // Hash passwords
  ctx.context.password.verify() // Verify passwords
  ctx.context.adapter           // Database adapter methods
  ctx.context.internalAdapter   // High-level DB operations
  ctx.context.generateId()      // Generate IDs
});
```

**Why This Matters**: The double nesting (`ctx.context.newSession`) is non-obvious. Many developers try `ctx.newSession` and wonder why it's undefined.

---

## 10. Secondary Storage

### What It Is

Secondary storage is a key-value store for high-performance data like sessions and rate limiting, separate from your main database.

**Use Cases**:
- Session storage in Redis instead of SQLite/Postgres
- Rate limiting counters
- Temporary data with TTL

**Why Use It**: Offload high-frequency reads/writes from your primary database to a faster store.

**Configuration**: Pass your own implementation to `betterAuth()` config (exact API depends on your setup).

---

## 11. SQLite Database Path Resolution in Monorepo

### The Problem

Relative paths in SQLite can break depending on where the process runs.

### The Solution

```typescript
// In packages/db/src/index.ts
const sqlite = new Database('../../sqlite.db');
// Relative to apps/api, where the process runs
```

**File Location**: `sqlite.db` lives in the project root
**Process Location**: The API runs from `apps/api`
**Path Calculation**: From `apps/api` to root = `../../sqlite.db`

**Critical**: If you run commands from the project root or `packages/db`, the path breaks. Always run the API from `apps/api` or use absolute paths.

---

## 12. tRPC + Hono + Better Auth Integration

### The Complete Flow

```typescript
// 1. Mount tRPC in Hono
app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: ({ req }) => createContext({ req }),
}))

// 2. Create context with Better Auth session
export async function createContext({ req }: { req: Request }) {
  const sessionResult = await auth.api.getSession({ headers: req.headers });
  return {
    req,
    user: sessionResult?.user ?? null,
    session: sessionResult?.session ?? null,
    db
  };
}

// 3. Protected procedure middleware
export const protectedProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    if (!opts.ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
  })
);
```

**Why This Works**:
- Hono passes the raw `Request` to tRPC's context creator
- Better Auth extracts the session from request headers
- Protected procedures check for `user` in context
- Type safety maintained end-to-end

### HTTP Method Mapping

The `@hono/trpc-server` adapter automatically maps:
- tRPC **queries** → **GET** requests
- tRPC **mutations** → **POST** requests

---

## 13. TypeScript Type Inference with Better Auth

### Server-Side Inference

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  // ... config
});

type Session = typeof auth.$Infer.Session;
// Session includes { user: {...}, session: {...} }
```

### Client-Side Inference (Monorepo)

```typescript
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth"; // Type-only import

const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
```

### Additional Fields

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,  // CRITICAL: Prevents users from setting this field
      }
    }
  }
});
```

**Security Note**: Additional fields default to `input: true`, meaning users can set them during sign-up. Always set `input: false` for sensitive fields like `role`, `isAdmin`, etc.

---

## 14. Common Pitfalls Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on all auth routes | Using `app.route()` | Use `app.use('/api/auth/**', ...)` |
| "model 'user' not found" | Missing `usePlural: true` or `schema` | Add both to drizzle adapter config |
| "no such table: users" | Wrong DB path or missing migrations | Check `../../sqlite.db` path, run migrations |
| tRPC returns UNAUTHORIZED when logged in | Missing `credentials: true` in CORS | Add CORS with credentials support |
| Session is null in tRPC context | Not passing `headers` to `getSession()` | Pass `req.headers` to `auth.api.getSession()` |
| Custom fields not type-safe on client | Not using `inferAdditionalFields` | Add plugin with type reference |

---

## 15. Development Workflow Tips

### Running Migrations

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations (use custom script, not drizzle-kit push)
cd packages/db && bun migrate.ts
```

**Why Custom Script**: `drizzle-kit push` has issues with Bun. Use the custom `migrate.ts` that calls `migrate(db, { migrationsFolder: "./migrations" })` directly.

### Testing Auth Flow

```bash
# 1. Sign up
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'

# 2. Sign in (save cookies)
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 3. Test protected endpoint
curl "http://localhost:3000/trpc/user.getCurrentUser" \
  -b cookies.txt
```

---

## Conclusion

This document covers the non-obvious, Better Auth-specific implementation details that are critical for building on this stack. Keep it as a reference when debugging integration issues or extending the application.

**Most Common Issues**:
1. Handler mounting (use `app.use` not `app.route`)
2. Endpoint paths (remember the `/email` suffix)
3. Schema configuration (`usePlural: true`)
4. CORS credentials (required for cookies)
5. Passing headers to `getSession()`

**Last Updated**: 2025-10-27
