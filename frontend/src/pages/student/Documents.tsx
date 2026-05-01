import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Download, FileCheck, FileClock, PenLine,
  Eye, Upload, CheckCircle2, Clock, Loader2, ImagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { getMyDocuments, submitPaymentProof } from '../../services/document.service';
import { ResidentDocument } from '../../types/domain.types';
import { usePageTitle } from '../../hooks/usePageTitle';
import InvoiceModal from '../../components/InvoiceModal';
import ContractSignModal from '../../components/ContractSignModal';

const TYPE_ICON: Record<string, React.ReactNode> = {
  INVOICE:  <FileClock  size={16} />,
  CONTRACT: <FileCheck  size={16} />,
  LETTER:   <FileText   size={16} />,
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  INVOICE:  { bg: 'rgba(232,25,122,.1)',  color: 'var(--rose)'  },
  CONTRACT: { bg: 'rgba(0,204,204,.1)',   color: 'var(--cyan)'  },
  LETTER:   { bg: 'var(--bg3)',           color: 'var(--text2)' },
};

/** Proof status pill */
function ProofBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: 'Under Review',    color: '#a78bfa'       },
    CLEARED:   { label: 'Payment Cleared', color: 'var(--cyan)'   },
    REJECTED:  { label: 'Proof Rejected',  color: 'var(--rose)'   },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px',
      borderRadius: 20, background: `${s.color}18`, color: s.color,
      border: `1px solid ${s.color}30`, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export default function Documents() {
  usePageTitle('Documents');
  const qc = useQueryClient();

  // ── Modal state ──────────────────────────────────────────────
  const [invoiceDoc,  setInvoiceDoc]  = useState<ResidentDocument | null>(null);
  const [contractDoc, setContractDoc] = useState<ResidentDocument | null>(null);

  // ── Payment proof state ──────────────────────────────────────
  /** Which invoice row has its inline upload panel open */
  const [payTarget,    setPayTarget]    = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Hidden file input — attached to DOM, so .click() reliably opens the picker
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const pickingForRef = useRef<string | null>(null);

  function openFilePicker(docId: string) {
    pickingForRef.current = docId;
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => setProofPreview(re.target?.result as string);
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected later
    e.target.value = '';
  }

  function expandPanel(docId: string) {
    setPayTarget(docId);
    setProofPreview(null);
  }

  function closePanel() {
    setPayTarget(null);
    setProofPreview(null);
  }

  // ── Queries ──────────────────────────────────────────────────
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn:  getMyDocuments,
  });

  const uploadProof = useMutation({
    mutationFn: ({ id, proofUrl }: { id: string; proofUrl: string }) =>
      submitPaymentProof(id, proofUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Proof submitted! Admin will review shortly.');
      closePanel();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to upload proof. Please try again.');
    },
  });

  // ── Grouping ─────────────────────────────────────────────────
  const invoices  = docs.filter(d => d.type === 'INVOICE');
  const contracts = docs.filter(d => d.type === 'CONTRACT');
  const letters   = docs.filter(d => d.type === 'LETTER');

  const needsPayment = invoices.filter(
    d => d.status !== 'Paid' && d.proofStatus !== 'CLEARED' && d.proofStatus !== 'SUBMITTED'
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5 appear">

      {/* Hidden file input — MUST be in DOM for .click() to work reliably */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />

      <div>
        <h1 className="page-title">Documents</h1>
        <p className="page-sub">Your invoices, contracts, and official letters</p>
      </div>

      {/* ── Payment prompt banner ── */}
      {!isLoading && needsPayment.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,25,122,.10) 0%, rgba(232,25,122,.04) 100%)',
          border: '1px solid rgba(232,25,122,.25)', borderRadius: 12, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'rgba(232,25,122,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileClock size={18} color="var(--rose)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--rose)' }}>
              {needsPayment.length} unpaid invoice{needsPayment.length > 1 ? 's' : ''} outstanding
            </p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              Click <strong style={{ color: 'var(--rose)' }}>Upload Proof</strong> on any invoice below to submit your proof of payment.
            </p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading
        ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
            ))}
          </div>
        )
        : docs.length === 0
          ? (
            <div className="card empty-state">
              <FileText size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No documents yet</p>
              <p>Documents from management will appear here</p>
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { label: 'Invoices',  items: invoices,  note: 'Click row to view · Upload proof of payment on outstanding invoices.' },
                { label: 'Contracts', items: contracts, note: 'Review and e-sign your lease agreement.' },
                { label: 'Letters',   items: letters,   note: 'Official correspondence from management.' },
              ].filter(g => g.items.length > 0).map(group => (
                <div key={group.label}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <p className="micro-label">{group.label}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)' }}>
                      {group.note}
                    </p>
                  </div>

                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {group.items.map((doc, idx) => {
                      const isLast      = idx === group.items.length - 1;
                      const panelOpen   = doc.type === 'INVOICE' && payTarget === doc.id;
                      const isLastVisually = isLast && !panelOpen;

                      return (
                        <div key={doc.id}>
                          <DocRow
                            doc={doc}
                            isLast={isLastVisually}
                            onOpen={() => {
                              if (doc.type === 'INVOICE')  setInvoiceDoc(doc);
                              if (doc.type === 'CONTRACT') setContractDoc(doc);
                            }}
                            onExpandPay={() => expandPanel(doc.id)}
                            onCollapsePay={closePanel}
                            panelOpen={panelOpen}
                          />

                          {/* ── Inline proof upload panel ── */}
                          {panelOpen && (
                            <div style={{
                              background: 'rgba(232,25,122,.04)',
                              borderTop: '1px solid rgba(232,25,122,.14)',
                              borderBottom: isLast ? 'none' : '1px solid var(--border)',
                              padding: '16px 18px',
                            }}>
                              <div style={{ marginBottom: 12 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                                  Proof of Payment — <span style={{ color: 'var(--rose)' }}>{doc.period}</span>
                                </p>
                                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                                  Upload a screenshot or photo of your bank transfer, EFT receipt, or payment slip.
                                </p>
                                {doc.proofStatus === 'REJECTED' && (
                                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--rose)', marginTop: 4 }}>
                                    ⚠ Previous proof was rejected. Please upload a clearer image.
                                  </p>
                                )}
                              </div>

                              {proofPreview ? (
                                /* Preview + submit */
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                                  <img
                                    src={proofPreview}
                                    alt="Proof preview"
                                    style={{
                                      maxHeight: 120, maxWidth: 180, borderRadius: 8,
                                      border: '1px solid var(--border)', objectFit: 'cover', flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)' }}>
                                      Looking good? Click Submit Proof to send it for review.
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                      <button
                                        onClick={() => uploadProof.mutate({ id: doc.id, proofUrl: proofPreview })}
                                        disabled={uploadProof.isPending}
                                        className="btn-primary"
                                        style={{ padding: '8px 18px', fontSize: 12 }}
                                      >
                                        {uploadProof.isPending
                                          ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                                          : <><CheckCircle2 size={12} /> Submit Proof</>
                                        }
                                      </button>
                                      <button
                                        onClick={() => openFilePicker(doc.id)}
                                        className="btn-ghost"
                                        style={{ padding: '8px 14px', fontSize: 12 }}
                                      >
                                        Change
                                      </button>
                                      <button
                                        onClick={closePanel}
                                        className="btn-ghost"
                                        style={{ padding: '8px 14px', fontSize: 12 }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* No image yet — pick one */
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <button
                                    onClick={() => openFilePicker(doc.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      padding: '28px 32px', borderRadius: 10, cursor: 'pointer',
                                      background: 'var(--hover)',
                                      border: '2px dashed rgba(232,25,122,.3)',
                                      color: 'var(--rose)', fontSize: 13, fontWeight: 600,
                                      fontFamily: "'Space Grotesk', sans-serif",
                                      flexDirection: 'column', transition: 'all .18s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,25,122,.6)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,25,122,.3)'}
                                  >
                                    <ImagePlus size={22} />
                                    <span>Select Image</span>
                                  </button>
                                  <button
                                    onClick={closePanel}
                                    className="btn-ghost"
                                    style={{ padding: '8px 14px', fontSize: 12 }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
      }

      {/* Modals */}
      <InvoiceModal      doc={invoiceDoc}  onClose={() => setInvoiceDoc(null)}  />
      <ContractSignModal doc={contractDoc} onClose={() => setContractDoc(null)} />
    </div>
  );
}

/* ── DocRow ──────────────────────────────────────────────────── */
function DocRow({
  doc, onOpen, onExpandPay, onCollapsePay, panelOpen, isLast,
}: {
  doc:           ResidentDocument;
  onOpen:        () => void;
  onExpandPay:   () => void;
  onCollapsePay: () => void;
  panelOpen:     boolean;
  isLast:        boolean;
}) {
  const ts          = TYPE_STYLE[doc.type] ?? { bg: 'var(--bg3)', color: 'var(--text2)' };
  const needsSign   = doc.type === 'CONTRACT' && doc.status === 'Pending';
  const isInvoice   = doc.type === 'INVOICE';
  const isPaid      = doc.status === 'Paid' || doc.proofStatus === 'CLEARED';
  const isSubmitted = doc.proofStatus === 'SUBMITTED';
  const isRejected  = doc.proofStatus === 'REJECTED';
  // Show upload button when: it's an invoice, not already cleared/paid, and not currently under review
  const canPay      = isInvoice && !isPaid && !isSubmitted;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 18px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: panelOpen ? 'rgba(232,25,122,.03)' : 'transparent',
        transition: 'background .15s',
      }}
      onMouseEnter={e => {
        if (!panelOpen) (e.currentTarget as HTMLDivElement).style.background = 'var(--hover)';
      }}
      onMouseLeave={e => {
        if (!panelOpen) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Type icon */}
      <div
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: ts.bg, color: ts.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer',
        }}
        onClick={onOpen}
      >
        {TYPE_ICON[doc.type]}
      </div>

      {/* Doc info (clickable → open modal) */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
            {doc.type === 'INVOICE' ? 'Rent Invoice'
              : doc.type === 'CONTRACT' ? 'Lease Agreement'
              : 'Official Letter'}
          </p>
          <span style={{ color: 'var(--text4)', fontSize: 12 }}>—</span>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{doc.period}</p>
          <ProofBadge status={doc.proofStatus} />
        </div>
        {doc.amount && doc.amount !== '—' && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {doc.amount}
          </p>
        )}
        {doc.signedAt && doc.signedByName && (
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--cyan)', marginTop: 2 }}>
            ✓ Signed by {doc.signedByName}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Payment / status badges */}
        <span className={`badge ${isPaid ? 'badge-cyan' : doc.status === 'Overdue' ? 'badge-rose' : 'badge-gray'}`}>
          {isPaid ? 'Paid' : doc.status}
        </span>

        {/* Contract sign CTA */}
        {needsSign && (
          <button
            onClick={onOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: 'var(--rose)', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <PenLine size={12} /> Sign
          </button>
        )}

        {/* ── Upload Proof CTA ── prominent rose button */}
        {canPay && !panelOpen && (
          <button
            onClick={onExpandPay}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: 'rgba(232,25,122,.12)', border: '1px solid rgba(232,25,122,.28)',
              color: 'var(--rose)', cursor: 'pointer', transition: 'all .18s',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,25,122,.22)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,25,122,.12)'}
          >
            <Upload size={12} />
            {isRejected ? 'Re-upload Proof' : 'Upload Proof'}
          </button>
        )}

        {/* Collapse button when panel is open */}
        {canPay && panelOpen && (
          <button
            onClick={onCollapsePay}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: 'rgba(232,25,122,.06)', border: '1px solid rgba(232,25,122,.2)',
              color: 'var(--rose)', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ✕ Close
          </button>
        )}

        {/* Under review indicator */}
        {isSubmitted && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#a78bfa',
          }}>
            <Clock size={11} /> Reviewing
          </span>
        )}

        {/* Cleared tick */}
        {isPaid && isInvoice && (
          <CheckCircle2 size={14} style={{ color: 'var(--cyan)' }} />
        )}

        {/* Download icon for paid/submitted invoices */}
        {isInvoice && !canPay && !isSubmitted && (
          <button
            onClick={onOpen}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Download size={13} />
          </button>
        )}

        {/* Eye for letters/signed contracts */}
        {!isInvoice && !needsSign && (
          <button
            onClick={onOpen}
            style={{ display: 'flex', alignItems: 'center', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Eye size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
