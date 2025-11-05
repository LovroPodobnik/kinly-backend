import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '@my-app/db';
import { protectedProcedure, publicProcedure, router } from '../middleware';

export const userRouter = router({
  // Get current authenticated user
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // Get all users (protected)
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(users);
  }),

  // Create user (removed - use Better Auth sign-up instead)
  // createUser is handled by Better Auth /api/auth/sign-up/email

  // Update user (fixed to use string ID)
  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.string(), // Changed from z.number() to z.string()
        updates: z
          .object({
            email: z.string().email().optional(),
            name: z.string().min(1).optional(),
          })
          .refine((val) => Object.keys(val).length > 0, {
            message: 'Updates cannot be empty',
          }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .update(users)
        .set(input.updates)
        .where(eq(users.id, input.id))
        .returning();

      return user;
    }),
});
