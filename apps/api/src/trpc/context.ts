import { auth } from '@my-app/auth';
import { db } from '@my-app/db';

export async function createContext({ req }: { req: Request }) {
  console.log('[Context] Creating tRPC context...');

  try {
    // Extract session from request headers (contains cookies)
    const sessionResult = await auth.api.getSession({ headers: req.headers });

    const user = sessionResult?.user ?? null;
    const session = sessionResult?.session ?? null;

    console.log('[Context] Session:', session ? 'authenticated' : 'anonymous');
    console.log('[Context] User:', user?.email ?? 'none');

    return {
      req,
      user,
      session,
      db
    };
  } catch (err) {
    console.error('[Context] Error creating context:', err);
    // Return context with null user/session on error
    return {
      req,
      user: null,
      session: null,
      db
    };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
