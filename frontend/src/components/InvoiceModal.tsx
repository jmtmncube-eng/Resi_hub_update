import { X, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { ResidentDocument } from '../types/domain.types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Props {
  doc: ResidentDocument | null;
  onClose: () => void;
}

export default function InvoiceModal({ doc, onClose }: Props) {
  const { user } = useAuth();

  useEffect(() => {
    if (!doc) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doc, onClose]);

  useEffect(() => {
    if (doc) document.body.style.overflow = 'hidden';
    else     document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [doc]);

  if (!doc) return null;

  const isPaid    = doc.status === 'Paid';
  const isOverdue = doc.status === 'Overdue';

  function downloadInvoice() {
    const invoiceNum = `INV-${doc!.id.slice(-8).toUpperCase()}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoiceNum} — ResiHub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
    .brand { font-size: 28px; font-weight: 800; color: #00cccc; letter-spacing: -.03em; }
    .brand-sub { font-size: 11px; color: #888; letter-spacing: .08em; margin-top: 2px; font-family: monospace; }
    .inv-label { font-size: 13px; color: #888; font-family: monospace; text-align: right; }
    .inv-num { font-size: 20px; font-weight: 700; color: #1a1a2e; font-family: monospace; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: monospace; margin-top: 6px;
      background: ${isPaid ? 'rgba(0,204,204,.12)' : 'rgba(232,25,122,.12)'}; color: ${isPaid ? '#00aaaa' : '#E8197A'}; }
    .divider { height: 1px; background: #e8ecf0; margin: 32px 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
    .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .06em; font-family: monospace; margin-bottom: 6px; }
    .value { font-size: 14px; color: #1a1a2e; font-weight: 500; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .06em; font-family: monospace; padding: 10px 16px; text-align: left; background: #f8f9fa; border-bottom: 1px solid #e8ecf0; }
    td { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .total-row { background: #f8f9fa; font-weight: 700; font-size: 16px; }
    .total-row td { padding: 16px; border-top: 2px solid #e8ecf0; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8ecf0; font-size: 12px; color: #aaa; font-family: monospace; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ResiHub</div>
      <div class="brand-sub">STUDENT ACCOMMODATION PLATFORM</div>
    </div>
    <div style="text-align:right">
      <div class="inv-label">INVOICE</div>
      <div class="inv-num">${invoiceNum}</div>
      <div><span class="status-badge">${doc!.status.toUpperCase()}</span></div>
    </div>
  </div>
  <div class="grid-2">
    <div>
      <div class="label">Billed To</div>
      <div class="value">${user?.name ?? 'Resident'}<br/>${user?.email ?? ''}<br/>${user?.allocation ? `Room ${user.allocation.room.number}, Block ${user.allocation.room.block}` : ''}</div>
    </div>
    <div>
      <div class="label">Invoice Details</div>
      <div class="value">Period: ${doc!.period}<br/>Issue Date: ${format(new Date(doc!.createdAt), 'dd MMMM yyyy')}<br/>Due: Net 30 days</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Period</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      <tr><td>Monthly Rent — ${user?.allocation ? `Room ${user.allocation.room.number} (${user.allocation.room.type})` : 'Student Accommodation'}</td><td>${doc!.period}</td><td style="text-align:right;font-family:monospace">${doc!.amount ?? user?.allocation ? 'R' + Number(user?.allocation?.rent ?? 0).toLocaleString() : '—'}</td></tr>
    </tbody>
    <tfoot>
      <tr class="total-row"><td colspan="2">Total Due</td><td style="text-align:right;font-family:monospace">${doc!.amount ?? (user?.allocation ? 'R' + Number(user?.allocation?.rent ?? 0).toLocaleString() : '—')}</td></tr>
    </tfoot>
  </table>
  <div class="footer">ResiHub Student Accommodation · admin@resihub.co · This is a computer-generated invoice.</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${invoiceNum}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const invoiceNum = `INV-${doc.id.slice(-8).toUpperCase()}`;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card appear"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}
      >
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
                Period: {doc.period}
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
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{doc.period}</p>
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '9px 18px', fontSize: 13 }}>Close</button>
            <button onClick={downloadInvoice} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
