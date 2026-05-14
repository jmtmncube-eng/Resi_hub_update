import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Loader2 } from 'lucide-react';
import { getAnalytics, AnalyticsMonth } from '../services/admin.service';
import { useResidence } from '../contexts/ResidenceContext';

/**
 * Six-month trend analytics — rent billed vs collected, tickets opened,
 * new residents. Pure CSS bar charts (no charting dependency). Rendered
 * as a section on the Admin Overview.
 */

const fmtR = (n: number) => `R${n.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
/** "2026-05" → "May" */
const monthShort = (period: string) => {
  const m = Number(period.slice(5, 7)) - 1;
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m] ?? period;
};

export function AnalyticsSection() {
  const { selectedId: residenceId } = useResidence();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', residenceId],
    queryFn:  () => getAnalytics(residenceId ?? undefined),
  });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Analytics</h2>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          · last 6 months
        </span>
      </div>

      {isLoading || !data ? (
        <div className="card-sm" style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Snapshot tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Tile label="Collection rate" value={`${data.snapshot.collectionRate}%`}
                  hint={`${fmtR(data.snapshot.totalCollected)} of ${fmtR(data.snapshot.totalBilled)}`}
                  accent={data.snapshot.collectionRate >= 80 ? '#4ade80' : data.snapshot.collectionRate >= 50 ? '#f59e0b' : '#f87171'} />
            <Tile label="Slot occupancy" value={`${data.snapshot.occupancyRate}%`} hint="current"
                  accent={data.snapshot.occupancyRate >= 80 ? '#4ade80' : 'var(--cyan)'} />
            <Tile label="New residents" value={String(data.snapshot.newResidents6mo)} hint="last 6 months" accent="var(--cyan)" />
            <Tile label="Tickets opened" value={String(data.snapshot.ticketsOpened6mo)} hint="last 6 months" accent="var(--text2)" />
          </div>

          {/* Rent: billed vs collected */}
          <div className="card-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Rent — billed vs collected</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Legend color="rgba(0,204,204,.35)" label="Billed" />
                <Legend color="var(--cyan)" label="Collected" />
              </div>
            </div>
            <BilledCollectedChart series={data.series} />
          </div>

          {/* Tickets + new residents */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div className="card-sm" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Tickets opened</p>
              <CountChart series={data.series} pick={m => m.ticketsOpened} color="#f59e0b" />
            </div>
            <div className="card-sm" style={{ padding: '16px 18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>New residents</p>
              <CountChart series={data.series} pick={m => m.newResidents} color="var(--cyan)" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({ label, value, hint, accent }: {
  label: string; value: string; hint: string; accent: string;
}) {
  return (
    <div className="card-sm" style={{ padding: '12px 14px' }}>
      <p style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </p>
      <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
        {hint}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text3)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

/** Grouped bar chart — billed (faint) behind collected (solid) per month. */
function BilledCollectedChart({ series }: { series: AnalyticsMonth[] }) {
  const max = Math.max(1, ...series.map(m => m.billed));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
      {series.map(m => {
        const billedH    = Math.round((m.billed / max) * 100);
        const collectedH = Math.round((m.collected / max) * 100);
        return (
          <div key={m.period} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
              {/* Billed — faint full bar */}
              <div style={{
                width: '70%', height: `${billedH}%`,
                background: 'rgba(0,204,204,.18)', borderRadius: '4px 4px 0 0',
                position: 'relative',
              }} title={`Billed ${fmtR(m.billed)}`}>
                {/* Collected — solid overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${m.billed > 0 ? Math.round((m.collected / m.billed) * 100) : 0}%`,
                  background: 'var(--cyan)', borderRadius: collectedH >= billedH ? '4px 4px 0 0' : 0,
                }} title={`Collected ${fmtR(m.collected)}`} />
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {monthShort(m.period)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Simple single-series count bar chart with the value above each bar. */
function CountChart({ series, pick, color }: {
  series: AnalyticsMonth[]; pick: (m: AnalyticsMonth) => number; color: string;
}) {
  const max = Math.max(1, ...series.map(pick));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
      {series.map(m => {
        const v = pick(m);
        return (
          <div key={m.period} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)' }}>{v}</span>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{
                width: '60%', height: `${Math.round((v / max) * 100)}%`,
                minHeight: v > 0 ? 3 : 0,
                background: color, borderRadius: '4px 4px 0 0',
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {monthShort(m.period)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
