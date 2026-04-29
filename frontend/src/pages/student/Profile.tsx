import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Camera, Loader2, Save } from 'lucide-react';
import { updateProfile, uploadAvatar } from '../../services/profile.service';
import { useAuth } from '../../contexts/AuthContext';

const formSchema = z.object({
  name:       z.string().min(2).optional().or(z.literal('')),
  phone:      z.string().optional(),
  bio:        z.string().max(300).optional(),
  university: z.string().optional(),
  program:    z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

export default function Profile() {
  const { user }    = useAuth();
  const [saved, setSaved] = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    defaultValues: {
      name:       user?.name       ?? '',
      phone:      user?.phone      ?? '',
      bio:        user?.bio        ?? '',
      university: user?.university ?? '',
      program:    user?.program    ?? '',
    },
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  const { mutate: uploadAv, isPending: uploading } = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
  });

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAv(file);
  }

  const roleLabel = isAdmin ? 'Admin' : user?.role === 'ACTIVE_STUDENT' ? 'Resident' : 'Applicant';

  return (
    <div className="space-y-5 appear" style={{ maxWidth: 680 }}>
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">Your personal details and bio</p>
      </div>

      {/* Avatar section */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <div className={`avatar ${isAdmin ? 'avatar-rose' : 'avatar-cyan'}`} style={{ width: 72, height: 72, fontSize: 22, fontWeight: 700 }}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.name?.slice(0,2).toUpperCase()
              }
            </div>
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%',
              background: 'var(--cyan)', color: '#0f0f12', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            </button>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{user?.name}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{user?.email}</p>
            <span className={`badge ${isAdmin ? 'badge-rose' : 'badge-cyan'}`}>{roleLabel}</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit(d => save(d))} className="card" style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Personal Details</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          <Field label="Full Name" error={errors.name?.message}>
            <input {...register('name')} className="input-base" />
          </Field>
          <Field label="Phone Number">
            <input {...register('phone')} placeholder="+27 ..." className="input-base" />
          </Field>
          <Field label="University">
            <input {...register('university')} className="input-base" />
          </Field>
          <Field label="Programme / Degree">
            <input {...register('program')} className="input-base" />
          </Field>
        </div>

        <Field label="Bio (max 300 characters)" error={errors.bio?.message}>
          <textarea {...register('bio')} rows={3} placeholder="Tell your housemates a bit about yourself…" className="input-base" />
        </Field>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button type="submit" disabled={saving || !isDirty} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#4ade80' }}>✓ Saved!</span>}
        </div>
      </form>

      {/* Room info (read-only) */}
      {user?.allocation && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Room Information</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoTile label="Room"   value={`Room ${user.allocation.room.number}`} />
            <InfoTile label="Block"  value={user.allocation.room.block} />
            <InfoTile label="Type"   value={user.allocation.room.type} />
            <InfoTile label="Rent"   value={`R${Number(user.allocation.rent).toLocaleString()}/mo`} />
            <InfoTile label="Status" value={user.allocation.status} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>{error}</p>}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
      <p className="micro-label" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</p>
    </div>
  );
}
