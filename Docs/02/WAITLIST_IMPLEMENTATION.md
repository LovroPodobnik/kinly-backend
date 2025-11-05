# Waitlist Implementation Guide

## Overview

This document describes the complete waitlist system implementation for your AI Learning Platform. The system allows you to collect emails now (pre-launch) and automatically convert waitlist users to active users when you're ready to launch.

---

## Features Implemented

### ✅ Phase 1: Email Collection (Now)
- Users can join the waitlist with just email, name, and interests
- No password required at signup
- Automatic confirmation emails (via Resend)
- User status tracked as "waitlist"
- Interests and signup source tracking

### ✅ Phase 2: Launch & Activation (Later)
- Send password reset emails to waitlist users
- Users set their password and are automatically activated
- Status changes from "waitlist" → "active"
- Email verified automatically
- Users can immediately log in and access the platform

---

## Database Schema Changes

### New Fields in `users` Table

```typescript
status: text('status').notNull().default('waitlist')
// Possible values: 'waitlist', 'active', 'premium', etc.

interests: text('interests')
// AI course topics they're interested in

signupSource: text('signup_source')
// Track where they signed up (landing page, referral, etc.)
```

---

## API Endpoints

### 1. Join Waitlist
**Endpoint**: `POST /trpc/waitlist.join`

**Request**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "interests": "AI Fundamentals, ChatGPT",
  "signupSource": "landing-page"
}
```

**Response**:
```json
{
  "success": true,
  "message": "You're on the waitlist! Check your email for confirmation.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "waitlist"
  }
}
```

**What Happens**:
1. User record created with `status="waitlist"` and `password=NULL`
2. Confirmation email sent via Resend
3. User data stored with interests and signup source

---

### 2. Request Password Reset (Launch Activation)
**Endpoint**: `POST /api/auth/request-password-reset`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "status": true,
  "message": "If this email exists in our system, check your email for the reset link"
}
```

**What Happens**:
1. Token generated and stored in `verifications` table
2. Email sent with password reset link
3. Link format: `https://yourapp.com/reset-password?token=xxx`

---

### 3. Set Password (User Activation)
**Endpoint**: `POST /api/auth/reset-password`

**Request**:
```json
{
  "token": "xxx",
  "newPassword": "SecurePassword123"
}
```

**Response**:
```json
{
  "status": true
}
```

**What Happens**:
1. Token validated
2. Password set for user
3. User can now log in

---

### 4. Sign In (Auto-Activation)
**Endpoint**: `POST /api/auth/sign-in/email`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**:
```json
{
  "redirect": false,
  "token": "session-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    ...
  }
}
```

**What Happens**:
1. User authenticated
2. **Hook triggers automatically**: If user status is "waitlist", it updates to "active"
3. Email marked as verified
4. User can now access the platform

---

## User Journey

### Pre-Launch (Now)

```mermaid
User visits landing page
    ↓
Fills out waitlist form (email, name, interests)
    ↓
POST /trpc/waitlist.join
    ↓
User record created (status: waitlist, password: NULL)
    ↓
Confirmation email sent ✉️
    ↓
User on waitlist! ✅
```

### Launch Day (Later)

```mermaid
You trigger launch
    ↓
Send "We're Live!" emails to all waitlist users
    ↓
POST /api/auth/request-password-reset for each user
    ↓
Email sent with "Set Password" link ✉️
    ↓
User clicks link in email
    ↓
User sets password
    ↓
POST /api/auth/reset-password
    ↓
Password saved ✅
```

### First Login (Automatic Activation)

```mermaid
User visits your app
    ↓
Enters email + new password
    ↓
POST /api/auth/sign-in/email
    ↓
Hook checks: status == "waitlist"?
    ↓ YES
Update: status → "active", emailVerified → true
    ↓
User logged in with active account! ✅
```

---

## Email Templates

### 1. Waitlist Confirmation Email

**Subject**: You're on the waitlist! 🎉

**Content**:
- Welcome message
- Thanks for joining
- "We'll email you when we launch"

**Sent via**: `apps/api/src/lib/email.ts` → `sendWaitlistConfirmation()`

---

### 2. Launch Activation Email

**Subject**: We're Live! Set Your Password

**Content**:
- "Great news! We're live!"
- Call-to-action button: "Set Password & Access Platform"
- Password reset link with token
- Link expires in 1 hour

**Sent via**: `packages/auth/src/index.ts` → `sendResetPassword` hook

---

## Testing the Complete Flow

### Step 1: Join Waitlist
```bash
curl -X POST "http://localhost:3000/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "name":"Test User",
    "interests":"AI, Machine Learning"
  }'
```

**Expected Result**: User created with status="waitlist"

---

### Step 2: Request Password Reset
```bash
curl -X POST "http://localhost:3000/api/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Result**: Password reset email sent

---

### Step 3: Set Password
```bash
# Get token from database or email
curl -X POST "http://localhost:3000/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_EMAIL","newPassword":"MyPassword123"}'
```

**Expected Result**: Password set successfully

---

### Step 4: Sign In (Auto-Activation)
```bash
curl -X POST "http://localhost:3000/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"MyPassword123"}'
```

**Expected Result**:
- User logged in successfully
- Status automatically changed to "active"
- Email marked as verified

---

### Verify Activation in Database
```bash
sqlite3 sqlite.db "SELECT email, status, email_verified FROM users WHERE email='test@example.com';"
```

**Expected Output**:
```
test@example.com|active|1
```

---

## Email Configuration (Resend)

### Current Status: Sandbox Mode
- Emails can only be sent to your verified email: `podobnik.lovro@gmail.com`
- To send to other addresses, you need to verify a domain

### Production Setup Required:
1. **Verify your domain** at [resend.com/domains](https://resend.com/domains)
2. **Update email sender** in both:
   - `apps/api/src/lib/email.ts` (line 73)
   - `packages/auth/src/index.ts` (line 24)
3. Change from: `onboarding@resend.dev` → `onboarding@yourdomain.com`

### Environment Variables
Already configured in `.env`:
```
RESEND_API_KEY=re_WfudxUox_6G2ydYFaQZyhGTh4bNsBKrbu
```

---

## Architecture Decisions

### Why Auto-Activate on Sign-In?
Instead of activating during password reset, we activate on first sign-in because:
1. **Better UX**: User immediately sees "active" status after logging in
2. **More reliable**: Sign-in creates a session, providing better context
3. **Hook compatibility**: `newSession` object is available on sign-in
4. **Flexibility**: Works whether user sets password via reset link or alternative methods

### Hook Implementation
```typescript
// In packages/auth/src/index.ts
hooks: {
  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path === '/sign-in/email') {
      const newSession = ctx.context.newSession;
      if (newSession?.user) {
        // Check if user is on waitlist
        const [dbUser] = await db.select()...
        if (dbUser && dbUser.status === 'waitlist') {
          // Activate user
          await db.update(users).set({
            status: 'active',
            emailVerified: true,
            updatedAt: new Date(),
          })...
        }
      }
    }
  }),
}
```

---

## Files Modified/Created

### Created Files:
1. `/apps/api/src/lib/email.ts` - Resend email service
2. `/apps/api/src/trpc/routers/waitlist.ts` - Waitlist tRPC router

### Modified Files:
1. `/packages/db/src/schema.ts` - Added waitlist fields
2. `/packages/db/migrations/0002_medical_barracuda.sql` - Database migration
3. `/packages/auth/src/index.ts` - Better Auth config + hooks
4. `/apps/api/src/trpc/root.ts` - Added waitlist router
5. `/apps/api/package.json` - Updated dev script for .env loading

---

## Launch Day Checklist

### Pre-Launch Preparation:
- [ ] Verify domain in Resend
- [ ] Update sender email addresses in code
- [ ] Test email sending to external addresses
- [ ] Prepare launch email copy/design
- [ ] Query database for total waitlist count

### Launch Execution:
```bash
# 1. Get all waitlist users
sqlite3 sqlite.db "SELECT email, name FROM users WHERE status='waitlist';"

# 2. For each user, trigger password reset:
curl -X POST "http://localhost:3000/api/auth/request-password-reset" \
  -H "Content-Type: application/json" \
  -d '{"email":"USER_EMAIL"}'

# 3. Users receive email and set password
# 4. Users sign in → automatically activated!
```

### Post-Launch Monitoring:
```bash
# Check activation rate
sqlite3 sqlite.db "
  SELECT
    status,
    COUNT(*) as count
  FROM users
  GROUP BY status;
"
```

---

## Future Enhancements

### Analytics & Tracking:
- Add `activatedAt` timestamp field
- Track conversion rate (waitlist → active)
- Monitor password reset link click rate

### Admin Dashboard:
- View waitlist stats via `/trpc/waitlist.getStats`
- Filter by signup source
- Export waitlist to CSV

### User Experience:
- Add email verification step before waitlist
- Send reminder emails to unactivated users
- Add "early supporter" badge for waitlist users

### Bulk Operations:
- Create admin endpoint to trigger mass password resets
- Batch email sending with rate limiting
- Schedule launch emails via Resend

---

## Troubleshooting

### Issue: Emails not sending

**Cause**: RESEND_API_KEY not loaded or Resend in sandbox mode

**Solution**:
1. Verify `.env` file exists in project root
2. Restart dev server: `bun dev` from project root
3. Check for sandbox mode restrictions (only sends to verified email)

---

### Issue: User status not changing to "active"

**Cause**: Hook not triggering or user didn't sign in

**Solution**:
1. Verify hook is configured in `packages/auth/src/index.ts`
2. User must sign in **after** setting password
3. Check server logs for: `[Better Auth Hook] Activating waitlist user`

---

### Issue: Database path errors

**Cause**: Running commands from wrong directory

**Solution**: Always run `bun dev` from project root, not from `apps/api`

---

## Support & Questions

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify database schema: `sqlite3 sqlite.db ".schema users"`
3. Test endpoints individually using curl commands above
4. Review Better Auth documentation for advanced configuration

---

**Last Updated**: 2025-10-27
**Implementation Status**: ✅ Complete and Tested
**Next Steps**: See [NEXT_STEPS.md](./NEXT_STEPS.md) for launch preparation
