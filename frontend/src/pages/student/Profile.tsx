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

  return (
    <div className="space-y-5 appear max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-white/40 mt-0.5">Your personal details and bio</p>
      </div>

      {/* Avatar section */}
      <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-5">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-rh-cyan/20 flex items-center justify-center text-rh-cyan font-bold text-2xl overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : user?.name?.slice(0,2).toUpperCase()
              }
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-rh-cyan flex items-center justify-center text-rh-bg hover:bg-rh-cyan/80 transition-colors">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </button>
          </div>
          <div>
            <p className="text-base font-semibold text-white">{user?.name}</p>
            <p className="text-sm text-white/40 font-mono">{user?.email}</p>
            <span className={`mt-1.5 inline-flex text-[11px] font-mono px-2 py-0.5 rounded-full ${
              user?.role === 'ADMIN'
                ? 'bg-rh-rose/15 text-rh-rose'
                : user?.role === 'ACTIVE_STUDENT'
                  ? 'bg-rh-cyan/15 text-rh-cyan'
                  : 'bg-yellow-500/15 text-yellow-400'
            }`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit(d => save(d))} className="bg-rh-bg2 border border-white/7 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Personal Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || !isDirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-rh-cyan text-rh-bg text-sm font-semibold rounded-lg hover:bg-rh-cyan/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span className="text-xs text-green-400 font-mono">✓ Saved!</span>}
        </div>
      </form>

      {/* Room info (read-only) */}
      {user?.allocation && (
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Room Information</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoTile label="Room" value={`Room ${user.allocation.room.number}`} />
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
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-rh-bg3 rounded-lg px-3 py-2.5">
      <p className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white font-medium mt-0.5">{value}</p>
    </div>
  );
}
