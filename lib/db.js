import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL);

/**
 * Initializes all tables. Safe to call repeatedly — every table uses
 * CREATE TABLE IF NOT EXISTS. Called at the top of API routes that touch
 * the DB so a fresh Neon database self-provisions on first request.
 *
 * Schema philosophy: everything hangs off engagement_id. A client (the folder)
 * has many engagements; an engagement owns all Hear/See/Recommend data plus
 * shareable artifacts. Pillars and voice categories are per-engagement config,
 * not hardcoded — that's what makes Vantage OS multi-client.
 */
export async function initDb() {
  // The folder. One row per client or prospect.
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      logo_url    TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    )
  `;

  // An engagement belongs to a client. Pillars + voice categories live here
  // as JSONB so each engagement defines its own strategic framework.
  await sql`
    CREATE TABLE IF NOT EXISTS engagements (
      id                SERIAL PRIMARY KEY,
      client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      type              TEXT,
      pillars           JSONB DEFAULT '[]'::jsonb,
      voice_categories  JSONB DEFAULT '[]'::jsonb,
      research_context  TEXT,
      status            TEXT DEFAULT 'active',
      created_at        TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS interviews (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      speaker       TEXT,
      role          TEXT,
      date          TEXT,
      category      TEXT,
      summary       TEXT,
      processed_at  TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      interview_id  INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
      section       TEXT,
      theme         TEXT,
      quote         TEXT,
      context       TEXT,
      source        TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS funder_signals (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      interview_id  INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
      signal        TEXT,
      quote         TEXT,
      source        TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS review_items (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      interview_id  INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
      item          TEXT,
      reason        TEXT,
      source        TEXT,
      resolved      BOOLEAN DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gap_analysis (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      gaps          JSONB,
      scores        JSONB,
      assessment    TEXT,
      run_at        TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS changelog (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      interview_id  INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
      speaker       TEXT,
      date          TEXT,
      summary       TEXT,
      new_items     INTEGER,
      flag_count    INTEGER,
      logged_at     TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Generalized from ignite_quotes. "pillar" matches one of the engagement's
  // configured pillar names.
  await sql`
    CREATE TABLE IF NOT EXISTS pillar_quotes (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      interview_id  INTEGER REFERENCES interviews(id) ON DELETE CASCADE,
      pillar        TEXT,
      quote         TEXT,
      context       TEXT,
      relevance     TEXT,
      source        TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS see_threads (
      id                SERIAL PRIMARY KEY,
      engagement_id     INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      thread_id         TEXT,
      trigger_type      TEXT,
      trigger_value     TEXT,
      interview_ids     TEXT,
      status            TEXT DEFAULT 'queued',
      indiana_context   TEXT,
      peer_benchmark    TEXT,
      national_trend    TEXT,
      gap_analysis      TEXT,
      convergence_signal TEXT,
      divergence_signal  TEXT,
      sources           TEXT,
      created_at        TIMESTAMPTZ DEFAULT now(),
      completed_at      TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS see_synthesis (
      id              SERIAL PRIMARY KEY,
      engagement_id   INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      convergences    JSONB,
      divergences     JSONB,
      recommend_brief TEXT,
      generated_at    TIMESTAMPTZ DEFAULT now()
    )
  `;

  // The shareable object. Any deliverable becomes an artifact with its own
  // visibility state. A signed share_token is what lets a single file go out
  // to a client without exposing the rest of the workspace.
  await sql`
    CREATE TABLE IF NOT EXISTS artifacts (
      id            SERIAL PRIMARY KEY,
      engagement_id INTEGER NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      type          TEXT,
      content       JSONB,
      visibility    TEXT DEFAULT 'internal',
      share_token   TEXT UNIQUE,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    )
  `;
}

/**
 * Loads an engagement plus its parent client. Used everywhere the workspace
 * needs to know which pillars/voice categories/research context apply.
 */
export async function getEngagement(engagementId) {
  const rows = await sql`
    SELECT e.*, c.name AS client_name, c.slug AS client_slug
    FROM engagements e
    JOIN clients c ON c.id = e.client_id
    WHERE e.id = ${engagementId}
  `;
  return rows[0] || null;
}
