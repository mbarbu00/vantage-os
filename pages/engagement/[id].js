import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

const MODES = [
  { key: 'hear', glyph: '◎', label: 'Hear' },
  { key: 'see', glyph: '◈', label: 'See' },
  { key: 'recommend', glyph: '◆', label: 'Recommend' },
];

const HEAR_TABS = ['Ingest', 'Intelligence Map', 'Pillars', 'Coverage Gaps', 'Needs Review', 'Changelog'];
const SEE_TABS = ['Research Threads', 'Vantage Brief'];

export default function Workspace() {
  const router = useRouter();
  const { id } = router.query;
  const [engagement, setEngagement] = useState(null);
  const [mode, setMode] = useState('hear');
  const [tab, setTab] = useState('Ingest');

  const loadEngagement = useCallback(() => {
    if (!id) return;
    fetch(`/api/engagements?id=${id}`).then((r) => r.json()).then((d) => setEngagement(d.engagement || null));
  }, [id]);
  useEffect(() => { loadEngagement(); }, [loadEngagement]);

  function switchMode(m) {
    setMode(m);
    setTab(m === 'hear' ? 'Ingest' : m === 'see' ? 'Research Threads' : 'Brief');
  }

  if (!engagement) {
    return (<><Header crumb="Loading" /><main className="vo-container" style={{ paddingTop: 60 }}><p className="vo-eyebrow">Loading engagement…</p></main></>);
  }

  const tabs = mode === 'hear' ? HEAR_TABS : mode === 'see' ? SEE_TABS : [];

  return (
    <div data-mode={mode}>
      <Header crumb={engagement.client_name} />
      <main className="vo-container" style={{ paddingTop: 40, paddingBottom: 120 }}>
        <Link href={`/client/${engagement.client_id}`} className="vo-eyebrow">← {engagement.client_name}</Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '18px 0 28px', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h1 className="vo-display" style={{ fontSize: 38, margin: '0 0 6px' }}>{engagement.name}</h1>
            <span className="vo-eyebrow">{engagement.type} · {engagement.interview_count} interviews · {engagement.pillars?.length || 0} pillars</span>
          </div>
          {/* The mode pill toggle */}
          <div style={{ display: 'inline-flex', background: 'var(--vo-navy)', border: '1px solid var(--vo-line-strong)', borderRadius: 100, padding: 4 }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className="vo-wordmark"
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: 100,
                  padding: '9px 18px', fontSize: 12, letterSpacing: '0.16em',
                  background: mode === m.key ? (m.key === 'see' ? 'var(--vo-teal)' : m.key === 'recommend' ? 'var(--vo-text)' : 'var(--vo-gold)') : 'transparent',
                  color: mode === m.key ? 'var(--vo-ink)' : 'var(--vo-text-dim)',
                  transition: 'all 0.18s ease',
                }}
              >
                {m.glyph} {m.label}
              </button>
            ))}
          </div>
        </div>

        {tabs.length > 0 && (
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--vo-line)', marginBottom: 32, flexWrap: 'wrap' }}>
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className="vo-eyebrow"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px',
                  color: tab === t ? 'var(--vo-text)' : 'var(--vo-text-faint)',
                  borderBottom: tab === t ? '2px solid var(--vo-gold)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {mode === 'hear' && <HearMode engagement={engagement} tab={tab} onChange={loadEngagement} />}
        {mode === 'see' && <SeeMode engagement={engagement} tab={tab} />}
        {mode === 'recommend' && <RecommendMode engagement={engagement} />}
      </main>
    </div>
  );
}

/* ---------------- HEAR ---------------- */
function HearMode({ engagement, tab, onChange }) {
  if (tab === 'Ingest') return <Ingest engagement={engagement} onDone={onChange} />;
  if (tab === 'Intelligence Map') return <IntelligenceMap engagement={engagement} />;
  if (tab === 'Pillars') return <Pillars engagement={engagement} />;
  if (tab === 'Coverage Gaps') return <Gaps engagement={engagement} />;
  if (tab === 'Needs Review') return <Review engagement={engagement} />;
  if (tab === 'Changelog') return <Changelog engagement={engagement} />;
  return null;
}

function Ingest({ engagement, onDone }) {
  const [form, setForm] = useState({ speaker: '', role: '', date: '', category: '', transcript: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const voices = engagement.voice_categories || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagement_id: engagement.id, ...form }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Processing failed.');
      setResult(d);
      setForm({ speaker: '', role: '', date: '', category: '', transcript: '' });
      onDone && onDone();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div><label className="vo-label">Speaker</label><input className="vo-input" value={form.speaker} onChange={set('speaker')} /></div>
        <div><label className="vo-label">Role</label><input className="vo-input" value={form.role} onChange={set('role')} /></div>
        <div><label className="vo-label">Date</label><input className="vo-input" value={form.date} onChange={set('date')} placeholder="May 19, 2026" /></div>
        <div>
          <label className="vo-label">Voice category</label>
          <select className="vo-select" value={form.category} onChange={set('category')}>
            <option value="">—</option>
            {voices.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <label className="vo-label">Transcript</label>
      <textarea className="vo-textarea" style={{ minHeight: 240 }} value={form.transcript} onChange={set('transcript')} placeholder="Paste the full interview transcript…" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
        <button className="vo-btn vo-btn-primary" disabled={busy || !form.transcript.trim()} onClick={submit}>
          {busy ? 'Processing…' : 'Process transcript →'}
        </button>
        {busy && <span className="vo-spinner" />}
      </div>
      {error && <p style={{ color: 'var(--vo-red)', marginTop: 16, fontFamily: 'var(--vo-mono)', fontSize: 13 }}>{error}</p>}
      {result && (
        <div className="vo-card" style={{ padding: 20, marginTop: 20 }}>
          <p className="vo-eyebrow" style={{ color: 'var(--vo-green)', marginBottom: 10 }}>Processed · {result.interview?.speaker}</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--vo-mono)', fontSize: 12, color: 'var(--vo-text-dim)' }}>
            <span>{result.counts.quotes} quotes</span>
            <span>{result.counts.pillar_quotes} pillar-mapped</span>
            <span>{result.counts.funder_signals} funder signals</span>
            <span>{result.counts.review_items} to review</span>
            <span>{result.counts.threads_queued} See threads queued</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligenceMap({ engagement }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(`/api/map?engagement_id=${engagement.id}`).then((r) => r.json()).then(setData); }, [engagement.id]);
  if (!data) return <p className="vo-eyebrow">Loading map…</p>;
  if (data.stats.quotes === 0) return <Empty msg="No intelligence yet. Process a transcript in the Ingest tab." />;

  const sections = [
    ['Themes', data.bySection.theme], ['Proof points', data.bySection.proof],
    ['Concerns', data.bySection.concern], ['Opportunities', data.bySection.opportunity],
  ];
  return (
    <div>
      <StatRow stats={[['Interviews', data.stats.interviews], ['Quotes', data.stats.quotes], ['Funder signals', data.stats.funderSignals]]} />
      {sections.map(([label, items]) => items?.length > 0 && (
        <section key={label} style={{ marginTop: 36 }}>
          <p className="vo-eyebrow" style={{ marginBottom: 16 }}>{label} · {items.length}</p>
          <div className="vo-stack">
            {items.map((q) => <QuoteCard key={q.id} q={q} />)}
          </div>
        </section>
      ))}
      {data.funderSignals.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <p className="vo-eyebrow" style={{ marginBottom: 16, color: 'var(--vo-gold)' }}>Funder signals · {data.funderSignals.length}</p>
          <div className="vo-stack">
            {data.funderSignals.map((f) => (
              <div key={f.id} className="vo-card" style={{ padding: 18 }}>
                <p style={{ margin: '0 0 10px', color: 'var(--vo-gold-bright)', fontSize: 14 }}>{f.signal}</p>
                <div className="vo-quote">{f.quote}<span className="attr">{f.source}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Pillars({ engagement }) {
  const [pillars, setPillars] = useState(null);
  useEffect(() => { fetch(`/api/pillars?engagement_id=${engagement.id}`).then((r) => r.json()).then((d) => setPillars(d.pillars)); }, [engagement.id]);
  if (!pillars) return <p className="vo-eyebrow">Loading…</p>;
  if (pillars.length === 0) return <Empty msg="This engagement has no pillars configured." />;
  return (
    <div className="vo-stack" style={{ gap: 28, display: 'flex', flexDirection: 'column' }}>
      {pillars.map((p) => (
        <section key={p.name} className="vo-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: p.description ? 6 : 16 }}>
            <h3 className="vo-display" style={{ fontSize: 22, margin: 0 }}>{p.name}</h3>
            <span className="vo-pill">{p.quotes.length} quotes</span>
          </div>
          {p.description && <p style={{ color: 'var(--vo-text-dim)', margin: '0 0 16px', fontSize: 14 }}>{p.description}</p>}
          {p.quotes.length === 0 ? <p className="vo-eyebrow" style={{ color: 'var(--vo-text-faint)' }}>No quotes mapped yet.</p> : (
            <div className="vo-stack">{p.quotes.map((q) => (
              <div key={q.id} className="vo-quote">{q.quote}<span className="attr">{q.relevance ? q.relevance + ' · ' : ''}{q.source}</span></div>
            ))}</div>
          )}
        </section>
      ))}
    </div>
  );
}

function Gaps({ engagement }) {
  const [analysis, setAnalysis] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch(`/api/gaps?engagement_id=${engagement.id}`).then((r) => r.json()).then((d) => setAnalysis(d.analysis)), [engagement.id]);
  useEffect(() => { load(); }, [load]);
  async function run() {
    setBusy(true);
    await fetch('/api/gaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engagement_id: engagement.id }) });
    await load(); setBusy(false);
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span className="vo-eyebrow">Coverage analysis</span>
        <button className="vo-btn vo-btn-primary" disabled={busy} onClick={run}>{busy ? 'Analyzing…' : 'Run gap analysis'}</button>
      </div>
      {analysis === undefined ? <p className="vo-eyebrow">Loading…</p> : !analysis ? <Empty msg="No analysis yet. Run a gap analysis to assess coverage." /> : (
        <div>
          {analysis.scores && (
            <StatRow stats={[['Pillar coverage', (analysis.scores.pillar_coverage || 0) + '%'], ['Voice balance', (analysis.scores.voice_balance || 0) + '%'], ['Overall', (analysis.scores.overall || 0) + '%']]} />
          )}
          <div className="vo-stack" style={{ marginTop: 28 }}>
            {(analysis.gaps || []).map((g, i) => (
              <div key={i} className="vo-card" style={{ padding: 18, borderLeft: `3px solid ${g.severity === 'high' ? 'var(--vo-red)' : g.severity === 'medium' ? 'var(--vo-yellow)' : 'var(--vo-green)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 15 }}>{g.area}</strong>
                  <span className="vo-pill">{g.type} · {g.severity}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--vo-text-dim)', fontSize: 14 }}>{g.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Review({ engagement }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => fetch(`/api/review?engagement_id=${engagement.id}`).then((r) => r.json()).then((d) => setItems(d.items)), [engagement.id]);
  useEffect(() => { load(); }, [load]);
  async function resolve(id, resolved) {
    await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resolved }) });
    load();
  }
  if (!items) return <p className="vo-eyebrow">Loading…</p>;
  if (items.length === 0) return <Empty msg="Nothing flagged for review." />;
  return (
    <div className="vo-stack">
      {items.map((it) => (
        <div key={it.id} className="vo-card" style={{ padding: 18, opacity: it.resolved ? 0.5 : 1, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 15 }}>{it.item}</p>
            <p className="vo-eyebrow" style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--vo-text-faint)' }}>{it.reason} · {it.source}</p>
          </div>
          <button className="vo-btn" onClick={() => resolve(it.id, !it.resolved)}>{it.resolved ? 'Reopen' : 'Resolve'}</button>
        </div>
      ))}
    </div>
  );
}

function Changelog({ engagement }) {
  const [entries, setEntries] = useState(null);
  useEffect(() => { fetch(`/api/changelog?engagement_id=${engagement.id}`).then((r) => r.json()).then((d) => setEntries(d.entries)); }, [engagement.id]);
  if (!entries) return <p className="vo-eyebrow">Loading…</p>;
  if (entries.length === 0) return <Empty msg="No activity yet." />;
  return (
    <div className="vo-stack">
      {entries.map((e) => (
        <div key={e.id} className="vo-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{e.speaker || 'Interview'}</strong>
            <span className="vo-eyebrow">{e.date}</span>
          </div>
          <p style={{ margin: '0 0 10px', color: 'var(--vo-text-dim)', fontSize: 14 }}>{e.summary}</p>
          <span className="vo-eyebrow" style={{ color: 'var(--vo-text-faint)' }}>+{e.new_items} items · {e.flag_count} flagged</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- SEE ---------------- */
function SeeMode({ engagement, tab }) {
  const [data, setData] = useState(null);
  const [running, setRunning] = useState(null);
  const load = useCallback(() => fetch(`/api/see?engagement_id=${engagement.id}`).then((r) => r.json()).then(setData), [engagement.id]);
  useEffect(() => { load(); }, [load]);

  async function runThread(threadDbId) {
    setRunning(threadDbId);
    await fetch('/api/see-research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thread_id: threadDbId }) });
    await load(); setRunning(null);
  }

  if (!data) return <p className="vo-eyebrow">Loading…</p>;

  if (tab === 'Vantage Brief') {
    return data.synthesis ? (
      <div className="vo-card" style={{ padding: 28 }}>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{data.synthesis.recommend_brief}</p>
      </div>
    ) : <Empty msg="No synthesis yet. Complete research threads, then synthesize into a Vantage Brief." />;
  }

  // Research Threads
  if (data.threads.length === 0) return <Empty msg="No threads yet. Processing transcripts queues research threads here." />;
  return (
    <div>
      <StatRow stats={[['Threads', data.stats.total], ['Queued', data.stats.queued], ['Completed', data.stats.completed]]} />
      <div className="vo-stack" style={{ marginTop: 28 }}>
        {data.threads.map((t) => (
          <div key={t.id} className="vo-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.status === 'completed' ? 16 : 0 }}>
              <div>
                <span className="vo-pill" style={{ marginBottom: 8 }}>{t.trigger_type}</span>
                <h3 className="vo-display" style={{ fontSize: 20, margin: '8px 0 0' }}>{t.trigger_value}</h3>
              </div>
              {t.status === 'queued' ? (
                <button className="vo-btn vo-btn-teal" disabled={running === t.id} onClick={() => runThread(t.id)}>
                  {running === t.id ? 'Researching…' : 'Run See research'}
                </button>
              ) : <span className="vo-eyebrow" style={{ color: t.status === 'error' ? 'var(--vo-red)' : 'var(--vo-teal)' }}>{t.status}</span>}
            </div>
            {t.status === 'completed' && (
              <div className="vo-stack" style={{ borderTop: '1px solid var(--vo-line)', paddingTop: 16 }}>
                {[['Regional context', t.indiana_context], ['Peer benchmark', t.peer_benchmark], ['National trend', t.national_trend], ['Convergence', t.convergence_signal], ['Divergence', t.divergence_signal]].map(([l, v]) => v && (
                  <div key={l}>
                    <p className="vo-eyebrow" style={{ marginBottom: 6, color: l === 'Convergence' ? 'var(--vo-green)' : l === 'Divergence' ? 'var(--vo-yellow)' : 'var(--vo-text-faint)' }}>{l}</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--vo-text-dim)', lineHeight: 1.6 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- RECOMMEND (toggle live, structured build later) ---------------- */
function RecommendMode({ engagement }) {
  return (
    <div className="vo-card" style={{ padding: 48, textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
      <span className="vo-pill" style={{ marginBottom: 20 }}>◆ Phase three</span>
      <h2 className="vo-display" style={{ fontSize: 30, margin: '0 0 14px' }}>Recommend</h2>
      <p style={{ color: 'var(--vo-text-dim)', lineHeight: 1.7, margin: '0 auto 8px', maxWidth: 520 }}>
        The Recommend layer will synthesize Hear quotes and See evidence into prioritized, client-ready action items — each backed by what was said and what the research confirms.
      </p>
      <p className="vo-eyebrow" style={{ color: 'var(--vo-text-faint)', marginTop: 20 }}>
        Structured deliverable · in development
      </p>
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function QuoteCard({ q }) {
  return (
    <div className="vo-card" style={{ padding: 18 }}>
      {q.theme && <p className="vo-eyebrow" style={{ marginBottom: 10 }}>{q.theme}</p>}
      <div className="vo-quote">{q.quote}<span className="attr">{q.source}</span></div>
    </div>
  );
}
function StatRow({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid var(--vo-line)', borderRadius: 'var(--vo-radius-lg)', overflow: 'hidden' }}>
      {stats.map(([label, val], i) => (
        <div key={label} style={{ flex: 1, padding: '20px 24px', borderLeft: i ? '1px solid var(--vo-line)' : 'none' }}>
          <div className="vo-display" style={{ fontSize: 32 }}>{val}</div>
          <div className="vo-eyebrow" style={{ marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
function Empty({ msg }) {
  return <div className="vo-card" style={{ padding: 40, textAlign: 'center', color: 'var(--vo-text-dim)' }}>{msg}</div>;
}
