import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { db, schema, users } from '@my-app/db';
import { eq } from 'drizzle-orm';

/**
 * Helper function to send welcome email to new signups via Resend
 */
async function sendSignupWelcome(to: string, name?: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured, cannot send welcome email');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kinly <noreply@kinly.si>',
        to: [to],
        subject: "Dobrodošel v Kinly — AI v praksi. Učenje, ki deluje.",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f7f5;">

            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 48px;">
              <!-- <img src="YOUR_LOGO_URL" alt="Kinly" style="height: 32px;" /> -->
              <div style="font-size: 24px; font-weight: 600; color: #171717; letter-spacing: -0.02em;">Kinly</div>
            </div>

            <!-- Main Card -->
            <div style="background: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: inset 0 0 0 1px #ebeef4;">

              <!-- Header -->
              <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 500; color: #171717; letter-spacing: -0.02em; line-height: 1.2;">
                Živjo${name ? `, ${name}` : ''}
              </h1>

              <p style="margin: 0 0 40px 0; font-size: 18px; color: #7c7b7a; line-height: 1.5;">
                Dobrodošel v Kinly — Slovenski prostor za učenje AI v praksi
              </p>

              <!-- Divider -->
              <div style="height: 1px; background: #ebeef4; margin: 40px 0;"></div>

              <!-- What You Get -->
              <div style="margin-bottom: 40px;">
                <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 500; color: #171717; letter-spacing: -0.01em;">
                  Kaj te čaka?
                </h2>

                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                    <strong style="color: #171717;">Praktične lekcije</strong> — Učenje skozi gradnjo z AI, ne teorija
                  </p>
                </div>

                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                    <strong style="color: #171717;">Predloge & projekti</strong> — Vse v slovenščini, pripravljeno za uporabo
                  </p>
                </div>

                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                    <strong style="color: #171717;">Skupnost</strong> — Q&A, povezovanje, skupno učenje
                  </p>
                </div>

                <div style="padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                    <strong style="color: #171717;">Brezplačno</strong> — Ni skritih stroškov, dostop za vedno
                  </p>
                </div>
              </div>

              <!-- Divider -->
              <div style="height: 1px; background: #ebeef4; margin: 40px 0;"></div>

              <!-- Quick Stats -->
              <div style="background: #f9f7f5; border-radius: 8px; padding: 24px; border: 1px solid #ebeef4; margin-bottom: 32px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #171717; font-weight: 500;">
                  Pridruži se 1.000+ ustvarjalcem
                </p>
                <p style="margin: 0; font-size: 15px; color: #474645; line-height: 1.6;">
                  Brezplačen slovenski prostor za učenje, gradnjo in sodelovanje — brez tehničnega predznanja. Jasni koraki, predloge in primeri, ki ti prihranijo 100+ ur brskanja in poskusov.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://kinly.si" style="display: inline-block; background: #171717; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                  Začni učenje
                </a>
              </div>

            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #7c7b7a;">
                — Tim Kinly
              </p>
              <p style="margin: 0; font-size: 12px; color: #7c7b7a;">
                © 2025 Kinly. Vse pravice pridržane.
              </p>
            </div>

          </div>
        `,
        text: `Živjo${name ? `, ${name}` : ''}

Dobrodošel v Kinly — Slovenski prostor za učenje AI v praksi

KAJ TE ČAKA?

• Praktične lekcije — Učenje skozi gradnjo z AI, ne teorija
• Predloge & projekti — Vse v slovenščini, pripravljeno za uporabo
• Skupnost — Q&A, povezovanje, skupno učenje
• Brezplačno — Ni skritih stroškov, dostop za vedno

PRIDRUŽI SE 1.000+ USTVARJALCEM

Brezplačen slovenski prostor za učenje, gradnjo in sodelovanje — brez tehničnega predznanja. Jasni koraki, predloge in primeri, ki ti prihranijo 100+ ur brskanja in poskusov.

Začni učenje: https://kinly.si

— Tim Kinly
© 2025 Kinly. Vse pravice pridržane.`,
      }),
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

/**
 * Helper function to send password reset email via Resend
 */
async function sendPasswordResetEmail(to: string, url: string, name?: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured, cannot send password reset email');
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI App Bootcamp <noreply@kinly.si>',
        to: [to],
        subject: "Aktiviraj svoj račun",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f7f5;">

            <!-- Logo placeholder -->
            <div style="text-align: center; margin-bottom: 48px;">
              <!-- <img src="YOUR_LOGO_URL" alt="Kinly" style="height: 32px;" /> -->
              <div style="font-size: 24px; font-weight: 600; color: #171717; letter-spacing: -0.02em;">Kinly</div>
            </div>

            <!-- Main Card -->
            <div style="background: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: inset 0 0 0 1px #ebeef4;">

              <!-- Header -->
              <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 500; color: #171717; letter-spacing: -0.02em; line-height: 1.2;">
                Živjo${name ? `, ${name}` : ''}
              </h1>

              <p style="margin: 0 0 40px 0; font-size: 18px; color: #7c7b7a; line-height: 1.5;">
                Aktiviraj svoj račun za AI App Bootcamp
              </p>

              <!-- Divider -->
              <div style="height: 1px; background: #ebeef4; margin: 40px 0;"></div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${url}" style="display: inline-block; background: #171717; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; transition: transform 0.1s ease;">
                  Nastavi geslo
                </a>
              </div>

              <!-- Info Box -->
              <div style="background: #f9f7f5; border-radius: 8px; padding: 24px; border: 1px solid #ebeef4; margin-bottom: 32px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #171717; font-weight: 500;">
                  Po aktivaciji dobiš dostop do:
                </p>

                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 15px; color: #474645; line-height: 1.6;">
                    Učnih gradiv in skupnosti
                  </p>
                </div>

                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 15px; color: #474645; line-height: 1.6;">
                    Slack skupnosti
                  </p>
                </div>

                <div style="padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
                  <p style="margin: 0; font-size: 15px; color: #474645; line-height: 1.6;">
                    Priprave na bootcamp
                  </p>
                </div>
              </div>

              <!-- Security Note -->
              <div style="text-align: center; padding: 16px; background: #f9f7f5; border-radius: 8px; border: 1px solid #ebeef4;">
                <p style="margin: 0; font-size: 13px; color: #7c7b7a;">
                  Ta povezava poteče čez <strong style="color: #171717;">1 uro</strong>
                </p>
              </div>

              <!-- Link fallback -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #ebeef4;">
                <p style="margin: 0; font-size: 13px; color: #7c7b7a; line-height: 1.6; text-align: center;">
                  Če gumb ne deluje, kopiraj povezavo:<br>
                  <a href="${url}" style="color: #171717; word-break: break-all; text-decoration: underline;">${url}</a>
                </p>
              </div>

            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #7c7b7a;">
                — Tim AI App Bootcamp
              </p>
              <p style="margin: 0; font-size: 12px; color: #7c7b7a;">
                © 2025 AI App Bootcamp
              </p>
            </div>

          </div>
        `,
        text: `Živjo${name ? `, ${name}` : ''}\n\nAktiviraj svoj račun za AI App Bootcamp.\n\nKlikni na povezavo za nastavitev gesla:\n${url}\n\nPo aktivaciji dobiš dostop do:\n• Učnih gradiv in skupnosti\n• Slack skupnosti\n• Priprave na bootcamp\n\nTa povezava poteče čez 1 uro.\n\n— Tim AI App Bootcamp\n© 2025 AI App Bootcamp`,
      }),
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}

export const auth = betterAuth({
  basePath: '/api/auth',
  database: drizzleAdapter(db, {
    provider: process.env.DATABASE_URL ? 'pg' : 'sqlite',
    schema: schema,
    usePlural: true,  // Our tables use plural form (users, sessions, etc.)
  }),
  // Whitelist trusted origins for CSRF protection
  trustedOrigins: [
    'http://localhost:3000',      // Local dev
    'http://localhost:3001',      // Local dev
    'https://www.kinly.si',       // Production
    'https://kinly.si',           // Production (non-www)
  ],
  emailAndPassword: {
    enabled: true,
    // Configure password reset functionality
    sendResetPassword: async ({ user, url, token }, request) => {
      console.log(`[Better Auth] Sending password reset email to ${user.email}`);
      await sendPasswordResetEmail(user.email, url, user.name || undefined);
    },
    // Token expires in 1 hour (3600 seconds)
    resetPasswordTokenExpiresIn: 3600,
  },
  socialProviders: {
    github: {
      enabled: false,
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'none',  // Required for cross-domain (www.kinly.si -> fly.dev)
      secure: true,      // Required with SameSite=None
      httpOnly: true,    // XSS protection
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Send welcome email when user signs up with email/password
      if (ctx.path === '/sign-up/email') {
        const newSession = ctx.context.newSession;

        if (newSession?.user) {
          const user = newSession.user;
          console.log(`[Better Auth Hook] Sending welcome email to new user: ${user.email}`);

          // Send welcome email asynchronously (don't block the response)
          sendSignupWelcome(user.email, user.name || undefined).catch((error) => {
            console.error(`[Better Auth Hook] Failed to send welcome email to ${user.email}:`, error);
          });
        }
      }

      // When a user resets their password, activate them if they're on the waitlist
      if (ctx.path === '/reset-password') {
        // Get the returned response to extract user info
        const returned = ctx.context.returned;

        // Password reset returns user data in the response
        if (returned && typeof returned === 'object' && 'user' in returned) {
          const user = (returned as any).user;

          if (user?.id) {
            // Check if user is on waitlist
            const [dbUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1);

            if (dbUser && dbUser.status === 'waitlist') {
              console.log(`[Better Auth Hook] Activating waitlist user: ${dbUser.email}`);

              // Update status to active
              await db
                .update(users)
                .set({
                  status: 'active',
                  emailVerified: true, // Also mark email as verified since they clicked the link
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
            }
          }
        }
      }

      // Also handle activation when user signs in for the first time after setting password
      if (ctx.path === '/sign-in/email') {
        const newSession = ctx.context.newSession;

        if (newSession?.user) {
          const userId = newSession.user.id;

          // Check if user is on waitlist and just set their password
          const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (dbUser && dbUser.status === 'waitlist') {
            console.log(`[Better Auth Hook] Activating waitlist user on first sign-in: ${dbUser.email}`);

            // Update status to active
            await db
              .update(users)
              .set({
                status: 'active',
                emailVerified: true,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));
          }
        }
      }
    }),
  },
});

export type Auth = typeof auth;
type AuthSessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type Session = AuthSessionResult['session'];
