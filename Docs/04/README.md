# Backend Documentation - Quick Reference

## 📚 Documentation Overview

Complete guides for developing, deploying, and integrating with the backend API.

---

## 📖 Available Guides

### 1. [Local Development Guide](./LOCAL_DEVELOPMENT.md)
**For Backend Developers**

Learn how to:
- Set up the development environment
- Run the backend locally
- Make database changes
- Test endpoints
- Debug common issues

**Quick Start:**
```bash
cd my-better-t-app
bun install
# Create .env with RESEND_API_KEY and BETTER_AUTH_SECRET
cd apps/api && bun run dev
```

---

### 2. [Deployment Guide](./DEPLOYMENT_GUIDE.md)
**For DevOps / Backend Developers**

Learn how to:
- Deploy to Fly.io production
- Manage database migrations
- Update production secrets
- Monitor and debug production
- Roll back deployments

**Production URL:** https://my-better-t-app-shy-sky-8404.fly.dev

**Quick Deploy:**
```bash
fly deploy
```

---

### 3. [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
**For Frontend Developers**

Learn how to:
- Integrate waitlist signup form
- Implement authentication flow
- Handle user sessions
- Make API requests
- Handle errors

**Quick Example:**
```javascript
// Join waitlist
fetch('https://my-better-t-app-shy-sky-8404.fly.dev/trpc/waitlist.join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe'
  })
});
```

---

## 🚀 Quick Links

### For Backend Developers
- [Set up local environment](./LOCAL_DEVELOPMENT.md#initial-setup)
- [Run development server](./LOCAL_DEVELOPMENT.md#running-the-development-server)
- [Add new endpoints](./LOCAL_DEVELOPMENT.md#1-adding-a-new-trpc-endpoint)
- [Modify database schema](./LOCAL_DEVELOPMENT.md#2-modifying-database-schema)
- [Troubleshooting](./LOCAL_DEVELOPMENT.md#troubleshooting)

### For DevOps / Deployment
- [Initial deployment setup](./DEPLOYMENT_GUIDE.md#initial-deployment-setup)
- [Update production](./DEPLOYMENT_GUIDE.md#updating-production-after-initial-setup)
- [Database management](./DEPLOYMENT_GUIDE.md#database-management)
- [Monitoring & debugging](./DEPLOYMENT_GUIDE.md#monitoring--debugging)
- [Rollback](./DEPLOYMENT_GUIDE.md#rollback--recovery)

### For Frontend Developers
- [Waitlist form integration](./FRONTEND_INTEGRATION.md#waitlist-integration)
- [Authentication examples](./FRONTEND_INTEGRATION.md#react-authentication-hook)
- [API endpoints reference](./FRONTEND_INTEGRATION.md#api-endpoints-reference)
- [TypeScript types](./FRONTEND_INTEGRATION.md#typescript-types)
- [Common issues](./FRONTEND_INTEGRATION.md#need-help)

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- Runtime: Bun
- Framework: Hono (fast web framework)
- API: tRPC (type-safe endpoints)
- Auth: Better Auth (email/password)
- Database ORM: Drizzle
- Validation: Zod

**Database:**
- Development: SQLite (auto-configured)
- Production: PostgreSQL (Fly.io managed)

**Deployment:**
- Platform: Fly.io
- Containerization: Docker
- Database: PostgreSQL on Fly.io

**Email:**
- Service: Resend
- Templates: HTML emails

### Project Structure

```
my-better-t-app/
├── apps/
│   └── api/                    # Main API application
│       ├── src/
│       │   ├── index.ts        # Hono server entry point
│       │   ├── trpc/           # tRPC routers
│       │   │   ├── routers/
│       │   │   │   ├── waitlist.ts    # Waitlist endpoints
│       │   │   │   └── user.ts        # User endpoints
│       │   │   └── root.ts            # Root router
│       │   └── lib/
│       │       └── email.ts    # Email service
│       ├── drizzle.config.ts   # SQLite config (dev)
│       └── drizzle.config.postgres.ts  # PostgreSQL config (prod)
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── index.ts        # DB client
│   │   │   ├── schema.ts       # SQLite schema
│   │   │   └── schema-postgres.ts  # PostgreSQL schema
│   │   ├── migrations/         # SQLite migrations
│   │   └── migrations-postgres/ # PostgreSQL migrations
│   │
│   └── auth/                   # Authentication package
│       └── src/
│           └── index.ts        # Better Auth configuration
│
├── Dockerfile                  # Production container
├── fly.toml                    # Fly.io configuration
└── .env                        # Environment variables (local)
```

---

## 🔌 API Endpoints

### Production Base URL
```
https://my-better-t-app-shy-sky-8404.fly.dev
```

### Development Base URL
```
http://localhost:3000
```

### Health Check
```bash
GET /health
# Response: {"status":"ok"}
```

### Waitlist
```bash
POST /trpc/waitlist.join          # Join waitlist
GET  /trpc/waitlist.getStats      # Get stats
```

### Authentication
```bash
POST /api/auth/sign-up/email      # Sign up
POST /api/auth/sign-in/email      # Sign in
POST /api/auth/sign-out           # Sign out
GET  /api/auth/get-session        # Get session
POST /api/auth/forget-password    # Request reset
POST /api/auth/reset-password     # Reset password
```

### User Management (Protected)
```bash
GET  /trpc/user.getCurrentUser    # Get logged-in user
POST /trpc/user.updateUser        # Update profile
```

---

## 🔑 Environment Variables

### Required for Development

```env
# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here

# Authentication
BETTER_AUTH_SECRET=your_32_char_hex_secret

# Optional
NODE_ENV=development
PORT=3000
```

### Required for Production

Set via `fly secrets set`:

- `DATABASE_URL` - Auto-set when attaching PostgreSQL
- `RESEND_API_KEY` - Your Resend API key
- `BETTER_AUTH_SECRET` - Auth token signing secret
- `NODE_ENV` - Set to "production" (via fly.toml)
- `PORT` - Set to "8080" (via fly.toml)

---

## 🧪 Testing Endpoints

### Test Waitlist (curl)

```bash
# Join waitlist
curl -X POST "http://localhost:3000/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "interests": "AI Learning"
  }'

# Get stats
curl "http://localhost:3000/trpc/waitlist.getStats"
```

### Test Authentication (curl)

```bash
# Sign up
curl -X POST "http://localhost:3000/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "New User"
  }' \
  --cookie-jar cookies.txt

# Get session
curl "http://localhost:3000/api/auth/get-session" \
  --cookie cookies.txt

# Sign out
curl -X POST "http://localhost:3000/api/auth/sign-out" \
  --cookie cookies.txt
```

---

## 📊 Current Status

### Production
- **Status:** ✅ Live and Running
- **URL:** https://my-better-t-app-shy-sky-8404.fly.dev
- **Database:** PostgreSQL (Fly.io)
- **Region:** iad (US East)
- **Health:** All checks passing

### Features
- ✅ Waitlist signup with email notifications
- ✅ Email/password authentication
- ✅ Password reset flow
- ✅ User profile management
- ✅ Session management with cookies
- ✅ Auto-activation for waitlist users
- ✅ PostgreSQL database with migrations

---

## 🆘 Getting Help

### For Backend Issues
1. Check [Local Development Troubleshooting](./LOCAL_DEVELOPMENT.md#troubleshooting)
2. Review server logs: `fly logs`
3. Check database: `fly postgres connect`

### For Deployment Issues
1. Check [Deployment Troubleshooting](./DEPLOYMENT_GUIDE.md#troubleshooting-production-issues)
2. Review deployment status: `fly status`
3. Check recent releases: `fly releases`

### For Frontend Integration Issues
1. Check [Frontend Common Issues](./FRONTEND_INTEGRATION.md#need-help)
2. Verify API is responding: `curl https://my-better-t-app-shy-sky-8404.fly.dev/health`
3. Check browser console for CORS/cookie errors

---

## 📝 Important Notes

### For Development
- SQLite is used automatically for local development
- Environment variables must be in root `.env` file
- Hot reload works, but sometimes requires restart
- Database file: `sqlite.db` (in project root)

### For Production
- PostgreSQL is used in production
- All secrets managed via `fly secrets`
- Auto-stop/start configured to save costs
- Health checks run every 15 seconds

### For Frontend
- Always use `credentials: 'include'` for cookies
- Backend accepts requests from any origin
- Resend sandbox mode: emails only go to verified addresses
- Session cookies are httpOnly and secure in production

---

## 🎯 Next Steps

### Backend Developers
1. ✅ Set up local environment
2. ✅ Run development server
3. ✅ Test all endpoints
4. ⬜ Add new features (if needed)
5. ⬜ Deploy to production

### Frontend Developers
1. ⬜ Review [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
2. ⬜ Implement waitlist form
3. ⬜ Test with production API
4. ⬜ Implement authentication flow
5. ⬜ Test end-to-end

### DevOps
1. ✅ Initial deployment complete
2. ✅ Database migrations applied
3. ✅ Secrets configured
4. ⬜ Set up monitoring alerts
5. ⬜ Configure CI/CD (optional)

---

## 📚 Related Documentation

### In This Project
- [Codebase Context](../01/CODEBASE_CONTEXT.md) - Better Auth + Hono integration
- [Waitlist Implementation](../02/WAITLIST_IMPLEMENTATION.md) - Waitlist feature details
- [Fly.io Deployment](../03/FLY_IO_DEPLOYMENT_GUIDE.md) - Original deployment guide

### External Resources
- [Bun Documentation](https://bun.sh/docs)
- [Hono Documentation](https://hono.dev)
- [tRPC Documentation](https://trpc.io)
- [Better Auth Documentation](https://better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Fly.io Documentation](https://fly.io/docs)
- [Resend Documentation](https://resend.com/docs)

---

## 🤝 Contributing

### Code Style
- Use TypeScript for type safety
- Validate inputs with Zod schemas
- Handle errors gracefully
- Write clear commit messages

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes
git add .
git commit -m "feat: add feature description"

# Push and create PR
git push origin feature/feature-name
```

### Before Deploying
- [ ] Test locally
- [ ] Test with production API
- [ ] Review database migrations
- [ ] Update documentation (if needed)
- [ ] Check logs for errors

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
**Status**: Production Ready ✅
