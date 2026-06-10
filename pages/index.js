import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';

export default function Home() {
  const [clients, setClients] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch('/api/clients');
    const d = await r.json();
    setClients(d.clients || []);
  }
  useEffect(() => { load(); }, []);

  async function createClient() {
    if (!name.trim()) return;
    setBusy(true);
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    setCreating(false);
    setBusy(false);
    load();
  }

  return (
    <>
      <Header crumb="Workspace" />
      <main className="vo-container" style={{ paddingTop: 64, paddingBottom: 100 }}>
        <p className="vo-eyebrow" style={{ marginBottom: 14 }}>Hear · See · Recommend</p>
        <h1 className="vo-display" style={{ fontSize: 52, maxWidth: 760, margin: '0 0 20px' }}>
          The intelligence platform behind every WeCreate engagement.
        </h1>
        <div className="vo-rule" style={{ maxWidth: 200, marginBottom: 40 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span className="vo-eyebrow">Clients &amp; Prospects</span>
          <button className="vo-btn vo-btn-primary" onClick={() => setCreating(true)}>+ New client</button>
        </div>

        {creating && (
          <div className="vo-card" style={{ padding: 24, marginBottom: 28 }}>
            <label className="vo-label">Client or prospect name</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                className="vo-input"
                value={name}
                autoFocus
                placeholder="e.g. Northwest Indiana Forum"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createClient()}
              />
              <button className="vo-btn vo-btn-primary" disabled={busy} onClick={createClient}>
                {busy ? 'Creating…' : 'Create'}
              </button>
              <button className="vo-btn" onClick={() => { setCreating(false); setName(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {clients === null ? (
          <p className="vo-eyebrow">Loading…</p>
        ) : clients.length === 0 && !creating ? (
          <div className="vo-card" style={{ padding: 48, textAlign: 'center' }}>
            <p className="vo-display" style={{ fontSize: 24, margin: '0 0 10px' }}>No clients yet.</p>
            <p style={{ color: 'var(--vo-text-dim)', margin: '0 0 24px' }}>
              Create your first client folder to begin a Hear · See · Recommend engagement.
            </p>
            <button className="vo-btn vo-btn-primary" onClick={() => setCreating(true)}>+ New client</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {clients.map((c) => (
              <Link key={c.id} href={`/client/${c.id}`} className="vo-card vo-card-hover" style={{ padding: 26, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                  <span className="vo-pill">Folder</span>
                  <span className="vo-eyebrow">{c.engagement_count} engagement{c.engagement_count === 1 ? '' : 's'}</span>
                </div>
                <h3 className="vo-display" style={{ fontSize: 24, margin: 0 }}>{c.name}</h3>
                <p className="vo-eyebrow" style={{ marginTop: 8 }}>{c.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
