/**
 * Shared tRPC Types for Frontend/Backend Type Safety
 *
 * This package contains ONLY type definitions (no runtime code).
 * Re-exports AppRouter type for frontend consumption.
 */

// Main tRPC router type - the only export needed for tRPC client setup
export type { AppRouter } from '@my-app/api/src/trpc/root';
