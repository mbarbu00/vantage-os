import { sql, initDb, getEngagement } from '../../lib/db';
import { complete, safeParseJson, VERBATIM_CONSTRAINT } from '../../lib/ai';

export default async function handler(req, res) {
  await initDb();
  const { engagement_id } = req.method === 'GET' ? req.query : req.body || {};
  if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });

  // GET returns the latest stored analysis.
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT * FROM gap_analysis WHERE engagement_id = ${engagement_id} ORDER BY run_at DESC LIMIT 1
    `;
    return res.status(200).json({ analysis: rows[0] || null });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // POST runs a fresh analysis.
  const engagement = await getEngagement(engagement_id);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found.' });

  const pillars = (Array.isArray(engagement.pillars) ? engagement.pillars : []).map((p) =>
    typeof p === 'string' ? p : p.name
  );
  const voices = Array.isArray(engagement.voice_categories) ? engagement.voice_categories : [];

  const interviews = await sql`SELECT speaker, role, category FROM interviews WHERE engagement_id = ${engagement_id}`;
  const pillarRows = await sql`SELECT pillar, COUNT(*)::int AS n FROM pillar_quotes WHERE engagement_id = ${engagement_id} GROUP BY pillar`;

  const coverageByPillar = {};
  for (const p of pillars) coverageByPillar[p] = 0;
  for (const r of pillarRows) coverageByPillar[r.pillar] = r.n;

  const voiceCounts = {};
  for (const v of voices) voiceCounts[v] = 0;
  for (const i of interviews) if (voiceCounts[i.category] !== undefined) voiceCounts[i.category]++;

  // Pass 1: prose assessment.
  const prose = await complete(
    `You are the Hear-layer coverage analyst for Vantage OS, engagement "${engagement.name}".

Strategic pillars and how many supporting quotes each currently has:
${pillars.map((p) => `- ${p}: ${coverageByPillar[p]} quotes`).join('\n')}

Voice categories and how many interviews represent each:
${voices.map((v) => `- ${v}: ${voiceCounts[v]} interviews`).join('\n')}

Total interviews processed: ${interviews.length}

Write a prose coverage assessment: which pillars are well-supported, which are thin, which voices are over- or under-represented, and concrete follow-up recommendations (who to interview next and what to ask). Be specific and practical.`,
    { system: `You assess intelligence coverage for stakeholder listening engagements. ${VERBATIM_CONSTRAINT}`, maxTokens: 2048 }
  );

  // Pass 2: structure to JSON.
  const structured = safeParseJson(
    await complete(
      `Convert this assessment into JSON only:
{
  "gaps": [{ "area": "string", "type": "pillar|voice", "severity": "high|medium|low", "recommendation": "string" }],
  "scores": { "pillar_coverage": 0-100, "voice_balance": 0-100, "overall": 0-100 }
}

Assessment:
${prose}`,
      { system: 'Output only valid JSON, no markdown.', maxTokens: 2048 }
    )
  ) || { gaps: [], scores: { pillar_coverage: 0, voice_balance: 0, overall: 0 } };

  const [row] = await sql`
    INSERT INTO gap_analysis (engagement_id, gaps, scores, assessment)
    VALUES (${engagement_id}, ${JSON.stringify(structured.gaps)}::jsonb, ${JSON.stringify(structured.scores)}::jsonb, ${prose})
    RETURNING *
  `;

  return res.status(200).json({ analysis: row, coverageByPillar, voiceCounts });
}
