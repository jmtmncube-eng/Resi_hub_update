import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wrench, X, ImagePlus, Loader2 } from 'lucide-react';
import { getMyTickets, createTicket } from '../../services/maintenance.service';
import { TicketStatus, TicketPriority } from '../../types/domain.types';
import { format } from 'date-fns';

const CATEGORIES = ['WiFi / Internet','Plumbing','Electrical','Furniture','Appliance','Structural','Pest Control','Cleaning','Security','Other'];

const formSchema = z.object({
  category:    z.string().min(1),
  location:    z.string().min(2, 'Location is required'),
  description: z.string().min(10, 'Please describe the issue in more detail'),
  priority:    z.enum(['LOW','NORMAL','HIGH','EMERGENCY']),
});
type FormData = z.infer<typeof formSchema>;

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN:        'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  RESOLVED:    'bg-green-500/15 text-green-400 border-green-500/20',
  CLOSED:      'bg-white/5 text-white/40 border-white/10',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  LOW:       'text-white/40',
  NORMAL:    'text-rh-cyan',
  HIGH:      'text-orange-400',
  EMERGENCY: 'text-red-400',
};

export default function Maintenance() {
  const [tab,      setTab]      = useState<'list'|'report'>('list');
  const [files,    setFiles]    = useState<File[]>([]);
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
    },
  });

  return (
    <div className="space-y-5 appear">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Maintenance</h1>
          <p className="text-sm text-white/40 mt-0.5">Report and track issues in your room</p>
        </div>
        <button
          onClick={() => setTab(tab === 'report' ? 'list' : 'report')}
          className="flex items-center gap-2 px-4 py-2 bg-rh-cyan text-rh-bg text-sm font-semibold rounded-lg hover:bg-rh-cyan/90 transition-colors"
        >
          {tab === 'report' ? <X size={15} /> : <Plus size={15} />}
          {tab === 'report' ? 'Cancel' : 'Report Issue'}
        </button>
      </div>

      {/* Report form */}
      {tab === 'report' && (
        <div className="bg-rh-bg2 border border-white/7 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">New Maintenance Request</h2>
          <form onSubmit={handleSubmit(d => submit(d))} className="space-y-4">
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
              <textarea {...register('description')} rows={4} placeholder="Describe the issue in detail..." className="input-base" />
            </Field>

            {/* Media upload */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Photos / Videos (optional)</label>
              <label className="flex items-center gap-2 w-fit cursor-pointer px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg text-sm text-white/60 transition-colors">
                <ImagePlus size={15} />
                Add media
                <input type="file" multiple accept="image/*,video/*" className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files ?? []))} />
              </label>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-white/50">{f.name}</span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-rh-cyan text-rh-bg text-sm font-semibold rounded-lg hover:bg-rh-cyan/90 disabled:opacity-60 transition-colors">
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {/* Ticket list */}
      {tab === 'list' && (
        <div className="space-y-3">
          {isLoading
            ? [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-rh-bg2 rounded-xl animate-pulse" />)
            : tickets.length === 0
              ? <EmptyTickets onReport={() => setTab('report')} />
              : tickets.map(t => (
                  <div key={t.id} className="bg-rh-bg2 border border-white/7 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-rh-cyan/10 flex items-center justify-center text-rh-cyan flex-shrink-0">
                          <Wrench size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{t.category}</p>
                          <p className="text-xs text-white/40">{t.location}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLE[t.status]}`}>
                        {t.status.replace('_',' ')}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-3 leading-relaxed">{t.description}</p>
                    {t.adminNote && (
                      <div className="mt-3 bg-rh-cyan/8 border border-rh-cyan/15 rounded-lg px-3 py-2">
                        <p className="text-xs text-rh-cyan/80 font-medium mb-0.5">Admin note</p>
                        <p className="text-xs text-white/60">{t.adminNote}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-xs font-mono font-medium ${PRIORITY_COLOR[t.priority]}`}>
                        {t.priority} priority
                      </span>
                      <span className="text-xs text-white/25 font-mono">
                        {format(new Date(t.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                ))
          }
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function EmptyTickets({ onReport }: { onReport: () => void }) {
  return (
    <div className="bg-rh-bg2 border border-white/7 rounded-2xl py-12 text-center">
      <Wrench size={28} className="text-white/20 mx-auto mb-3" />
      <p className="text-white/50 font-medium">No maintenance requests yet</p>
      <p className="text-white/25 text-sm mt-1">Everything working well? Report an issue if not.</p>
      <button onClick={onReport}
        className="mt-4 px-4 py-2 bg-rh-cyan/10 text-rh-cyan text-sm font-medium rounded-lg hover:bg-rh-cyan/15 transition-colors">
        Report an issue
      </button>
    </div>
  );
}
