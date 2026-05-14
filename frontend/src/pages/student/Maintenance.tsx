import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wrench, X, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMyTickets, createTicket } from '../../services/maintenance.service';
import { TicketStatus, TicketPriority } from '../../types/domain.types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';

/** Open = needs work (OPEN, IN_PROGRESS). Closed = done (RESOLVED, CLOSED). */
const OPEN_STATUSES   = ['OPEN', 'IN_PROGRESS'];
type ListFilter = 'open' | 'closed';

const CATEGORIES = ['WiFi / Internet','Plumbing','Electrical','Furniture','Appliance','Structural','Pest Control','Cleaning','Security','Other'];

const formSchema = z.object({
  category:    z.string().min(1),
  location:    z.string().min(2, 'Location is required'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority:    z.enum(['LOW','NORMAL','HIGH','EMERGENCY']),
});
type FormData = z.infer<typeof formSchema>;

const STATUS_STYLE: Record<TicketStatus, { badge: string; bg: string; text: string }> = {
  OPEN:        { badge: 'badge-rose',  bg: 'rgba(232,25,122,.1)',   text: '#E8197A' },
  IN_PROGRESS: { badge: 'badge-cyan',  bg: 'rgba(0,204,204,.1)',    text: '#00CCCC' },
  RESOLVED:    { badge: 'badge-cyan',  bg: 'rgba(0,204,204,.08)',   text: '#00CCCC' },
  CLOSED:      { badge: 'badge-gray',  bg: 'rgba(128,128,128,.08)', text: 'rgba(128,128,128,.8)' },
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  LOW:       'var(--text3)',
  NORMAL:    'var(--cyan)',
  HIGH:      '#fb923c',
  EMERGENCY: '#f87171',
};

export default function Maintenance() {
  usePageTitle('Maintenance');
  const [tab,   setTab]   = useState<'list'|'report'>('list');
  const [files, setFiles] = useState<File[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>('open');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn:  getMyTickets,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: 'WiFi / Internet', priority: 'NORMAL' },
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: (fd: FormData) => {
      const form = new FormData();
      Object.entries(fd).forEach(([k, v]) => form.append(k, v));
      files.forEach(f => form.append('media', f));
      return createTicket(form);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      reset();
      setFiles([]);
      setTab('list');
      toast.success('Maintenance request submitted!');
    },
    onError: () => toast.error('Failed to submit request. Please try again.'),
  });

  return (
    <div className="space-y-5 appear">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-sub">Report and track issues in your room</p>
        </div>
        <button
          onClick={() => setTab(tab === 'report' ? 'list' : 'report')}
          className={tab === 'report' ? 'btn-ghost' : 'btn-primary'}
          style={{ flexShrink: 0, padding: '9px 16px', fontSize: 13 }}
        >
          {tab === 'report' ? <X size={14} /> : <Plus size={14} />}
          {tab === 'report' ? 'Cancel' : 'Report Issue'}
        </button>
      </div>

      {/* Report form */}
      {tab === 'report' && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)', marginBottom: 20 }}>
            New Maintenance Request
          </h2>
          <form onSubmit={handleSubmit(d => submit(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" error={errors.category?.message}>
                <select {...register('category')} className="input-base">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Priority" error={errors.priority?.message}>
                <select {...register('priority')} className="input-base">
                  {(['LOW','NORMAL','HIGH','EMERGENCY'] as const).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Location" error={errors.location?.message}>
              <input {...register('location')} placeholder="e.g. Room 204 bathroom" className="input-base" />
            </Field>

            <Field label="Description" error={errors.description?.message}>
              <textarea {...register('description')} rows={4} placeholder="Describe the issue in detail…" className="input-base" />
            </Field>

            {/* Media upload */}
            <div>
              <label className="field-label" style={{ marginBottom: 8 }}>Photos / Videos (optional)</label>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 14px', background: 'var(--hover)', border: '1px solid var(--border2)',
                borderRadius: 8, fontSize: 13, color: 'var(--text2)', transition: 'all .18s',
              }}>
                <ImagePlus size={14} />
                Add media
                <input type="file" multiple accept="image/*,video/*" style={{ display: 'none' }}
                  onChange={e => setFiles(Array.from(e.target.files ?? []))} />
              </label>
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {files.map((f, i) => (
                    <span key={i} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, background: 'var(--bg3)', padding: '3px 8px', borderRadius: 4, color: 'var(--text2)' }}>
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>
                {isPending && <Loader2 size={13} className="animate-spin" />}
                {isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket list */}
      {tab === 'list' && (() => {
        const openTickets   = tickets.filter(t => OPEN_STATUSES.includes(t.status));
        const closedTickets = tickets.filter(t => !OPEN_STATUSES.includes(t.status));
        const shown = listFilter === 'open' ? openTickets : closedTickets;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Open / Closed tabs */}
            <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2, alignSelf: 'flex-start' }}>
              {([
                { key: 'open'   as ListFilter, label: 'Open',   count: openTickets.length },
                { key: 'closed' as ListFilter, label: 'Closed', count: closedTickets.length },
              ]).map(({ key, label, count }) => (
                <button key={key} onClick={() => setListFilter(key)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 7, fontSize: 13,
                  fontWeight: listFilter === key ? 600 : 400,
                  background: listFilter === key ? 'var(--bg2)' : 'transparent',
                  color:      listFilter === key ? 'var(--text)' : 'var(--text3)',
                  border: 'none', cursor: 'pointer', transition: 'all .18s',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {label}
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: '1px 6px', borderRadius: 999,
                    background: listFilter === key ? 'rgba(0,204,204,.15)' : 'var(--bg2)',
                    color: listFilter === key ? 'var(--cyan)' : 'var(--text4)',
                  }}>{count}</span>
                </button>
              ))}
            </div>

            {isLoading
              ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 10 }} />)
              : tickets.length === 0
                ? <EmptyTickets onReport={() => setTab('report')} />
                : shown.length === 0
                  ? (
                    <div className="card empty-state">
                      <Wrench size={26} style={{ color: 'var(--text4)', margin: '0 auto 10px' }} />
                      <p style={{ fontWeight: 600, color: 'var(--text2)' }}>
                        No {listFilter} tickets
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {listFilter === 'open' ? 'Everything is resolved — nice.' : 'Nothing has been closed out yet.'}
                      </p>
                    </div>
                  )
                  : shown.map(t => {
                      const s = STATUS_STYLE[t.status];
                      return (
                        <div key={t.id} className="card-sm" style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,204,204,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', flexShrink: 0 }}>
                                <Wrench size={16} />
                              </div>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.category}</p>
                                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t.location}</p>
                              </div>
                            </div>
                            {/* Prefixed with "Ticket status:" so it reads as a
                                state label, not a clickable button. */}
                            <span className={`badge ${s.badge}`} style={{ flexShrink: 0, textTransform: 'none' }}>
                              Ticket status: {t.status.replace('_',' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                            </span>
                          </div>

                          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 12, lineHeight: 1.6 }}>{t.description}</p>

                          {/* Attached photos — click to open full-size */}
                          {t.mediaUrls && t.mediaUrls.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                              {t.mediaUrls.map((url, i) => (
                                <button
                                  key={i}
                                  onClick={() => setPhotoPreview(url)}
                                  style={{
                                    width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
                                    border: '1px solid var(--border)', cursor: 'pointer', padding: 0,
                                    background: 'var(--bg3)',
                                  }}
                                  title="Open photo"
                                >
                                  <img src={url} alt={`Attachment ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </button>
                              ))}
                            </div>
                          )}

                          {t.adminNote && (
                            <div style={{ marginTop: 10, background: 'rgba(0,204,204,.06)', border: '1px solid rgba(0,204,204,.15)', borderRadius: 8, padding: '8px 12px' }}>
                              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Admin note</p>
                              <p style={{ fontSize: 12, color: 'var(--text2)' }}>{t.adminNote}</p>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PRIORITY_COLOR[t.priority], fontWeight: 500 }}>
                              {t.priority} priority
                            </span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                              {format(new Date(t.createdAt), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                      );
                    })
            }
          </div>
        );
      })()}

      {/* Full-size photo viewer */}
      <Modal open={!!photoPreview} onClose={() => setPhotoPreview(null)} maxWidth={680}>
        {photoPreview && (
          <img src={photoPreview} alt="Attachment" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        )}
      </Modal>
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

function EmptyTickets({ onReport }: { onReport: () => void }) {
  return (
    <div className="card empty-state">
      <Wrench size={28} style={{ color: 'var(--text4)', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 600, color: 'var(--text2)' }}>No maintenance requests yet</p>
      <p>Everything working well? Report an issue if not.</p>
      <button onClick={onReport} className="btn-primary" style={{ marginTop: 16, fontSize: 13, padding: '9px 18px' }}>
        Report an issue
      </button>
    </div>
  );
}
