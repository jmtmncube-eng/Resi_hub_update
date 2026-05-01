import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ChevronDown, Plus, X, Check, Loader2, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { listResidences, createResidence } from '../services/residence.service';
import { useResidence } from '../contexts/ResidenceContext';
import { Modal } from './Modal';

/**
 * Residence picker — opens a popover listing every residence the admin
 * manages, plus an "All residences" rollup option and a "+ Add residence"
 * action that opens a small create modal. Selection is persisted via
 * ResidenceContext (localStorage-backed).
 */
export function ResidencePicker() {
  const { selectedId, setSelectedId } = useResidence();
  const [open,    setOpen]    = useState(false);
  const [creating, setCreating] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const { data: residences = [], isLoading } = useQuery({
    queryKey: ['residences'],
    queryFn:  listResidences,
  });

  // Auto-pick first residence on initial load if none selected and at least one exists
  useEffect(() => {
    if (!isLoading && residences.length > 0 && selectedId === null) {
      // Default to first residence rather than "All" so admins land in a single
      // property by default. They can switch to All explicitly.
      setSelectedId(residences[0].id);
    }
  }, [isLoading, residences, selectedId, setSelectedId]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = residences.find(r => r.id === selectedId);
  const labelText = selectedId === null ? 'All residences' : (selected?.name ?? 'Pick residence');

  return (
    <>
      <div ref={popRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="press-soft"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            borderRadius: 10,
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            cursor: 'pointer', minWidth: 220,
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: selectedId === null ? 'rgba(232,25,122,.16)' : 'rgba(0,204,204,.16)',
            border: `1px solid ${selectedId === null ? 'rgba(232,25,122,.3)' : 'rgba(0,204,204,.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {selectedId === null
              ? <Globe2 size={14} style={{ color: 'var(--rose)' }} />
              : <Building2 size={14} style={{ color: 'var(--cyan)' }} />}
          </span>
          <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <p style={{
              fontSize: 9, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1,
            }}>
              {selectedId === null ? 'PORTFOLIO' : 'RESIDENCE'}
            </p>
            <p style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginTop: 2, lineHeight: 1.2,
            }}>
              {labelText}
            </p>
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text3)', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>

        {open && (
          <div
            role="listbox"
            className="appear"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              minWidth: 320,
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              borderRadius: 12,
              boxShadow: '0 18px 50px -18px rgba(0,0,0,.45)',
              overflow: 'hidden',
              zIndex: 1000,
            }}
          >
            {/* All-residences option */}
            <PickerRow
              accent="rose"
              icon={<Globe2 size={14} style={{ color: 'var(--rose)' }} />}
              title="All residences"
              subtitle="Portfolio-wide rollup"
              selected={selectedId === null}
              onClick={() => { setSelectedId(null); setOpen(false); }}
            />
            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Residences */}
            {isLoading ? (
              <div style={{ padding: 14, textAlign: 'center' }}>
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text3)' }} />
              </div>
            ) : residences.length === 0 ? (
              <p style={{ padding: 14, fontSize: 12, color: 'var(--text3)', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
                No residences yet
              </p>
            ) : residences.map(r => (
              <PickerRow
                key={r.id}
                accent="cyan"
                icon={<Building2 size={14} style={{ color: 'var(--cyan)' }} />}
                title={r.name}
                subtitle={`${r.filledSlots}/${r.totalSlots} slots · R${r.projectedMonthly.toLocaleString()}/mo`}
                selected={selectedId === r.id}
                onClick={() => { setSelectedId(r.id); setOpen(false); }}
              />
            ))}

            {/* Add new */}
            <div style={{ height: 1, background: 'var(--border)' }} />
            <button
              onClick={() => { setOpen(false); setCreating(true); }}
              className="press-soft"
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
                color: 'var(--cyan)',
                fontSize: 13, fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={14} /> Add residence
            </button>
          </div>
        )}
      </div>

      {creating && <CreateResidenceModal onClose={() => setCreating(false)} onCreated={(id) => {
        setSelectedId(id);
        setCreating(false);
      }} />}
    </>
  );
}

function PickerRow({ accent, icon, title, subtitle, selected, onClick }: {
  accent: 'cyan' | 'rose'; icon: React.ReactNode;
  title: string; subtitle?: string;
  selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="press-soft"
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px',
        background: selected
          ? (accent === 'cyan' ? 'rgba(0,204,204,.06)' : 'rgba(232,25,122,.06)')
          : 'transparent',
        border: 'none',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background .15s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget.style.background = 'var(--hover)'); }}
      onMouseLeave={e => { if (!selected) (e.currentTarget.style.background = 'transparent'); }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: accent === 'cyan' ? 'rgba(0,204,204,.10)' : 'rgba(232,25,122,.10)',
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </span>
      {selected && <Check size={14} style={{ color: accent === 'cyan' ? 'var(--cyan)' : 'var(--rose)', flexShrink: 0 }} />}
    </button>
  );
}

function CreateResidenceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [name,    setName]    = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');

  const create = useMutation({
    mutationFn: () => createResidence({ name, tagline, address }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['residences'] });
      toast.success(`${res.name} added`);
      onCreated(res.id);
    },
    onError: () => toast.error('Failed to add residence'),
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={460}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Add a residence</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
            New property to manage
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="field-label">Residence name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Lions Den Residence"
            className="input-base" autoFocus
          />
        </div>
        <div>
          <label className="field-label">Tagline (optional)</label>
          <input
            value={tagline} onChange={e => setTagline(e.target.value)}
            placeholder="Where ambitious minds live"
            className="input-base"
          />
        </div>
        <div>
          <label className="field-label">Address</label>
          <input
            value={address} onChange={e => setAddress(e.target.value)}
            placeholder="14 Den Avenue, Cape Town"
            className="input-base"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !name.trim()}
          className="btn-primary press-soft"
          style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
        >
          {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {create.isPending ? 'Adding…' : 'Add residence'}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
