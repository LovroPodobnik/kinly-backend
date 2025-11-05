# Production Database Access

## Quick Connect to Production Postgres

```bash
# Interactive SQL console
fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404

# Run single query
echo "SELECT * FROM users;" | fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404

# Run multiple commands
fly postgres connect -a my-better-t-app-db -d my_better_t_app_shy_sky_8404 <<'EOF'
SELECT COUNT(*) FROM users;
SELECT email, name, status FROM users ORDER BY created_at DESC;
EOF
```

## Database Info

- **App name**: `my-better-t-app-db`
- **Database name**: `my_better_t_app_shy_sky_8404`
- **Hostname**: `postgresql://my-better-t-app-db.flycast`

## Common Operations

```sql
-- View all users
SELECT email, name, status, created_at FROM users ORDER BY created_at DESC;

-- Count users
SELECT COUNT(*) FROM users;

-- Clean test data
DELETE FROM users WHERE email LIKE '%example.com%';

-- View all tables
\dt

-- Exit console
\q
```

## WARNING

**This is unmanaged Postgres** - you are responsible for:
- Backups
- Disaster recovery
- All operations

Consider upgrading to Managed Postgres: `fly mpg`
