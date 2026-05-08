import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  UserPlus, Loader2, X, Check, Receipt, Send, Sparkles, Pause,
  Sprout, Brush, Trees,
} from 'lucide-react';
import {
  listContractors, createContractor, endContractor,
  generateContractorInvoiceBulk, listContractorInvoices,
  markContractorInvoicePaid,
  Contractor, ContractorType, ContractorPaymentType,
} from '../../services/residence.service';
import { Modal } from '../../components/Modal';
import { useConfirm } from '../../components/useConfirm';
import { useResidence } from '../../contexts/ResidenceContext';
import { formatPeriod, formatRand } from '../../utils/period';

const TYPE_META: Record<ContractorType, { label: string; icon: typeof Brush; color: string }> = {
  CLEANER:       { label: 'House cleaner',  icon: Brush,  color: '#38bdf8' },
  GROUNDSKEEPER: { label: 'Groundskeeper',  icon: Sprout, color: '#4ade80' },
  GARDENER:      { label: 'Gardener',       icon: Trees,  color: '#fb923c' },
  OTHER:         { label: 'Other',          icon: Sparkles, color: 'var(--text2)' },
};

export default function ResidenceContractors() {
  const qc = useQueryClient();
  const { selectedId } = useResidence();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payVarTarget, setPayVarTarget] = useState<{ id: string; name: string; period: string; rate: string } | null>(null);

  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors', selectedId],
    queryFn:  () => listContractors(selectedId ?? undefined),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['contractor-invoices', selectedId],
    queryFn:  () => listContractorInvoices(),
  });

  // Filter invoices by selected residence (client-side since list endpoint returns all)
  const visibleInvoices = selectedId
    ? invoices.filter(i => i.contractor?.residenceId === selectedId)
    : invoices;

  const endMut = useMutation({
    mutationFn: (id: string) => endContractor(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contract ended');
    },
    onError: () => toast.error('Failed to end contract'),
  });

  const payMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount?: number }) =>
      markContractorInvoicePaid(id, undefined, amount),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['contractor-invoices'] });
      qc.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Invoice marked Paid');
      setPayVarTarget(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to mark paid');
    },
  });

  // Top stats
  const active = contractors.filter(c => c.active).length;
  const monthlyCommit = contractors.filter(c => c.active).reduce((s, c) => s + Number(c.rate), 0);
  const pendingInv  = visibleInvoices.filter(i => i.status === 'Pending');
  const totalDue    = pendingInv.reduce((s, i) => s + Number(i.amount), 0);

  if (!selectedId) {
    return (
      <div className="card-sm" style={{ padding: '24px 28px' }}>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Pick a residence in the picker above to manage its contractors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="page-sub" style={{ marginTop: 0 }}>
        Onboard cleaners, groundskeepers, gardeners. Bill them monthly with one click.
      </p>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <Stat label="Active contractors" value={String(active)} accent="cyan" />
        <Stat label="Monthly commitment" value={formatRand(monthlyCommit)} accent="text" hint="sum of active rates" />
        <Stat label="Unpaid invoices"    value={String(pendingInv.length)} accent={pendingInv.length ? 'rose' : 'text'} />
        <Stat label="Total owed"         value={formatRand(totalDue)} accent={totalDue ? 'rose' : 'text'} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setAdding(true)} className="btn-primary press-soft"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
          <UserPlus size={13} /> Onboard contractor
        </button>
        <button onClick={() => setBulkOpen(true)} className="btn-ghost press-soft"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
          <Send size={13} /> Generate monthly invoices
        </button>
      </div>

      {/* Contractor list */}
      {contractors.length === 0 ? (
        <div className="card empty-state">
          <UserPlus size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No contractors yet</p>
          <p>Click <b>Onboard contractor</b> to add the first one — cleaner, gardener, grounds-keeper.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contractors.map(c => (
            <ContractorCard
              key={c.id}
              contractor={c}
              invoices={invoices.filter(i => i.contractorId === c.id)}
              onEnd={async () => {
                const ok = await confirm({
                  title: `End ${c.name}'s contract?`,
                  message: `They won't be billed for future months. Past invoices and history are kept for your records.`,
                  confirmLabel: 'End contract',
                  tone: 'rose',
                  icon: Pause,
                });
                if (ok) endMut.mutate(c.id);
              }}
              onPay={(invoiceId) => {
                if (c.paymentType === 'VARIABLE') {
                  const inv = invoices.find(i => i.id === invoiceId);
                  setPayVarTarget({
                    id: invoiceId,
                    name: c.name,
                    period: inv?.period ?? '',
                    rate: c.rate,
                  });
                } else {
                  payMut.mutate({ id: invoiceId });
                }
              }}
              payingId={payMut.isPending ? payMut.variables?.id : undefined}
            />
          ))}
        </div>
      )}

      {adding && (
        <AddContractorModal
          residenceId={selectedId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['contractors'] });
            setAdding(false);
          }}
        />
      )}

      {bulkOpen && (
        <BulkInvoiceModal
          residenceId={selectedId}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['contractor-invoices'] });
            setBulkOpen(false);
          }}
        />
      )}

      {payVarTarget && (
        <PayVariableModal
          target={payVarTarget}
          loading={payMut.isPending}
          onClose={() => setPayVarTarget(null)}
          onSubmit={(amount) => payMut.mutate({ id: payVarTarget.id, amount })}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent, hint }: {
  label: string; value: string; accent: 'cyan' | 'rose' | 'text'; hint?: string;
}) {
  const color = accent === 'cyan' ? 'var(--cyan)' : accent === 'rose' ? 'var(--rose)' : 'var(--text)';
  return (
    <div className="card-sm" style={{ padding: '14px 16px' }}>
      <span className="micro-label">{label}</span>
      <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1, marginTop: 6 }}>
        {value}
      </p>
      {hint && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{hint}</p>}
    </div>
  );
}

function ContractorCard({ contractor: c, invoices, onEnd, onPay, payingId }: {
  contractor: Contractor;
  invoices: Contractor['invoices'];
  onEnd: () => void;
  onPay: (invoiceId: string) => void;
  payingId?: string;
}) {
  const meta = TYPE_META[c.type];
  const Icon = meta.icon;
  const recent = invoices.slice(0, 3);
  return (
    <div className="card" style={{ padding: '16px 20px', opacity: c.active ? 1 : .55 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: `${meta.color}1f`,
          border: `1px solid ${meta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {c.name}
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              fontSize: 10, fontWeight: 600,
              background: c.active ? 'rgba(74,222,128,.10)' : 'rgba(232,25,122,.10)',
              color:      c.active ? '#4ade80' : 'var(--rose)',
              border: `1px solid ${c.active ? 'rgba(74,222,128,.25)' : 'rgba(232,25,122,.25)'}`,
              fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
            }}>
              {c.active ? 'Active' : 'Ended'}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              fontSize: 10, fontWeight: 600,
              background: c.paymentType === 'FIXED' ? 'rgba(0,204,204,.10)' : 'rgba(251,146,60,.10)',
              color:      c.paymentType === 'FIXED' ? 'var(--cyan)' : '#fb923c',
              border: `1px solid ${c.paymentType === 'FIXED' ? 'rgba(0,204,204,.25)' : 'rgba(251,146,60,.25)'}`,
              fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
            }} title={c.paymentType === 'FIXED'
              ? 'Same amount every period'
              : 'Amount entered when each invoice is paid'}>
              {c.paymentType}
            </span>
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
            {meta.label} · {formatRand(c.rate)} / {c.rateUnit}
            {c.paymentType === 'VARIABLE' && ' (budget)'}
            {c.phone && ` · ${c.phone}`}
            {c.residence && ` · ${c.residence.name}`}
          </p>
          {c.notes && (
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{c.notes}</p>
          )}
        </div>
        {c.active && (
          <button onClick={onEnd} className="press-soft"
                  title="End contract"
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(232,25,122,.08)',
                    color: 'var(--rose)',
                    border: '1px solid rgba(232,25,122,.25)',
                    fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
            <Pause size={11} /> End
          </button>
        )}
      </div>

      {/* Recent invoices */}
      {recent.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p className="micro-label" style={{ marginBottom: 8 }}>Recent invoices</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map(i => (
              <div key={i.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: i.status === 'Paid' ? 'rgba(74,222,128,.05)' : 'rgba(232,25,122,.04)',
                border: `1px solid ${i.status === 'Paid' ? 'rgba(74,222,128,.18)' : 'rgba(232,25,122,.16)'}`,
              }}>
                <Receipt size={12} style={{ color: i.status === 'Paid' ? '#4ade80' : 'var(--rose)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>
                  {formatPeriod(i.period)}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: i.status === 'Paid' ? '#4ade80' : 'var(--rose)', fontWeight: 700 }}>
                  {c.paymentType === 'VARIABLE' && i.status === 'Pending' && Number(i.amount) === 0
                    ? '— TBC'
                    : formatRand(i.amount)}
                </span>
                {i.status === 'Pending' ? (
                  <button onClick={() => onPay(i.id)} disabled={payingId === i.id}
                          className="press-soft"
                          style={{
                            padding: '4px 10px', borderRadius: 6,
                            background: 'var(--cyan)', color: '#0f0f12',
                            border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600,
                            fontFamily: "'Space Grotesk', sans-serif",
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                    {payingId === i.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                    {c.paymentType === 'VARIABLE' ? 'Enter & pay' : 'Mark paid'}
                  </button>
                ) : (
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4ade80', fontWeight: 600 }}>
                    PAID
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Add contractor modal
// ─────────────────────────────────────────────────────────────────

function AddContractorModal({ residenceId, onClose, onAdded }: {
  residenceId: string; onClose: () => void; onAdded: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [type,        setType]        = useState<ContractorType>('CLEANER');
  const [name,        setName]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [rate,        setRate]        = useState('');
  const [rateUnit,    setRateUnit]    = useState<'month' | 'week' | 'visit'>('month');
  const [paymentType, setPaymentType] = useState<ContractorPaymentType>('FIXED');
  const [startDate,   setStartDate]   = useState(today);
  const [endDate,     setEndDate]     = useState('');
  const [notes,       setNotes]       = useState('');

  const create = useMutation({
    mutationFn: () => createContractor({
      residenceId, type, name, phone, email,
      rate: Number(rate), rateUnit, paymentType,
      startDate, endDate: endDate || undefined,
      notes,
    }),
    onSuccess: () => { toast.success('Contractor onboarded'); onAdded(); },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to onboard');
    },
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={500}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Onboard a contractor</p>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Role</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['CLEANER', 'GROUNDSKEEPER', 'GARDENER', 'OTHER'] as ContractorType[]).map(t => {
              const m = TYPE_META[t];
              const Icon = m.icon;
              const active = type === t;
              return (
                <button key={t} onClick={() => setType(t)} className="press-soft"
                        style={{
                          padding: '10px 6px', borderRadius: 8,
                          border: `1px solid ${active ? m.color : 'var(--border)'}`,
                          background: active ? `${m.color}14` : 'var(--bg3)',
                          color: active ? 'var(--text)' : 'var(--text2)',
                          fontSize: 11, fontWeight: active ? 600 : 500,
                          fontFamily: "'Space Grotesk', sans-serif",
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          cursor: 'pointer',
                        }}>
                  <Icon size={14} color={active ? m.color : 'currentColor'} />
                  {m.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-base" autoFocus />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 71 …" className="input-base" />
        </div>
        <div>
          <label className="field-label">Email (optional)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">Rate (R)</label>
          <input type="number" min={0} step={50} value={rate} onChange={e => setRate(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">Per</label>
          <select value={rateUnit} onChange={e => setRateUnit(e.target.value as 'month' | 'week' | 'visit')} className="input-base">
            <option value="month">month</option>
            <option value="week">week</option>
            <option value="visit">visit</option>
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Payment type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['FIXED', 'VARIABLE'] as ContractorPaymentType[]).map(pt => {
              const active = paymentType === pt;
              const color  = pt === 'FIXED' ? 'var(--cyan)' : '#fb923c';
              return (
                <button key={pt} type="button" onClick={() => setPaymentType(pt)} className="press-soft"
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${active ? color : 'var(--border)'}`,
                    background: active ? `${color}14` : 'var(--bg3)',
                    color: active ? 'var(--text)' : 'var(--text2)',
                    fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color, letterSpacing: '.05em' }}>{pt}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
                    {pt === 'FIXED' ? 'Same amount every period' : 'Enter actual at pay-time'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="field-label">Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base" />
        </div>
        <div>
          <label className="field-label">End date (optional)</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="input-base" placeholder="Comes Tuesdays + Fridays…" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => create.mutate()} disabled={create.isPending || !name.trim() || !rate}
                className="btn-primary press-soft"
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          {create.isPending ? 'Adding…' : 'Onboard'}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Bulk invoice modal — generates invoices for every active contractor
// ─────────────────────────────────────────────────────────────────

function BulkInvoiceModal({ residenceId, onClose, onDone }: {
  residenceId: string; onClose: () => void; onDone: () => void;
}) {
  const months: { value: string; label: string }[] = (() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -1; i <= 5; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      out.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      });
    }
    return out;
  })();
  const [period, setPeriod] = useState(months[1].value);

  const run = useMutation({
    mutationFn: () => generateContractorInvoiceBulk(period, residenceId),
    onSuccess:  (res) => {
      toast.success(`${res.created} invoice${res.created !== 1 ? 's' : ''} generated · ${res.skipped} already on file`);
      onDone();
    },
    onError: () => toast.error('Failed to generate'),
  });

  return (
    <Modal open={true} onClose={onClose} maxWidth={460}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Generate contractor invoices
      </p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
        Bills every active contractor for the selected month
      </p>

      <label className="field-label">Billing month</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8, marginBottom: 16 }}>
        {months.map(m => {
          const active = period === m.value;
          return (
            <button key={m.value} onClick={() => setPeriod(m.value)} className="press-soft"
                    style={{
                      padding: '9px 6px', borderRadius: 8,
                      border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                      background: active ? 'rgba(0,204,204,.08)' : 'var(--bg3)',
                      color: active ? 'var(--text)' : 'var(--text2)',
                      fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                      fontWeight: active ? 600 : 400, cursor: 'pointer',
                    }}>
              {m.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => run.mutate()} disabled={run.isPending}
                className="btn-primary press-soft"
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          {run.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Generate
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pay-variable modal — admin enters actual amount before marking paid
// ─────────────────────────────────────────────────────────────────

function PayVariableModal({ target, loading, onClose, onSubmit }: {
  target: { id: string; name: string; period: string; rate: string };
  loading: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState('');
  const num = Number(amount);
  const valid = num > 0 && Number.isFinite(num);

  return (
    <Modal open={true} onClose={onClose} maxWidth={420}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Pay {target.name}
      </p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
        {formatPeriod(target.period)} · variable rate (budget {formatRand(target.rate)})
      </p>

      <label className="field-label">Actual amount paid (R)</label>
      <input
        type="number" min={0} step={50} autoFocus
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder={target.rate}
        className="input-base"
        onKeyDown={e => { if (e.key === 'Enter' && valid) onSubmit(num); }}
      />
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
        This becomes the invoice amount and the invoice is marked Paid.
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => onSubmit(num)} disabled={!valid || loading}
                className="btn-primary press-soft"
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {loading ? 'Saving…' : 'Pay & mark paid'}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
