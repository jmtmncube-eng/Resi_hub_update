import { Zap, ShieldCheck } from 'lucide-react';

/**
 * Electricity status card on the student dashboard.
 * Renders one of two states depending on the per-tenant flag set by admin
 * during onboarding (Allocation.electricitySelfManaged).
 *
 *  - selfManaged=true  → tenant tops up their own prepaid meter / smart account
 *  - selfManaged=false → admin buys bulk + bills back; tenant just sits tight
 */
export default function ElectricityCard({
  selfManaged,
  roomNumber,
}: {
  selfManaged: boolean;
  roomNumber?: string;
}) {
  if (selfManaged) {
    return (
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11, flexShrink: 0,
            background: 'rgba(245,158,11,.14)',
            border: '1px solid rgba(245,158,11,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              You manage your own electricity
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
              {roomNumber
                ? `Top up your own prepaid meter / smart-meter account for room ${roomNumber}.`
                : 'Top up your own prepaid meter / smart-meter account directly.'}
              {' '}If you run out, the residence office can't load credits for you — buy units from your provider.
            </p>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: 'var(--text4)', marginTop: 8, letterSpacing: '.04em',
            }}>
              SELF-LOAD · own meter · own account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: 'rgba(0,204,204,.12)',
          border: '1px solid rgba(0,204,204,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={20} style={{ color: 'var(--cyan)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Electricity is handled for you
          </p>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
            Admin buys electricity in bulk for the residence and adds it to your monthly invoice.
            You don't need to top up anything — just report any outage via maintenance.
          </p>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            color: 'var(--text4)', marginTop: 8, letterSpacing: '.04em',
          }}>
            ADMIN-MANAGED · billed monthly
          </p>
        </div>
      </div>
    </div>
  );
}
