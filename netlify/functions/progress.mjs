import { auth, pool } from './lib/auth.mjs';

const COURSES = new Set(['code-skool', 'py-skool', 'ai-skool']);

// Matches the database guard rails in db/schema.sql. Checked here too so a
// client gets a readable error instead of a constraint violation.
const MAX_PATH = 300;
const MAX_CONTENT = 200_000;
const MAX_FILES = 400;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export default async (req) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return json({ error: 'not signed in' }, 401);
  const userId = session.user.id;

  const url = new URL(req.url);

  if (req.method === 'GET') {
    const course = url.searchParams.get('course');
    if (!COURSES.has(course)) return json({ error: 'unknown course' }, 400);
    const { rows } = await pool.query(
      'select path, content from progress where "userId" = $1 and course = $2',
      [userId, course]
    );
    const files = {};
    for (const r of rows) files[r.path] = r.content;
    return json({ course, files });
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

    const { course, files } = body || {};
    if (!COURSES.has(course)) return json({ error: 'unknown course' }, 400);
    if (!files || typeof files !== 'object') return json({ error: 'no files' }, 400);

    const entries = Object.entries(files);
    if (entries.length > MAX_FILES) return json({ error: 'too many files' }, 413);

    for (const [path, content] of entries) {
      if (typeof content !== 'string') return json({ error: `not text: ${path}` }, 400);
      if (path.length > MAX_PATH) return json({ error: `path too long: ${path}` }, 413);
      if (content.length > MAX_CONTENT) return json({ error: `file too big: ${path}` }, 413);
      // Only ever store what the student wrote, never course files.
      if (!path.startsWith('work/')) return json({ error: `refused: ${path}` }, 400);
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const [path, content] of entries) {
        await client.query(
          `insert into progress ("userId", course, path, content, "updatedAt")
           values ($1, $2, $3, $4, now())
           on conflict ("userId", course, path)
           do update set content = excluded.content, "updatedAt" = now()`,
          [userId, course, path, content]
        );
      }
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      return json({ error: 'could not save', detail: String(e.message).slice(0, 200) }, 500);
    } finally {
      client.release();
    }

    return json({ saved: entries.length });
  }

  if (req.method === 'DELETE') {
    const course = url.searchParams.get('course');
    if (!COURSES.has(course)) return json({ error: 'unknown course' }, 400);
    const { rowCount } = await pool.query(
      'delete from progress where "userId" = $1 and course = $2',
      [userId, course]
    );
    return json({ deleted: rowCount });
  }

  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/progress' };
