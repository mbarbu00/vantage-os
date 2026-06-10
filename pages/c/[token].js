import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * The client-facing surface. Reached only via a share token. Renders a single
 * shared artifact with zero navigation back into the workspace — no header
 * links, no sibling data. This is the boundary that lets a file go out without
 * exposing the rest of WeCreate's work.
 */
export default function ClientShareView() {
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => setState(ok ? { status: 'ready', artifact: d.artifact } : { status: 'gone', message: d.error }));
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--vo-paper)', color: '#1a2236' }}>
      <header style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '20px 0' }}>
        <div className="vo-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--vo-mono)', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', fontSize: 13 }}>
            Vantage<span style={{ color: 'var(--wc-magenta)' }}>.</span>OS
          </span>
          {state.status === 'ready' && <span style={{ fontFamily: 'var(--vo-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a93a8' }}>Prepared for {state.artifact.client_name}</span>}
        </div>
      </header>

      <main className="vo-container" style={{ paddingTop: 64, paddingBottom: 100, maxWidth: 760 }}>
        {state.status === 'loading' && <p style={{ fontFamily: 'var(--vo-mono)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a93a8' }}>Loading…</p>}
        {state.status === 'gone' && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <h1 style={{ fontFamily: 'var(--vo-display)', fontSize: 30 }}>This link is no longer available.</h1>
            <p style={{ color: '#5a637a' }}>{state.message}</p>
          </div>
        )}
        {state.status === 'ready' && (
          <article>
            <p style={{ fontFamily: 'var(--vo-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8a93a8' }}>{state.artifact.type}</p>
            <h1 style={{ fontFamily: 'var(--vo-display)', fontSize: 40, margin: '12px 0 24px', lineHeight: 1.1 }}>{state.artifact.title}</h1>
            <div style={{ height: 3, width: 48, background: 'var(--wc-magenta)', marginBottom: 36 }} />
            <ArtifactBody content={state.artifact.content} />
          </article>
        )}
      </main>
    </div>
  );
}

function ArtifactBody({ content }) {
  if (!content) return null;
  if (typeof content === 'string') return <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{content}</p>;
  if (content.body) return <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{content.body}</p>;
  return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--vo-mono)', fontSize: 13 }}>{JSON.stringify(content, null, 2)}</pre>;
}
