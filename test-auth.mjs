// Integration test for accounts and saved progress.
//
// Calls the real function handlers against the real Neon database, so it needs
// .env and no dev server. It creates one throwaway user and deletes it again.
//
//   node test-auth.mjs
import { readFileSync } from 'node:fs';

const ROOT = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
for (const raw of readFileSync(ROOT + '/.env', 'utf8').split('\n')) {
  const m = raw.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = 'http://localhost:8888';
process.env.BETTER_AUTH_URL = BASE;

const { auth } = await import(ROOT + '/netlify/functions/lib/auth.mjs');
const progress = (await import(ROOT + '/netlify/functions/progress.mjs')).default;

const EMAIL = `selftest+${Date.now()}@aifreeware.net`;
const PASS = 'correct-horse-battery';
let cookie = '';
let failures = 0;

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

async function hit(path, { method = 'GET', body } = {}) {
  // Browsers always send Origin on a same-origin POST, and Better Auth's CSRF
  // check rejects requests without it. Match what the page actually does.
  const headers = { 'content-type': 'application/json', origin: BASE };
  if (cookie) headers.cookie = cookie;
  const res = await auth.handler(new Request(BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }));
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(',').map(c => c.split(';')[0].trim()).join('; ');
  let data = null;
  try { data = await res.clone().json(); } catch {}
  return { status: res.status, data };
}

async function prog(path, { method = 'GET', body } = {}) {
  // Browsers always send Origin on a same-origin POST, and Better Auth's CSRF
  // check rejects requests without it. Match what the page actually does.
  const headers = { 'content-type': 'application/json', origin: BASE };
  if (cookie) headers.cookie = cookie;
  const res = await progress(new Request(BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }));
  return { status: res.status, data: await res.json().catch(() => null) };
}

console.log('--- auth ---');
let r = await hit('/api/auth/sign-up/email', { method: 'POST', body: { email: EMAIL, password: PASS, name: 'selftest' } });
check('sign up', r.status === 200, `status ${r.status} ${r.status !== 200 ? JSON.stringify(r.data) : ''}`);

r = await hit('/api/auth/get-session');
check('session after sign up', r.data?.user?.email === EMAIL, r.data?.user?.email || JSON.stringify(r.data));

r = await hit('/api/auth/sign-up/email', { method: 'POST', body: { email: EMAIL, password: PASS, name: 'dupe' } });
check('duplicate email rejected', r.status >= 400, `status ${r.status}`);

const savedCookie = cookie;
cookie = '';
r = await hit('/api/auth/sign-in/email', { method: 'POST', body: { email: EMAIL, password: 'wrong-password' } });
check('wrong password rejected', r.status >= 400, `status ${r.status}`);

cookie = '';
r = await hit('/api/auth/sign-in/email', { method: 'POST', body: { email: EMAIL, password: PASS } });
check('sign in', r.status === 200, `status ${r.status}`);

console.log('--- progress ---');
let p = await prog('/api/progress?course=py-skool');
check('empty course reads clean', p.status === 200 && Object.keys(p.data.files || {}).length === 0, JSON.stringify(p.data).slice(0, 80));

p = await prog('/api/progress', { method: 'PUT', body: { course: 'py-skool', files: { 'work/week-01/ex01.py': 'print("hi")' } } });
check('put saves', p.status === 200 && p.data.saved === 1, JSON.stringify(p.data));

p = await prog('/api/progress?course=py-skool');
check('get returns it', p.data?.files?.['work/week-01/ex01.py'] === 'print("hi")', JSON.stringify(p.data).slice(0, 80));

p = await prog('/api/progress', { method: 'PUT', body: { course: 'py-skool', files: { 'work/week-01/ex01.py': 'print("edited")' } } });
p = await prog('/api/progress?course=py-skool');
check('put overwrites', p.data?.files?.['work/week-01/ex01.py'] === 'print("edited")');

p = await prog('/api/progress', { method: 'PUT', body: { course: 'py-skool', files: { 'code/src/cheat.py': 'x' } } });
check('refuses non-work path', p.status === 400, `status ${p.status}`);

p = await prog('/api/progress', { method: 'PUT', body: { course: 'nope', files: {} } });
check('refuses unknown course', p.status === 400, `status ${p.status}`);

p = await prog('/api/progress', { method: 'PUT', body: { course: 'py-skool', files: { 'work/big.py': 'x'.repeat(200_001) } } });
check('refuses oversized file', p.status === 413, `status ${p.status}`);

p = await prog('/api/progress?course=py-skool', { method: 'DELETE' });
check('delete clears', p.status === 200 && p.data.deleted >= 1, JSON.stringify(p.data));

p = await prog('/api/progress?course=py-skool');
check('empty after delete', Object.keys(p.data.files || {}).length === 0);

const held = cookie; cookie = '';
p = await prog('/api/progress?course=py-skool');
check('signed out gets 401', p.status === 401, `status ${p.status}`);
cookie = held;

console.log('--- sign out ---');
r = await hit('/api/auth/sign-out', { method: 'POST', body: {} });
check('sign out', r.status === 200, `status ${r.status}`);

// Leave no test user behind in the real database.
const { pool } = await import(ROOT + '/netlify/functions/lib/auth.mjs');
const del = await pool.query('delete from "user" where email = $1', [EMAIL]);
check('test user cleaned up', del.rowCount === 1);
await pool.end();

console.log(failures ? `\n${failures} FAILED` : '\nall green');
process.exit(failures ? 1 : 0);
