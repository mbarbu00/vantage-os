import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

export default function ClientPage() {
  const router = useRouter();
  const { id } = router.query;
  const [client, setClient] = useState(null);
  const [engagements, setEngagements] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch('/api/clients').then((r) => r.json()).then((d) => {
      setClient((d.clients || []).find((c) => String(c.id) === String(id)) || null);
    });
    fetch(`/api/engagements?client_id=${id}`).then((r) => r.json()).then((d) => setEngagements(d.engagements || []));
  }, [id]);

  return (
    <>
      <Header crumb={client ? client.name : 'Client'} />
      <main className="vo-container" style={{ paddingTop: 48, paddingBottom: 100 }}>
        <Link href="/" className="vo-eyebrow">← Workspace</Link>
        <h1 className="vo-display" style={{ fontSize: 42, margin: '18px 0 8px' }}>{client?.name || '…'}</h1>
        <div className="vo-rule" style={{ maxWidth: 160, marginBottom: 36 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span className="vo-eyebrow">Engagements</span>
          <Link href={`/engagement/new?client_id=${id}`} className="vo-btn vo-btn-primary">+ New engagement</Link>
        </div>

        {engagements === null ? (
          <p className="vo-eyebrow">Loading…</p>
        ) : engagements.length === 0 ? (
          <div className="vo-card" style={{ padding: 44, textAlign: 'center' }}>
            <p className="vo-display" style={{ fontSize: 22, margin: '0 0 10px' }}>No engagements yet.</p>
            <p style={{ color: 'var(--vo-text-dim)', margin: '0 0 24px' }}>
              Set up an engagement to define its strategic pillars, voices, and research context.
            </p>
            <Link href={`/engagement/new?client_id=${id}`} className="vo-btn vo-btn-primary">+ New engagement</Link>
          </div>
        ) : (
          <div className="vo-stack">
            {engagements.map((e) => (
              <Link key={e.id} href={`/engagement/${e.id}`} className="vo-card vo-card-hover" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="vo-display" style={{ fontSize: 22, margin: '0 0 6px' }}>{e.name}</h3>
                  <span className="vo-eyebrow">{e.type || 'Engagement'} · {e.interview_count} interview{e.interview_count === 1 ? '' : 's'}</span>
                </div>
                <span className="vo-pill">{(e.pillars?.length || 0)} pillars</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
