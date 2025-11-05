import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '@my-app/db';
import { publicProcedure, router } from '../middleware';
import { sendWaitlistConfirmation } from '../../lib/email';
import { TRPCError } from '@trpc/server';

export const waitlistRouter = router({
  /**
   * Join the waitlist
   * Collects email, name, and interests without requiring a password
   */
  join: publicProcedure
    .input(
      z.object({
        email: z.string().email('Please provide a valid email address'),
        name: z.string().min(1, 'Name is required').optional(),
        interests: z.string().optional(), // What AI courses/topics they're interested in
        signupSource: z.string().optional(), // Where they signed up from (landing page, referral, etc.)
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email is already on the waitlist',
        });
      }

      // Generate a unique ID for the user
      const userId = crypto.randomUUID();

      // Create waitlist user (no password yet)
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          id: userId,
          email: input.email,
          name: input.name || null,
          status: 'waitlist', // Status is set to waitlist by default in schema
          interests: input.interests || null,
          signupSource: input.signupSource || 'direct',
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Send confirmation email
      try {
        await sendWaitlistConfirmation(input.email, input.name);
      } catch (error) {
        console.error('Failed to send waitlist confirmation email:', error);
        // Don't throw - user is still added to waitlist even if email fails
      }

      // Return success (without sensitive data)
      return {
        success: true,
        message: "You're on the waitlist! Check your email for confirmation.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          status: newUser.status,
        },
      };
    }),

  /**
   * Get waitlist stats (useful for admin dashboard later)
   * This is a public endpoint for now, but you might want to protect it
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    const waitlistUsers = await ctx.db
      .select()
      .from(users)
      .where(eq(users.status, 'waitlist'));

    return {
      totalWaitlist: waitlistUsers.length,
    };
  }),
});
