import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, updateSettings, ResidenceSettings } from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

const BLANK: Partial<ResidenceSettings> = {
  name: '', tagline: '', address: '', phone: '', email: '', description: '',
};

export default function AdminSettings() {
  usePageTitle('Residence Settings');
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<ResidenceSettings>>(BLANK);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  getSettings,
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => updateSettings({
      name:        form.name,
      tagline:     form.tagline || undefined,
      address:     form.address || undefined,
      phone:       form.phone   || undefined,
      email:       form.email   || undefined,
      description: form.description || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Residence settings saved!');
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const field = (key: keyof ResidenceSettings) => ({
    value:    (form[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
    </div>
  );

  return (
    <div className="space-y-6 appear" style={{ maxWidth: 680 }}>
      <div>
        <h1 className="page-title">Residence Settings</h1>
        <p className="page-sub">Customise your residence name and contact info visible to students</p>
      </div>

      {/* Preview badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(135deg, rgba(0,204,204,.08) 0%, var(--bg3) 100%)',
        border: '1px solid rgba(0,204,204,.2)', borderRadius: 14, padding: '16px 20px',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(0,204,204,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={22} color="var(--cyan)" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{form.name || 'ResiHub Student Residence'}</p>
          {form.tagline && <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{form.tagline}</p>}
          {form.address && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{form.address}</p>}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Basic Information</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="field-label">Residence Name *</label>
            <input type="text" className="input-base" placeholder="e.g. Sunview Student Residence" {...field('name')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="field-label">Tagline / Subtitle</label>
            <input type="text" className="input-base" placeholder="e.g. Premium student living since 2010" {...field('tagline')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="field-label">Physical Address</label>
            <input type="text" className="input-base" placeholder="123 University Road, Sandton, GP" {...field('address')} />
          </div>
          <div>
            <label className="field-label">Phone Number</label>
            <input type="tel" className="input-base" placeholder="+27 11 000 0000" {...field('phone')} />
          </div>
          <div>
            <label className="field-label">Contact Email</label>
            <input type="email" className="input-base" placeholder="admin@yourresidence.co.za" {...field('email')} />
          </div>
        </div>

        <div>
          <label className="field-label">Description / Welcome Message</label>
          <textarea
            className="input-base"
            rows={4}
            placeholder="Describe your residence — facilities, rules summary, welcome note…"
            style={{ resize: 'vertical' }}
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name?.trim()}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: 13 }}
          >
            {save.isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  );
}
