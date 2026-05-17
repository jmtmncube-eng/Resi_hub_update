import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import {
  Droplets, Flame, Scissors, Zap, Sun, Plus, X, Loader2,
  AlertTriangle, Clock, CheckCircle2, Trash2, Image as ImageIcon,
  TrendingUp,
} from 'lucide-react';
import {
  listOpsServices, createOpsService, deleteOpsService,
  getOpsInsights, listOpsStock, setOpsStock,
  OpsType, OpsService,
} from '../../services/ops.service';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';
import { useResidence } from '../../contexts/ResidenceContext';
import { format } from 'date-fns';
import { ViewSwitcher, useViewMode } from '../../components/ViewSwitcher';

// ─────────────────────────────────────────────────────────────────
// Static config — drives the section grid
// ─────────────────────────────────────────────────────────────────

interface SectionConfig {
  key:        string;
  title:      string;
  blurb:      string;
  icon:       LucideIcon;
  accent:     string;
  serviceTypes: OpsType[];
  stockKeys:  string[];
  metaFields?: Array<{ name: string; label: string; unit: string; type: 'number' }>;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'pool',
    title: 'Pool',
    blurb: 'Cleanings, chemicals & pool maintenance bills',
    icon: Droplets,
    accent: '#38bdf8',
    serviceTypes: ['POOL_CLEAN', 'POOL_CHEMICAL'],
    stockKeys: ['POOL_CHLORINE', 'POOL_PH'],
    metaFields: [{ name: 'litres', label: 'Chemicals added', unit: 'L', type: 'number' }],
  },
  {
    key: 'gas',
    title: 'Cooking gas',
    blurb: 'Refills and consumption',
    icon: Flame,
    accent: '#fb923c',
    serviceTypes: ['GAS_REFILL'],
    stockKeys: ['GAS_KG'],
    metaFields: [{ name: 'kg', label: 'Cylinder size', unit: 'kg', type: 'number' }],
  },
  {
    key: 'grass',
    title: 'Grounds',
    blurb: 'Grass cuts and grounds-keeping',
    icon: Scissors,
    accent: '#4ade80',
    serviceTypes: ['GRASS_CUT'],
    stockKeys: [],
  },
  {
    key: 'electricity',
    title: 'Electricity',
    blurb: 'Prepaid top-ups and monthly usage',
    icon: Zap,
    accent: '#facc15',
    serviceTypes: ['ELECTRICITY_PURCHASE'],
    stockKeys: ['ELECTRICITY_UNITS'],
    metaFields: [{ name: 'kWh', label: 'Units bought', unit: 'kWh', type: 'number' }],
  },
  {
    key: 'solar',
    title: 'Solar',
    blurb: 'Daily generation readings (kWh)',
    icon: Sun,
    accent: '#f472b6',
    serviceTypes: ['SOLAR_TELEMETRY'],
    stockKeys: [],
    metaFields: [
      { name: 'kWh',     label: 'Generated',         unit: 'kWh', type: 'number' },
      { name: 'voltage', label: 'Battery voltage',   unit: 'V',   type: 'number' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function ResidenceOps() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { selectedId: residenceId } = useResidence();
  const [logOpen, setLogOpen] = useState<SectionConfig | null>(null);
  const [view, setView] = useViewMode('residence-ops-view', 'list');

  // Every ops query keyed on residenceId so the picker actually narrows
  // the data instead of just labelling it.
  const { data: services = [] } = useQuery({
    queryKey: ['ops-services', residenceId],
    queryFn:  () => listOpsServices({ residenceId: residenceId ?? undefined }),
  });
  const { data: insights } = useQuery({
    queryKey: ['ops-insights', residenceId],
    queryFn:  () => getOpsInsights(residenceId ?? undefined),
  });
  const { data: stock = [] } = useQuery({
    queryKey: ['ops-stock', residenceId],
    queryFn:  () => listOpsStock(residenceId ?? undefined),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => deleteOpsService(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['ops-services'] });
      qc.invalidateQueries({ queryKey: ['ops-insights'] });
      toast.success('Entry removed');
    },
    onError: () => toast.error('Failed to remove entry'),
  });

  return (
    <div className="space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p className="page-sub" style={{ marginTop: 0, flex: 1 }}>
          Operational tracking for the residence — cleaning, utilities, services. Log it once, the system tracks frequency and cost.
        </p>
        <ViewSwitcher value={view} onChange={setView} />
      </div>

      {/* Top KPI row + reminders */}
      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* Monthly ops cost */}
          <div className="card-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <TrendingUp size={16} style={{ color: 'var(--cyan)' }} />
              <span className="micro-label">Trailing 30-day ops cost</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cyan)', lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
              R{insights.monthlyOpsCost.toLocaleString()}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              Across {insights.spend30.reduce((s, x) => s + x.count, 0)} entries
            </p>
          </div>
          {/* Solar kWh */}
          <div className="card-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sun size={16} style={{ color: '#f472b6' }} />
                <span className="micro-label">Solar — last 30 days</span>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: 'rgba(251,146,60,.10)', color: '#fb923c',
                border: '1px solid rgba(251,146,60,.3)',
                fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.06em',
              }}>Manual</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#f472b6', lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
              {insights.solarKwhLast30.toFixed(0)} <span style={{ fontSize: 16, color: 'var(--text3)' }}>kWh</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              From manually-logged readings · API pending
            </p>
          </div>
          {/* Active reminders */}
          <div className="card-sm" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={16} style={{ color: 'var(--rose)' }} />
              <span className="micro-label">Reminders</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, color: insights.reminders.length > 0 ? 'var(--rose)' : 'var(--text)', lineHeight: 1, fontFamily: "'Space Grotesk', sans-serif" }}>
              {insights.reminders.length}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
              {insights.reminders.length === 0 ? 'All caught up' : 'Things to action'}
            </p>
          </div>
        </div>
      )}

      {/* Reminders list */}
      {insights && insights.reminders.length > 0 && (
        <div className="card-sm" style={{ padding: '16px 20px' }}>
          <p className="micro-label" style={{ marginBottom: 12 }}>Action items</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.reminders.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 9,
                background: r.severity === 'urgent' ? 'rgba(232,25,122,.08)' : 'rgba(251,146,60,.06)',
                border: `1px solid ${r.severity === 'urgent' ? 'rgba(232,25,122,.25)' : 'rgba(251,146,60,.25)'}`,
              }}>
                <Clock size={14} style={{ color: r.severity === 'urgent' ? 'var(--rose)' : '#fb923c', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections — list mode stacks full-width cards (the verbose view
          with recent entries); cards mode lays them out in an auto-fit
          grid so all 5 fit above the fold at a glance. */}
      <div style={view === 'cards'
        ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }
        : { display: 'flex', flexDirection: 'column', gap: 16 }
      }>
        {SECTIONS.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            services={services.filter(s => section.serviceTypes.includes(s.type))}
            stock={stock.filter(s => section.stockKeys.includes(s.key))}
            onLog={() => setLogOpen(section)}
            onDelete={async (id) => {
              const ok = await confirm({
                title: 'Remove this entry?',
                message: 'The cost, cadence and stock impact of this log will be undone in your reports.',
                confirmLabel: 'Remove',
                tone: 'rose',
                icon: Trash2,
              });
              if (ok) removeMut.mutate(id);
            }}
            insights={insights}
            compact={view === 'cards'}
          />
        ))}
      </div>

      {/* Live monitoring lives on its own dedicated tab now —
          Residence → Live monitoring. Keeping Operations focused
          purely on the manual-log workflow. */}

      {/* Log entry modal */}
      {logOpen && (
        <LogModal
          section={logOpen}
          onClose={() => setLogOpen(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['ops-services'] });
            qc.invalidateQueries({ queryKey: ['ops-insights'] });
            qc.invalidateQueries({ queryKey: ['ops-stock'] });
            setLogOpen(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Section card — header + cadence chip + stock + recent entries
// ─────────────────────────────────────────────────────────────────

function SectionCard({
  section, services, stock, onLog, onDelete, insights, compact = false,
}: {
  section: SectionConfig;
  services: OpsService[];
  stock: { key: string; label: string; quantity: string | number; unit: string; threshold: string | number | null; }[];
  onLog: () => void;
  onDelete: (id: string) => void;
  insights: import('../../services/ops.service').OpsInsights | undefined;
  /** Compact (cards) mode — keep heading + key stats + Log button,
   *  drop the Recent entries list (the main vertical-space hog). */
  compact?: boolean;
}) {
  const Icon = section.icon;
  const recent = services.slice(0, 5);

  // Find this section's cadence stats (first matching type for headline display)
  const cadence = insights?.cadence.find(c => section.serviceTypes.includes(c.type));
  const totalSpend30 = insights?.spend30
    .filter(s => section.serviceTypes.includes(s.type))
    .reduce((sum, s) => sum + s.total, 0) ?? 0;

  return (
    <div className="card" style={{ padding: compact ? '14px 16px' : '20px 24px' }}>
      {/* Header — same shape in both modes; compact just shrinks slightly
          and we hide the blurb so the card stays scannable. */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap', marginBottom: compact ? 12 : 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 14, minWidth: 0 }}>
          <div style={{
            width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: compact ? 9 : 11,
            background: `${section.accent}1f`,
            border: `1px solid ${section.accent}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={compact ? 16 : 20} color={section.accent} />
          </div>
          <div>
            <p style={{ fontSize: compact ? 14 : 17, fontWeight: 700, color: 'var(--text)' }}>{section.title}</p>
            {!compact && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{section.blurb}</p>
            )}
          </div>
        </div>
        <button
          onClick={onLog}
          aria-label={`Log entry for ${section.title}`}
          className="btn-primary press-soft"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: compact ? '6px 10px' : '8px 14px', fontSize: compact ? 11 : 13,
            background: section.accent, color: '#0f0f12',
          }}
        >
          <Plus size={compact ? 11 : 13} /> Log{compact ? '' : ' entry'}
        </button>
      </div>

      {/* Stat strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        <Stat label="Last logged" value={cadence?.lastDate ? format(new Date(cadence.lastDate), 'dd MMM') : '—'}
              hint={cadence?.daysSinceLast != null ? `${cadence.daysSinceLast}d ago` : undefined}
              tone={cadence?.isOverdue ? 'rose' : 'default'} />
        <Stat label="Cadence" value={cadence?.avgIntervalDays ? `~${Math.round(cadence.avgIntervalDays)}d` : '—'}
              hint={cadence?.totalCount ? `${cadence.totalCount} entries` : 'no data yet'} />
        <Stat label="Spend (30d)" value={`R${totalSpend30.toLocaleString()}`} tone="cyan" />
        {stock.map(s => {
          const q = Number(s.quantity);
          const t = s.threshold != null ? Number(s.threshold) : null;
          const low = t != null && q <= t;
          return (
            <Stat
              key={s.key}
              label={s.label}
              value={`${q}${s.unit}`}
              hint={t != null ? `low at ${t}${s.unit}` : undefined}
              tone={low ? 'rose' : 'default'}
            />
          );
        })}
      </div>

      {/* Recent entries — list view only; cards view drops this to
          stay compact. In cards mode the stat strip's "{n} entries"
          hint on Cadence still tells you how many exist. */}
      {!compact && (
        recent.length === 0 ? (
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)',
            textAlign: 'center', padding: '12px 0',
          }}>
            No entries yet — click <b style={{ color: section.accent }}>Log entry</b> to start tracking.
          </p>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p className="micro-label" style={{ marginBottom: 8 }}>Recent entries</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recent.map(s => (
                <EntryRow key={s.id} entry={s} onDelete={() => onDelete(s.id)} accent={section.accent} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone = 'default' }: {
  label: string; value: string; hint?: string; tone?: 'default' | 'cyan' | 'rose';
}) {
  const color = tone === 'cyan' ? 'var(--cyan)' : tone === 'rose' ? 'var(--rose)' : 'var(--text)';
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 9,
      background: 'var(--bg3)', border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </p>
      <p style={{ fontSize: 16, fontWeight: 700, color, marginTop: 3, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{hint}</p>}
    </div>
  );
}

function EntryRow({ entry, onDelete, accent }: { entry: OpsService; onDelete: () => void; accent: string }) {
  const meta = entry.meta as Record<string, unknown> | null;
  const metaSummary = meta
    ? Object.entries(meta).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${v} ${k}`).join(' · ')
    : '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 10px', borderRadius: 8,
      transition: 'background .15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', width: 60, flexShrink: 0 }}>
        {format(new Date(entry.date), 'dd MMM')}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.vendor || prettyType(entry.type)}
          {metaSummary && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
              · {metaSummary}
            </span>
          )}
        </p>
        {entry.note && (
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.note}
          </p>
        )}
      </div>
      {entry.proofUrl && (
        <a href={entry.proofUrl} target="_blank" rel="noreferrer" title="View proof"
           style={{ display: 'flex', color: 'var(--text3)' }}>
          <ImageIcon size={13} />
        </a>
      )}
      {entry.amount != null && (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>
          R{Number(entry.amount).toLocaleString()}
        </span>
      )}
      <button
        onClick={onDelete}
        title="Delete"
        className="press-soft"
        style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function prettyType(t: OpsType) {
  return ({
    POOL_CLEAN: 'Pool clean', POOL_CHEMICAL: 'Pool chemicals',
    GAS_REFILL: 'Gas refill', GRASS_CUT: 'Grass cut',
    ELECTRICITY_PURCHASE: 'Electricity', SOLAR_TELEMETRY: 'Solar reading',
    OTHER: 'Other',
  } as Record<OpsType, string>)[t];
}

// ─────────────────────────────────────────────────────────────────
// Log modal — form for new entry
// ─────────────────────────────────────────────────────────────────

function LogModal({ section, onClose, onSaved }: {
  section: SectionConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { selectedId: residenceId } = useResidence();
  const today = new Date().toISOString().slice(0, 10);
  const [type,    setType]    = useState<OpsType>(section.serviceTypes[0]);
  const [date,    setDate]    = useState(today);
  const [amount,  setAmount]  = useState('');
  const [vendor,  setVendor]  = useState('');
  const [note,    setNote]    = useState('');
  const [meta,    setMeta]    = useState<Record<string, string>>({});
  const [proof,   setProof]   = useState<string | null>(null);
  const [adjustStock, setAdjustStock] = useState<Record<string, string>>({});

  const stockQuery = useQuery({
    queryKey: ['ops-stock', residenceId],
    queryFn:  () => listOpsStock(residenceId ?? undefined),
  });
  const sectionStock = (stockQuery.data ?? []).filter(s => section.stockKeys.includes(s.key));

  function onProofPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setProof(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  const save = useMutation({
    mutationFn: async () => {
      const metaPayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(meta)) {
        if (v !== '') metaPayload[k] = Number(v);
      }
      const created = await createOpsService({
        type,
        date:   new Date(date).toISOString(),
        amount: amount ? Number(amount) : undefined,
        vendor: vendor.trim() || undefined,
        note:   note.trim() || undefined,
        proofUrl: proof ?? undefined,
        meta:   Object.keys(metaPayload).length ? metaPayload : undefined,
        // Stamp it with the currently-selected residence so the entry
        // shows up in the filtered list (residenceId-null orphans us).
        residenceId: residenceId ?? undefined,
      });
      // Adjust stock if user provided new values
      for (const [key, raw] of Object.entries(adjustStock)) {
        if (raw !== '') await setOpsStock(key, { quantity: Number(raw) });
      }
      return created;
    },
    onSuccess: () => {
      toast.success('Entry logged');
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to save');
    },
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Log {section.title} entry</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
            Track service, cost & stock in one form
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {/* Type — only if section has multiple types */}
        {section.serviceTypes.length > 1 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="field-label">Entry type</label>
            <select value={type} onChange={e => setType(e.target.value as OpsType)} className="input-base">
              {section.serviceTypes.map(t => <option key={t} value={t}>{prettyType(t)}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="field-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">Amount (R)</label>
          <input type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(e.target.value)}
                 placeholder="optional" className="input-base" />
        </div>
        <div>
          <label className="field-label">Vendor</label>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
                 placeholder="e.g. John's Pool Service" className="input-base" />
        </div>

        {/* Type-specific meta */}
        {section.metaFields?.map(f => (
          <div key={f.name}>
            <label className="field-label">{f.label} ({f.unit})</label>
            <input type="number" step={0.01} value={meta[f.name] ?? ''}
                   onChange={e => setMeta(m => ({ ...m, [f.name]: e.target.value }))}
                   className="input-base" />
          </div>
        ))}

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Note</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="optional" className="input-base" />
        </div>

        {/* Stock adjusters */}
        {sectionStock.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p className="field-label" style={{ marginBottom: 8 }}>Update stock (optional)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {sectionStock.map(s => (
                <div key={s.key}>
                  <label style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                    {s.label} <span style={{ color: 'var(--text4)' }}>({s.unit})</span>
                  </label>
                  <input
                    type="number" step={0.01}
                    value={adjustStock[s.key] ?? ''}
                    onChange={e => setAdjustStock(a => ({ ...a, [s.key]: e.target.value }))}
                    placeholder={String(s.quantity)}
                    className="input-base"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proof upload */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Proof of payment / receipt</label>
          {proof ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <img src={proof} alt="proof" style={{
                width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)',
              }} />
              <button onClick={() => setProof(null)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                Remove
              </button>
            </div>
          ) : (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: '1px dashed var(--border2)',
              fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              <ImageIcon size={13} /> Choose receipt image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onProofPicked} />
            </label>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="btn-primary press-soft"
          style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
        >
          {save.isPending
            ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
            : <><CheckCircle2 size={13} /> Save entry</>}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
