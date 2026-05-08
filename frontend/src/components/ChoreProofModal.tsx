import { X, Upload, Loader2, Camera, ImagePlus, AlertCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Chore } from '../types/domain.types';
import { completeChore } from '../services/chore.service';
import { Modal } from './Modal';

interface Props {
  chore: Chore | null;
  onClose: () => void;
}

export default function ChoreProofModal({ chore, onClose }: Props) {
  const qc = useQueryClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note,    setNote]    = useState('');

  const submit = useMutation({
    mutationFn: ({ proofUrl, note }: { proofUrl: string; note: string }) =>
      completeChore(chore!.id, proofUrl, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chores'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Proof submitted — admin will review within 24h ✓');
      setPreview(null); setNote('');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to submit proof.');
    },
  });

  if (!chore) return null;

  function takePhoto() {
    cameraInputRef.current?.click();
  }
  function pickFile() {
    fileInputRef.current?.click();
  }
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = re => setPreview(re.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function handleSubmit() {
    if (!preview) {
      toast.error('Please add a photo of the completed work');
      return;
    }
    submit.mutate({ proofUrl: preview, note });
  }

  return (
    <Modal open={true} onClose={onClose} maxWidth={480}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, background: 'transparent',
          border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4,
        }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>{chore.icon}</span>
          <div>
            <h2 className="modal-title">{chore.name}</h2>
            <p className="modal-sub" style={{ marginBottom: 0 }}>Submit photo proof for admin review</p>
          </div>
        </div>

        <hr className="divider" />

        {/* Info banner */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.18)',
          marginBottom: 18,
        }}>
          <AlertCircle size={14} style={{ color: 'var(--cyan)', marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>
            Your <strong style={{ color: 'var(--text)' }}>+20 🪙</strong> reward unlocks once an admin approves your proof — usually within <strong style={{ color: 'var(--text)' }}>24 hours</strong>.
          </p>
        </div>

        {/* Photo pickers — separate inputs so camera vs gallery are explicit on mobile */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileSelected} style={{ display: 'none' }} />
        <input ref={fileInputRef}   type="file" accept="image/*"                       onChange={onFileSelected} style={{ display: 'none' }} />

        {!preview ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={takePhoto} type="button" style={{
              padding: '24px 12px', borderRadius: 12,
              background: 'rgba(232,25,122,.06)',
              border: '1.5px dashed rgba(232,25,122,.45)',
              color: 'var(--text)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.background = 'rgba(232,25,122,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(232,25,122,.45)'; e.currentTarget.style.background = 'rgba(232,25,122,.06)'; }}>
              <Camera size={24} style={{ color: 'var(--rose)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Take photo</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>On-site capture</span>
            </button>

            <button onClick={pickFile} type="button" style={{
              padding: '24px 12px', borderRadius: 12,
              background: 'rgba(0,204,204,.06)',
              border: '1.5px dashed rgba(0,204,204,.4)',
              color: 'var(--text)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'rgba(0,204,204,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,204,204,.4)';  e.currentTarget.style.background = 'rgba(0,204,204,.06)'; }}>
              <ImagePlus size={24} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Upload</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>From gallery · max 5 MB</span>
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border2)' }}>
            <img src={preview} alt="Proof preview" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
            <button onClick={() => setPreview(null)} type="button" style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff',
              padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              Replace
            </button>
          </div>
        )}

        {/* Optional note */}
        <div style={{ marginTop: 16 }}>
          <label className="field-label">Note to admin (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Anything the reviewer should know…"
            rows={2}
            className="input-base"
            style={{ resize: 'vertical', minHeight: 56, fontFamily: "'Space Grotesk', sans-serif" }}
          />
        </div>

        {/* Actions — stack on phones, row on desktop */}
        <div className="chore-proof-actions" style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} type="button" className="btn-ghost">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!preview || submit.isPending}
            className="btn-rose"
            style={{ minWidth: 150, justifyContent: 'center' }}
          >
            {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {submit.isPending ? 'Submitting…' : 'Submit proof'}
          </button>
        </div>
    </Modal>
  );
}
