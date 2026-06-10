import { sql, initDb, getEngagement } from '../../lib/db';
import { anthropic, MODEL } from '../../lib/ai';

/**
 * Executes a single See research thread. This is the deliberate "fire when
 * ready" action — threads queue on ingest but only run when the team clicks,
 * so back-to-back transcript uploads don't burn API calls.
 *
 * The See layer contextualizes what was Heard against external reality. It uses
 * the web_search tool so the research thread reflects current benchmarks and
 * trends rather than stale model knowledge.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  await initDb();

  const { thread_id } = req.body || {};
  if (!thread_id) return res.status(400).json({ error: 'thread_id (DB id) required.' });

  const [thread] = await sql`SELECT * FROM see_threads WHERE id = ${thread_id}`;
  if (!thread) return res.status(404).json({ error: 'Thread not found.' });

  const engagement = await getEngagement(thread.engagement_id);
  if (!engagement) return res.status(404).json({ error: 'Engagement not found.' });

  try {
    const prompt = `You are the See-layer researcher for Vantage OS, engagement "${engagement.name}" (client: ${engagement.client_name}).
${engagement.research_context ? `\nEngagement context:\n${engagement.research_context}\n` : ''}
A recurring theme surfaced in stakeholder interviews: "${thread.trigger_value}".

Research this theme against external reality and return a briefing with these labeled sections:

REGIONAL/STATE CONTEXT: How does this theme connect to relevant state or regional priorities, plans, or funding?
PEER BENCHMARK: How are comparable regions or organizations addressing this? Name specifics.
NATIONAL TREND: What is the broader national trend or data on this theme?
CONVERGENCE SIGNAL: Where does what stakeholders said ALIGN with external reality? (strengthens the case)
DIVERGENCE SIGNAL: Where do stakeholders DIVERGE from external reality or peers? (a gap or opportunity)

Use web search to ground every claim in current sources. Cite sources inline.`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    });

    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    // Pull labeled sections out of the prose.
    const section = (label, next) => {
      const re = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=${next ? next + ':' : '$'})`, 'i');
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };

    const regional = section('REGIONAL/STATE CONTEXT', 'PEER BENCHMARK') || section('STATE CONTEXT', 'PEER BENCHMARK');
    const peer = section('PEER BENCHMARK', 'NATIONAL TREND');
    const national = section('NATIONAL TREND', 'CONVERGENCE SIGNAL');
    const convergence = section('CONVERGENCE SIGNAL', 'DIVERGENCE SIGNAL');
    const divergence = section('DIVERGENCE SIGNAL', null);

    const [updated] = await sql`
      UPDATE see_threads SET
        status = 'completed',
        indiana_context = ${regional},
        peer_benchmark = ${peer},
        national_trend = ${national},
        convergence_signal = ${convergence},
        divergence_signal = ${divergence},
        gap_analysis = ${text},
        completed_at = now()
      WHERE id = ${thread_id}
      RETURNING *
    `;

    return res.status(200).json({ thread: updated });
  } catch (err) {
    console.error('see-research error:', err);
    await sql`UPDATE see_threads SET status = 'error' WHERE id = ${thread_id}`;
    return res.status(500).json({ error: 'Research failed. ' + (err.message || '') });
  }
}
