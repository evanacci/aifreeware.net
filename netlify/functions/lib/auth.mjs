import { betterAuth } from 'better-auth';
import pg from 'pg';
import { sendEmail, brandedHtml, brandedText } from './email.mjs';

// Pooled connection: serverless functions open and drop connections constantly,
// and Neon's pooler is what keeps that from exhausting the database.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'https://aifreeware.netlify.app',
  basePath: '/api/auth',
  trustedOrigins: [
    'https://aifreeware.netlify.app',
    'https://aifreeware.net',
    'https://www.aifreeware.net',
    'http://localhost:8888',
  ],
  emailAndPassword: {
    enabled: true,
    // Nobody is verifying a mailbox to save their homework. Keep the door low.
    requireEmailVerification: false,
    minPasswordLength: 8,

    // Without this a forgotten password means the saved work is gone for good,
    // which is the one thing an account here is supposed to prevent.
    sendResetPassword: async ({ user, url }) => {
      const copy = {
        heading: 'Set a new password',
        intro: 'Use the link below to choose a new password for your aifreeware account. '
             + 'It works once and expires in an hour.',
        url,
        note: 'If you did not ask for this, nothing has happened to your account and you can ignore this email.',
      };
      try {
        await sendEmail({
          to: user.email,
          subject: 'Set a new aifreeware password',
          html: brandedHtml({ ...copy, buttonLabel: 'Set a new password' }),
          text: brandedText(copy),
        });
      } catch (err) {
        // Better Auth deliberately answers "check your email" whether or not the
        // address has an account, so it swallows whatever happens in here. That
        // privacy is worth keeping, but it also means a send that never happened
        // looks exactly like one that did. Log it so a silent failure is at least
        // visible in the function logs instead of only to the person waiting.
        console.error('password reset email failed for', user.email, '->', err.message);
        throw err;
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 60,   // 60 days, this is coursework not banking
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    },
  },
});

export { pool };
