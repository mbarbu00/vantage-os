import { sql, initDb, getEngagement } from '../../lib/db';
import { complete, safeParseJson, VERBATIM_CONSTRAINT } from '../../lib/ai';

/**
 * Ingests one transcript for an engagement. Mirrors the proven NWI flow but
 * generalized: pillars and voice categories come from the engagement config
 * instead of hardcoded IGNITE values.
 *
 * Flow:
 *   1. Extract speaker metadata + summary + intelligence as PROSE (pass 1).
 *   2. Convert that prose to strict JSON (pass 2).
 *   3. Extract pillar-mapped quotes against the engagement's configured pillars.
 *   4. Persist everything under engagement_id and queue See threads.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();

  const { engagement_id, transcript, speaker, role, date, category } = req.body || {};
  if (!engagement_id || !transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'engagement_id and transcript are required.' });
  }

  const engagement = await getEngagement(engagement_id);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found.' });

  // Pillars are stored as JSONB. Each entry: { name, description }.
  const pillars = Array.isArray(engagement.pillars) ? engagement.pillars : [];
  const pillarNames = pillars.map((p) => (typeof p === 'string' ? p : p.name));
  // Use "and" instead of "&" in prompts, then map back to display names —
  // the line-by-line parser fix from the NWI build.
  const pillarPromptList = pillarNames
    .map((n, i) => `${i + 1}. ${n.replace(/&/g, 'and')}`)
    .join('\n');
  const displayNameByPromptName = {};
  pillarNames.forEach((n) => {
    displayNameByPromptName[n.replace(/&/g, 'and').trim().toLowerCase()] = n;
  });

  const sourceTag = `${speaker || 'Unknown'} · ${role || 'Unknown role'} · ${date || 'Undated'}`;

  try {
    // ---- PASS 1: extract as prose ----
    const extractSystem = `You are the Hear-layer analyst for Vantage OS, WeCreate Media's intelligence platform.
You are analyzing a stakeholder interview for the engagement "${engagement.name}" (client: ${engagement.client_name}).
${engagement.research_context ? `\nEngagement context:\n${engagement.research_context}\n` : ''}
${VERBATIM_CONSTRAINT}`;

    const extractPrompt = `Analyze this interview transcript. Produce a structured PROSE briefing (not JSON) with these clearly labeled sections:

SPEAKER SUMMARY: A 2-3 sentence summary of who this person is and their core message.

THEMES: The major themes raised. For each, give the theme name and 1-3 VERBATIM quotes that establish it.

PROOF POINTS: Specific verbatim quotes that serve as proof of impact, momentum, or credibility.

CONCERNS: Verbatim quotes expressing concerns, risks, or obstacles.

OPPORTUNITIES: Verbatim quotes pointing to opportunities or forward-looking ideas.

FUNDER SIGNALS: Any verbatim statements indicating willingness to fund, invest, partner, or commit resources.

NEEDS REVIEW: Anything ambiguous, potentially sensitive, or that a human should verify before use. Explain why.

Transcript:
${transcript}`;

    const prose = await complete(extractPrompt, { system: extractSystem, maxTokens: 4096 });

    // ---- PASS 2: prose -> JSON ----
    const structureSystem = `You convert prose intelligence briefings into strict JSON. Output ONLY valid JSON, no markdown, no preamble. Preserve quotes exactly as written.`;
    const structurePrompt = `Convert the briefing below into this exact JSON shape:
{
  "summary": "string",
  "quotes": [{ "section": "theme|proof|concern|opportunity", "theme": "string", "quote": "string", "context": "string" }],
  "funder_signals": [{ "signal": "string", "quote": "string" }],
  "review_items": [{ "item": "string", "reason": "string" }]
}

Briefing:
${prose}`;

    const structured = safeParseJson(
      await complete(structurePrompt, { system: structureSystem, maxTokens: 4096 })
    ) || { summary: '', quotes: [], funder_signals: [], review_items: [] };

    // ---- Insert interview ----
    const [interview] = await sql`
      INSERT INTO interviews (engagement_id, speaker, role, date, category, summary)
      VALUES (${engagement_id}, ${speaker || null}, ${role || null}, ${date || null}, ${category || null}, ${structured.summary || null})
      RETURNING *
    `;

    // ---- Insert quotes ----
    for (const q of structured.quotes || []) {
      await sql`
        INSERT INTO quotes (engagement_id, interview_id, section, theme, quote, context, source)
        VALUES (${engagement_id}, ${interview.id}, ${q.section || null}, ${q.theme || null}, ${q.quote || null}, ${q.context || null}, ${sourceTag})
      `;
    }

    // ---- Insert funder signals ----
    for (const f of structured.funder_signals || []) {
      await sql`
        INSERT INTO funder_signals (engagement_id, interview_id, signal, quote, source)
        VALUES (${engagement_id}, ${interview.id}, ${f.signal || null}, ${f.quote || null}, ${sourceTag})
      `;
    }

    // ---- Insert review items ----
    for (const r of structured.review_items || []) {
      await sql`
        INSERT INTO review_items (engagement_id, interview_id, item, reason, source)
        VALUES (${engagement_id}, ${interview.id}, ${r.item || null}, ${r.reason || null}, ${sourceTag})
      `;
    }

    // ---- Pillar mapping (only if engagement has configured pillars) ----
    let pillarCount = 0;
    if (pillarNames.length) {
      const pillarSystem = `You map interview quotes to strategic pillars for Vantage OS.
${VERBATIM_CONSTRAINT}`;
      const pillarPrompt = `The engagement tracks these strategic pillars:
${pillarPromptList}

From the transcript, find VERBATIM quotes that map to one of these pillars. Output ONE LINE PER QUOTE in exactly this pipe-delimited format (no header, no JSON):
PILLAR NAME | verbatim quote | one-sentence relevance

Only include quotes that genuinely belong to a pillar. Use the pillar names exactly as listed above.

Transcript:
${transcript}`;

      const pillarText = await complete(pillarPrompt, { system: pillarSystem, maxTokens: 4096 });

      // Line-by-line parse — never regex on "&".
      for (const line of pillarText.split('\n')) {
        const parts = line.split('|').map((s) => s.trim());
        if (parts.length < 2) continue;
        const [rawPillar, quote, relevance] = parts;
        const matched = displayNameByPromptName[rawPillar.replace(/&/g, 'and').trim().toLowerCase()];
        if (!matched || !quote) continue;
        await sql`
          INSERT INTO pillar_quotes (engagement_id, interview_id, pillar, quote, context, relevance, source)
          VALUES (${engagement_id}, ${interview.id}, ${matched}, ${quote}, ${null}, ${relevance || null}, ${sourceTag})
        `;
        pillarCount++;
      }
    }

    // ---- Changelog ----
    const newItems = (structured.quotes?.length || 0) + (structured.funder_signals?.length || 0) + pillarCount;
    await sql`
      INSERT INTO changelog (engagement_id, interview_id, speaker, date, summary, new_items, flag_count)
      VALUES (${engagement_id}, ${interview.id}, ${speaker || null}, ${date || null}, ${structured.summary || null}, ${newItems}, ${structured.review_items?.length || 0})
    `;

    // ---- Queue See threads (semi-automatic: queued, not fired) ----
    const themes = [...new Set((structured.quotes || []).map((q) => q.theme).filter(Boolean))];
    for (const theme of themes.slice(0, 5)) {
      const threadId = `thread-${engagement_id}-${interview.id}-${theme.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
      await sql`
        INSERT INTO see_threads (engagement_id, thread_id, trigger_type, trigger_value, interview_ids, status)
        VALUES (${engagement_id}, ${threadId}, ${'theme'}, ${theme}, ${String(interview.id)}, ${'queued'})
      `;
    }

    return res.status(200).json({
      interview,
      counts: {
        quotes: structured.quotes?.length || 0,
        funder_signals: structured.funder_signals?.length || 0,
        review_items: structured.review_items?.length || 0,
        pillar_quotes: pillarCount,
        threads_queued: Math.min(themes.length, 5),
      },
    });
  } catch (err) {
    console.error('process error:', err);
    return res.status(500).json({ error: 'Processing failed. ' + (err.message || '') });
  }
}
