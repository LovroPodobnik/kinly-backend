# Frontend Authentication Integration Guide

## Overview

This guide provides everything needed to integrate user authentication (signup, login, session management) with the Kinly backend API.

**Backend API URL (Production)**: `https://my-better-t-app-shy-sky-8404.fly.dev`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Signup Flow](#user-signup-flow)
4. [User Login Flow](#user-login-flow)
5. [Session Management](#session-management)
6. [Protected Requests](#protected-requests)
7. [Error Handling](#error-handling)
8. [TypeScript Types](#typescript-types)
9. [Example Implementation](#example-implementation)

---

## Quick Start

### CORS Configuration

The backend is configured to accept requests from `http://localhost:3001` for local development. For production, you'll need to update the CORS origin in the backend.

### Authentication Method

The API uses **HTTP-only cookies** for session management. This means:
- ✅ Sessions are automatically handled by the browser
- ✅ More secure (XSS protection)
- ⚠️ You must send `credentials: 'include'` with all authenticated requests

---

## Authentication Endpoints

### Base URL

```
Production: https://my-better-t-app-shy-sky-8404.fly.dev
Local Dev:  http://localhost:4000
```

### Available Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/sign-up/email` | POST | Create new user account | No |
| `/api/auth/sign-in/email` | POST | Login with email/password | No |
| `/api/auth/sign-out` | POST | Logout current user | Yes |
| `/api/auth/get-session` | GET | Get current session | Yes |
| `/api/auth/forget-password` | POST | Request password reset | No |
| `/api/auth/reset-password` | POST | Reset password with token | No |

---

## User Signup Flow

### Endpoint

```
POST /api/auth/sign-up/email
```

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "User Name"
}
```

### Request Headers

```
Content-Type: application/json
```

### Success Response (200)

```json
{
  "token": "session-token-string",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "image": null,
    "emailVerified": false,
    "createdAt": "2025-11-05T10:30:46.000Z",
    "updatedAt": "2025-11-05T10:30:46.000Z"
  }
}
```

### What Happens After Signup?

1. ✅ User account is created with status `active`
2. ✅ Session is automatically created (HTTP-only cookie set)
3. ✅ Welcome email is sent to user's email address
4. ✅ User is immediately logged in (no need to call sign-in again)

### Example Code (Fetch API)

```typescript
async function signUp(email: string, password: string, name: string) {
  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // IMPORTANT: Include cookies
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    return data; // { token, user }
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}
```

### Example Code (Axios)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://my-better-t-app-shy-sky-8404.fly.dev',
  withCredentials: true, // IMPORTANT: Include cookies
});

async function signUp(email: string, password: string, name: string) {
  try {
    const { data } = await api.post('/api/auth/sign-up/email', {
      email,
      password,
      name,
    });
    return data; // { token, user }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
    throw error;
  }
}
```

### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Invalid request (missing fields, invalid email format) |
| `409` | Email already exists |
| `500` | Server error |

---

## User Login Flow

### Endpoint

```
POST /api/auth/sign-in/email
```

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Request Headers

```
Content-Type: application/json
```

### Success Response (200)

```json
{
  "redirect": false,
  "token": "session-token-string",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "image": null,
    "emailVerified": true,
    "createdAt": "2025-11-05T10:25:49.000Z",
    "updatedAt": "2025-11-05T10:25:57.000Z"
  }
}
```

### Example Code (Fetch API)

```typescript
async function signIn(email: string, password: string) {
  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // IMPORTANT: Include cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    return data; // { token, user }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Invalid request (missing fields) |
| `401` | Invalid credentials (wrong email or password) |
| `500` | Server error |

---

## Session Management

### Get Current Session

#### Endpoint

```
GET /api/auth/get-session
```

#### Request Headers

```
Cookie: <session-cookie> (automatically sent by browser)
```

#### Success Response (200)

```json
{
  "session": {
    "id": "session-id",
    "userId": "user-id",
    "expiresAt": "2025-11-12T10:25:57.000Z",
    "token": "session-token",
    "ipAddress": "::1",
    "userAgent": "Mozilla/5.0..."
  },
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true,
    "createdAt": "2025-11-05T10:25:49.000Z",
    "updatedAt": "2025-11-05T10:25:57.000Z"
  }
}
```

#### Response When Not Logged In

```json
null
```

#### Example Code

```typescript
async function getCurrentSession() {
  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/api/auth/get-session', {
      credentials: 'include', // IMPORTANT: Include cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data; // { session, user } or null
  } catch (error) {
    console.error('Session check error:', error);
    return null;
  }
}
```

### Sign Out

#### Endpoint

```
POST /api/auth/sign-out
```

#### Success Response (200)

```json
{
  "success": true
}
```

#### Example Code

```typescript
async function signOut() {
  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include', // IMPORTANT: Include cookies
    });

    if (!response.ok) {
      throw new Error('Sign out failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
```

---

## Protected Requests

All tRPC endpoints require authentication. Make sure to include credentials in your requests.

### Example: Get Current User (Protected)

```typescript
async function getCurrentUser() {
  try {
    const response = await fetch('https://my-better-t-app-shy-sky-8404.fly.dev/trpc/user.getCurrentUser', {
      credentials: 'include', // IMPORTANT: Include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Unauthorized or request failed');
    }

    const data = await response.json();
    return data.result.data; // User object
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}
```

### Response Format

tRPC wraps responses in a `result.data` structure:

```json
{
  "result": {
    "data": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "emailVerified": true,
      "createdAt": "2025-11-05T10:25:49.000Z",
      "updatedAt": "2025-11-05T10:25:57.000Z"
    }
  }
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Network Error

```typescript
try {
  await signUp(email, password, name);
} catch (error) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    // Network error - API might be down
    alert('Unable to connect to server. Please check your internet connection.');
  }
}
```

#### 2. Validation Error (400)

```typescript
// Response body
{
  "message": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

#### 3. Authentication Error (401)

```typescript
// Response body
{
  "message": "Invalid email or password",
  "code": "UNAUTHORIZED"
}
```

#### 4. Duplicate Email (409)

```typescript
// Response body
{
  "message": "Email already exists",
  "code": "CONFLICT"
}
```

### Generic Error Handler

```typescript
async function handleAuthError(response: Response) {
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    const error = await response.json();
    throw new Error(error.message || `Request failed with status ${response.status}`);
  } else {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

// Usage
if (!response.ok) {
  await handleAuthError(response);
}
```

---

## TypeScript Types

### User Type

```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
```

### Session Type

```typescript
interface Session {
  id: string;
  userId: string;
  expiresAt: string; // ISO 8601 date string
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
}
```

### Auth Response Types

```typescript
interface SignUpResponse {
  token: string;
  user: User;
}

interface SignInResponse {
  redirect: boolean;
  token: string;
  user: User;
}

interface GetSessionResponse {
  session: Session;
  user: User;
} | null;

interface SignOutResponse {
  success: boolean;
}
```

---

## Example Implementation

### React Hook for Authentication

```typescript
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

const API_BASE_URL = 'https://my-better-t-app-shy-sky-8404.fly.dev';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data?.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, name: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();
      setUser(data.user);
      return data;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
}
```

### Usage in Components

```tsx
import { useAuth } from './hooks/useAuth';

function SignupForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await signUp(email, password, name);
      // Redirect to dashboard or show success message
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Sign Up</button>
    </form>
  );
}

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await signIn(email, password);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Sign In</button>
    </form>
  );
}

function ProtectedPage() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}
```

---

## Testing Checklist

### Local Development

- [ ] Can sign up new user
- [ ] Receives welcome email after signup
- [ ] Can sign in with credentials
- [ ] Session persists after page reload
- [ ] Can access protected routes when logged in
- [ ] Cannot access protected routes when logged out
- [ ] Can sign out successfully
- [ ] Session cleared after sign out

### Production

- [ ] All above tests pass in production
- [ ] CORS configured correctly for production domain
- [ ] HTTPS working (no mixed content warnings)
- [ ] Cookies work across subdomains (if applicable)

---

## Security Best Practices

### Frontend

1. ✅ **Never store passwords**: Let the browser handle password management
2. ✅ **Use HTTPS only**: Production API is HTTPS-only
3. ✅ **Don't store tokens in localStorage**: Session cookies are HTTP-only
4. ✅ **Validate user input**: Validate email format, password strength before sending
5. ✅ **Show appropriate error messages**: Don't reveal if email exists during login

### Password Requirements (Enforce on Frontend)

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (optional but recommended)

```typescript
function validatePassword(password: string): boolean {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return minLength && hasUpperCase && hasLowerCase && hasNumber;
}
```

---

## Troubleshooting

### Issue: CORS Error

**Symptom**: `Access to fetch at '...' has been blocked by CORS policy`

**Solution**:
1. Ensure you're using `credentials: 'include'` in fetch requests
2. For production, backend CORS needs to be updated with your frontend domain
3. Contact backend team to add your domain to CORS whitelist

### Issue: Session Not Persisting

**Symptom**: User gets logged out on page reload

**Solution**:
1. Verify `credentials: 'include'` is set on ALL requests
2. Check if cookies are enabled in browser
3. Ensure you're on the same domain or subdomain
4. Check browser console for cookie warnings

### Issue: 401 Unauthorized on Protected Routes

**Symptom**: Cannot access protected endpoints after login

**Solution**:
1. Verify login was successful (check response)
2. Ensure `credentials: 'include'` is set
3. Check if session cookie exists (browser DevTools → Application → Cookies)
4. Try logging out and logging in again

---

## Support & Questions

- **API Status**: https://my-better-t-app-shy-sky-8404.fly.dev/health
- **Backend Team**: Contact for CORS updates, bug reports, or feature requests
- **Documentation Updates**: This doc is version-controlled in the project repo

---

**Last Updated**: 2025-11-05
**API Version**: v1
**Production URL**: https://my-better-t-app-shy-sky-8404.fly.dev
