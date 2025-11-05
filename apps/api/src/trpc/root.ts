import { router } from './middleware';
import { userRouter } from './routers/user';
import { waitlistRouter } from './routers/waitlist';

export const appRouter = router({
  user: userRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
