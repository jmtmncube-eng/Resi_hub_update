import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page Not Found');

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
    }} className="appear">

      {/* Large 404 */}
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 96, fontWeight: 700, lineHeight: 1,
        background: 'linear-gradient(135deg, var(--cyan), rgba(0,204,204,.3))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 24, userSelect: 'none',
      }}>
        404
      </p>

      <h1 style={{
        fontSize: 22, fontWeight: 700, color: 'var(--text)',
        fontFamily: "'Space Grotesk', sans-serif", marginBottom: 10,
      }}>
        Page not found
      </h1>

      <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 320, lineHeight: 1.7, marginBottom: 32 }}>
        The page you're looking for doesn't exist or has been moved.
        Head back to get to where you need to go.
      </p>

      <Link
        to="/"
        className="btn-primary"
        style={{ padding: '11px 24px', fontSize: 14, textDecoration: 'none' }}
      >
        Go to homepage
      </Link>

      {/* Subtle grid decoration */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1, opacity: .03,
        backgroundImage: 'radial-gradient(var(--cyan) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }}/>
    </div>
  );
}
