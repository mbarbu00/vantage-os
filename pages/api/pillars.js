import { sql, initDb, getEngagement } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();
  const { engagement_id } = req.query;
  if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });

  const engagement = await getEngagement(engagement_id);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found.' });

  const pillarConfig = Array.isArray(engagement.pillars) ? engagement.pillars : [];
  const quotes = await sql`
    SELECT * FROM pillar_quotes WHERE engagement_id = ${engagement_id} ORDER BY id DESC
  `;

  // Group quotes under each configured pillar so empty pillars still show.
  const grouped = pillarConfig.map((p) => {
    const name = typeof p === 'string' ? p : p.name;
    return {
      name,
      description: typeof p === 'string' ? '' : p.description || '',
      quotes: quotes.filter((q) => q.pillar === name),
    };
  });

  return res.status(200).json({ pillars: grouped });
}
