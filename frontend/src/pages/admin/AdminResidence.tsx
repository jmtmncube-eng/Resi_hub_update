import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LayoutGrid, Activity, Camera, Pencil, Wrench, Users as UsersIcon,
  Loader2, Trash2,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { listResidences, updateResidence, archiveResidence } from '../../services/residence.service';
import { useResidence } from '../../contexts/ResidenceContext';
import { ResidencePicker } from '../../components/ResidencePicker';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';

import AdminSettings       from './AdminSettings';
import ResidenceHealth     from './ResidenceHealth';
import ResidenceTelemetry  from './ResidenceTelemetry';
import ResidenceOps        from './ResidenceOps';
import ResidenceContractors from './ResidenceContractors';

/**
 * Residence hub — single console for everything property-related.
 * Tabs:
 *   Health      — KPIs, smart suggestions, charts (works portfolio-wide)
 *   Rooms       — setup + occupancy grid + add/remove tenants (this is the
 *                 single source of truth for tenancies — the old standalone
 *                 "Allocations" tab was redundant and has been removed)
 *   Operations  — pool, gas, grass, electricity, solar
 *   Contractors — cleaners, gardeners, grounds-keepers
 *   Telemetry   — camera & sensor feeds (placeholder)
 *
 * Info tab removed: residence-name editing happens inline in the header.
 */

type Tab = 'health' | 'rooms' | 'ops' | 'contractors' | 'telemetry';

const TABS: { value: Tab; label: string; icon: typeof Activity; sub: string }[] = [
  { value: 'health',      label: 'Health',      icon: Activity,    sub: 'Business-health metrics, charts & smart suggestions' },
  { value: 'rooms',       label: 'Rooms',       icon: LayoutGrid,  sub: 'Setup, occupancy grid, add or remove tenants' },
  { value: 'ops',         label: 'Operations',  icon: Wrench,      sub: 'Pool, gas, grass, electricity & solar tracking' },
  { value: 'contractors', label: 'Contractors', icon: UsersIcon,   sub: 'Cleaners, gardeners, grounds-keepers — onboard & bill' },
  { value: 'telemetry',   label: 'Telemetry',   icon: Camera,      sub: 'Camera & sensor feeds (coming soon)' },
];

export default function AdminResidence() {
  usePageTitle('Residence · Admin');
  const [params, setParams] = useSearchParams();
  // Coerce unknown / legacy tab values (e.g. ?tab=allocations from an old
  // bookmark) back to a valid tab so the body always renders something.
  const rawTab = params.get('tab') as Tab | null;
  const tab: Tab = TABS.some(t => t.value === rawTab) ? (rawTab as Tab) : 'health';
  const { selectedId } = useResidence();
  const [editing, setEditing] = useState(false);

  const { data: residences = [] } = useQuery({ queryKey: ['residences'], queryFn: listResidences });

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  const active = useMemo(() => TABS.find(t => t.value === tab) ?? TABS[0], [tab]);
  const selected = residences.find(r => r.id === selectedId);

  // If the user is on a residence-specific tab but has selected "All", bounce to Health.
  useEffect(() => {
    const portfolioOnlyTab = tab === 'health' || tab === 'telemetry';
    if (selectedId === null && !portfolioOnlyTab) setTab('health');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tab]);

  return (
    <div className="space-y-5 appear">
      {/* Header — picker + sub-title with inline edit */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ResidencePicker />
          <p className="page-sub" style={{ marginTop: 0 }}>{active.sub}</p>
        </div>
        {selected && (
          <button
            onClick={() => setEditing(true)}
            className="btn-ghost press-soft"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}
          >
            <Pencil size={12} /> Edit residence
          </button>
        )}
      </div>

      {/* Tab strip */}
      <div role="tablist" aria-label="Residence sections"
           style={{
             display: 'flex', gap: 4,
             borderBottom: '1px solid var(--border2)',
             overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%',
           }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          const isComingSoon = t.value === 'telemetry';
          // Disable residence-scoped tabs when "All" is selected
          const portfolioOnly = t.value === 'health' || t.value === 'telemetry';
          const disabled = selectedId === null && !portfolioOnly;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={isActive}
              aria-disabled={disabled}
              onClick={() => !disabled && setTab(t.value)}
              className="press-soft"
              title={disabled ? 'Pick a residence to view this' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 18px',
                marginBottom: -1,
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${isActive ? 'var(--cyan)' : 'transparent'}`,
                color: disabled ? 'var(--text4)' : (isActive ? 'var(--text)' : 'var(--text2)'),
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: disabled ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'border-color .18s, color .18s',
                flexShrink: 0,
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <Icon size={15} style={{ color: isActive ? 'var(--cyan)' : 'currentColor' }} />
              {t.label}
              {isComingSoon && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(232,25,122,.14)',
                  color: 'var(--rose)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase', letterSpacing: '.05em',
                  marginLeft: 4,
                }}>SOON</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body — keyed for clean reset between tabs */}
      <div key={tab} className="appear">
        {tab === 'health'      && <ResidenceHealth />}
        {tab === 'rooms'       && <AdminSettings initialTab="rooms" hideHeader />}
        {tab === 'ops'         && <ResidenceOps />}
        {tab === 'contractors' && <ResidenceContractors />}
        {tab === 'telemetry'   && <ResidenceTelemetry />}
      </div>

      {/* Edit residence modal */}
      {editing && selected && (
        <EditResidenceModal residence={selected} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Edit residence modal — replaces the standalone Info tab
// ─────────────────────────────────────────────────────────────────

function EditResidenceModal({ residence, onClose }: {
  residence: { id: string; name: string; tagline: string | null; address: string | null;
               phone: string | null; email: string | null; description: string | null; };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { selectedId, setSelectedId } = useResidence();
  const confirm = useConfirm();
  const [name,    setName]    = useState(residence.name);
  const [tagline, setTagline] = useState(residence.tagline ?? '');
  const [address, setAddress] = useState(residence.address ?? '');
  const [phone,   setPhone]   = useState(residence.phone ?? '');
  const [email,   setEmail]   = useState(residence.email ?? '');

  const save = useMutation({
    mutationFn: () => updateResidence(residence.id, { name, tagline, address, phone, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residences'] });
      toast.success('Residence updated');
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  const archive = useMutation({
    mutationFn: () => archiveResidence(residence.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residences'] });
      toast.success('Residence archived');
      if (selectedId === residence.id) setSelectedId(null);
      onClose();
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to archive');
    },
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={500}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
        Edit residence
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-base" autoFocus />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Tagline</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} className="input-base" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !name.trim()}
          className="btn-primary press-soft"
          style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
        >
          {save.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>

      {/* Danger zone */}
      <div style={{
        marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={async () => {
            const ok = await confirm({
              title: `Archive "${residence.name}"?`,
              message: 'Hides this residence from the picker. Only works when no rooms are still attached — otherwise remove or reassign rooms first.',
              confirmLabel: 'Archive',
              tone: 'rose',
              icon: Trash2,
            });
            if (ok) archive.mutate();
          }}
          disabled={archive.isPending}
          className="press-soft"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(232,25,122,.06)', color: 'var(--rose)',
            border: '1px solid rgba(232,25,122,.25)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          <Trash2 size={11} /> Archive residence
        </button>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          Hides from the picker. Only works when no rooms remain attached.
        </p>
      </div>
    </Modal>
  );
}
