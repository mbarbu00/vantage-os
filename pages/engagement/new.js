import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

const ENGAGEMENT_TYPES = ['Capital campaign', 'Brand strategy', 'EDO / regional planning', 'Stakeholder listening', 'Other'];

export default function NewEngagement() {
  const router = useRouter();
  const { client_id } = router.query;

  const [name, setName] = useState('');
  const [type, setType] = useState(ENGAGEMENT_TYPES[0]);
  const [pillars, setPillars] = useState([{ name: '', description: '' }]);
  const [voices, setVoices] = useState(['']);
  const [research, setResearch] = useState('');
  const [busy, setBusy] = useState(false);

  function updatePillar(i, field, val) {
    setPillars((p) => p.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  }
  const addPillar = () => setPillars((p) => [...p, { name: '', description: '' }]);
  const removePillar = (i) => setPillars((p) => p.filter((_, idx) => idx !== i));

  function updateVoice(i, val) { setVoices((v) => v.map((x, idx) => (idx === i ? val : x))); }
  const addVoice = () => setVoices((v) => [...v, '']);
  const removeVoice = (i) => setVoices((v) => v.filter((_, idx) => idx !== i));

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const r = await fetch('/api/engagements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        name,
        type,
        pillars: pillars.filter((p) => p.name.trim()),
        voice_categories: voices.filter((v) => v.trim()),
        research_context: research,
      }),
    });
    const d = await r.json();
    setBusy(false);
    if (d.engagement) router.push(`/engagement/${d.engagement.id}`);
  }

  return (
    <>
      <Header crumb="New engagement" />
      <main className="vo-container" style={{ paddingTop: 48, paddingBottom: 120, maxWidth: 820 }}>
        <p className="vo-eyebrow" style={{ marginBottom: 12 }}>Onboarding</p>
        <h1 className="vo-display" style={{ fontSize: 40, margin: '0 0 8px' }}>Configure the engagement.</h1>
        <p style={{ color: 'var(--vo-text-dim)', maxWidth: 620, margin: '0 0 8px' }}>
          The pillars and voices you define here shape how the Hear layer maps every interview and how the See layer researches what it hears.
        </p>
        <div className="vo-rule" style={{ maxWidth: 160, margin: '24px 0 40px' }} />

        <div className="vo-stack" style={{ gap: 28, display: 'flex', flexDirection: 'column' }}>
          <div>
            <label className="vo-label">Engagement name</label>
            <input className="vo-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Forum 100" />
          </div>

          <div>
            <label className="vo-label">Engagement type</label>
            <select className="vo-select" value={type} onChange={(e) => setType(e.target.value)}>
              {ENGAGEMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="vo-label">Strategic pillars</label>
            <p className="vo-eyebrow" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--vo-text-faint)', marginBottom: 12 }}>
              The strategic themes intelligence maps to. Replaces hardcoded frameworks.
            </p>
            <div className="vo-stack">
              {pillars.map((p, i) => (
                <div key={i} className="vo-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input className="vo-input" value={p.name} placeholder={`Pillar ${i + 1} name`} onChange={(e) => updatePillar(i, 'name', e.target.value)} />
                    {pillars.length > 1 && <button className="vo-btn" onClick={() => removePillar(i)}>Remove</button>}
                  </div>
                  <input className="vo-input" value={p.description} placeholder="Short description (optional)" onChange={(e) => updatePillar(i, 'description', e.target.value)} />
                </div>
              ))}
            </div>
            <button className="vo-btn" style={{ marginTop: 12 }} onClick={addPillar}>+ Add pillar</button>
          </div>

          <div>
            <label className="vo-label">Voice categories</label>
            <p className="vo-eyebrow" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--vo-text-faint)', marginBottom: 12 }}>
              How you classify who's speaking — used for coverage balance.
            </p>
            <div className="vo-stack">
              {voices.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <input className="vo-input" value={v} placeholder={`Voice ${i + 1} — e.g. Civic / Public sector`} onChange={(e) => updateVoice(i, e.target.value)} />
                  {voices.length > 1 && <button className="vo-btn" onClick={() => removeVoice(i)}>Remove</button>}
                </div>
              ))}
            </div>
            <button className="vo-btn" style={{ marginTop: 12 }} onClick={addVoice}>+ Add voice</button>
          </div>

          <div>
            <label className="vo-label">Research context</label>
            <p className="vo-eyebrow" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--vo-text-faint)', marginBottom: 12 }}>
              What the See layer needs to know to research intelligently — region, sector, goals, benchmarks to compare against.
            </p>
            <textarea className="vo-textarea" value={research} onChange={(e) => setResearch(e.target.value)} placeholder="e.g. Northwest Indiana regional economic development. Compare against peer Midwest metros. The engagement supports a $3M capital campaign…" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="vo-btn vo-btn-primary" disabled={busy || !name.trim()} onClick={create}>
              {busy ? 'Creating…' : 'Create engagement →'}
            </button>
            <button className="vo-btn" onClick={() => router.back()}>Cancel</button>
          </div>
        </div>
      </main>
    </>
  );
}
