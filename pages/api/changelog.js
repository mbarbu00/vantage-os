import { sql, initDb } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();
  const { engagement_id } = req.query;
  if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });
  const entries = await sql`
    SELECT * FROM changelog WHERE engagement_id = ${engagement_id} ORDER BY logged_at DESC
  `;
  return res.status(200).json({ entries });
}
