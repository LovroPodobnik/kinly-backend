# @kinly/trpc-types

Shared tRPC type definitions for frontend/backend type safety.

## What This Package Does

Exports the `AppRouter` type from the backend API so frontend can get full TypeScript type safety when using tRPC.

**This package contains ONLY type definitions** - no runtime code.

## Usage (Frontend)

### 1. Link the Package (Local Development)

```bash
# In frontend project (velocity-landing-page)
bun link @kinly/trpc-types
```

### 2. Use in tRPC Client

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@kinly/trpc-types';  // ✅ Full type safety!

export const api = createTRPCReact<AppRouter>();
```

### 3. Remove Type Assertions

```typescript
// BEFORE (stopgap)
export const api = createTRPCReact() as any;

// AFTER (type-safe)
export const api = createTRPCReact<AppRouter>();
```

## Benefits

✅ Autocomplete for all API endpoints
✅ TypeScript errors for typos
✅ Compile-time validation of inputs/outputs
✅ Refactor safety across frontend/backend

## Maintenance (Backend Team)

When API changes:
1. Types update automatically (just the .d.ts file references the backend)
2. Frontend needs to re-link or reinstall to get updates

For production: Publish to npm or GitHub Packages.

## Package Structure

```
packages/trpc-types/
├── dist/
│   ├── index.d.ts     # Type declarations
│   └── index.js       # Empty (types only)
├── src/
│   └── index.ts       # Source (re-exports AppRouter)
├── package.json
├── tsconfig.json
└── README.md
```

## Notes

- No runtime dependencies
- No build step needed (manually created dist)
- Package only contains type information
- Size: ~1KB (just type declarations)
