# Local Development Guide

## Prerequisites

- **Bun**: v1.3.1 or higher
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **Git**: For version control
- **Code Editor**: VS Code recommended

---

## Initial Setup

### 1. Clone & Install Dependencies

```bash
# Navigate to project
cd my-better-t-app

# Install all dependencies (uses Turborepo)
bun install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy the example (if it exists) or create new
touch .env
```

**Required Environment Variables:**

```env
# Database (SQLite for local development)
# DATABASE_URL is optional for local dev - defaults to SQLite
# DATABASE_URL="postgresql://localhost:5432/mydb"  # Only if using local Postgres

# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here

# Authentication
BETTER_AUTH_SECRET=your_secret_here_use_openssl_rand_hex_32

# Server
NODE_ENV=development
PORT=3000
```

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -hex 32
```

**Get RESEND_API_KEY:**
1. Sign up at https://resend.com
2. Create an API key in the dashboard
3. Note: In sandbox mode, emails only go to your verified email address

### 3. Database Setup (SQLite - Auto-configured)

SQLite is used automatically for local development. No additional setup needed!

The database file will be created at the project root: `sqlite.db`

**Generate and Run Migrations:**

```bash
# From project root
cd apps/api

# Generate migrations
bun x drizzle-kit generate --config=drizzle.config.ts

# Run migrations (automatic on first run)
cd ../../packages/db
bun migrate.ts
```

**Database Schema:**
- `users` - User accounts with waitlist support
- `sessions` - Better Auth sessions
- `accounts` - OAuth accounts (if enabled)
- `verifications` - Email verification tokens

---

## Running the Development Server

### Start the API Server

```bash
# From project root
cd apps/api
bun run dev

# OR from root with turborepo
bun dev
```

**Server will start at:** `http://localhost:3000`

**Expected Output:**
```
📁 Using SQLite database (local development)
🚀 Server is running on http://localhost:3000
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Check Better Auth
curl http://localhost:3000/api/auth/get-session
# Expected: null (no session yet)
```

---

## Development Workflow

### Project Structure

```
my-better-t-app/
├── apps/
│   └── api/                    # Main API application
│       ├── src/
│       │   ├── index.ts        # Entry point (Hono server)
│       │   ├── trpc/           # tRPC routers
│       │   │   ├── routers/
│       │   │   │   ├── waitlist.ts    # Waitlist endpoints
│       │   │   │   └── user.ts        # User endpoints
│       │   │   └── root.ts     # Root router
│       │   └── lib/
│       │       └── email.ts    # Email service (Resend)
│       └── drizzle.config.ts   # SQLite config
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── index.ts        # DB client export
│   │   │   ├── schema.ts       # SQLite schema
│   │   │   └── schema-postgres.ts  # PostgreSQL schema
│   │   ├── migrations/         # SQLite migrations
│   │   └── migrations-postgres/ # PostgreSQL migrations
│   │
│   └── auth/                   # Better Auth configuration
│       └── src/
│           └── index.ts        # Auth setup with hooks
│
├── .env                        # Environment variables
└── sqlite.db                   # SQLite database file (auto-created)
```

### Making Changes

#### 1. Adding a New tRPC Endpoint

**Example: Add a new waitlist endpoint**

```typescript
// apps/api/src/trpc/routers/waitlist.ts

export const waitlistRouter = router({
  // ... existing endpoints

  // New endpoint
  removeFromWaitlist: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(users)
        .where(eq(users.email, input.email));

      return { success: true };
    }),
});
```

**Test it:**
```bash
curl -X POST "http://localhost:3000/trpc/waitlist.removeFromWaitlist" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

#### 2. Modifying Database Schema

**Add a new field to users table:**

```typescript
// packages/db/src/schema.ts

export const users = sqliteTable('users', {
  // ... existing fields

  // New field
  company: text('company'),
});
```

**Generate and run migration:**
```bash
cd apps/api
bun x drizzle-kit generate --config=drizzle.config.ts

# Check generated migration in packages/db/migrations/
# Then run it:
cd ../../packages/db
bun migrate.ts
```

#### 3. Updating Email Templates

```typescript
// apps/api/src/lib/email.ts

export async function sendWaitlistConfirmation(to: string, name?: string) {
  return sendEmail({
    from: 'Your App <onboarding@resend.dev>',
    to,
    subject: "You're on the waitlist! 🎉",
    html: `
      <!-- Your custom HTML template -->
    `,
  });
}
```

---

## Testing Locally

### 1. Test Waitlist Flow

```bash
# Join waitlist
curl -X POST "http://localhost:3000/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "interests": "AI Learning",
    "signupSource": "landing-page"
  }'

# Check stats
curl "http://localhost:3000/trpc/waitlist.getStats"
```

### 2. Test Authentication Flow

```bash
# Sign up with email/password
curl -X POST "http://localhost:3000/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "New User"
  }'

# Sign in
curl -X POST "http://localhost:3000/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!"
  }' \
  --cookie-jar cookies.txt

# Get session (using saved cookies)
curl "http://localhost:3000/api/auth/get-session" \
  --cookie cookies.txt
```

### 3. Inspect Database

**Using SQLite CLI:**
```bash
# Install sqlite3 if needed
brew install sqlite3  # macOS
# OR
apt-get install sqlite3  # Linux

# Open database
sqlite3 sqlite.db

# List tables
.tables

# Query users
SELECT * FROM users;

# Exit
.quit
```

**Using Drizzle Studio (Recommended):**
```bash
cd apps/api
bun x drizzle-kit studio --config=drizzle.config.ts

# Opens at http://localhost:4983
# Visual database browser with full CRUD
```

---

## Common Development Tasks

### Reset Database

```bash
# Delete database file
rm sqlite.db

# Regenerate migrations (if needed)
cd apps/api
bun x drizzle-kit generate --config=drizzle.config.ts

# Run migrations
cd ../../packages/db
bun migrate.ts
```

### Add New Package

```bash
# From project root
bun add <package-name>

# To specific workspace
cd apps/api
bun add <package-name>
```

### Run Type Checking

```bash
# From project root
bun run type-check  # If configured in package.json
# OR
cd apps/api && bunx tsc --noEmit
```

---

## Troubleshooting

### Issue: RESEND_API_KEY not found

**Symptom:**
```
⚠️ RESEND_API_KEY not found in environment variables
```

**Fix:**
1. Ensure `.env` file exists in project root
2. Add `RESEND_API_KEY=your_key`
3. Restart dev server

### Issue: Port 3000 already in use

**Fix:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# OR use different port
PORT=4000 bun run dev
```

### Issue: Migration errors

**Fix:**
```bash
# Reset database
rm sqlite.db
rm -rf packages/db/migrations/

# Regenerate clean migrations
cd apps/api
bun x drizzle-kit generate --config=drizzle.config.ts

# Run migrations
cd ../../packages/db
bun migrate.ts
```

### Issue: Changes not reflecting

**Fix:**
1. Restart dev server (Bun has hot reload but sometimes needs restart)
2. Check for TypeScript errors: `bunx tsc --noEmit`
3. Clear Bun cache: `rm -rf node_modules/.cache`

---

## Development Best Practices

### 1. Database Changes

- Always generate migrations, don't modify DB directly
- Test migrations in both SQLite (dev) and PostgreSQL (staging)
- Never delete migration files

### 2. API Endpoints

- Use tRPC for type-safe endpoints
- Validate all inputs with Zod schemas
- Return consistent response formats
- Handle errors gracefully

### 3. Authentication

- Never store passwords in plain text
- Use Better Auth's built-in password hashing
- Implement proper session management
- Test auth flows thoroughly

### 4. Email Sending

- Test with Resend sandbox mode first
- Keep email templates maintainable
- Handle email failures gracefully (log but don't crash)
- Test with real email addresses before production

### 5. Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | SQLite | PostgreSQL URL for production |
| `RESEND_API_KEY` | Yes | - | Resend API key for emails |
| `BETTER_AUTH_SECRET` | Yes | - | Secret for auth token signing |
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3000 | Server port |

---

## Next Steps

1. **Read**: [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
2. **Read**: [Deployment Guide](./DEPLOYMENT_GUIDE.md)
3. **Explore**: API endpoints at http://localhost:3000
4. **Test**: Use the provided curl examples
5. **Build**: Create your features!

---

**Last Updated**: 2025-10-27
**Maintainer**: Backend Team
