import { useState, useEffect } from 'react';
import { X, FileCheck, PenLine, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResidentDocument } from '../types/domain.types';
import { signContract } from '../services/document.service';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { formatPeriod } from '../utils/period';
import { downloadContractPdf } from '../utils/pdf';

interface Props {
  doc: ResidentDocument | null;
  onClose: () => void;
}

export default function ContractSignModal({ doc, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sigName, setSigName] = useState('');

  useEffect(() => {
    if (!doc) return;
    setSigName(user?.name ?? '');
  }, [doc, user?.name]);
  // ESC + scroll-lock are handled by <Modal> wrapper.

  const { mutate: sign, isPending: signing } = useMutation({
    mutationFn: () => signContract(doc!.id, sigName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Contract signed successfully!');
      onClose();
    },
    onError: () => toast.error('Failed to sign contract.'),
  });

  if (!doc) return null;

  const isSigned = doc.status === 'Signed';
  const contractRef = `CTR-${doc.id.slice(-8).toUpperCase()}`;

  function downloadContract() {
    if (!doc) return;
    downloadContractPdf({
      id:           doc.id,
      period:       doc.period,
      status:       doc.status,
      signedAt:     doc.signedAt,
      signedByName: doc.signedByName,
      user:         { name: user?.name ?? 'Resident', email: user?.email ?? '' },
      room:         user?.allocation
        ? {
            number: user.allocation.room.number,
            block:  user.allocation.room.block,
            type:   user.allocation.room.type,
            price:  Number(user.allocation.rent ?? 0),
          }
        : undefined,
      startDate:    user?.allocation?.moveIn ?? doc.createdAt,
    });
  }

  return (
    <Modal open={true} onClose={onClose} maxWidth={520}>
      <div style={{ margin: '-28px -32px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          background: isSigned
            ? 'linear-gradient(135deg, rgba(0,204,204,.1) 0%, var(--bg2) 100%)'
            : 'linear-gradient(135deg, rgba(232,25,122,.08) 0%, var(--bg2) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: isSigned ? 'rgba(0,204,204,.15)' : 'rgba(232,25,122,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isSigned
                ? <CheckCircle2 size={20} color="var(--cyan)" />
                : <FileCheck size={20} color="var(--rose)" />
              }
            </div>
            <div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 2 }}>
                {isSigned ? 'SIGNED CONTRACT' : 'LEASE AGREEMENT'}
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{contractRef}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${isSigned ? 'badge-cyan' : 'badge-gray'}`}>{doc.status}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Contract summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <InfoBlock label="Period" value={formatPeriod(doc.period)} />
            <InfoBlock label="Monthly Rent" value={doc.amount ?? (user?.allocation ? `R${Number(user.allocation.rent).toLocaleString()}` : '—')} />
            {user?.allocation && <>
              <InfoBlock label="Room" value={`Room ${user.allocation.room.number} · Block ${user.allocation.room.block}`} />
              <InfoBlock label="Type" value={user.allocation.room.type} />
            </>}
          </div>

          {/* Terms preview */}
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, maxHeight: 140, overflowY: 'auto' }}>
            <p className="micro-label" style={{ marginBottom: 8 }}>Terms Summary</p>
            {[
              'Pay rent by the 1st of each month.',
              'Maintain room in good condition; report damage promptly.',
              'Register all visitors via the ResiHub system.',
              'Observe quiet hours: 22:00–07:00.',
              'No subletting without written consent.',
              'One-month notice required for early exit.',
              'Management may inspect rooms with 24h notice.',
            ].map((t, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 3 }}>
                <span style={{ color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", marginRight: 6 }}>{i + 1}.</span>
                {t}
              </p>
            ))}
          </div>

          {/* Signed state */}
          {isSigned ? (
            <div style={{ background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CheckCircle2 size={15} color="var(--cyan)" />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cyan)' }}>Contract signed</p>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                Signed by: <strong style={{ color: 'var(--text2)' }}>{doc.signedByName}</strong>
              </p>
              {doc.signedAt && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  Date: {format(new Date(doc.signedAt), 'dd MMM yyyy, HH:mm')}
                </p>
              )}
            </div>
          ) : (
            /* Signature input */
            <div style={{ marginBottom: 20 }}>
              <label className="field-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <PenLine size={12} /> Type your full name to sign
              </label>
              <input
                type="text"
                value={sigName}
                onChange={e => setSigName(e.target.value)}
                placeholder="Your full legal name…"
                className="input-base"
                style={{ fontSize: 16, fontStyle: 'italic', letterSpacing: '.02em' }}
              />
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', marginTop: 6 }}>
                By typing your name above, you electronically sign this agreement and confirm you have read and agree to all terms.
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>Close</button>
            <button onClick={downloadContract} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>
              <Download size={14} /> Download
            </button>
            {!isSigned && (
              <button
                onClick={() => sign()}
                disabled={signing || sigName.trim().length < 2}
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                {signing ? <><Loader2 size={13} className="animate-spin" /> Signing…</> : <><PenLine size={14} /> Sign Contract</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
      <p className="micro-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
    </div>
  );
}
