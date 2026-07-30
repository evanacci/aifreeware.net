import { betterAuth } from 'better-auth';
import pg from 'pg';

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
    // Nobody is verifying a mailbox to save their homework. Keep the door low
    // and do not pretend to send mail we have no sender for.
    requireEmailVerification: false,
    minPasswordLength: 8,
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
