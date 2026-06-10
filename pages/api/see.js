import { sql, initDb } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();
  const { engagement_id } = req.query;
  if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });

  const threads = await sql`
    SELECT * FROM see_threads WHERE engagement_id = ${engagement_id} ORDER BY created_at DESC
  `;
  const synthesisRows = await sql`
    SELECT * FROM see_synthesis WHERE engagement_id = ${engagement_id} ORDER BY generated_at DESC LIMIT 1
  `;

  return res.status(200).json({
    threads,
    synthesis: synthesisRows[0] || null,
    stats: {
      total: threads.length,
      queued: threads.filter((t) => t.status === 'queued').length,
      completed: threads.filter((t) => t.status === 'completed').length,
    },
  });
}
