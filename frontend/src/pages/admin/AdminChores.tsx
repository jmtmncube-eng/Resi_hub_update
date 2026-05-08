import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Loader2, X, ListChecks,
  CheckCircle2, Pause, Play,
} from 'lucide-react';
import {
  listAllChores, createChore, updateChore, deleteChore, AdminChore,
} from '../../services/chore.service';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';
import { useResidence } from '../../contexts/ResidenceContext';
import { usePageTitle } from '../../hooks/usePageTitle';

const FREQUENCIES = [
  'Weekly',
  'Weekly · Mondays',
  'Weekly · Tuesdays',
  'Weekly · Wednesdays',
  'Weekly · Thursdays',
  'Weekly · Fridays',
  'Weekly · Saturdays',
  'Weekly · Sundays',
  'Bi-weekly',
  'Monthly',
];

const ICON_PRESETS = ['🧹', '🗑️', '🪟', '🌿', '💡', '🚿', '🍳', '🧴', '🧺', '🪣', '🚽', '🏠'];

export default function AdminChores() {
  usePageTitle('Chores · Admin');
  const qc = useQueryClient();
  const { selectedId } = useResidence();
  const confirm = useConfirm();

  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<AdminChore | null>(null);

  const { data: chores = [], isLoading } = useQuery({
    queryKey: ['admin-chores', selectedId],
    queryFn:  () => listAllChores(selectedId ?? undefined),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateChore(id, { active }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['admin-chores'] });
      toast.success('Chore updated');
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to update chore');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteChore(id),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ['admin-chores'] });
      toast.success(`Removed: ${data.name}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to delete chore');
    },
  });

  const active   = chores.filter(c => c.active);
  const archived = chores.filter(c => !c.active);
  const claimed  = chores.filter(c => c.claimedById).length;
  const pending  = chores.filter(c => c.proofStatus === 'PENDING').length;

  return (
    <div className="space-y-5 appear">
      <div>
        <h1 className="page-title">Chores</h1>
        <p className="page-sub">
          Add, edit, pause or remove the weekly chores residents must do.
          {selectedId
            ? ' New chores attach to the selected residence.'
            : ' Pick a residence above to scope chores; otherwise they\'re portfolio-wide.'}
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Stat label="Active chores"  value={String(active.length)}   accent="cyan" />
        <Stat label="Currently claimed" value={String(claimed)}      accent="text" />
        <Stat label="Awaiting review"   value={String(pending)}      accent={pending > 0 ? 'rose' : 'text'} />
        <Stat label="Archived"          value={String(archived.length)} accent="text" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setAdding(true)} className="btn-primary press-soft"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
          <Plus size={13} /> New chore
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : chores.length === 0 ? (
        <div className="card empty-state">
          <ListChecks size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No chores yet</p>
          <p>Click <b>New chore</b> to add the first weekly task — sweeping, dustbin, etc.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chores.map(c => (
            <ChoreRow
              key={c.id}
              chore={c}
              onEdit={() => setEditing(c)}
              onToggle={() => toggleActive.mutate({ id: c.id, active: !c.active })}
              onDelete={async () => {
                const ok = await confirm({
                  title: `Delete "${c.name}"?`,
                  message: 'The chore + its history will be removed. Approved chore credits already paid out are unaffected.',
                  confirmLabel: 'Delete',
                  tone: 'rose',
                  icon: Trash2,
                });
                if (ok) remove.mutate(c.id);
              }}
            />
          ))}
        </div>
      )}

      {adding && (
        <ChoreFormModal
          residenceId={selectedId ?? null}
          onClose={() => setAdding(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-chores'] }); setAdding(false); }}
        />
      )}
      {editing && (
        <ChoreFormModal
          chore={editing}
          residenceId={editing.residenceId}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-chores'] }); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────────

function ChoreRow({ chore, onEdit, onToggle, onDelete }: {
  chore: AdminChore;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card" style={{ padding: '14px 18px', opacity: chore.active ? 1 : .55 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(0,204,204,.10)', border: '1px solid rgba(0,204,204,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {chore.icon}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {chore.name}
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
              background: chore.active ? 'rgba(74,222,128,.10)' : 'rgba(232,25,122,.10)',
              color:      chore.active ? '#4ade80' : 'var(--rose)',
              border: `1px solid ${chore.active ? 'rgba(74,222,128,.25)' : 'rgba(232,25,122,.25)'}`,
              fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{chore.active ? 'Active' : 'Paused'}</span>
            {chore.proofStatus === 'PENDING' && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                background: 'rgba(245,158,11,.12)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,.3)',
                fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase',
              }}>Awaiting review</span>
            )}
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
            Block {chore.block} · {chore.frequency}
            {chore.claimedByName && ` · claimed by ${chore.claimedByName}`}
          </p>
          {chore.description && (
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{chore.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onToggle} className="btn-ghost press-soft"
                  title={chore.active ? 'Pause this chore (hide from students)' : 'Reactivate'}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12 }}>
            {chore.active ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
          </button>
          <button onClick={onEdit} className="btn-ghost press-soft"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12 }}>
            <Pencil size={11} /> Edit
          </button>
          <button onClick={onDelete} className="press-soft"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(232,25,122,.08)', color: 'var(--rose)',
                    border: '1px solid rgba(232,25,122,.25)', cursor: 'pointer', fontSize: 12,
                  }}>
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stat
// ─────────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent: 'cyan' | 'rose' | 'text' }) {
  const color = accent === 'cyan' ? 'var(--cyan)' : accent === 'rose' ? 'var(--rose)' : 'var(--text)';
  return (
    <div className="card-sm" style={{ padding: '12px 14px' }}>
      <span className="micro-label">{label}</span>
      <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, marginTop: 4 }}>{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Form Modal — used for both Create + Edit
// ─────────────────────────────────────────────────────────────────

function ChoreFormModal({ chore, residenceId, onClose, onSaved }: {
  chore?: AdminChore;
  residenceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!chore;
  const [icon,        setIcon]        = useState(chore?.icon        ?? '🧹');
  const [name,        setName]        = useState(chore?.name        ?? '');
  const [description, setDescription] = useState(chore?.description ?? '');
  const [frequency,   setFrequency]   = useState(chore?.frequency   ?? 'Weekly · Mondays');
  const [block,       setBlock]       = useState(chore?.block       ?? 'A');

  const save = useMutation({
    mutationFn: () => editing
      ? updateChore(chore!.id, { icon, name, description, frequency, block })
      : createChore({ icon, name, description, frequency, block, residenceId: residenceId ?? undefined }),
    onSuccess: () => {
      toast.success(editing ? 'Chore updated' : 'Chore created');
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to save');
    },
  });

  const valid = name.trim().length > 0 && block.trim().length > 0;

  return (
    <Modal open={true} onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
          {editing ? 'Edit chore' : 'New chore'}
        </p>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Icon */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ICON_PRESETS.map(em => {
              const active = icon === em;
              return (
                <button key={em} type="button" onClick={() => setIcon(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: 18,
                    background: active ? 'rgba(0,204,204,.14)' : 'var(--bg3)',
                    border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}>{em}</button>
              );
            })}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-base" autoFocus
                 placeholder="e.g. Take out dustbin" />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Description</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="input-base"
                    placeholder="Optional — extra detail residents see." />
        </div>

        <div>
          <label className="field-label">Block</label>
          <input value={block} onChange={e => setBlock(e.target.value.toUpperCase())} maxLength={4} className="input-base"
                 style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>
        <div>
          <label className="field-label">Frequency</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)} className="input-base">
            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Cancel</button>
        <button onClick={() => save.mutate()} disabled={!valid || save.isPending}
                className="btn-primary press-soft"
                style={{ flex: 2, padding: '10px 0', fontSize: 13, justifyContent: 'center' }}>
          {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {save.isPending ? 'Saving…' : (editing ? 'Save changes' : 'Create chore')}
        </button>
      </div>
    </Modal>
  );
}
