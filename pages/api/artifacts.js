import { sql, initDb } from '../../lib/db';
import { makeShareToken } from '../../lib/ai';

/**
 * Artifacts are the shareable layer. An artifact can be flipped from internal
 * to shared, which mints a share_token. The client view route (/c/[token])
 * can ONLY resolve artifacts whose visibility is 'shared' — there is no path
 * from a token back into the workspace.
 */
export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    const { engagement_id } = req.query;
    if (!engagement_id) return res.status(400).json({ error: 'engagement_id required.' });
    const artifacts = await sql`
      SELECT id, engagement_id, title, type, visibility, share_token, created_at, updated_at
      FROM artifacts WHERE engagement_id = ${engagement_id} ORDER BY created_at DESC
    `;
    return res.status(200).json({ artifacts });
  }

  if (req.method === 'POST') {
    const { engagement_id, title, type, content } = req.body || {};
    if (!engagement_id || !title) {
      return res.status(400).json({ error: 'engagement_id and title required.' });
    }
    const [row] = await sql`
      INSERT INTO artifacts (engagement_id, title, type, content)
      VALUES (${engagement_id}, ${title}, ${type || 'document'}, ${JSON.stringify(content || {})}::jsonb)
      RETURNING *
    `;
    return res.status(201).json({ artifact: row });
  }

  if (req.method === 'PATCH') {
    // Toggle sharing. Sharing mints a token if one doesn't exist; unsharing
    // keeps the token but flips visibility so the link goes dark.
    const { id, visibility } = req.body || {};
    if (!id || !visibility) return res.status(400).json({ error: 'id and visibility required.' });

    let token = null;
    if (visibility === 'shared') {
      const [existing] = await sql`SELECT share_token FROM artifacts WHERE id = ${id}`;
      token = existing?.share_token || makeShareToken();
    }

    const [row] = await sql`
      UPDATE artifacts
      SET visibility = ${visibility},
          share_token = COALESCE(${token}, share_token),
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, type, visibility, share_token
    `;
    return res.status(200).json({ artifact: row });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
