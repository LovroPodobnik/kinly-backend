1. **Better Auth + Hono integration patterns**: To integrate Better Auth with Hono, mount the authentication handler to a specific endpoint using `app.on` for POST and GET methods on the path `/api/auth/*` (or a custom base path if configured), passing `c.req.raw` to `auth.handler`. Better Auth supports a single basePath per server instance, which determines the mount path (e.g., `/api/auth/*` by default). It does not natively support multiple basePaths or dynamic routing based on subdomains or paths. Example mounting code:
   ```
   import { Hono } from "hono";
   import { auth } from "./auth";
   import { serve } from "@hono/node-server";

   const app = new Hono();

   app.on(["POST", "GET"], "/api/auth/*", (c) => {
       return auth.handler(c.req.raw);
   });

   serve(app);
   ```

2. **Better Auth Drizzle adapter configuration**: The Drizzle adapter requires specifying the `provider` (e.g., "sqlite", "pg", or "mysql"). The `schema` parameter is needed if your Drizzle schema uses custom table names (e.g., mapping `user` to `users`), where you must manually map it for compatibility. The `usePlural` setting, when set to `true`, automatically handles mapping if all tables use plural forms (e.g., `users` instead of `user`), simplifying setup without manual schema config. Example:
   ```
   import { betterAuth } from "better-auth";
   import { drizzleAdapter } from "better-auth/adapters/drizzle";
   import { db } from "./database.ts";
   import { schema } from "./schema";

   export const auth = betterAuth({
     database: drizzleAdapter(db, {
       provider: "sqlite",
       schema: {
         ...schema,
         user: schema.users,
       },
       usePlural: true,
     }),
     // ... rest of config
   });
   ```

3. **Better Auth database schema requirements**: Better Auth requires core tables for users, sessions, accounts, and verifications, with fields as follows (types in TypeScript; map to appropriate DB types). Tables and fields can be customized via config, and plugins may extend them. ID generation is customizable, and numeric auto-incrementing IDs can be enabled.

   | Table        | Fields                                                                 |
   |--------------|------------------------------------------------------------------------|
   | **user**    | id: string (primary key), name: string, email: string, emailVerified: boolean, image: string, createdAt: Date, updatedAt: Date |
   | **session** | id: string (primary key), userId: string, token: string, expiresAt: Date, ipAddress: string, userAgent: string, createdAt: Date, updatedAt: Date |
   | **account** | id: string (primary key), userId: string, accountId: string, providerId: string, accessToken: string, refreshToken: string, accessTokenExpiresAt: Date, refreshTokenExpiresAt: Date, scope: string, idToken: string, password: string, createdAt: Date, updatedAt: Date |
   | **verification** | id: string (primary key), identifier: string, value: string, expiresAt: Date, createdAt: Date, updatedAt: Date |

4. **Better Auth auth.api.getSession() method**: The `auth.api.getSession()` function retrieves the active session server-side by verifying the session token from the provided headers (which include the session cookie). It extracts the token from the cookie in headers, validates it against the session table (checking id, userId, expiresAt, etc.), and handles expiration (default 7 days) and freshness. If cookie caching is enabled, it first checks the cookie for cached data; otherwise, it queries the database. Custom fields can be added via plugins but aren't cached. Example:
   ```
   await auth.api.getSession({
       headers: req.headers, // Extracts cookie from headers
   });
   ```
   To disable cache and force DB fetch:
   ```
   await auth.api.getSession({
       query: { disableCookieCache: true },
       headers: req.headers,
   });
   ```

5. **Better Auth endpoint structure**: Endpoints follow patterns like `/sign-up/email` (instead of just `/sign-up`) to specify the authentication method or type, differentiating flows such as email/password from social providers or plugins. This structure is exposed via the `api` object, where endpoints are functions requiring body, headers, or query params. Available email/password endpoints include: signUpEmail (for sign-up with email/password), signInEmail (for sign-in), verifyEmail (for verification with token), and getSession (for session retrieval, used with email flows).

6. **@hono/trpc-server adapter**: The `@hono/trpc-server` provides middleware to adapt tRPC servers for Hono, working across runtimes like Cloudflare Workers, Deno, and Bun. Install via `npm install @hono/trpc-server`. Define a tRPC router, then mount it in Hono using `app.use('/trpc/*', trpcServer({ router: appRouter }))`. It follows tRPC conventions: queries use GET requests, mutations use POST. Custom contexts and endpoints are supported. Example server:
   ```
   import { Hono } from 'hono';
   import { trpcServer } from '@hono/trpc-server';
   import { appRouter } from './router';

   const app = new Hono();
   app.use('/trpc/*', trpcServer({ router: appRouter }));
   export default app;
   ```

7. **Better Auth CORS requirements**: For Better Auth to handle cookies and sessions across origins in Hono, use the `cors` middleware from `hono/cors` with `credentials: true` to allow cross-origin cookie transmission. Mount it before auth routes (e.g., on `/api/auth/*`). For cross-domain cookies, set `SameSite=None` and `Secure=true` in config, or enable cross-subdomain cookies. Client requests must include `credentials: "include"`. Example server CORS:
   ```
   import { cors } from "hono/cors";

   app.use("/api/auth/*", cors({
       origin: "http://localhost:3001",
       allowHeaders: ["Content-Type", "Authorization"],
       allowMethods: ["POST", "GET", "OPTIONS"],
       exposeHeaders: ["Content-Length"],
       maxAge: 600,
       credentials: true,
   }));
   ```