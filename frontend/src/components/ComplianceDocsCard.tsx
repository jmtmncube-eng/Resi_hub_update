import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Camera, ImagePlus, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import {
  getMyApplicationDocs, uploadApplicationDoc,
  ApplicationDocType,
} from '../services/application.service';

const DOC_LABELS: Record<ApplicationDocType, { label: string; hint: string }> = {
  ID_DOC:             { label: 'ID document',           hint: 'Front of your SA ID / passport' },
  PROOF_REGISTRATION: { label: 'Proof of registration', hint: 'University registration letter' },
  PROOF_FUNDING:      { label: 'Proof of funding',      hint: 'NSFAS, bank statement, sponsor letter' },
  SIGNATURE:          { label: 'Signature on file',     hint: 'Signed during onboarding' },
};

const DOC_ORDER: ApplicationDocType[] = ['ID_DOC', 'PROOF_REGISTRATION', 'PROOF_FUNDING', 'SIGNATURE'];

/**
 * Compliance docs card — lives on the Profile page.
 * Shows the 4 application/compliance documents the resident should have
 * on file. Active students who never submitted (or whose docs went stale)
 * can append/replace them right here, no need to redo the full app form.
 */
export default function ComplianceDocsCard() {
  const qc = useQueryClient();

  const { data: docs, isLoading } = useQuery({
    queryKey: ['my-application-docs'],
    queryFn:  getMyApplicationDocs,
  });

  const upload = useMutation({
    mutationFn: ({ type, fileUrl }: { type: ApplicationDocType; fileUrl: string }) =>
      uploadApplicationDoc(type, fileUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-application-docs'] });
      toast.success('Document uploaded');
    },
    onError: (err: unknown) => {
      const msg = err instanceof AxiosError ? err.response?.data?.error : null;
      toast.error(msg ?? 'Failed to upload document');
    },
  });

  const missing = docs ? DOC_ORDER.filter(t => !docs[t]).length : 0;

  return (
    <div className="card-sm" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: missing === 0 ? 'rgba(74,222,128,.12)' : 'rgba(245,158,11,.12)',
          border: `1px solid ${missing === 0 ? 'rgba(74,222,128,.3)' : 'rgba(245,158,11,.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={18} style={{ color: missing === 0 ? '#4ade80' : '#f59e0b' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Compliance documents</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {isLoading
              ? 'Loading…'
              : missing === 0
                ? 'All 4 documents on file'
                : `${missing} missing — admin may ask for these at any time`}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {DOC_ORDER.map(type => {
          const doc = docs?.[type] ?? null;
          const meta = DOC_LABELS[type];
          return (
            <DocSlot
              key={type}
              type={type}
              label={meta.label}
              hint={meta.hint}
              fileUrl={doc?.fileUrl ?? null}
              uploadedAt={doc?.createdAt ?? null}
              uploading={upload.isPending && upload.variables?.type === type}
              onUpload={(fileUrl) => upload.mutate({ type, fileUrl })}
            />
          );
        })}
      </div>
    </div>
  );
}

function DocSlot({ type, label, hint, fileUrl, uploadedAt, uploading, onUpload }: {
  type:       ApplicationDocType;
  label:      string;
  hint:       string;
  fileUrl:    string | null;
  uploadedAt: string | null;
  uploading:  boolean;
  onUpload:   (dataUrl: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const ALLOWED = type === 'SIGNATURE'
    ? ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    : ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error(`${label} is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      e.target.value = '';
      return;
    }
    // Guard the MIME up front so the user gets instant feedback instead
    // of a round-trip rejection from the server.
    if (f.type && !ALLOWED.includes(f.type)) {
      toast.error(
        type === 'SIGNATURE'
          ? 'Signature must be an image (PNG, JPG, WEBP, GIF).'
          : 'Upload a PDF or image (PNG, JPG, WEBP, GIF).',
      );
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error(`Couldn't read ${label} — try another file.`);
    reader.onload  = re => {
      const result = re.target?.result;
      if (typeof result === 'string' && result.startsWith('data:')) {
        onUpload(result);
      } else {
        toast.error(`Couldn't read ${label} — try another file.`);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  }

  const present = !!fileUrl;
  const isPdf   = !!fileUrl && fileUrl.startsWith('data:application/pdf');
  const accept  = type === 'SIGNATURE' ? 'image/*' : 'image/*,application/pdf';

  return (
    <div style={{
      borderRadius: 10, padding: '12px 14px',
      background: present ? 'rgba(74,222,128,.04)' : 'rgba(245,158,11,.04)',
      border: `1px solid ${present ? 'rgba(74,222,128,.18)' : 'rgba(245,158,11,.2)'}`,
    }}>
      <input ref={cameraRef} type="file" accept={accept} capture="environment" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={fileRef}   type="file" accept={accept}                       onChange={handleFile} style={{ display: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {present
          ? <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
          : <AlertCircle  size={14} style={{ color: '#f59e0b' }} />}
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{label}</p>
        {present && (
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700,
            padding: '1px 6px', borderRadius: 4,
            background: isPdf ? 'rgba(232,25,122,.12)' : 'rgba(0,204,204,.12)',
            color:      isPdf ? 'var(--rose)' : 'var(--cyan)',
            letterSpacing: '.05em',
          }}>
            {isPdf ? 'PDF' : 'IMG'}
          </span>
        )}
        {present && fileUrl && (
          <a href={fileUrl} target="_blank" rel="noreferrer" title="Open file in a new tab"
             style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10 }}>
        {present
          ? `${isPdf ? 'PDF' : 'Image'} on file · uploaded ${uploadedAt ? new Date(uploadedAt).toLocaleDateString() : '—'}`
          : hint}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={() => cameraRef.current?.click()} disabled={uploading} className="press-soft"
          style={{
            padding: '7px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: 'rgba(232,25,122,.08)', color: 'var(--rose)',
            border: '1px solid rgba(232,25,122,.25)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
          Photo
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="press-soft"
          style={{
            padding: '7px 8px', borderRadius: 7, fontSize: 11, fontWeight: 600,
            background: 'var(--bg3)', color: 'var(--text2)',
            border: '1px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
          Upload
        </button>
      </div>

      {present && (
        <p style={{ fontSize: 10, color: 'var(--text4)', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          Re-uploading replaces the existing file.
        </p>
      )}
    </div>
  );
}
