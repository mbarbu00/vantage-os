import { sql, initDb } from '../../lib/db';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    // Each client folder with a count of its engagements.
    const clients = await sql`
      SELECT c.*,
             COUNT(e.id)::int AS engagement_count
      FROM clients c
      LEFT JOIN engagements e ON e.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
    return res.status(200).json({ clients });
  }

  if (req.method === 'POST') {
    const { name, notes } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'A client name is required.' });
    }

    let slug = slugify(name);
    // Ensure slug uniqueness with a numeric suffix if needed.
    const existing = await sql`SELECT slug FROM clients WHERE slug LIKE ${slug + '%'}`;
    if (existing.length) {
      slug = `${slug}-${existing.length + 1}`;
    }

    const rows = await sql`
      INSERT INTO clients (name, slug, notes)
      VALUES (${name.trim()}, ${slug}, ${notes || null})
      RETURNING *
    `;
    return res.status(201).json({ client: rows[0] });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
