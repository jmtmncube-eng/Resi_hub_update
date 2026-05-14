import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  X, Loader2, CalendarClock, Wallet, RefreshCw, LogOut, ClipboardCheck, ImagePlus,
} from 'lucide-react';
import { Modal } from './Modal';
import {
  getLease, updateLeaseTerms, recordDeposit, refundDeposit,
  giveNotice, scheduleMoveOut, completeMoveOut, renewLease, createInspection,
  LeaseView, InspectionType,
} from '../services/lease.service';
import { useConfirm } from './useConfirm';

/**
 * Admin / manager lease-lifecycle console for a single allocation.
 * One scrollable modal with five sections: term, deposit, renewal,
 * move-out, inspections. Opened from the AccountOverviewDrawer.
 */

const errMsg = (err: unknown, fallback: string) =>
  (err instanceof AxiosError ? err.response?.data?.error : null) ?? fallback;

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const fmtR = (v: string | number | null | undefined) =>
  v == null ? '—' : `R${Number(v).toLocaleString()}`;

interface Props { allocationId: string; onClose: () => void; }

export default function LeaseManageModal({ allocationId, onClose }: Props) {
  const qc = useQueryClient();
  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', allocationId],
    queryFn:  () => getLease(allocationId),
  });

  // Every mutation refreshes this lease + the admin account overview + the
  // student's own lease view.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lease', allocationId] });
    qc.invalidateQueries({ queryKey: ['account-overview'] });
    qc.invalidateQueries({ queryKey: ['admin-accounts'] });
    qc.invalidateQueries({ queryKey: ['my-lease'] });
  };

  return (
    <Modal open={true} onClose={onClose} maxWidth={620}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Manage lease</p>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {isLoading || !lease ? (
        <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cyan)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
            Room {lease.room.number} · Block {lease.room.block} · {lease.status}
          </p>
          <TermSection      lease={lease} allocationId={allocationId} onDone={invalidate} />
          <DepositSection   lease={lease} allocationId={allocationId} onDone={invalidate} />
          <RenewSection     lease={lease} allocationId={allocationId} onDone={invalidate} />
          <MoveOutSection   lease={lease} allocationId={allocationId} onDone={invalidate} />
          <InspectionSection lease={lease} allocationId={allocationId} onDone={invalidate} />
        </div>
      )}
    </Modal>
  );
}

// ── Section shell ──────────────────────────────────────────────
function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="card-sm" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon}
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text3)', marginBottom: 4, display: 'block',
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', border: 'none',
  background: 'var(--cyan)', color: '#04211f',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
};
const btnRose: React.CSSProperties = {
  ...btnPrimary, background: 'rgba(232,25,122,.1)', color: 'var(--rose)',
  border: '1px solid rgba(232,25,122,.3)',
};

// ── Term ───────────────────────────────────────────────────────
function TermSection({ lease, allocationId, onDone }: SectionProps) {
  const [start, setStart] = useState(toDateInput(lease.leaseStart));
  const [end, setEnd]     = useState(toDateInput(lease.leaseEnd));

  const save = useMutation({
    mutationFn: () => updateLeaseTerms(allocationId, {
      leaseStart: start || null,
      leaseEnd:   end || null,
    }),
    onSuccess: () => { onDone(); toast.success('Lease term updated'); },
    onError: (e) => toast.error(errMsg(e, 'Could not update the lease term')),
  });

  return (
    <Section icon={<CalendarClock size={15} style={{ color: 'var(--cyan)' }} />} title="Lease term">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Start</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input-base" />
        </div>
        <div>
          <label style={labelStyle}>End</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-base" />
        </div>
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending}
              className="press-soft" style={{ ...btnPrimary, marginTop: 10 }}>
        {save.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
        Save term
      </button>
    </Section>
  );
}

// ── Deposit ────────────────────────────────────────────────────
function DepositSection({ lease, allocationId, onDone }: SectionProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const held = lease.depositStatus !== 'NONE';

  const record = useMutation({
    mutationFn: () => recordDeposit(allocationId, { amount: Number(amount), note: note || undefined }),
    onSuccess: () => { onDone(); setAmount(''); setNote(''); toast.success('Deposit recorded'); },
    onError: (e) => toast.error(errMsg(e, 'Could not record the deposit')),
  });
  const refund = useMutation({
    mutationFn: () => refundDeposit(allocationId, { amount: Number(amount), note: note || undefined }),
    onSuccess: () => { onDone(); setAmount(''); setNote(''); toast.success('Deposit refund recorded'); },
    onError: (e) => toast.error(errMsg(e, 'Could not record the refund')),
  });

  return (
    <Section icon={<Wallet size={15} style={{ color: 'var(--cyan)' }} />} title="Deposit">
      {held && (
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          {fmtR(lease.depositAmount)} on file · <b>{lease.depositStatus.replace('_', ' ').toLowerCase()}</b>
          {lease.depositRefunded != null && ` · ${fmtR(lease.depositRefunded)} refunded`}
          {lease.depositNote && <span style={{ color: 'var(--text3)' }}> · {lease.depositNote}</span>}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Amount (R)</label>
          <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                 placeholder="0" className="input-base" />
        </div>
        <div>
          <label style={labelStyle}>Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)}
                 placeholder={held ? 'e.g. R500 withheld — cleaning' : 'e.g. cash, ref #1234'}
                 className="input-base" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {!held ? (
          <button onClick={() => record.mutate()} disabled={record.isPending || !(Number(amount) > 0)}
                  className="press-soft" style={btnPrimary}>
            {record.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Record deposit held
          </button>
        ) : (
          <button onClick={() => refund.mutate()}
                  disabled={refund.isPending || amount === '' || Number(amount) < 0
                            || lease.depositStatus === 'REFUNDED'}
                  className="press-soft" style={btnRose}>
            {refund.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Record refund
          </button>
        )}
      </div>
    </Section>
  );
}

// ── Renew ──────────────────────────────────────────────────────
function RenewSection({ lease, allocationId, onDone }: SectionProps) {
  const [end, setEnd]   = useState('');
  const [rent, setRent] = useState('');

  const renew = useMutation({
    mutationFn: () => renewLease(allocationId, {
      leaseEnd: end,
      ...(rent ? { rent: Number(rent) } : {}),
    }),
    onSuccess: () => { onDone(); setEnd(''); setRent(''); toast.success('Lease renewed'); },
    onError: (e) => toast.error(errMsg(e, 'Could not renew the lease')),
  });

  if (lease.status === 'ENDED') return null;

  return (
    <Section icon={<RefreshCw size={15} style={{ color: 'var(--cyan)' }} />} title="Renew lease">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
        <div>
          <label style={labelStyle}>New end date</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-base" />
        </div>
        <div>
          <label style={labelStyle}>New rent (optional)</label>
          <input type="number" min="0" value={rent} onChange={e => setRent(e.target.value)}
                 placeholder={String(Number(lease.rent))} className="input-base" />
        </div>
      </div>
      <button onClick={() => renew.mutate()} disabled={renew.isPending || !end}
              className="press-soft" style={{ ...btnPrimary, marginTop: 10 }}>
        {renew.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        Renew lease
      </button>
    </Section>
  );
}

// ── Move-out ───────────────────────────────────────────────────
function MoveOutSection({ lease, allocationId, onDone }: SectionProps) {
  const confirm = useConfirm();
  const [date, setDate] = useState(toDateInput(lease.moveOutDate));
  const ended = lease.status === 'ENDED';

  const notice = useMutation({
    mutationFn: () => giveNotice(allocationId),
    onSuccess: () => { onDone(); toast.success('Notice recorded'); },
    onError: (e) => toast.error(errMsg(e, 'Could not record notice')),
  });
  const schedule = useMutation({
    mutationFn: () => scheduleMoveOut(allocationId, { moveOutDate: date }),
    onSuccess: () => { onDone(); toast.success('Move-out scheduled'); },
    onError: (e) => toast.error(errMsg(e, 'Could not schedule move-out')),
  });
  const complete = useMutation({
    mutationFn: () => completeMoveOut(allocationId),
    onSuccess: () => { onDone(); toast.success('Move-out completed — room freed'); },
    onError: (e) => toast.error(errMsg(e, 'Could not complete move-out')),
  });

  if (ended) {
    return (
      <Section icon={<LogOut size={15} style={{ color: 'var(--text3)' }} />} title="Move-out">
        <p style={{ fontSize: 12, color: 'var(--text2)' }}>
          Lease ended{lease.moveOutCompletedAt
            ? ` on ${new Date(lease.moveOutCompletedAt).toLocaleDateString()}` : ''} — room freed.
        </p>
      </Section>
    );
  }

  return (
    <Section icon={<LogOut size={15} style={{ color: 'var(--rose)' }} />} title="Move-out">
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
        {lease.noticeGivenAt
          ? `Notice given ${new Date(lease.noticeGivenAt).toLocaleDateString()}.`
          : 'No notice on file yet.'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {!lease.noticeGivenAt && (
          <button onClick={() => notice.mutate()} disabled={notice.isPending}
                  className="press-soft" style={btnRose}>
            {notice.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Record notice given
          </button>
        )}
        <div>
          <label style={labelStyle}>Move-out date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base" />
        </div>
        <button onClick={() => schedule.mutate()} disabled={schedule.isPending || !date}
                className="press-soft" style={btnPrimary}>
          {schedule.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Schedule
        </button>
      </div>
      <button
        onClick={async () => {
          const ok = await confirm({
            title: 'Complete move-out?',
            message: 'This ends the lease and frees the room. It cannot be undone.',
            confirmLabel: 'Complete move-out',
            tone: 'rose',
          });
          if (ok) complete.mutate();
        }}
        disabled={complete.isPending}
        className="press-soft"
        style={{ ...btnRose, marginTop: 10, width: '100%' }}
      >
        {complete.isPending ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        Complete move-out &amp; free room
      </button>
    </Section>
  );
}

// ── Inspections ────────────────────────────────────────────────
const INSPECTION_TYPES: InspectionType[] = ['MOVE_IN', 'ROUTINE', 'MOVE_OUT'];

function InspectionSection({ lease, allocationId, onDone }: SectionProps) {
  const [type, setType]           = useState<InspectionType>('ROUTINE');
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes]         = useState('');
  const [photos, setPhotos]       = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = useMutation({
    mutationFn: () => createInspection(allocationId, {
      type, condition, notes: notes || undefined,
      photoUrls: photos.length ? photos : undefined,
    }),
    onSuccess: () => {
      onDone();
      setNotes(''); setPhotos([]); setCondition('Good'); setType('ROUTINE');
      toast.success('Inspection logged');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not log the inspection')),
  });

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} is over 5 MB`); return; }
      const reader = new FileReader();
      reader.onload = re => {
        const r = re.target?.result;
        if (typeof r === 'string') setPhotos(p => [...p, r]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  }

  return (
    <Section icon={<ClipboardCheck size={15} style={{ color: 'var(--cyan)' }} />} title="Inspections">
      {lease.inspections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {lease.inspections.map(ins => (
            <div key={ins.id} style={{
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--bg3)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {ins.type.replace('_', '-').toLowerCase()} · {ins.condition}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {new Date(ins.inspectedAt).toLocaleDateString()}
                </span>
              </div>
              {ins.notes && (
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{ins.notes}</p>
              )}
              {ins.photoUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {ins.photoUrls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" style={{
                        width: 44, height: 44, objectFit: 'cover', borderRadius: 6,
                        border: '1px solid var(--border)',
                      }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add inspection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as InspectionType)} className="input-base">
            {INSPECTION_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', '-').toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Condition</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} className="input-base">
            <option>Good</option><option>Fair</option><option>Poor</option>
          </select>
        </div>
      </div>
      <label style={{ ...labelStyle, marginTop: 10 }}>Notes (optional)</label>
      <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Condition details, damages noted, etc." className="input-base" />
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button onClick={() => fileRef.current?.click()} className="press-soft"
                style={{ ...btnPrimary, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
          <ImagePlus size={12} /> Photos{photos.length ? ` (${photos.length})` : ''}
        </button>
        <button onClick={() => add.mutate()} disabled={add.isPending || !condition}
                className="press-soft" style={btnPrimary}>
          {add.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Log inspection
        </button>
      </div>
    </Section>
  );
}

interface SectionProps {
  lease: LeaseView;
  allocationId: string;
  onDone: () => void;
}
