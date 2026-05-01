import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { ResiMark } from '../../components/Brand';
import { ROUTES } from '../../constants/routes';

/**
 * Shared chrome for /privacy and /terms — full-bleed reading surface,
 * sized for actual reading, with a back link to login. The pages are
 * public (no auth required) so anyone can read before signing up.
 */
export function LegalLayout({
  title, lastUpdated, children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ResiMark size={28} />
          <span style={{
            fontSize: 18, fontWeight: 700, color: 'var(--cyan)',
            letterSpacing: '-.03em', fontFamily: "'Space Grotesk', sans-serif",
          }}>
            ResiHub
          </span>
        </div>
        <Link
          to={ROUTES.LOGIN}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            border: '1px solid var(--border2)', borderRadius: 8,
            background: 'transparent', color: 'var(--text2)',
            fontSize: 12, fontWeight: 500, textDecoration: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </header>

      {/* Body */}
      <main style={{
        maxWidth: 760, margin: '0 auto',
        padding: '36px 28px 80px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
        }}>
          <span style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(0,204,204,.14)',
            border: '1px solid rgba(0,204,204,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={18} style={{ color: 'var(--cyan)' }} />
          </span>
          <h1 style={{
            fontSize: 30, fontWeight: 700, letterSpacing: '-.02em',
            color: 'var(--text)', lineHeight: 1.15,
          }}>
            {title}
          </h1>
        </div>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          color: 'var(--text3)', marginBottom: 28,
        }}>
          Last updated · {lastUpdated}
        </p>

        <article className="legal-prose">
          {children}
        </article>

        {/* Footer */}
        <hr style={{ marginTop: 40, border: 'none', borderTop: '1px solid var(--border)' }} />
        <p style={{
          marginTop: 18, fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: 'var(--text3)', letterSpacing: '.05em', textAlign: 'center',
        }}>
          Built by{' '}
          <span style={{ color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0', fontFamily: "'Space Grotesk', sans-serif", fontSize: 11 }}>
            Athera
          </span>
          {' '}· © {new Date().getFullYear()} · For questions email{' '}
          <a href="mailto:privacy@resihub.co" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
            privacy@resihub.co
          </a>
        </p>
      </main>
    </div>
  );
}
