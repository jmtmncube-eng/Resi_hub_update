import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Camera, Loader2, Save, User as UserIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile, uploadAvatar } from '../../services/profile.service';
import { useAuth } from '../../contexts/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import ComplianceDocsCard from '../../components/ComplianceDocsCard';
import LeaseDocsCard from '../../components/LeaseDocsCard';
import MyLeaseCard from '../../components/MyLeaseCard';
import { getMyApplicationDocs } from '../../services/application.service';

const ACCEPTED_AVATAR = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function extractApiError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  return fallback;
}

const formSchema = z.object({
  name:       z.string().min(2).optional().or(z.literal('')),
  phone:      z.string().optional(),
  bio:        z.string().max(300).optional(),
  university: z.string().optional(),
  program:    z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

export default function Profile() {
  usePageTitle('Profile');
  const { user, updateUser } = useAuth();
  const fileRef              = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Role gates — the page is shared across every role, but only students
  // get the lease + compliance + room cards and the university/programme
  // fields. Staff roles see identity + personal details only.
  const role      = user?.role;
  const isStudent = role === 'ACTIVE_STUDENT' || role === 'PENDING_STUDENT';
  const isStaff   = role === 'ADMIN' || role === 'MANAGER' || role === 'MAINTENANCE';

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
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success('Profile saved');
    },
    onError: (err) => toast.error(extractApiError(err, 'Failed to save profile')),
  });

  const { mutate: uploadAv, isPending: uploading } = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess:  (updated) => {
      // Push the new avatarUrl into the auth context so the sidebar + profile tile
      // both refresh immediately without a hard reload.
      updateUser({ avatarUrl: updated.avatarUrl });
      setPreview(null);
      toast.success('Profile picture updated');
    },
    onError: (err) => {
      setPreview(null);
      toast.error(extractApiError(err, 'Failed to upload profile picture'));
    },
  });

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Always reset the input so re-selecting the same file fires onChange again
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_AVATAR.includes(file.type)) {
      toast.error('Please choose a PNG, JPG, WEBP or GIF image');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
      return;
    }

    // Local optimistic preview while the upload is in flight
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);

    uploadAv(file);
  }

  const roleLabel =
    role === 'ADMIN'           ? 'Admin'       :
    role === 'MANAGER'         ? 'Manager'     :
    role === 'MAINTENANCE'     ? 'Maintenance' :
    role === 'ACTIVE_STUDENT'  ? 'Resident'    :
                                 'Applicant';

  // Tab state — students only. Defaults to 'personal'; sticky in localStorage
  // so the page reopens on whichever tab the user last used.
  const [tab, setTab] = useState<'personal' | 'documents'>(() => {
    try {
      const v = localStorage.getItem('profile-tab');
      return v === 'documents' ? 'documents' : 'personal';
    } catch { return 'personal'; }
  });
  function selectTab(t: 'personal' | 'documents') {
    setTab(t);
    try { localStorage.setItem('profile-tab', t); } catch { /* ignore */ }
  }

  // Counter on the Documents tab — mirrors the sidebar Profile badge:
  // compliance docs that are Missing OR Rejected (i.e. need the student
  // to upload). Submitted + Approved are not counted.
  const { data: myDocsByType } = useQuery({
    queryKey: ['my-application-docs'],
    queryFn:  getMyApplicationDocs,
    enabled:  isStudent,
  });
  const docsTabBadge = myDocsByType
    ? (Object.keys(myDocsByType) as Array<keyof typeof myDocsByType>).filter(t => {
        const d = myDocsByType[t];
        return !d || d.status === 'Rejected';
      }).length
    : 0;

  return (
    <div className="space-y-5 appear" style={{ maxWidth: 680 }}>
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-sub">
          {isStudent
            ? 'Your personal details, bio and compliance documents'
            : 'Your personal details and profile picture'}
        </p>
      </div>

      {/* Avatar section — always first, identity at the top of the page */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <div className={`avatar ${isStaff ? 'avatar-rose' : 'avatar-cyan'}`} style={{ width: 72, height: 72, fontSize: 22, fontWeight: 700, overflow: 'hidden', position: 'relative' }}>
              {preview || user?.avatarUrl
                ? <img src={preview ?? user!.avatarUrl!} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.name?.slice(0,2).toUpperCase()
              }
              {uploading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              style={{
                position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--cyan)', color: '#0f0f12', border: '2px solid var(--bg2)', cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Camera size={11} />
            </button>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{user?.name}</p>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{user?.email}</p>
            <span className={`badge ${isStaff ? 'badge-rose' : 'badge-cyan'}`}>{roleLabel}</span>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_AVATAR.join(',')}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <p style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
          PNG / JPG / WEBP / GIF · max 5MB
        </p>
      </div>

      {/* Tabs — students only. Staff have nothing to put on a Documents
          tab (no lease, no compliance), so we render their slim form
          inline below instead. */}
      {isStudent && (
        <div role="tablist" style={{
          display: 'flex', gap: 2, borderBottom: '1px solid var(--border)',
        }}>
          <ProfileTab label="Personal"  icon={UserIcon} active={tab === 'personal'}  onClick={() => selectTab('personal')} />
          <ProfileTab label="Documents" icon={FileText} active={tab === 'documents'} onClick={() => selectTab('documents')} badge={docsTabBadge} />
        </div>
      )}

      {/* PERSONAL — personal details form + room info. Staff render this
          block directly (no tab chrome) since their page is short. */}
      {(!isStudent || tab === 'personal') && (
        <>
          <form onSubmit={handleSubmit(d => save(d))} className="card" style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Personal Details</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
              <Field label="Full Name" error={errors.name?.message}>
                <input {...register('name')} className="input-base" />
              </Field>
              <Field label="Phone Number">
                <input {...register('phone')} placeholder="+27 ..." className="input-base" />
              </Field>
              {/* University + programme are student-only — staff roles don't have
                  an academic record so we hide the fields entirely. */}
              {isStudent && (
                <>
                  <Field label="University">
                    <input {...register('university')} className="input-base" />
                  </Field>
                  <Field label="Programme / Degree">
                    <input {...register('program')} className="input-base" />
                  </Field>
                </>
              )}
            </div>

            <Field label="Bio (max 300 characters)" error={errors.bio?.message}>
              <textarea {...register('bio')} rows={3} placeholder="Tell your housemates a bit about yourself…" className="input-base" />
            </Field>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <button type="submit" disabled={saving || !isDirty} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Room info (read-only) — students only; staff don't have allocations */}
          {isStudent && user?.allocation && (
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
        </>
      )}

      {/* DOCUMENTS — lease + lease docs + compliance docs. Students only. */}
      {isStudent && tab === 'documents' && (
        <>
          <MyLeaseCard />
          <LeaseDocsCard />
          <ComplianceDocsCard />
        </>
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

// Profile tab — same shape as the residence tabs on the Accounts page.
// Optional rose badge for action counts (Documents tab uses it for the
// compliance-docs-needing-action count, matching the sidebar Profile
// badge). Hidden when the count is zero so the tab reads clean.
function ProfileTab({
  label, icon: Icon, active, onClick, badge,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="press-soft"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 0, border: 'none',
        background: 'transparent',
        color:      active ? 'var(--text)' : 'var(--text3)',
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap',
        borderBottom: active ? '2px solid var(--cyan)' : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      <Icon size={14} />
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 18, height: 18, padding: '0 6px',
          borderRadius: 999, fontSize: 10, fontWeight: 700,
          background: 'var(--rose)', color: '#fff',
          fontFamily: "'IBM Plex Mono', monospace",
          lineHeight: 1,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
