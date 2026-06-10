# Vantage OS

WeCreate Media's proprietary intelligence platform. **Hear → See → Recommend**, built as a standalone, multi-client product separate from the NWI Intelligence Map.

---

## What this is

A workspace where each **client** is a folder that can hold multiple **engagements**. Every engagement defines its own strategic pillars, voice categories, and research context at onboarding — nothing is hardcoded to one client. Inside an engagement you work across three modes:

- **◎ Hear** — ingest transcripts, build the intelligence map, map quotes to pillars, run coverage gaps, review flagged items, track the changelog.
- **◈ See** — research threads (queued on ingest, fired manually) that contextualize what was heard against regional, peer, and national reality with live web search.
- **◆ Recommend** — the toggle is live; the structured deliverable is the next build.

Deliverables can be saved as **artifacts** and shared to a client through a read-only token link (`/c/[token]`) that exposes only that one file — never the rest of the workspace.

---

## First-time setup

1. **Create a new Neon database** (separate from NWI). Copy its connection string.

postgresql://neondb_owner:npg_TJSO4H5Rjwkd@ep-noisy-rice-ajzyeshd-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

2. **Create a new Vercel project** pointed at this repo.
3. In Vercel → Settings → Environment Variables, add the three variables from `.env.example`:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (the Neon string, with `?sslmode=require`)
   - `NEXT_PUBLIC_BASE_URL` (your Vercel URL)
4. Deploy. The database tables create themselves automatically on the first request — no migration step.

To run locally instead: copy `.env.example` to `.env.local`, fill it in, then `npm install` and `npm run dev`.

---

## Deploying updates (your usual flow)

Download updated files from Claude, replace them in Finder, then:

```
cd ~/Desktop/vantage-os
git add [files]
git commit -m "description"
git push
```

Vercel auto-deploys on push (~2 minutes).

---

## How it's built

- **Next.js 14** (pages router) on Vercel
- **Neon** serverless Postgres — `lib/db.js`, `initDb()` self-provisions all tables
- **Anthropic API** (`claude-sonnet-4-5`), server-side only — `lib/ai.js`

Preserved technical decisions from the NWI build:
- **Two-pass JSON extraction** — prose first, then convert to JSON. Avoids parse failures on em-dashes and verbatim quotes.
- **Line-by-line pillar parser** — pillar names use "and" in prompts, mapped back to "&" display names. No regex on "&".
- **Verbatim-only constraint** — centralized in `lib/ai.js`, injected into every extraction prompt.
- **No duplicate detection** — intentional.
- **Semi-automatic See** — threads queue on ingest but only run when you click.

---

## File map

```
lib/db.js              schema + initDb + getEngagement
lib/ai.js              Anthropic client, two-pass extraction, verbatim rules, share tokens
pages/index.js         client folder grid (workspace home)
pages/client/[id].js   one client's engagements
pages/engagement/new.js   onboarding (pillars / voices / research context)
pages/engagement/[id].js  the Hear/See/Recommend workspace
pages/c/[token].js     read-only client share view
pages/api/             clients, engagements, process, map, pillars, gaps,
                       review, changelog, see, see-research, artifacts, share/[token]
styles/globals.css     the Vantage OS design system
```
