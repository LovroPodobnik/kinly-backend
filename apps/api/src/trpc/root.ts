import { router } from './middleware';
import { userRouter } from './routers/user';
import { waitlistRouter } from './routers/waitlist';
import { coursesRouter } from './routers/courses';

export const appRouter = router({
  user: userRouter,
  waitlist: waitlistRouter,
  courses: coursesRouter,
});

export type AppRouter = typeof appRouter;
