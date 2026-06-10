import Link from 'next/link';

export default function Header({ crumb }) {
  return (
    <header style={{ borderBottom: '1px solid var(--vo-line)', background: 'rgba(10,14,26,0.8)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="vo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <Link href="/" className="vo-wordmark">
          VANTAGE<span className="dot">·</span>OS
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {crumb && <span className="vo-eyebrow">{crumb}</span>}
          <span className="vo-eyebrow" style={{ color: 'var(--vo-text-faint)' }}>WeCreate Media</span>
        </div>
      </div>
    </header>
  );
}
