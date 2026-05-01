import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, AlertTriangle,
  Wallet as WalletIcon, BarChart3, Megaphone, Wrench, Sparkles,
  Sun, Droplets, Lightbulb, ArrowRight,
} from 'lucide-react';
import {
  getAdminStats, getRevenueReport, getOccupancy, getAccounts,
} from '../../services/admin.service';
import { getOpsInsights } from '../../services/ops.service';
import { ROUTES } from '../../constants/routes';
import { formatPeriod } from '../../utils/period';
import { useResidence } from '../../contexts/ResidenceContext';
import { listResidences } from '../../services/residence.service';

/**
 * Business-health summary for the residence. Pulls everything an admin
 * needs to gauge how the property is performing without leaving the
 * page — projected revenue, occupancy %, late payers, applicants in
 * the queue, room mix, top earners by chore credit.
 */
export default function ResidenceHealth() {
  const { selectedId: residenceId } = useResidence();
  const { data: stats }    = useQuery({ queryKey: ['admin-stats'],     queryFn: getAdminStats });
  const { data: revenue }  = useQuery({ queryKey: ['admin-revenue'],   queryFn: getRevenueReport });
  const { data: occ }      = useQuery({
    queryKey: ['admin-occupancy', residenceId],
    queryFn:  () => getOccupancy(undefined, residenceId ?? undefined),
  });
  const { data: accounts } = useQuery({ queryKey: ['admin-accounts'],  queryFn: () => getAccounts() });
  const { data: ops }      = useQuery({ queryKey: ['ops-insights'],    queryFn: getOpsInsights });
  const { data: residences = [] } = useQuery({ queryKey: ['residences'], queryFn: listResidences });

  const rooms       = occ?.rooms ?? [];
  const totalSlots  = rooms.reduce((s, r) => s + (r.capacity ?? 1), 0);
  const filledSlots = rooms.reduce((s, r) => s + (r.tenants?.length ?? 0), 0);
  const slotOccupancy = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const roomTypeMix: Record<string, number> = {};
  for (const r of rooms) roomTypeMix[r.type] = (roomTypeMix[r.type] ?? 0) + 1;

  const pendingApplicants = (accounts ?? []).filter(a => a.role === 'PENDING_STUDENT').length;
  const topEarners = (accounts ?? [])
    .filter(a => a.role === 'ACTIVE_STUDENT' && (a.wallet?.credits ?? 0) > 0)
    .sort((a, b) => (b.wallet?.credits ?? 0) - (a.wallet?.credits ?? 0))
    .slice(0, 5);

  const projected   = revenue?.projectedMonthly ?? 0;
  const monthlyData = revenue?.monthlyBreakdown?.slice(-6) ?? [];
  const latePayers  = revenue?.latePayers ?? [];
  const opsCost     = ops?.monthlyOpsCost ?? 0;
  const netMonthly  = projected - opsCost;
  const lowStock    = ops?.stock.filter(s => s.low) ?? [];
  const opsRemind   = ops?.reminders.length ?? 0;

  return (
    <div className="space-y-5">
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
        {residenceId === null
          ? 'Portfolio rollup across all residences. Pick one in the picker for a focused view.'
          : 'Live snapshot of this residence — financial, operational, community.'}
      </p>

      {/* Portfolio rollup table — only when "All residences" is selected */}
      {residenceId === null && residences.length > 0 && (
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 12 }}>Per-residence breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {residences.map(r => (
              <div key={r.id} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
                gap: 12, alignItems: 'center',
                padding: '10px 12px', borderRadius: 9,
                background: 'var(--bg3)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>
                  {r.filledSlots}/{r.totalSlots} slots
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: r.occupancyPct >= 90 ? 'var(--cyan)' : r.occupancyPct >= 60 ? '#fb923c' : 'var(--rose)' }}>
                  {r.occupancyPct}% full
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--cyan)', fontWeight: 700, textAlign: 'right' }}>
                  R{r.projectedMonthly.toLocaleString()}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top KPI grid — operational + financial side-by-side */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <Kpi label="Projected monthly"  value={`R${projected.toLocaleString()}`} accent="cyan"  icon={<TrendingUp size={16} />} />
        <Kpi label="Ops cost (30d)"     value={`R${opsCost.toLocaleString()}`}   accent={opsCost > 0 ? 'rose' : 'text'} icon={<Wrench size={16} />} hint={opsRemind > 0 ? `${opsRemind} action items` : 'tracked monthly'} />
        <Kpi label="Net monthly"        value={`R${netMonthly.toLocaleString()}`} accent={netMonthly >= 0 ? 'cyan' : 'rose'} icon={<TrendingUp size={16} />} hint="projected − ops" />
        <Kpi label="Slot occupancy"     value={`${slotOccupancy}%`}              accent="cyan"  icon={<BarChart3  size={16} />} hint={`${filledSlots}/${totalSlots} filled`} />
        <Kpi label="Active students"    value={String(stats?.students.total ?? '—')}     accent="cyan" icon={<Users size={16} />} />
        <Kpi label="Pending applicants" value={String(pendingApplicants)}        accent="rose"  icon={<Sparkles  size={16} />} hint={pendingApplicants > 0 ? 'awaiting approval' : 'queue empty'} />
        <Kpi label="Open tickets"       value={String(stats?.maintenance.open ?? '—')}   accent="rose" icon={<Wrench size={16} />} hint={`${stats?.maintenance.urgent ?? 0} urgent`} />
        <Kpi label="Late payers"        value={String(latePayers.length)}        accent={latePayers.length ? 'rose' : 'text'} icon={<AlertTriangle size={16} />} />
        <Kpi label="Solar (30d)"        value={`${(ops?.solarKwhLast30 ?? 0).toFixed(0)} kWh`} accent="text" icon={<Sun size={16} />} hint="from logged readings" />
        <Kpi label="Low-stock items"    value={String(lowStock.length)}         accent={lowStock.length ? 'rose' : 'text'} icon={<Droplets size={16} />} hint={lowStock.length ? lowStock.map(s => s.label).join(', ') : 'all topped up'} />
      </div>

      {/* Smart suggestions panel — plain-language, prioritised */}
      <SmartSuggestions
        slotOccupancy={slotOccupancy}
        filledSlots={filledSlots}
        totalSlots={totalSlots}
        opsCost={opsCost}
        projected={projected}
        latePayers={latePayers.length}
        pendingApplicants={pendingApplicants}
        lowStock={lowStock}
        opsRemind={opsRemind}
        netMonthly={netMonthly}
        roomTypeMix={roomTypeMix}
      />

      {/* Two-up: revenue line chart + occupancy ring */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {/* Revenue trend — proper SVG line chart */}
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span className="micro-label">Last 6 months · expected vs cleared</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)' }}>
                <span style={{ width: 10, height: 2, background: 'var(--text4)' }} /> Expected
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan)' }}>
                <span style={{ width: 10, height: 2, background: 'var(--cyan)' }} /> Cleared
              </span>
            </span>
          </div>
          {monthlyData.length === 0 ? (
            <EmptyHint label="No invoices issued yet" />
          ) : (
            <RevenueChart data={monthlyData} />
          )}
        </div>

        {/* Occupancy ring — single donut + room mix list */}
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>Occupancy & room mix</p>
          {totalSlots === 0 ? (
            <EmptyHint label="No rooms configured yet" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
              <DonutRing pct={slotOccupancy} caption={`${filledSlots}/${totalSlots} slots`} />
              <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(roomTypeMix).sort().map(([type, n]) => {
                  const pct = rooms.length > 0 ? (n / rooms.length) * 100 : 0;
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{type}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text3)' }}>
                          {n} · {Math.round(pct)}%
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: 'linear-gradient(90deg, var(--cyan), rgba(0,204,204,.4))',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ops spend breakdown (last 90 days) */}
      {ops && ops.spend90.some(s => s.total > 0) && (
        <div className="card-sm" style={{ padding: '18px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 14 }}>Ops spend — last 90 days</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ops.spend90
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .map(s => {
                const max = Math.max(...ops.spend90.map(x => x.total));
                const pct = max > 0 ? (s.total / max) * 100 : 0;
                return (
                  <div key={s.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{prettyOpsType(s.type)}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text3)' }}>
                        {s.count} × · R{s.total.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'linear-gradient(90deg, var(--cyan), var(--rose))',
                      }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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

        <div className="card-sm" style={{
          padding: '18px 20px',
          ...(latePayers.length > 0 && { borderColor: 'rgba(232,25,122,.32)' }),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p className="micro-label" style={{ margin: 0 }}>
              <Megaphone size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: latePayers.length > 0 ? 'var(--rose)' : undefined }} />
              Late payers
              <span style={{
                marginLeft: 8,
                padding: '2px 8px', borderRadius: 999,
                background: latePayers.length > 0 ? 'rgba(232,25,122,.14)' : 'var(--bg3)',
                color: latePayers.length > 0 ? 'var(--rose)' : 'var(--text3)',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
              }}>
                {latePayers.length}
              </span>
            </p>
            {latePayers.length > 0 && (
              <Link
                to={ROUTES.ADMIN_PAYMENTS}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: 'var(--rose)', fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Open Payments <ArrowRight size={11} />
              </Link>
            )}
          </div>
          {latePayers.length === 0 ? (
            <EmptyHint label="Everyone's caught up ✓" />
          ) : (
            <>
              {/* Total owed banner */}
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(232,25,122,.06)',
                border: '1px solid rgba(232,25,122,.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              }}>
                <span style={{ color: 'var(--text3)' }}>Total outstanding</span>
                <span style={{ color: 'var(--rose)', fontWeight: 700, fontSize: 13 }}>
                  R{latePayers.reduce((s, lp) => s + Number(lp.amount ?? 0), 0).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {latePayers.slice(0, 6).map(lp => (
                  <div key={lp.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(232,25,122,.04)',
                    border: '1px solid rgba(232,25,122,.16)',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lp.user.name}
                      </p>
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                        {formatPeriod(lp.period)}
                      </p>
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--rose)', fontWeight: 700 }}>
                      R{Number(lp.amount ?? 0).toLocaleString()}
                    </span>
                  </div>
                ))}
                {latePayers.length > 6 && (
                  <p style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)',
                    textAlign: 'center', marginTop: 4,
                  }}>
                    + {latePayers.length - 6} more…
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Smart suggestions — plain-language tips for non-technical admins
// ─────────────────────────────────────────────────────────────────

interface Suggestion {
  severity: 'good' | 'warn' | 'urgent';
  title:    string;
  body:     string;
  cta?:     { label: string; to: string };
}

function SmartSuggestions(props: {
  slotOccupancy: number; filledSlots: number; totalSlots: number;
  opsCost: number; projected: number; latePayers: number;
  pendingApplicants: number;
  lowStock: { label: string }[];
  opsRemind: number;
  netMonthly: number;
  roomTypeMix: Record<string, number>;
}): React.ReactElement | null {
  const tips: Suggestion[] = [];

  // ── Net margin check
  if (props.projected > 0) {
    const opsRatio = props.opsCost / props.projected;
    if (opsRatio > 0.30) {
      tips.push({
        severity: 'urgent',
        title: 'Ops costs are high relative to revenue',
        body:  `You're spending ${Math.round(opsRatio * 100)}% of projected rent on operations. Industry healthy is 15–25%. Review the Operations tab for the biggest spend categories.`,
        cta:   { label: 'Open Operations', to: '/admin/residence?tab=ops' },
      });
    } else if (opsRatio > 0 && opsRatio < 0.10 && props.opsCost > 0) {
      tips.push({
        severity: 'good',
        title: 'Lean operations',
        body:  `Operations cost ${Math.round(opsRatio * 100)}% of revenue — well within healthy range. Keep logging entries to keep the picture accurate.`,
      });
    }
  }
  if (props.netMonthly < 0) {
    tips.push({
      severity: 'urgent',
      title: 'Running at a loss this month',
      body:  `Projected income (R${props.projected.toLocaleString()}) is below ops cost (R${props.opsCost.toLocaleString()}). Either revenue is missing or a one-off ops expense is skewing the month — check the late-payers list and the ops breakdown.`,
    });
  }

  // ── Occupancy
  if (props.totalSlots > 0) {
    if (props.slotOccupancy < 70 && props.pendingApplicants > 0) {
      tips.push({
        severity: 'warn',
        title: 'Empty slots while applicants wait',
        body:  `${props.totalSlots - props.filledSlots} slots are vacant and ${props.pendingApplicants} student${props.pendingApplicants === 1 ? '' : 's'} are awaiting approval. Approving them lifts revenue immediately.`,
        cta:   { label: 'Review applicants', to: '/admin/accounts' },
      });
    } else if (props.slotOccupancy >= 95) {
      tips.push({
        severity: 'good',
        title: 'Near full occupancy',
        body:  `${props.slotOccupancy}% of slots filled. Consider opening a waiting list — you can flag interested applicants without immediately allocating.`,
      });
    }
  }

  // ── Late payers
  if (props.latePayers >= 3) {
    tips.push({
      severity: 'urgent',
      title: `${props.latePayers} students are behind on rent`,
      body:  `Send a friendly reminder via the News tab, or open Payments to mark cleared payments individually.`,
      cta:   { label: 'Open Payments', to: '/admin/payments' },
    });
  } else if (props.latePayers > 0) {
    tips.push({
      severity: 'warn',
      title: `${props.latePayers} late payer${props.latePayers === 1 ? '' : 's'}`,
      body:  'Check the late-payers list below and follow up. Most students just need one nudge.',
      cta:   { label: 'Open Payments', to: '/admin/payments' },
    });
  }

  // ── Low stock
  if (props.lowStock.length > 0) {
    tips.push({
      severity: 'warn',
      title: `${props.lowStock.length} consumable${props.lowStock.length === 1 ? '' : 's'} running low`,
      body:  `Reorder soon: ${props.lowStock.map(s => s.label).join(', ')}. Running out costs more than buying ahead.`,
      cta:   { label: 'Open Operations', to: '/admin/residence?tab=ops' },
    });
  }

  // ── Ops reminders
  if (props.opsRemind > props.lowStock.length) {
    tips.push({
      severity: 'warn',
      title: 'Service due',
      body:  `Cadence tracker says one or more services are overdue (e.g. pool clean, grass cut). Logging entries regularly keeps reminders accurate.`,
      cta:   { label: 'Open Operations', to: '/admin/residence?tab=ops' },
    });
  }

  // ── Diversification hint
  const types = Object.keys(props.roomTypeMix);
  if (types.length === 1 && props.totalSlots > 5) {
    tips.push({
      severity: 'warn',
      title: 'Single room type only',
      body:  `All ${props.totalSlots} slots are ${types[0]}. A mix (e.g. some SINGLE + DOUBLE) usually fills faster because it serves more student budgets.`,
      cta:   { label: 'Manage rooms', to: '/admin/residence?tab=rooms' },
    });
  }

  // ── Default healthy state
  if (tips.length === 0) {
    tips.push({
      severity: 'good',
      title: 'Everything looks healthy',
      body:  'No urgent issues right now. Keep logging operations entries — the more data you give the system, the smarter the cadence reminders get.',
    });
  }

  // Order: urgent → warn → good
  const order: Record<Suggestion['severity'], number> = { urgent: 0, warn: 1, good: 2 };
  tips.sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="card-sm" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Lightbulb size={14} style={{ color: 'var(--cyan)' }} />
        <span className="micro-label" style={{ margin: 0 }}>Smart suggestions</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          · auto-derived from your data
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tips.slice(0, 4).map((tip, i) => (
          <SuggestionRow key={i} tip={tip} />
        ))}
      </div>
    </div>
  );
}

function SuggestionRow({ tip }: { tip: Suggestion }) {
  const colors = {
    urgent: { bg: 'rgba(232,25,122,.06)', border: 'rgba(232,25,122,.22)', accent: 'var(--rose)', tag: 'Action' },
    warn:   { bg: 'rgba(251,146,60,.06)', border: 'rgba(251,146,60,.22)', accent: '#fb923c',     tag: 'Heads-up' },
    good:   { bg: 'rgba(74,222,128,.06)', border: 'rgba(74,222,128,.20)', accent: '#4ade80',     tag: 'OK' },
  }[tip.severity];

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${colors.accent}1f`,
        border: `1px solid ${colors.accent}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Lightbulb size={13} style={{ color: colors.accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: colors.accent,
            background: `${colors.accent}1a`,
            border: `1px solid ${colors.accent}40`,
            padding: '1px 7px', borderRadius: 999,
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '.05em',
          }}>{colors.tag}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{tip.title}</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{tip.body}</p>
        {tip.cta && (
          <Link
            to={tip.cta.to}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8,
              fontSize: 11, fontWeight: 600,
              color: colors.accent,
              textDecoration: 'none',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {tip.cta.label} <ArrowRight size={11} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SVG charts — line chart for revenue trend, donut ring for occupancy
// ─────────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: Array<{ period: string; expected: number; cleared: number }> }) {
  const w = 320, h = 140, padL = 4, padR = 4, padT = 8, padB = 22;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const max = Math.max(1, ...data.map(d => Math.max(d.expected, d.cleared)));
  const xFor = (i: number) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) => padT + innerH - (v / max) * innerH;

  const buildPath = (key: 'expected' | 'cleared') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d[key])}`).join(' ');

  const buildArea = () => {
    if (data.length === 0) return '';
    const top = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.cleared)}`).join(' ');
    const close = `L ${xFor(data.length - 1)} ${padT + innerH} L ${xFor(0)} ${padT + innerH} Z`;
    return `${top} ${close}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Revenue trend">
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1={padL} x2={padL + innerW}
              y1={padT + innerH * (1 - g)} y2={padT + innerH * (1 - g)}
              stroke="var(--border)" strokeDasharray="2 4" strokeWidth={1} />
      ))}
      {/* Cleared area (cyan) */}
      <defs>
        <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--cyan)" stopOpacity=".35" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={buildArea()} fill="url(#rev-fill)" />
      {/* Expected — dashed muted line */}
      <path d={buildPath('expected')} fill="none" stroke="var(--text4)" strokeWidth={1.6} strokeDasharray="4 4" />
      {/* Cleared — solid cyan line */}
      <path d={buildPath('cleared')} fill="none" stroke="var(--cyan)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Cleared dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(d.cleared)} r={3} fill="var(--cyan)" />
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={xFor(i)} y={h - 6}
              textAnchor="middle"
              fontSize={9} fill="var(--text3)" fontFamily="'IBM Plex Mono', monospace">
          {String(d.period).slice(-2)}
        </text>
      ))}
    </svg>
  );
}

function DonutRing({ pct, caption }: { pct: number; caption: string }) {
  const size = 120, stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const tone = pct >= 90 ? 'var(--cyan)' : pct >= 60 ? '#fb923c' : 'var(--rose)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={`Occupancy ${pct}%`}>
        <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={tone} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 24, fontWeight: 700, color: tone, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, letterSpacing: '-.02em' }}>
          {pct}%
        </p>
        <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
          {caption}
        </p>
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

function prettyOpsType(t: string): string {
  return ({
    POOL_CLEAN: 'Pool cleaning',
    POOL_CHEMICAL: 'Pool chemicals',
    GAS_REFILL: 'Gas refills',
    GRASS_CUT: 'Grass / grounds',
    ELECTRICITY_PURCHASE: 'Electricity',
    SOLAR_TELEMETRY: 'Solar readings',
    OTHER: 'Other',
  } as Record<string, string>)[t] ?? t;
}

function EmptyHint({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
      {label}
    </p>
  );
}
