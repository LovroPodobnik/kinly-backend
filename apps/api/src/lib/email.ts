/**
 * Resend Email Service
 *
 * Simple utility for sending emails via Resend API
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY not found in environment variables. Email sending will fail.');
}

export interface SendEmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
}

export interface SendEmailResponse {
  id: string;
}

export interface SendEmailError {
  message: string;
  statusCode: number;
}

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    const error: SendEmailError = {
      message: errorData.message || `Failed to send email: ${response.statusText}`,
      statusCode: response.status,
    };
    throw error;
  }

  return await response.json() as SendEmailResponse;
}

/**
 * Send a waitlist confirmation email
 * AI App Bootcamp Community - Minimalist black theme
 */
export async function sendWaitlistConfirmation(to: string, name?: string) {
  return sendEmail({
    from: 'AI App Bootcamp <noreply@kinly.si>',
    to,
    subject: "Dobrodošel v AI App Bootcamp Community",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f7f5;">

        <!-- Logo placeholder - add your logo URL here -->
        <div style="text-align: center; margin-bottom: 48px;">
          <!-- <img src="YOUR_LOGO_URL" alt="Kinly" style="height: 32px;" /> -->
          <div style="font-size: 24px; font-weight: 600; color: #171717; letter-spacing: -0.02em;">Kinly</div>
        </div>

        <!-- Main Card -->
        <div style="background: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: inset 0 0 0 1px #ebeef4;">

          <!-- Header -->
          <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 500; color: #171717; letter-spacing: -0.02em; line-height: 1.2;">
            Dobrodošel${name ? `, ${name}` : ''}
          </h1>

          <p style="margin: 0 0 40px 0; font-size: 18px; color: #7c7b7a; line-height: 1.5;">
            Uspešno si se pridružil AI App Bootcamp skupnosti
          </p>

          <!-- Divider -->
          <div style="height: 1px; background: #ebeef4; margin: 40px 0;"></div>

          <!-- Key Info -->
          <div style="margin-bottom: 40px;">
            <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 500; color: #171717; letter-spacing: -0.01em;">
              Od ideje do aplikacije v 2 tednih
            </h2>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #7c7b7a; margin-bottom: 4px;">Začetek</div>
              <div style="font-size: 16px; color: #171717; font-weight: 500;">1. december 2025</div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #7c7b7a; margin-bottom: 4px;">Trajanje</div>
              <div style="font-size: 16px; color: #171717; font-weight: 500;">12-dnevni sprint</div>
            </div>

            <div>
              <div style="font-size: 14px; color: #7c7b7a; margin-bottom: 4px;">Skupnost</div>
              <div style="font-size: 16px; color: #171717; font-weight: 500;">150+ udeležencev že gradi z AI</div>
            </div>
          </div>

          <!-- Divider -->
          <div style="height: 1px; background: #ebeef4; margin: 40px 0;"></div>

          <!-- What's Next -->
          <div style="margin-bottom: 40px;">
            <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 500; color: #171717;">
              Kaj sledi?
            </h3>

            <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
              <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
              <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                Obvestilo o odprtju vpisa in early bird ponudbi
              </p>
            </div>

            <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
              <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
              <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                Ekskluzivni vpogled v učni načrt
              </p>
            </div>

            <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
              <div style="position: absolute; left: 0; top: 9px; width: 4px; height: 4px; background: #171717; border-radius: 50%;"></div>
              <p style="margin: 0; font-size: 16px; color: #474645; line-height: 1.6;">
                Povabilo v Slack skupnost
              </p>
            </div>
          </div>

          <!-- CTA Box -->
          <div style="background: #f9f7f5; border-radius: 8px; padding: 24px; border: 1px solid #ebeef4;">
            <p style="margin: 0; font-size: 15px; color: #474645; line-height: 1.6;">
              <strong style="color: #171717;">Medtem pa:</strong> Začni razmišljati o aplikacijski ideji. Kateri problem bi rad rešil? V dveh tednih boš imel delujoč izdelek.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500; color: #171717;">
            Ostani osredotočen. Izpelji. Ponovi. Zmagaj.
          </p>
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #7c7b7a;">
            — Tim AI App Bootcamp
          </p>
          <p style="margin: 0; font-size: 12px; color: #7c7b7a;">
            © 2025 AI App Bootcamp
          </p>
        </div>

      </div>
    `,
    text: `Dobrodošel${name ? `, ${name}` : ''}

Uspešno si se pridružil AI App Bootcamp skupnosti.

OD IDEJE DO APLIKACIJE V 2 TEDNIH

Začetek: 1. december 2025
Trajanje: 12-dnevni sprint
Skupnost: 150+ udeležencev že gradi z AI

KAJ SLEDI?
• Obvestilo o odprtju vpisa in early bird ponudbi
• Ekskluzivni vpogled v učni načrt
• Povabilo v Slack skupnost

MEDTEM PA: Začni razmišljati o aplikacijski ideji. Kateri problem bi rad rešil? V dveh tednih boš imel delujoč izdelek.

Ostani osredotočen. Izpelji. Ponovi. Zmagaj.

— Tim AI App Bootcamp
© 2025 AI App Bootcamp`,
  });
}

/**
 * Send welcome email for users who sign up from Kinly landing page
 * Uses the same minimal aesthetic as waitlist template
 */
export async function sendSignupWelcome(to: string, name?: string) {
  return sendEmail({
    from: 'Kinly <noreply@kinly.si>',
    to,
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
  });
}

/**
 * Send password reset email (used for activation when launching)
 */
export async function sendPasswordResetEmail(to: string, url: string, name?: string) {
  return sendEmail({
    from: 'AI Learning Platform <onboarding@resend.dev>', // TODO: Update with your verified domain
    to,
    subject: "We're Live! Set Your Password",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Great News${name ? `, ${name}` : ''}!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          The AI Learning Platform is now live, and you're on our early access list!
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          Click the button below to set your password and start learning:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Set Password & Access Platform
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #888;">
          Or copy and paste this link into your browser:<br>
          <a href="${url}" style="color: #0066cc;">${url}</a>
        </p>
        <p style="font-size: 14px; color: #888; margin-top: 40px;">
          This link will expire in 1 hour for security reasons.
        </p>
        <p style="font-size: 14px; color: #888;">
          — The AI Learning Platform Team
        </p>
      </div>
    `,
    text: `Great News${name ? `, ${name}` : ''}!\n\nThe AI Learning Platform is now live, and you're on our early access list!\n\nClick this link to set your password and start learning:\n${url}\n\nThis link will expire in 1 hour for security reasons.\n\n— The AI Learning Platform Team`,
  });
}
