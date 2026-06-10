import { sql, initDb } from '../../../lib/db';

/**
 * The ONLY route a client-side share token touches. It resolves a token to a
 * single artifact and refuses anything not explicitly marked 'shared'. No
 * engagement data, no sibling artifacts, no folder traversal.
 */
export default async function handler(req, res) {
  await initDb();
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token.' });

  const rows = await sql`
    SELECT a.title, a.type, a.content, a.updated_at, c.name AS client_name
    FROM artifacts a
    JOIN engagements e ON e.id = a.engagement_id
    JOIN clients c ON c.id = e.client_id
    WHERE a.share_token = ${token} AND a.visibility = 'shared'
    LIMIT 1
  `;

  if (!rows.length) {
    return res.status(404).json({ error: 'This link is no longer available.' });
  }
  return res.status(200).json({ artifact: rows[0] });
}
