import { X, Download, CheckCircle2, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResidentDocument } from '../types/domain.types';
import { useAuth } from '../contexts/AuthContext';
import { submitPaymentProof } from '../services/document.service';
import { format } from 'date-fns';
import { formatPeriod } from '../utils/period';
import { downloadInvoicePdf } from '../utils/pdf';

interface Props {
  doc: ResidentDocument | null;
  onClose: () => void;
}

export default function InvoiceModal({ doc, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Hidden file input — must be in DOM for .click() to reliably open the file picker
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadProof = useMutation({
    mutationFn: (proofUrl: string) => submitPaymentProof(doc!.id, proofUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Proof of payment uploaded! Admin will review shortly.');
      setProofPreview(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to upload proof.');
    },
  });

  function pickProof() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => setProofPreview(re.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ESC handling + scroll lock are handled by the <Modal> wrapper.

  if (!doc) return null;

  const isPaid    = doc.status === 'Paid';
  const isOverdue = doc.status === 'Overdue';

  function downloadInvoice() {
    if (!doc) return;
    // Real PDF — replaces the previous HTML blob.
    downloadInvoicePdf({
      id:           doc.id,
      period:       doc.period ?? null,
      amount:       doc.amount ?? null,
      status:       doc.status ?? null,
      proofStatus:  doc.proofStatus ?? null,
      createdAt:    doc.createdAt,
      user:         {
        name:  user?.name ?? 'Resident',
        email: user?.email ?? '',
        phone: user?.phone ?? null,
      },
      room:         user?.allocation
        ? { number: user.allocation.room.number, block: user.allocation.room.block, type: user.allocation.room.type }
        : undefined,
      rentLineItem: doc.amount != null ? Number(doc.amount) : Number(user?.allocation?.rent ?? 0),
    });
  }

  // ── Legacy HTML download removed; jspdf does the heavy lifting now ──

  const invoiceNum = `INV-${doc.id.slice(-8).toUpperCase()}`;

  return (
    <Modal open={true} onClose={onClose} maxWidth={520}>
      {/* Hidden file input — in DOM so .click() reliably opens the OS file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <div style={{ margin: '-28px -32px', padding: 0, overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,204,204,.1) 0%, var(--bg2) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', letterSpacing: '.06em', marginBottom: 4 }}>INVOICE</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>{invoiceNum}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${isPaid ? 'badge-cyan' : isOverdue ? 'badge-rose' : 'badge-gray'}`}>{doc.status}</span>
            {isPaid
              ? <CheckCircle2 size={18} color="var(--cyan)" />
              : isOverdue
              ? <AlertCircle size={18} color="var(--rose)" />
              : null
            }
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Billed to / Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <p className="micro-label" style={{ marginBottom: 8 }}>Billed To</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</p>
              {user?.allocation && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  Room {user.allocation.room.number} · Block {user.allocation.room.block}
                </p>
              )}
            </div>
            <div>
              <p className="micro-label" style={{ marginBottom: 8 }}>Invoice Details</p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)' }}>
                Period: {formatPeriod(doc.period)}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                Issued: {format(new Date(doc.createdAt), 'dd MMM yyyy')}
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                Due: Net 30 days
              </p>
            </div>
          </div>

          {/* Line items */}
          <div style={{ background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', letterSpacing: '.06em' }}>DESCRIPTION</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)', letterSpacing: '.06em' }}>AMOUNT</span>
            </div>
            <div style={{ display: 'flex', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: 'var(--text)' }}>
                  Monthly Rent {user?.allocation ? `— Room ${user.allocation.room.number} (${user.allocation.room.type})` : '— Student Accommodation'}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{formatPeriod(doc.period)}</p>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {doc.amount ?? (user?.allocation ? `R${Number(user.allocation.rent).toLocaleString()}` : '—')}
              </p>
            </div>
            {/* Total */}
            <div style={{ display: 'flex', padding: '14px 16px', background: 'var(--bg2)' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Total Due</span>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 700, color: isPaid ? 'var(--cyan)' : isOverdue ? 'var(--rose)' : 'var(--text)' }}>
                {doc.amount ?? (user?.allocation ? `R${Number(user.allocation.rent).toLocaleString()}` : '—')}
              </p>
            </div>
          </div>

          {isOverdue && (
            <div style={{ background: 'rgba(232,25,122,.08)', border: '1px solid rgba(232,25,122,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--rose)' }}>⚠ This invoice is overdue. Please contact admin to arrange payment.</p>
            </div>
          )}

          {/* Proof of payment section */}
          {!isPaid && (
            <div style={{ marginBottom: 20 }}>
              {doc.proofStatus === 'SUBMITTED' ? (
                <div style={{ background: 'rgba(167,139,250,.07)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, color: '#a78bfa' }}>📎 Proof of payment submitted — awaiting admin review.</p>
                </div>
              ) : doc.proofStatus === 'CLEARED' ? (
                <div style={{ background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.2)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, color: 'var(--cyan)' }}>✓ Payment cleared by admin.</p>
                </div>
              ) : (
                <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '14px 16px' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Upload proof of payment</p>
                  {doc.proofStatus === 'REJECTED' && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--rose)', marginBottom: 8 }}>⚠ Previous proof was rejected. Please upload a new one.</p>
                  )}
                  {proofPreview ? (
                    <div style={{ marginBottom: 10 }}>
                      <img src={proofPreview} alt="Proof preview" style={{ maxHeight: 140, borderRadius: 6, border: '1px solid var(--border)', objectFit: 'contain' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => uploadProof.mutate(proofPreview)} disabled={uploadProof.isPending} className="btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
                          {uploadProof.isPending ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><CheckCircle2 size={12} /> Submit</>}
                        </button>
                        <button onClick={() => setProofPreview(null)} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={pickProof} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>
                      <Upload size={13} /> Select image…
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>Close</button>
            <button onClick={downloadInvoice} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
