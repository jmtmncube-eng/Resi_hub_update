import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, Users, DoorOpen, AlertTriangle, CheckCircle2,
  Wallet as WalletIcon, BarChart3, Megaphone, Wrench, Sparkles,
} from 'lucide-react';
import {
  getAdminStats, getRevenueReport, getOccupancy, getAccounts,
} from '../../services/admin.service';

/**
 * Business-health summary for the residence. Pulls everything an admin
 * needs to gauge how the property is performing without leaving the
 * page — projected revenue, occupancy %, late payers, applicants in
 * the queue, room mix, top earners by chore credit.
 */
export default function ResidenceHealth() {
  const { data: stats }    = useQuery({ queryKey: ['admin-stats'],     queryFn: getAdminStats });
  const { data: revenue }  = useQuery({ queryKey: ['admin-revenue'],   queryFn: getRevenueReport });
  const { data: occ }      = useQuery({ queryKey: ['admin-occupancy'], queryFn: () => getOccupancy() });
  const { data: accounts } = useQuery({ queryKey: ['admin-accounts'],  queryFn: () => getAccounts() });

  const rooms       = occ?.rooms ?? [];
  const totalSlots  = rooms.reduce((s, r) => s + (r.capacity ?? 1), 0);
  const filledSlots = rooms.reduce((s, r) => s + (r.tenants?.length ?? 0), 0);
  const slotOccupancy = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const roomTypeMix: Record<string, number> = {};
  for (const r of rooms) roomTypeMix[r.type] = (roomTypeMix[r.type] ?? 0) + 1;

  const pendingApplicants = (accounts ?? []).filter(a => a.role === 'PENDING_STUDENT').length;
  const inactiveStudents  = (accounts ?? []).filter(a => a.isActive === false).length;
  const topEarners = (accounts ?? [])
    .filter(a => a.role === 'ACTIVE_STUDENT' && (a.wallet?.credits ?? 0) > 0)
    .sort((a, b) => (b.wallet?.credits ?? 0) - (a.wallet?.credits ?? 0))
    .slice(0, 5);

  const projected   = revenue?.projectedMonthly ?? 0;
  const monthlyData = revenue?.monthlyBreakdown?.slice(-6) ?? [];
  const latePayers  = revenue?.latePayers ?? [];

  return (
    <div className="space-y-5">
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
        Live snapshot of residence health — financial, operational, community.
      </p>

      {/* Top KPI grid */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <Kpi label="Projected monthly" value={`R${projected.toLocaleString()}`} accent="cyan"  icon={<TrendingUp size={16} />} />
        <Kpi label="Slot occupancy"     value={`${slotOccupancy}%`}              accent="cyan"  icon={<BarChart3  size={16} />} hint={`${filledSlots}/${totalSlots} filled`} />
        <Kpi label="Active students"    value={String(stats?.students.total ?? '—')}     accent="cyan" icon={<Users size={16} />} />
        <Kpi label="Pending applicants" value={String(pendingApplicants)}        accent="rose"  icon={<Sparkles  size={16} />} hint={pendingApplicants > 0 ? 'awaiting approval' : 'queue empty'} />
        <Kpi label="Open tickets"       value={String(stats?.maintenance.open ?? '—')}   accent="rose" icon={<Wrench size={16} />} hint={`${stats?.maintenance.urgent ?? 0} urgent`} />
        <Kpi label="Vacant slots"       value={String(totalSlots - filledSlots)} accent="text"  icon={<DoorOpen   size={16} />} hint="ready to allocate" />
        <Kpi label="Late payers"        value={String(latePayers.length)}        accent={latePayers.length ? 'rose' : 'text'} icon={<AlertTriangle size={16} />} />
        <Kpi label="Deactivated"        value={String(inactiveStudents)}         accent="text"  icon={<CheckCircle2 size={16} />} hint="suspended accounts" />
      </div>

      {/* Two-up: revenue trend + room mix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {/* Revenue trend bar chart */}
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>Last 6 months · expected vs cleared</p>
          {monthlyData.length === 0 ? (
            <EmptyHint label="No invoices issued yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {monthlyData.map(m => {
                const ratio = m.expected > 0 ? m.cleared / m.expected : 0;
                return (
                  <div key={m.period}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text2)' }}>{m.period}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text3)' }}>
                        R{m.cleared.toLocaleString()} / R{m.expected.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, ratio * 100)}%`, height: '100%',
                        background: ratio >= 0.95 ? 'var(--cyan)' : ratio >= 0.6 ? '#fb923c' : 'var(--rose)',
                        transition: 'width .4s cubic-bezier(.4,0,.2,1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Room mix */}
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>Room mix</p>
          {Object.keys(roomTypeMix).length === 0 ? (
            <EmptyHint label="No rooms configured yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(roomTypeMix).sort().map(([type, n]) => {
                const pct = rooms.length > 0 ? (n / rooms.length) * 100 : 0;
                return (
                  <div key={type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{type}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text3)' }}>
                        {n} room{n !== 1 ? 's' : ''} · {Math.round(pct)}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'linear-gradient(90deg, var(--cyan), rgba(0,204,204,.4))',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top earners + late payers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>
            <WalletIcon size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Top chore earners
          </p>
          {topEarners.length === 0 ? (
            <EmptyHint label="No credits earned yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topEarners.map((u, i) => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: i === 0 ? 'rgba(0,204,204,.06)' : 'transparent',
                  border: i === 0 ? '1px solid rgba(0,204,204,.18)' : '1px solid transparent',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    fontSize: 11, fontWeight: 700,
                    background: i === 0 ? 'var(--cyan)' : 'var(--bg3)',
                    color: i === 0 ? '#0f0f12' : 'var(--text2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{u.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--cyan)', fontWeight: 700 }}>
                    {u.wallet?.credits ?? 0} 🪙
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>
            <Megaphone size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Late payers ({latePayers.length})
          </p>
          {latePayers.length === 0 ? (
            <EmptyHint label="Everyone's caught up ✓" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {latePayers.slice(0, 6).map(lp => (
                <div key={lp.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: 'rgba(232,25,122,.06)',
                  border: '1px solid rgba(232,25,122,.2)',
                }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lp.user.name}
                    </p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                      {lp.period}
                    </p>
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--rose)', fontWeight: 700 }}>
                    R{Number(lp.amount ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label, value, accent, icon, hint,
}: {
  label: string; value: string; accent: 'cyan' | 'rose' | 'text';
  icon: React.ReactNode; hint?: string;
}) {
  const color = accent === 'cyan' ? 'var(--cyan)' : accent === 'rose' ? 'var(--rose)' : 'var(--text)';
  return (
    <div className="card-sm" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="micro-label">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, letterSpacing: '-.01em' }}>
        {value}
      </p>
      {hint && (
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
      {label}
    </p>
  );
}
