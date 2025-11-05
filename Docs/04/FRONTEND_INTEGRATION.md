# Frontend Integration Guide

## Overview

This guide helps frontend developers integrate with the backend API for:
- **Waitlist signup** - Collect emails before launch
- **User authentication** - Sign up, sign in, password reset
- **User management** - Get and update user profiles

**Backend URLs:**
- Development: `http://localhost:3000`
- Production: `https://my-better-t-app-shy-sky-8404.fly.dev`

---

## Quick Start

### API Architecture

The backend uses two API patterns:

1. **tRPC** - Type-safe endpoints for app features
   - Base path: `/trpc`
   - Used for: Waitlist, user operations
   - Content-Type: `application/json`

2. **Better Auth** - Authentication endpoints
   - Base path: `/api/auth`
   - Used for: Sign up, sign in, sessions
   - Content-Type: `application/json`

### Authentication Flow

```
1. User signs up → POST /api/auth/sign-up/email
2. Backend creates account and session
3. Backend returns session cookie (automatically stored by browser)
4. Frontend makes authenticated requests with cookie
5. Backend validates session cookie automatically
```

---

## Waitlist Integration

### 1. Basic Waitlist Form

**Goal:** Collect emails before launch

**Endpoint:** `POST /trpc/waitlist.join`

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "interests": "AI, Machine Learning",
  "signupSource": "landing-page"
}
```

**Response:**
```json
{
  "result": {
    "data": {
      "success": true,
      "message": "You're on the waitlist! Check your email for confirmation.",
      "user": {
        "id": "uuid-here",
        "email": "user@example.com",
        "name": "John Doe",
        "status": "waitlist"
      }
    }
  }
}
```

**Error Response:**
```json
{
  "error": {
    "message": "This email is already on the waitlist",
    "code": "CONFLICT"
  }
}
```

### 2. React Example (Waitlist Form)

```tsx
'use client';

import { useState } from 'react';

interface WaitlistFormData {
  email: string;
  name: string;
  interests?: string;
}

export function WaitlistForm() {
  const [formData, setFormData] = useState<WaitlistFormData>({
    email: '',
    name: '',
    interests: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/trpc/waitlist.join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          interests: formData.interests || undefined,
          signupSource: 'landing-page', // Track where signup came from
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.result.data.message);
        // Clear form
        setFormData({ email: '', name: '', interests: '' });
      } else {
        setStatus('error');
        setMessage(data.error?.message || 'Failed to join waitlist');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email Address *
        </label>
        <input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="mt-1 block w-full rounded-md border px-3 py-2"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name (Optional)
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border px-3 py-2"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label htmlFor="interests" className="block text-sm font-medium">
          What interests you? (Optional)
        </label>
        <textarea
          id="interests"
          value={formData.interests}
          onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
          className="mt-1 block w-full rounded-md border px-3 py-2"
          placeholder="AI, Machine Learning, Data Science..."
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </button>

      {/* Status Messages */}
      {message && (
        <div
          className={`p-3 rounded-md ${
            status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
}
```

### 3. Vue.js Example (Waitlist Form)

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-4 max-w-md mx-auto">
    <div>
      <label for="email" class="block text-sm font-medium">Email Address *</label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        required
        class="mt-1 block w-full rounded-md border px-3 py-2"
        placeholder="you@example.com"
      />
    </div>

    <div>
      <label for="name" class="block text-sm font-medium">Name (Optional)</label>
      <input
        id="name"
        v-model="formData.name"
        type="text"
        class="mt-1 block w-full rounded-md border px-3 py-2"
        placeholder="John Doe"
      />
    </div>

    <div>
      <label for="interests" class="block text-sm font-medium">
        What interests you? (Optional)
      </label>
      <textarea
        id="interests"
        v-model="formData.interests"
        class="mt-1 block w-full rounded-md border px-3 py-2"
        placeholder="AI, Machine Learning..."
        rows="3"
      />
    </div>

    <button
      type="submit"
      :disabled="status === 'loading'"
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {{ status === 'loading' ? 'Joining...' : 'Join Waitlist' }}
    </button>

    <div v-if="message" :class="messageClass">
      {{ message }}
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface WaitlistFormData {
  email: string;
  name: string;
  interests: string;
}

const formData = ref<WaitlistFormData>({
  email: '',
  name: '',
  interests: '',
});

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const message = ref('');

const messageClass = computed(() =>
  status.value === 'success'
    ? 'p-3 rounded-md bg-green-50 text-green-800'
    : 'p-3 rounded-md bg-red-50 text-red-800'
);

const handleSubmit = async () => {
  status.value = 'loading';
  message.value = '';

  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/trpc/waitlist.join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.value.email,
        name: formData.value.name,
        interests: formData.value.interests || undefined,
        signupSource: 'landing-page',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      status.value = 'success';
      message.value = data.result.data.message;
      formData.value = { email: '', name: '', interests: '' };
    } else {
      status.value = 'error';
      message.value = data.error?.message || 'Failed to join waitlist';
    }
  } catch (error) {
    status.value = 'error';
    message.value = 'Network error. Please try again.';
  }
};
</script>
```

### 4. Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Waitlist</title>
  <style>
    .form-container { max-width: 500px; margin: 50px auto; padding: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; }
    input, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
    button { width: 100%; padding: 12px; background: #0066cc; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
    button:hover { background: #0052a3; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .message { padding: 12px; border-radius: 5px; margin-top: 15px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>Join Our Waitlist</h1>
    <form id="waitlistForm">
      <div class="form-group">
        <label for="email">Email Address *</label>
        <input type="email" id="email" required placeholder="you@example.com">
      </div>

      <div class="form-group">
        <label for="name">Name (Optional)</label>
        <input type="text" id="name" placeholder="John Doe">
      </div>

      <div class="form-group">
        <label for="interests">What interests you? (Optional)</label>
        <textarea id="interests" rows="3" placeholder="AI, Machine Learning..."></textarea>
      </div>

      <button type="submit" id="submitBtn">Join Waitlist</button>

      <div id="message" style="display: none;"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('waitlistForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Disable button and show loading
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';
      messageDiv.style.display = 'none';

      // Collect form data
      const formData = {
        email: document.getElementById('email').value,
        name: document.getElementById('name').value || undefined,
        interests: document.getElementById('interests').value || undefined,
        signupSource: 'landing-page',
      };

      try {
        const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/trpc/waitlist.join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          // Success
          messageDiv.className = 'message success';
          messageDiv.textContent = data.result.data.message;
          messageDiv.style.display = 'block';
          form.reset(); // Clear form
        } else {
          // Error
          messageDiv.className = 'message error';
          messageDiv.textContent = data.error?.message || 'Failed to join waitlist';
          messageDiv.style.display = 'block';
        }
      } catch (error) {
        // Network error
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.style.display = 'block';
      } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join Waitlist';
      }
    });
  </script>
</body>
</html>
```

---

## Authentication Integration

### 1. Sign Up New User

**Endpoint:** `POST /api/auth/sign-up/email`

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Doe"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "newuser@example.com",
    "name": "Jane Doe",
    "emailVerified": false
  },
  "session": {
    "id": "session-id",
    "userId": "uuid-here",
    "expiresAt": "2024-11-27T12:00:00.000Z"
  }
}
```

**Important:** Session cookie is automatically set by the backend!

### 2. Sign In Existing User

**Endpoint:** `POST /api/auth/sign-in/email`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "session-id",
    "userId": "uuid-here",
    "expiresAt": "2024-11-27T12:00:00.000Z"
  }
}
```

### 3. Get Current Session

**Endpoint:** `GET /api/auth/get-session`

**Request:** No body needed, cookie sent automatically

**Response (Logged in):**
```json
{
  "session": {
    "id": "session-id",
    "userId": "uuid-here",
    "expiresAt": "2024-11-27T12:00:00.000Z"
  },
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "status": "active"
  }
}
```

**Response (Not logged in):**
```json
null
```

### 4. Sign Out

**Endpoint:** `POST /api/auth/sign-out`

**Request:** No body needed

**Response:**
```json
{
  "success": true
}
```

### 5. Password Reset Flow

**Step 1: Request reset link**

**Endpoint:** `POST /api/auth/forget-password`

**Request:**
```json
{
  "email": "user@example.com",
  "redirectTo": "https://yourapp.com/reset-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Step 2: User clicks link in email (contains token)**

**Step 3: Reset password**

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## React Authentication Hook

### Custom Hook for Auth State

```tsx
'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  status: string;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const API_BASE_URL = 'https://my-better-t-app-shy-sky-8404.fly.dev';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        credentials: 'include', // Important: Send cookies
      });

      if (response.ok) {
        const data = await response.json();
        setAuthState({
          user: data?.user || null,
          session: data?.session || null,
          loading: false,
        });
      } else {
        setAuthState({ user: null, session: null, loading: false });
      }
    } catch (error) {
      console.error('Failed to check session:', error);
      setAuthState({ user: null, session: null, loading: false });
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: Store cookies
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign up failed');
    }

    const data = await response.json();
    setAuthState({
      user: data.user,
      session: data.session,
      loading: false,
    });

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: Store cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign in failed');
    }

    const data = await response.json();
    setAuthState({
      user: data.user,
      session: data.session,
      loading: false,
    });

    return data;
  };

  const signOut = async () => {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });

    setAuthState({ user: null, session: null, loading: false });
  };

  const requestPasswordReset = async (email: string, redirectTo: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/forget-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo }),
    });

    if (!response.ok) {
      throw new Error('Failed to send password reset email');
    }

    return await response.json();
  };

  const resetPassword = async (token: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }

    return await response.json();
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    isAuthenticated: !!authState.user,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
    refreshSession: checkSession,
  };
}
```

### Usage Example

```tsx
'use client';

import { useAuth } from './hooks/useAuth';

export function AuthExample() {
  const { user, loading, isAuthenticated, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated && user) {
    return (
      <div>
        <h1>Welcome, {user.name || user.email}!</h1>
        <p>Status: {user.status}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        await signIn(email, password);
      } catch (error) {
        alert(error.message);
      }
    }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

---

## Important Notes for Frontend Developers

### 1. CORS & Cookies

**Production:** The backend is configured to accept requests from any origin. However, for cookies to work:

```javascript
// Always include credentials for cookie-based auth
fetch(url, {
  credentials: 'include', // IMPORTANT!
});
```

**Development:** If your frontend runs on a different port (e.g., `localhost:3001`), cookies will work automatically.

### 2. API Base URL Management

Use environment variables:

```env
# .env.local
NEXT_PUBLIC_API_URL=https://my-better-t-app-shy-sky-8404.fly.dev
```

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

### 3. Error Handling

Always handle errors gracefully:

```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
  showToast('Something went wrong. Please try again.');
}
```

### 4. Form Validation

Validate inputs before sending:

```typescript
// Email validation
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Password requirements
const isValidPassword = (password: string) => password.length >= 8;
```

### 5. Loading States

Always show loading indicators:

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await apiCall();
  } finally {
    setIsLoading(false); // Always runs
  }
};
```

---

## API Endpoints Reference

### Base URLs

- **Development:** `http://localhost:3000`
- **Production:** `https://my-better-t-app-shy-sky-8404.fly.dev`

### Waitlist Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/trpc/waitlist.join` | Join waitlist |
| GET | `/trpc/waitlist.getStats` | Get waitlist count |

### Authentication Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/sign-up/email` | Sign up new user |
| POST | `/api/auth/sign-in/email` | Sign in existing user |
| POST | `/api/auth/sign-out` | Sign out current user |
| GET | `/api/auth/get-session` | Get current session |
| POST | `/api/auth/forget-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### User Management (Protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/trpc/user.getCurrentUser` | Get logged-in user |
| POST | `/trpc/user.updateUser` | Update user profile |

---

## TypeScript Types

```typescript
// Waitlist
interface WaitlistJoinRequest {
  email: string;
  name?: string;
  interests?: string;
  signupSource?: string;
}

interface WaitlistJoinResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    status: 'waitlist' | 'active';
  };
}

// Authentication
interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  session: Session;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  status: 'waitlist' | 'active' | 'suspended';
  createdAt: string;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

// Error
interface APIError {
  message: string;
  code?: string;
  details?: any;
}
```

---

## Testing Your Integration

### 1. Test Waitlist Form

```bash
# Should succeed
curl -X POST "http://localhost:3000/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Should fail (duplicate)
curl -X POST "http://localhost:3000/trpc/waitlist.join" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### 2. Test Authentication Flow

```bash
# Sign up
curl -X POST "http://localhost:3000/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!","name":"User"}' \
  --cookie-jar cookies.txt

# Check session (using saved cookies)
curl "http://localhost:3000/api/auth/get-session" \
  --cookie cookies.txt

# Sign out
curl -X POST "http://localhost:3000/api/auth/sign-out" \
  --cookie cookies.txt
```

---

## Need Help?

### Common Issues

**Q: Cookies not working?**
A: Ensure you're using `credentials: 'include'` in fetch options.

**Q: CORS errors?**
A: The backend is configured for CORS. Check browser console for details.

**Q: 401 Unauthorized errors?**
A: Your session expired or you're not logged in. Call `/api/auth/get-session` to check.

**Q: Email not sending?**
A: In development, Resend only sends to verified email addresses (sandbox mode).

### Contact Backend Team

- Check logs: Ask backend team to check `fly logs`
- Report bugs: Include request/response details
- Request features: Create a GitHub issue

---

## Next Steps

1. **Implement waitlist form** on landing page
2. **Test with production API** before launch
3. **Add error tracking** (Sentry, LogRocket, etc.)
4. **Implement analytics** (track signups, conversions)
5. **Build activation flow** for when platform launches

---

**Last Updated**: 2025-10-27
**Backend Status**: ✅ Live
**Production URL**: https://my-better-t-app-shy-sky-8404.fly.dev
