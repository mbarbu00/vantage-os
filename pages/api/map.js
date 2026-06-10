import { sql, initDb } from '../../lib/db';

export default async function handler(req, res) {
  await initDb();
  const { engagement_id } = req.query;
  if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });

  const interviews = await sql`
    SELECT * FROM interviews WHERE engagement_id = ${engagement_id} ORDER BY processed_at DESC
  `;
  const quotes = await sql`
    SELECT * FROM quotes WHERE engagement_id = ${engagement_id} ORDER BY id DESC
  `;
  const funderSignals = await sql`
    SELECT * FROM funder_signals WHERE engagement_id = ${engagement_id} ORDER BY id DESC
  `;

  // Group quotes by section for the intelligence map view.
  const bySection = { theme: [], proof: [], concern: [], opportunity: [] };
  for (const q of quotes) {
    const key = (q.section || '').toLowerCase();
    if (bySection[key]) bySection[key].push(q);
    else (bySection.theme ||= []).push(q);
  }

  return res.status(200).json({
    interviews,
    quotes,
    funderSignals,
    bySection,
    stats: {
      interviews: interviews.length,
      quotes: quotes.length,
      funderSignals: funderSignals.length,
    },
  });
}
