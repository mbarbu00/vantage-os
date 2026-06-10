import { sql, initDb, getEngagement } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    const { id, client_id } = req.query;

    if (id) {
      const engagement = await getEngagement(id);
      if (!engagement) return res.status(404).json({ error: 'Engagement not found.' });
      const [{ count: interviewCount }] = await sql`
        SELECT COUNT(*)::int AS count FROM interviews WHERE engagement_id = ${id}
      `;
      return res.status(200).json({ engagement: { ...engagement, interview_count: interviewCount } });
    }

    if (client_id) {
      const engagements = await sql`
        SELECT e.*,
               (SELECT COUNT(*)::int FROM interviews i WHERE i.engagement_id = e.id) AS interview_count
        FROM engagements e
        WHERE e.client_id = ${client_id}
        ORDER BY e.created_at DESC
      `;
      return res.status(200).json({ engagements });
    }

    const engagements = await sql`
      SELECT e.*, c.name AS client_name
      FROM engagements e
      JOIN clients c ON c.id = e.client_id
      ORDER BY e.created_at DESC
    `;
    return res.status(200).json({ engagements });
  }

  if (req.method === 'POST') {
    const { client_id, name, type, pillars, voice_categories, research_context } = req.body || {};
    if (!client_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'client_id and an engagement name are required.' });
    }

    const rows = await sql`
      INSERT INTO engagements (client_id, name, type, pillars, voice_categories, research_context)
      VALUES (
        ${client_id},
        ${name.trim()},
        ${type || null},
        ${JSON.stringify(pillars || [])}::jsonb,
        ${JSON.stringify(voice_categories || [])}::jsonb,
        ${research_context || null}
      )
      RETURNING *
    `;
    return res.status(201).json({ engagement: rows[0] });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
