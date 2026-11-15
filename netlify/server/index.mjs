import { drizzle } from 'drizzle-orm/netlify-db';
import { eq, and, sql } from 'drizzle-orm';
import { documents } from '../../db/schema.ts';
import { validDocument } from './validation.mjs';
const defaults = { levels: { items: [] }, completions: { map: {} }, mods: { names: [] } };
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function isAdmin(request) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('nf_jwt='))?.slice(7);
  if (!token) return false;
  // Validate with Identity on every request; never trust decoded client claims.
  const response = await fetch('https://possibleminuswaveslist.netlify.app/.netlify/identity/user', {
    headers: { Authorization: `Bearer ${decodeURIComponent(token)}` }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const user = await response.json();
  return !!user.id && !!user.confirmed_at && Array.isArray(user.app_metadata?.roles) && user.app_metadata.roles.includes('admin');
}
export default async function handler(request) {
  const path = new URL(request.url).pathname;
  try {
    if (path === '/api/session' && request.method === 'GET') return json({ admin: await isAdmin(request) });
    if (path !== '/api/data') return json({ error: 'Not found.' }, 404);
    if (request.method === 'GET') {
      const db = drizzle();
      const rows = await db.select().from(documents);
      return json(Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
        const row = rows.find(r => r.key === key);
        return [key, { value: row?.value || value, version: row?.version || 0 }];
      })));
    }
    if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);
    if (!await isAdmin(request)) return json({ error: 'Sign in with an invited admin account to save changes.' }, 403);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
    const body = await request.text();
    if (body.length > 300000) return json({ error: 'Request too large.' }, 413);
    let input;
    try { input = JSON.parse(body); } catch { return json({ error: 'Invalid JSON.' }, 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Invalid data.' }, 400);
    const { key, value, version } = input;
    if (!Object.hasOwn(defaults, key) || !Number.isSafeInteger(version) || version < 0) return json({ error: 'Invalid data.' }, 400);
    const db = drizzle();
    const [levels] = await db.select().from(documents).where(eq(documents.key, 'levels'));
    if (!validDocument(key, value, levels?.value?.items?.map(l => l.name) || [])) return json({ error: 'Check the names, points, level ID, and video URL. Completions must reference an existing player and level.' }, 400);
    if (key === 'levels') {
      const [completions] = await db.select().from(documents).where(eq(documents.key, 'completions'));
      const nextNames = new Set(value.items.map(l => l.name));
      const removed = (levels?.value?.items || []).filter(l => !nextNames.has(l.name)).map(l => l.name);
      if (Object.values(completions?.value?.map || {}).some(records => records.some(n => removed.includes(n)))) {
        return json({ error: 'Remove this level from player completions before deleting it.' }, 400);
      }
    }
    const result = version === 0
      ? await db.insert(documents).values({ key, value, version: 1 }).onConflictDoNothing().returning()
      : await db.update(documents).set({ value, version: sql`${documents.version} + 1` }).where(and(eq(documents.key, key), eq(documents.version, version))).returning();
    if (!result.length) return json({ error: 'Another admin changed this data. The latest version has been loaded; please try again.' }, 409);
    return json({ version: result[0].version });
  } catch {
    return json({ error: 'The service is unavailable. Please try again shortly.' }, 503);
  }
}
export const config = { path: '/api/*' };
