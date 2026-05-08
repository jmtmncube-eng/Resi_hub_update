import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Camera, ImagePlus, FileCheck2, Loader2, Send, AlertCircle, X } from 'lucide-react';
import { submitApplication, ApplicationStatus, ApplicationSubmission } from '../services/application.service';
import SignaturePad from './SignaturePad';

/** Shared style: each upload tile (ID / Reg / Funding). */
function UploadTile({ label, hint, value, onChange, accent = 'cyan' }: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (val: string | null) => void;
  accent?: 'cyan' | 'rose' | 'amber';
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const accentColor = accent === 'cyan' ? 'var(--cyan)' : accent === 'rose' ? 'var(--rose)' : '#f59e0b';
  const accentRgba  = accent === 'cyan' ? '0,204,204'   : accent === 'rose' ? '232,25,122'  : '245,158,11';

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${label} must be under 5 MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = re => onChange(re.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        <span style={{ color: 'var(--rose)' }}>*</span>
      </label>

      <input ref={cameraRef} type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={fileRef}   type="file" accept="image/*,application/pdf"                       onChange={handleFile} style={{ display: 'none' }} />

      {!value ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button type="button" onClick={() => cameraRef.current?.click()} style={{
            padding: '14px 8px', borderRadius: 10,
            background: `rgba(${accentRgba},.06)`,
            border: `1.5px dashed rgba(${accentRgba},.4)`,
            color: 'var(--text)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}>
            <Camera size={18} style={{ color: accentColor }} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Take photo</span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={{
            padding: '14px 8px', borderRadius: 10,
            background: 'rgba(255,255,255,.02)',
            border: '1.5px dashed var(--border2)',
            color: 'var(--text)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}>
            <ImagePlus size={18} style={{ color: 'var(--text2)' }} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Upload</span>
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid rgba(${accentRgba},.35)` }}>
          {value.startsWith('data:application/pdf') ? (
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 10, background: `rgba(${accentRgba},.06)` }}>
              <FileCheck2 size={20} style={{ color: accentColor }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>PDF uploaded</p>
                <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                  ~{Math.round(value.length * 0.75 / 1024)} KB
                </p>
              </div>
            </div>
          ) : (
            <img src={value} alt={label} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
          )}
          <button type="button" onClick={() => onChange(null)} style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff',
            padding: 4, borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={12} />
          </button>
        </div>
      )}

      <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace" }}>
        {hint}
      </p>
    </div>
  );
}

export default function ApplicationSubmitForm({ status }: { status: ApplicationStatus }) {
  const qc = useQueryClient();
  const [idNumber,        setIdNumber]        = useState(status.idNumber ?? '');
  const [idDocUrl,        setIdDocUrl]        = useState<string | null>(null);
  const [regProofUrl,     setRegProofUrl]     = useState<string | null>(null);
  const [fundingProofUrl, setFundingProofUrl] = useState<string | null>(null);
  const [signatureUrl,    setSignatureUrl]    = useState<string | null>(null);
  const [agreeTerms,      setAgreeTerms]      = useState(false);

  const idValid = /^\d{13}$/.test(idNumber);
  const allReady = idValid && idDocUrl && regProofUrl && fundingProofUrl && signatureUrl && agreeTerms;

  const submit = useMutation({
    mutationFn: (payload: ApplicationSubmission) => submitApplication(payload),
    onSuccess: () => {
      toast.success('Application submitted — admin will review shortly.');
      qc.invalidateQueries({ queryKey: ['application-status'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to submit application.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allReady) return;
    submit.mutate({
      idNumber,
      idDocUrl:         idDocUrl!,
      regProofUrl:      regProofUrl!,
      fundingProofUrl:  fundingProofUrl!,
      signatureDataUrl: signatureUrl!,
    });
  }

  const wasRejected = status.applicationStatus === 'REJECTED';

  return (
    <form onSubmit={handleSubmit} className="bg-white/4 border border-white/8 rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-1">
          {wasRejected ? 'Re-submit your application' : 'Submit your application'}
        </h2>
        <p className="text-white/40 text-xs">
          {wasRejected
            ? 'Admin needs the documents below before they can approve you.'
            : 'Upload your documents below — admin will review within 1–2 business days.'}
        </p>
      </div>

      {wasRejected && status.applicationAdminNote && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(232,25,122,.06)', border: '1px solid rgba(232,25,122,.25)',
        }}>
          <AlertCircle size={14} style={{ color: 'var(--rose)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Reviewer's note</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{status.applicationAdminNote}</p>
          </div>
        </div>
      )}

      {/* ID number */}
      <div>
        <label className="field-label">
          ID number <span style={{ color: 'var(--rose)' }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={13}
          value={idNumber}
          onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="13-digit South African ID"
          className="input-base"
          style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.06em' }}
        />
        {idNumber && !idValid && (
          <p style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>
            ID must be exactly 13 digits.
          </p>
        )}
      </div>

      {/* Document grid */}
      <div className="application-doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <UploadTile label="ID document"            accent="cyan"  hint="Front of SA ID / passport · JPG, PNG or PDF · max 5 MB"
          value={idDocUrl}        onChange={setIdDocUrl} />
        <UploadTile label="Proof of registration"  accent="cyan"  hint="Letter or printout from your university · max 5 MB"
          value={regProofUrl}     onChange={setRegProofUrl} />
        <UploadTile label="Proof of funding"       accent="amber" hint="NSFAS letter, bank statement, or sponsor letter · max 5 MB"
          value={fundingProofUrl} onChange={setFundingProofUrl} />
      </div>

      {/* Signature */}
      <div>
        <label className="field-label">
          Signature <span style={{ color: 'var(--rose)' }}>*</span>
        </label>
        <SignaturePad value={signatureUrl} onChange={setSignatureUrl} />
        <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 6 }}>
          By signing you confirm that the documents above are genuine and belong to you.
        </p>
      </div>

      {/* Terms checkbox */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={e => setAgreeTerms(e.target.checked)}
          style={{ marginTop: 3, accentColor: 'var(--cyan)' }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
          I confirm that all information and documents are accurate. I understand that submitting false
          information may result in the rejection of my application.
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={!allReady || submit.isPending}
        className="btn-primary press-soft"
        style={{ width: '100%', padding: '12px 0', fontSize: 14, justifyContent: 'center' }}
      >
        {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {submit.isPending ? 'Submitting…' : (wasRejected ? 'Re-submit application' : 'Submit application')}
      </button>
    </form>
  );
}
