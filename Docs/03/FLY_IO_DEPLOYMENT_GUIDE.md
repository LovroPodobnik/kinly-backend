# Fly.io Deployment Guide

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Flyctl CLI**: Installed via `brew install flyctl`
3. **PostgreSQL Migration**: Completed (this guide)
4. **Resend Domain**: Verified for production emails

---

## Setup Steps

### 1. Install Flyctl & Authenticate

```bash
# Install flyctl
brew install flyctl

# Login to Fly.io
fly auth login
```

### 2. Create PostgreSQL Database on Fly.io

```bash
# Create a Postgres cluster (Free tier: 256MB RAM, 1GB storage)
fly postgres create --name my-better-t-app-db --region iad

# Save the connection string displayed - you'll need it!
# Format: postgres://username:password@hostname:5432/dbname
```

**Important**: Save the DATABASE_URL connection string shown after creation!

### 3. Generate PostgreSQL Migrations

```bash
# Generate migrations for PostgreSQL schema
cd apps/api
bun x drizzle-kit generate --config=drizzle.config.postgres.ts
```

This creates migrations in `packages/db/migrations-postgres/`

### 4. Update Migration Runner

Create a PostgreSQL migration runner:

```typescript
// packages/db/migrate-postgres.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}

const queryClient = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(queryClient);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './migrations-postgres' });
console.log('Migrations completed!');
await queryClient.end();
```

### 5. Run Migrations Against Fly.io Database

```bash
# Set your DATABASE_URL temporarily
export DATABASE_URL="postgres://username:password@hostname:5432/dbname"

# Run migrations
cd packages/db
bun migrate-postgres.ts
```

### 6. Launch Your App

```bash
# Return to project root
cd /path/to/my-better-t-app

# Launch (this will prompt for app name and region)
fly launch

# When prompted:
# - App name: my-better-t-app (or your choice)
# - Region: Choose closest to you (e.g., iad for US East)
# - PostgreSQL: NO (we already created it)
# - Redis: NO (not needed yet)
```

### 7. Attach PostgreSQL Database

```bash
# Attach the database to your app
fly postgres attach my-better-t-app-db --app my-better-t-app

# This automatically sets DATABASE_URL secret
```

### 8. Set Environment Variables

```bash
# Set Resend API key
fly secrets set RESEND_API_KEY=your_actual_resend_key

# Set Better Auth secret
fly secrets set BETTER_AUTH_SECRET=your_auth_secret_here

# Set other environment variables
fly secrets set NODE_ENV=production
```

### 9. Deploy!

```bash
# Deploy your application
fly deploy

# Watch the deployment logs
fly logs
```

### 10. Verify Deployment

```bash
# Check app status
fly status

# View logs
fly logs

# Open your app in browser
fly open
```

Your app should now be live at: `https://my-better-t-app.fly.dev`

---

## Testing Production Endpoints

### Health Check
```bash
curl https://my-better-t-app.fly.dev/health
```

### Join Waitlist
```bash
curl -X POST "https://my-better-t-app.fly.dev/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "name":"Test User",
    "interests":"AI Learning"
  }'
```

### Check Database Connection
```bash
fly ssh console -C "bun -e 'console.log(process.env.DATABASE_URL)'"
```

---

## Monitoring & Management

### View Logs
```bash
# Real-time logs
fly logs

# Last 100 lines
fly logs --lines 100
```

### SSH into Machine
```bash
fly ssh console
```

### Check Database
```bash
# Connect to PostgreSQL
fly postgres connect -a my-better-t-app-db
```

### Scale Your App
```bash
# Scale to 2 machines
fly scale count 2

# Scale memory
fly scale memory 512

# Scale to 0 (sleep mode)
fly scale count 0
```

---

## Environment Variables Reference

Required secrets:
- `DATABASE_URL` - Auto-set when attaching Postgres
- `RESEND_API_KEY` - Your Resend API key
- `BETTER_AUTH_SECRET` - Generate with: `bunx better-auth generate-secret`

Optional:
- `NODE_ENV` - Set to "production"
- `PORT` - Auto-set to 8080 by Fly.io

---

## Cost Breakdown (Free Tier)

**Fly.io Free Tier Includes:**
- 3 shared-cpu-1x machines with 256MB RAM
- 160GB outbound data transfer
- PostgreSQL: 256MB RAM, 1GB storage

**After Free Tier:**
- Machines: ~$0.0000022/second (~$5.70/month per machine)
- PostgreSQL: ~$0.0000014/second (~$3.60/month)
- Bandwidth: $0.02/GB

---

## Troubleshooting

### Issue: Build fails

**Check**:
```bash
# Test build locally
docker build -t my-app .

# View build logs
fly logs --image
```

### Issue: Database connection fails

**Check**:
```bash
# Verify DATABASE_URL is set
fly secrets list

# Test connection
fly ssh console
> bun -e "console.log(process.env.DATABASE_URL)"
```

### Issue: Migrations not applied

**Solution**:
```bash
# Manually run migrations via SSH
fly ssh console
cd packages/db
bun migrate-postgres.ts
```

### Issue: App crashes on start

**Check logs**:
```bash
fly logs

# Common issues:
# - Missing environment variables
# - Database connection timeout
# - Port mismatch (ensure using PORT=8080)
```

---

## Updating Your App

### Deploy New Changes

```bash
# Commit your changes
git add .
git commit -m "Update"

# Deploy
fly deploy
```

### Rolling Back

```bash
# List releases
fly releases

# Rollback to previous
fly releases rollback
```

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get your API token: `fly auth token`

---

## Next Steps

1. **Set up custom domain**: `fly domains` (requires paid plan)
2. **Add Redis** for caching: `fly redis create`
3. **Configure backups** for PostgreSQL
4. **Set up monitoring** with Fly.io Metrics
5. **Add frontend** deployment to Vercel

---

## Support

- Fly.io Docs: https://fly.io/docs
- Community Forum: https://community.fly.io
- Status Page: https://status.fly.io

---

**Last Updated**: 2025-10-27
**Status**: Ready for Deployment
