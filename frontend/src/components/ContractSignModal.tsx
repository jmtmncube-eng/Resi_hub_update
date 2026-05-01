import { useState, useEffect } from 'react';
import { X, FileCheck, PenLine, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResidentDocument } from '../types/domain.types';
import { signContract } from '../services/document.service';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

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
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doc, onClose, user?.name]);

  useEffect(() => {
    if (doc) document.body.style.overflow = 'hidden';
    else     document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [doc]);

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
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Lease Agreement ${contractRef} — ResiHub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a2e; background: #fff; padding: 56px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 4px; }
    .subtitle { font-family: monospace; font-size: 11px; color: #888; text-align: center; letter-spacing: .1em; margin-bottom: 40px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #00aaaa; font-family: monospace; border-bottom: 1px solid #e8ecf0; padding-bottom: 6px; margin-bottom: 12px; }
    p { font-size: 13px; line-height: 1.8; color: #333; margin-bottom: 10px; }
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .06em; font-family: monospace; margin-bottom: 4px; }
    .value { font-size: 14px; font-weight: 600; }
    .signature-box { border: 2px solid #00cccc; border-radius: 12px; padding: 24px; margin-top: 32px; background: rgba(0,204,204,.03); }
    .sig-label { font-family: monospace; font-size: 10px; color: #888; letter-spacing: .06em; margin-bottom: 8px; }
    .sig-name { font-family: 'Georgia', serif; font-size: 28px; color: #1a1a2e; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
    .sig-meta { font-family: monospace; font-size: 11px; color: #888; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: monospace; background: rgba(0,204,204,.12); color: #00aaaa; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e8ecf0; font-size: 11px; color: #aaa; font-family: monospace; text-align: center; }
  </style>
</head>
<body>
  <h1>Residential Lease Agreement</h1>
  <div class="subtitle">CONTRACT REF: ${contractRef} · RESIHUB STUDENT ACCOMMODATION</div>

  <div class="section">
    <div class="section-title">Parties</div>
    <div class="parties-grid">
      <div>
        <div class="label">Landlord / Manager</div>
        <div class="value">ResiHub Property Management</div>
        <p style="margin-top:6px;font-size:12px">admin@resihub.co</p>
      </div>
      <div>
        <div class="label">Tenant / Resident</div>
        <div class="value">${user?.name ?? 'Resident'}</div>
        <p style="margin-top:6px;font-size:12px">${user?.email ?? ''}</p>
        <p style="font-size:12px">${user?.allocation ? `Room ${user.allocation.room.number}, Block ${user.allocation.room.block}` : ''}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Lease Terms</div>
    <p>Period: <strong>${doc.period}</strong></p>
    <p>Monthly Rent: <strong>${doc.amount ?? (user?.allocation ? 'R' + Number(user?.allocation?.rent ?? 0).toLocaleString() : '—')}</strong></p>
    <p>Room Type: <strong>${user?.allocation?.room.type ?? '—'}</strong></p>
    ${user?.allocation?.moveIn ? `<p>Move-in Date: <strong>${format(new Date(user.allocation.moveIn), 'dd MMMM yyyy')}</strong></p>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <p>1. The tenant agrees to pay the monthly rent by the 1st of each month.</p>
    <p>2. The tenant agrees to maintain the room in good condition and report any damage promptly.</p>
    <p>3. Visitors must be registered via the ResiHub visitor management system.</p>
    <p>4. The tenant must adhere to residence rules including quiet hours (22:00–07:00).</p>
    <p>5. Subletting is strictly prohibited without written consent from management.</p>
    <p>6. A one-month notice period is required for early termination of this agreement.</p>
    <p>7. Management reserves the right to inspect rooms with 24-hour notice.</p>
    <p>8. Any damage beyond normal wear and tear will be charged to the tenant.</p>
  </div>

  ${isSigned ? `
  <div class="signature-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div class="sig-label">TENANT SIGNATURE</div>
        <div class="sig-name">${doc.signedByName}</div>
        <div class="sig-meta">Signed digitally on ${doc.signedAt ? format(new Date(doc.signedAt), 'dd MMMM yyyy, HH:mm') : '—'}</div>
      </div>
      <span class="badge">✓ SIGNED</span>
    </div>
  </div>
  ` : '<div style="height:80px;border-bottom:1px solid #ccc;margin-top:48px"><p style="font-size:11px;color:#aaa;font-family:monospace;margin-top:8px">Tenant Signature</p></div>'}

  <div class="footer">Document generated by ResiHub · Contract Ref: ${contractRef} · This document is legally binding when signed.</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${contractRef}-LeaseAgreement.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card appear"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}
      >
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
            <InfoBlock label="Period" value={doc.period} />
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
    </div>
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
