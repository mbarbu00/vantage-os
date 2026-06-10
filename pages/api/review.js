import { sql, initDb } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    const { engagement_id } = req.query;
    if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });
    const items = await sql`
      SELECT * FROM review_items WHERE engagement_id = ${engagement_id} ORDER BY resolved ASC, id DESC
    `;
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    // Mark resolved / unresolved.
    const { id, resolved } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required.' });
    const [row] = await sql`
      UPDATE review_items SET resolved = ${resolved !== false} WHERE id = ${id} RETURNING *
    `;
    return res.status(200).json({ item: row });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
