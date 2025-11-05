# Production Deployment Guide

## Overview

This guide covers deploying your backend to **Fly.io** when local development is complete and tested.

**Production Stack:**
- Platform: Fly.io
- Runtime: Bun
- Database: PostgreSQL (managed by Fly.io)
- Containerization: Docker

**Live Production URL:** https://my-better-t-app-shy-sky-8404.fly.dev

---

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All features tested locally
- [ ] Database migrations tested with PostgreSQL locally
- [ ] Environment variables documented
- [ ] API endpoints tested and working
- [ ] Email sending tested (Resend configured)
- [ ] Error handling implemented
- [ ] Secrets prepared (RESEND_API_KEY, BETTER_AUTH_SECRET)
- [ ] Code committed to Git
- [ ] Database backup strategy planned

---

## Initial Deployment Setup

### Step 1: Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Verify installation
fly version
```

### Step 2: Authenticate

```bash
# Login to Fly.io (opens browser)
fly auth login

# Verify authentication
fly auth whoami
```

### Step 3: Create PostgreSQL Database

```bash
# Create Postgres cluster (adjust name as needed)
fly postgres create --name my-better-t-app-db --region iad

# IMPORTANT: Save the connection string displayed!
# Format: postgres://username:password@hostname:5432/dbname
# Example: postgres://postgres:yC3UtysqeYPHnpa@my-better-t-app-db.flycast:5432
```

**Save these credentials securely:**
- Username: (shown in output)
- Password: (shown in output)
- Hostname: (shown in output)

### Step 4: Generate PostgreSQL Migrations

```bash
# From project root
cd apps/api

# Generate migrations for PostgreSQL
bun x drizzle-kit generate --config=drizzle.config.postgres.ts

# Verify migrations created
ls -la ../../packages/db/migrations-postgres/
```

### Step 5: Initial App Launch

```bash
# Return to project root
cd ../..

# Launch app (first time)
fly launch

# When prompted:
# - App name: my-better-t-app (or your choice)
# - Region: Choose closest to your users (e.g., iad for US East)
# - PostgreSQL: NO (we already created it)
# - Redis: NO (not needed yet)
# - Deploy now: YES
```

**Note:** First deployment may fail - this is expected. We'll fix it next.

### Step 6: Attach PostgreSQL Database

```bash
# Start the database if stopped
fly machine list --app my-better-t-app-db
fly machine start <MACHINE_ID> --app my-better-t-app-db

# Wait 10 seconds for database to initialize
sleep 10

# Attach database to app
fly postgres attach my-better-t-app-db --app <your-app-name>

# This automatically sets DATABASE_URL secret
```

### Step 7: Set Environment Secrets

```bash
# Set secrets (replace with your values)
fly secrets set \
  RESEND_API_KEY=re_your_actual_key_here \
  BETTER_AUTH_SECRET=$(openssl rand -hex 32) \
  --app <your-app-name>

# Verify secrets are set
fly secrets list --app <your-app-name>
```

### Step 8: Run Database Migrations

```bash
# Create proxy tunnel to database
fly proxy 15432:5432 --app my-better-t-app-db &
PROXY_PID=$!

# Wait for tunnel to establish
sleep 5

# Run migrations through tunnel
cd packages/db
DATABASE_URL="postgres://username:password@localhost:15432/dbname?sslmode=disable" \
  bun migrate-postgres.ts

# Close tunnel
kill $PROXY_PID
cd ../..
```

**Replace in DATABASE_URL:**
- `username` - from Step 3
- `password` - from Step 3
- `dbname` - usually same as username

### Step 9: Deploy Application

```bash
# Deploy with latest code and migrations
fly deploy

# Monitor deployment
fly logs
```

### Step 10: Verify Deployment

```bash
# Check app status
fly status --app <your-app-name>

# Test health endpoint
curl https://<your-app-name>.fly.dev/health

# Test waitlist endpoint
curl -X POST "https://<your-app-name>.fly.dev/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "interests": "AI Learning"
  }'
```

---

## Updating Production (After Initial Setup)

### Standard Deployment Process

**1. Test Locally First**
```bash
# Run all tests
bun test  # if you have tests

# Verify server starts
cd apps/api && bun run dev

# Test critical endpoints
curl http://localhost:3000/health
```

**2. Database Migrations (If Any)**

If you modified the database schema:

```bash
# Generate new migrations
cd apps/api
bun x drizzle-kit generate --config=drizzle.config.postgres.ts

# Review generated SQL
cat ../../packages/db/migrations-postgres/<new-migration>.sql

# Commit migrations to Git
git add ../../packages/db/migrations-postgres/
git commit -m "feat: add new database migration"
```

**3. Deploy to Production**

```bash
# From project root
git add .
git commit -m "feat: your changes description"

# Deploy to Fly.io
fly deploy

# Monitor logs during deployment
fly logs --app <your-app-name>
```

**4. Run New Migrations (If Any)**

```bash
# Only if you added new migrations in step 2

# Create proxy tunnel
fly proxy 15432:5432 --app my-better-t-app-db &
PROXY_PID=$!

# Wait for tunnel
sleep 5

# Run migrations
cd packages/db
DATABASE_URL="postgres://username:password@localhost:15432/dbname?sslmode=disable" \
  bun migrate-postgres.ts

# Close tunnel
kill $PROXY_PID
```

**5. Verify Deployment**

```bash
# Check app status
fly status --app <your-app-name>

# Test updated endpoints
curl https://<your-app-name>.fly.dev/health

# Check logs for errors
fly logs --app <your-app-name>
```

---

## Database Management

### Backup Database

```bash
# Create backup
fly postgres connect --app my-better-t-app-db

# Inside PostgreSQL shell:
pg_dump your_database_name > backup.sql
\q

# Download backup to local
fly ssh console --app my-better-t-app-db -C "cat backup.sql" > backup.sql
```

### Connect to Production Database

```bash
# Method 1: Direct connection via fly
fly postgres connect --app my-better-t-app-db

# Method 2: Via proxy tunnel (for local tools)
fly proxy 15432:5432 --app my-better-t-app-db

# Then use any PostgreSQL client:
psql "postgres://username:password@localhost:15432/dbname?sslmode=disable"
```

### Inspect Database Tables

```bash
# Connect to database
fly postgres connect --app my-better-t-app-db

# List tables
\dt

# Describe users table
\d users

# Query waitlist users
SELECT id, email, name, status, created_at FROM users WHERE status = 'waitlist';

# Exit
\q
```

---

## Monitoring & Debugging

### View Live Logs

```bash
# Stream logs
fly logs --app <your-app-name>

# Filter by level
fly logs --app <your-app-name> | grep ERROR

# View specific machine
fly logs --app <your-app-name> --machine <machine-id>
```

### Check App Status

```bash
# Overall status
fly status --app <your-app-name>

# Detailed machine info
fly machine list --app <your-app-name>

# Health checks
fly checks list --app <your-app-name>
```

### SSH into Running Container

```bash
# Open shell in container
fly ssh console --app <your-app-name>

# Once inside:
ls -la /app
env | grep DATABASE_URL
bun --version
exit
```

### View Metrics

```bash
# Open metrics dashboard
fly dashboard --app <your-app-name>

# Or visit: https://fly.io/apps/<your-app-name>/monitoring
```

---

## Scaling & Performance

### Scale Machines

```bash
# Scale to 2 machines (high availability)
fly scale count 2 --app <your-app-name>

# Scale memory
fly scale memory 512 --app <your-app-name>

# Scale to 0 (sleep mode - saves costs)
fly scale count 0 --app <your-app-name>

# Wake up from sleep
fly scale count 1 --app <your-app-name>
```

### Auto-start/stop Configuration

Already configured in `fly.toml`:
```toml
auto_stop_machines = 'stop'  # Stop when idle
auto_start_machines = true    # Start on request
min_machines_running = 0      # No minimum (cost savings)
```

---

## Environment Management

### Update Secrets

```bash
# Update single secret
fly secrets set RESEND_API_KEY=new_key --app <your-app-name>

# Update multiple secrets
fly secrets set KEY1=val1 KEY2=val2 --app <your-app-name>

# List secrets (values hidden)
fly secrets list --app <your-app-name>

# Remove secret
fly secrets unset KEY_NAME --app <your-app-name>
```

### Current Production Secrets

Required secrets:
- `DATABASE_URL` - Auto-set when attaching Postgres
- `RESEND_API_KEY` - Your Resend API key
- `BETTER_AUTH_SECRET` - Auth token signing secret
- `NODE_ENV` - Set to "production" (via fly.toml)
- `PORT` - Set to "8080" (via fly.toml)

---

## Rollback & Recovery

### View Release History

```bash
# List all deployments
fly releases --app <your-app-name>

# Example output:
# VERSION STATUS      DESCRIPTION
# v3      complete    Deploy image
# v2      complete    Deploy image
# v1      complete    Deploy image
```

### Rollback to Previous Version

```bash
# Rollback to previous release
fly releases rollback --app <your-app-name>

# Rollback to specific version
fly releases rollback v2 --app <your-app-name>

# Verify rollback
fly status --app <your-app-name>
```

### Restart Application

```bash
# Restart all machines
fly machine restart --app <your-app-name>

# Restart specific machine
fly machine restart <machine-id> --app <your-app-name>
```

---

## Troubleshooting Production Issues

### Issue: App keeps restarting

**Check logs:**
```bash
fly logs --app <your-app-name>
```

**Common causes:**
- Missing environment variables
- Database connection failed
- Port mismatch
- Application crash at startup

**Fix:**
1. Verify all secrets are set: `fly secrets list`
2. Check database is running: `fly status --app my-better-t-app-db`
3. Review logs for specific error messages

### Issue: Database connection timeout

**Check database status:**
```bash
fly status --app my-better-t-app-db
```

**Start database if stopped:**
```bash
fly machine list --app my-better-t-app-db
fly machine start <machine-id> --app my-better-t-app-db
```

**Verify DATABASE_URL:**
```bash
fly ssh console --app <your-app-name> -C "printenv DATABASE_URL"
```

### Issue: Migrations not applied

**Symptom:** Tables missing or old schema

**Fix:**
```bash
# Re-run migrations
fly proxy 15432:5432 --app my-better-t-app-db &
sleep 5
cd packages/db
DATABASE_URL="postgres://username:password@localhost:15432/dbname?sslmode=disable" \
  bun migrate-postgres.ts
```

### Issue: 502 Bad Gateway

**Causes:**
- App not responding on correct port
- Health check failing
- App crashed

**Fix:**
1. Check logs: `fly logs`
2. Verify PORT=8080 in fly.toml
3. Restart app: `fly machine restart`

---

## Cost Management

### Fly.io Free Tier

Includes:
- 3 shared-cpu-1x machines (256MB RAM each)
- 160GB outbound data transfer
- PostgreSQL: 256MB RAM, 1GB storage

### Current Configuration

**App (from fly.toml):**
- Memory: 1GB
- CPU: 1 shared vCPU
- Auto-stop when idle (saves costs)

**Database:**
- Memory: 256MB (free tier)
- Storage: 1GB (free tier)

### Estimated Costs (if exceeding free tier)

- App machine: ~$5.70/month per machine
- PostgreSQL: ~$3.60/month
- Bandwidth: $0.02/GB after 160GB

### Cost-Saving Tips

1. **Use auto-stop** (already configured):
   ```toml
   auto_stop_machines = 'stop'
   min_machines_running = 0
   ```

2. **Monitor usage**:
   ```bash
   fly dashboard --app <your-app-name>
   ```

3. **Scale down when not needed**:
   ```bash
   fly scale count 0  # Stop completely
   fly scale count 1  # Resume
   ```

---

## CI/CD Setup (Optional)

### GitHub Actions Deployment

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

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Setup:**
1. Get API token: `fly auth token`
2. Add to GitHub Secrets as `FLY_API_TOKEN`
3. Push to main branch to auto-deploy

---

## Production Endpoints Reference

### Base URL
```
https://my-better-t-app-shy-sky-8404.fly.dev
```

### Health Check
```bash
GET /health
```

### tRPC Endpoints
```bash
POST /trpc/waitlist.join
GET  /trpc/waitlist.getStats
POST /trpc/user.updateUser
GET  /trpc/user.getCurrentUser
```

### Better Auth
```bash
POST /api/auth/sign-up/email
POST /api/auth/sign-in/email
POST /api/auth/sign-out
GET  /api/auth/get-session
POST /api/auth/forget-password
POST /api/auth/reset-password
```

---

## Security Best Practices

### 1. Secrets Management
- Never commit secrets to Git
- Rotate secrets regularly
- Use `fly secrets` command only
- Keep BETTER_AUTH_SECRET secure

### 2. Database Access
- Use proxy for migrations only
- Never expose direct database access
- Enable SSL in production
- Regular backups

### 3. API Security
- Validate all inputs with Zod
- Rate limit endpoints (if needed)
- Use HTTPS only (enforced by Fly.io)
- Implement proper error handling

### 4. Monitoring
- Check logs regularly
- Set up alerts for errors
- Monitor resource usage
- Track deployment success

---

## Quick Reference Commands

```bash
# Deploy
fly deploy

# View logs
fly logs

# Check status
fly status

# SSH into container
fly ssh console

# Update secret
fly secrets set KEY=value

# Restart app
fly machine restart

# Rollback
fly releases rollback

# Database connection
fly postgres connect --app my-better-t-app-db

# Scale
fly scale count 2

# Open dashboard
fly dashboard
```

---

## Support & Resources

- **Fly.io Docs**: https://fly.io/docs
- **Fly.io Community**: https://community.fly.io
- **Fly.io Status**: https://status.fly.io
- **Better Auth Docs**: https://better-auth.com
- **Hono Docs**: https://hono.dev
- **tRPC Docs**: https://trpc.io

---

## Next Steps

1. **Read**: [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
2. **Monitor**: Set up log monitoring
3. **Optimize**: Review performance metrics
4. **Scale**: Adjust resources as needed
5. **Secure**: Review security checklist

---

**Last Updated**: 2025-10-27
**Production URL**: https://my-better-t-app-shy-sky-8404.fly.dev
**Status**: ✅ Live and Running
