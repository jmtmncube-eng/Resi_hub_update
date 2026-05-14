import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Save, Loader2, Settings2, LayoutGrid,
  DoorOpen, RefreshCw, ChevronUp, Plus, Minus, UserPlus, UserMinus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSettings, updateSettings, getOccupancy,
  setupRooms, setupRoomsMixed, ResidenceSettings,
  AdminRoom, getAccounts, createAllocation, removeAllocation, moveAllocation,
  deleteRoom, createRoom,
} from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useResidence } from '../../contexts/ResidenceContext';
import { useConfirm } from '../../components/useConfirm';
import { Modal } from '../../components/Modal';
import { UserMinus as UserMinusIcon } from 'lucide-react';

// ── Room type config ──────────────────────────────────────────
const SHARING_OPTIONS = [
  { value: 'SINGLE', label: 'Single',  sub: '1 per room',  color: '#60a5fa' },
  { value: 'DOUBLE', label: 'Double',  sub: '2 sharing',   color: '#4ade80' },
  { value: 'TRIPLE', label: 'Triple',  sub: '3 sharing',   color: '#fb923c' },
  { value: 'QUAD',   label: 'Quad',    sub: '4 sharing',   color: '#c084fc' },
] as const;

type SharingType = typeof SHARING_OPTIONS[number]['value'];

const TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  SINGLE: { color: '#60a5fa', bg: 'rgba(96,165,250,.12)'  },
  DOUBLE: { color: '#4ade80', bg: 'rgba(74,222,128,.12)'  },
  TRIPLE: { color: '#fb923c', bg: 'rgba(251,146,60,.12)'  },
  QUAD:   { color: '#c084fc', bg: 'rgba(192,132,252,.12)' },
  STUDIO: { color: '#fb923c', bg: 'rgba(251,146,60,.12)'  },
};

const BLANK: Partial<ResidenceSettings> = {
  name: '', tagline: '', address: '', phone: '', email: '', description: '',
  autoInvoiceEnabled: false, autoInvoiceDay: 1,
};

interface AdminSettingsProps {
  /** When embedded inside the consolidated Residence page, hide the local
   *  page header + inner tab switcher; the parent renders them. */
  hideHeader?: boolean;
  /** Force a starting tab (used when the parent owns the routing). */
  initialTab?: 'info' | 'rooms';
}

export default function AdminSettings({ hideHeader = false, initialTab = 'info' }: AdminSettingsProps = {}) {
  usePageTitle(hideHeader ? '' : 'Residence · Admin');
  const qc = useQueryClient();
  const [tab, setTab] = useState<'info' | 'rooms'>(initialTab);
  const { selectedId: residenceId } = useResidence();
  const confirm = useConfirm();

  // ── Info form state ─────────────────────────────────────────
  const [form, setForm] = useState<Partial<ResidenceSettings>>(BLANK);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const saveInfo = useMutation({
    mutationFn: () => updateSettings({
      name:        form.name,
      tagline:     form.tagline     || undefined,
      address:     form.address     || undefined,
      phone:       form.phone       || undefined,
      email:       form.email       || undefined,
      description: form.description || undefined,
      autoInvoiceEnabled: form.autoInvoiceEnabled,
      autoInvoiceDay:     form.autoInvoiceDay,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Residence info saved!');
    },
    onError: () => toast.error('Failed to save info.'),
  });

  const field = (key: keyof ResidenceSettings) => ({
    value:    (form[key] as string) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  // ── Room setup state ────────────────────────────────────────
  const [roomCount,    setRoomCount]    = useState(20);
  const [sharingType,  setSharingType]  = useState<SharingType>('DOUBLE');
  const [numBlocks,    setNumBlocks]    = useState(1);
  const [pricePerRoom, setPricePerRoom] = useState(3500);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [setupMode, setSetupMode] = useState<'simple' | 'mixed'>('simple');
  const [mix, setMix] = useState<Array<{ type: SharingType; count: number; price: number }>>([
    { type: 'SINGLE', count: 5,  price: 4500 },
    { type: 'DOUBLE', count: 10, price: 3500 },
    { type: 'QUAD',   count: 2,  price: 2500 },
  ]);

  const { data: occupancy, isLoading: occLoading } = useQuery({
    queryKey: ['admin-occupancy', selectedBlock, residenceId],
    queryFn:  () => getOccupancy(selectedBlock || undefined, residenceId ?? undefined),
    enabled:  tab === 'rooms',
  });

  const rooms  = occupancy?.rooms  ?? [];
  const blocks = occupancy?.blocks ?? [];
  const hasRooms  = rooms.length > 0;
  const occupied  = rooms.filter(r => r.status === 'OCCUPIED').length;
  const vacant    = rooms.filter(r => r.status === 'VACANT').length;
  const reserved  = rooms.filter(r => r.status === 'RESERVED').length;

  const perBlock   = Math.ceil(roomCount / numBlocks);
  const previewMsg = `${numBlocks} block${numBlocks > 1 ? 's' : ''} × ${perBlock} rooms = ${roomCount} ${sharingType.toLowerCase()} rooms`;

  const mixTotal = mix.reduce((s, m) => s + (m.count || 0), 0);

  // ── Add-tenant flow state ───────────────────────────────────
  const [addTenantRoom, setAddTenantRoom] = useState<AdminRoom | null>(null);
  // ── Add-single-room flow ────────────────────────────────────
  const [addingRoom, setAddingRoom] = useState(false);

  const addRoomMut = useMutation({
    mutationFn: (vars: { number: string; block: string; type: SharingType | 'STUDIO'; capacity: number; price: number }) =>
      createRoom({ ...vars, residenceId: residenceId ?? undefined }),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      toast.success(`Room ${room.number} added`);
      setAddingRoom(false);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to add room');
    },
  });

  const { data: accountsList = [] } = useQuery({
    queryKey: ['admin-accounts-unallocated'],
    queryFn:  () => getAccounts(),
    enabled:  tab === 'rooms',
  });

  const addTenantMut = useMutation({
    mutationFn: (vars: { userId: string; roomId: string; rent: number; status: 'ACTIVE' | 'RESERVED'; electricitySelfManaged?: boolean }) =>
      createAllocation(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      setAddTenantRoom(null);
      toast.success('Tenant added to room');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to add tenant');
    },
  });

  const deleteRoomMut = useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      toast.success(`Room ${data.number} removed`);
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to delete room');
    },
  });

  /** Used when an admin picks a student who's already in a different room
   *  — we ask for confirmation, then transactionally move them. */
  const moveTenantMut = useMutation({
    mutationFn: (vars: { userId: string; targetRoomId: string; rent: number; status: 'ACTIVE' | 'RESERVED' }) =>
      moveAllocation(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      setAddTenantRoom(null);
      toast.success('Tenant moved to new room');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to move tenant');
    },
  });

  const removeTenantMut = useMutation({
    mutationFn: (allocationId: string) => removeAllocation(allocationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-allocations'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      toast.success('Tenant removed');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to remove tenant');
    },
  });

  const doSetup = useMutation({
    mutationFn: () => {
      if (setupMode === 'mixed') {
        return setupRoomsMixed({
          blocks: numBlocks,
          mix:    mix.filter(m => m.count > 0),
          residenceId: residenceId ?? undefined,
        });
      }
      return setupRooms({
        count: roomCount, type: sharingType, blocks: numBlocks, pricePerRoom,
        residenceId: residenceId ?? undefined,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      qc.invalidateQueries({ queryKey: ['admin-occupancy-rooms'] });
      toast.success(`${data.length} rooms generated`);
      setShowSetupForm(false);
    },
    onError: () => toast.error('Failed to generate rooms.'),
  });

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 appear">

      {/* Page header — suppressed when embedded in the Residence hub */}
      {!hideHeader && (
        <div>
          <h1 className="page-title">Residence</h1>
          <p className="page-sub">Manage residence info and configure your room layout</p>
        </div>
      )}

      {/* Local tab switcher — also suppressed when the parent owns tabs */}
      {!hideHeader && (
        <div style={{ display: 'inline-flex', background: 'var(--bg3)', borderRadius: 10, padding: 4, gap: 2 }}>
          {([
            { key: 'info',  label: 'Info',              icon: Settings2   },
            { key: 'rooms', label: 'Rooms & Occupancy', icon: LayoutGrid  },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 7, fontSize: 13,
                fontWeight: tab === key ? 600 : 400,
                background: tab === key ? 'var(--bg2)' : 'transparent',
                color:      tab === key ? 'var(--text)' : 'var(--text3)',
                border: 'none', cursor: 'pointer', transition: 'all .18s',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── INFO TAB ─────────────────────────────────────────────── */}
      {tab === 'info' && (
        settingsLoading
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
            </div>
          : (
            <div style={{ maxWidth: 680 }}>
              {/* Live preview badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
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
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                    {form.name || 'ResiHub Student Residence'}
                  </p>
                  {form.tagline && (
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {form.tagline}
                    </p>
                  )}
                  {form.address && (
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{form.address}</p>
                  )}
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
                    className="input-base" rows={4} style={{ resize: 'vertical' }}
                    placeholder="Describe your residence — facilities, rules summary, welcome note…"
                    value={form.description ?? ''}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* ── Recurring invoices ───────────────────────────── */}
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.autoInvoiceEnabled}
                      onChange={e => setForm(f => ({ ...f, autoInvoiceEnabled: e.target.checked }))}
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--cyan)', flexShrink: 0 }}
                    />
                    <span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        Auto-generate monthly rent invoices
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        Each month a background job raises that month's rent invoice for every active
                        resident. It skips anyone already invoiced, so it never double-charges.
                      </span>
                    </span>
                  </label>
                  {form.autoInvoiceEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingLeft: 26 }}>
                      <label className="field-label" style={{ margin: 0 }}>Generate on day</label>
                      <input
                        type="number" min={1} max={28}
                        className="input-base"
                        style={{ width: 70 }}
                        value={form.autoInvoiceDay ?? 1}
                        onChange={e => setForm(f => ({ ...f, autoInvoiceDay: Number(e.target.value) }))}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>of each month (1–28)</span>
                      {form.autoInvoiceLastRun && (
                        <span style={{ fontSize: 11, color: 'var(--text4)', marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace" }}>
                          last run: {form.autoInvoiceLastRun}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => saveInfo.mutate()}
                    disabled={saveInfo.isPending || !form.name?.trim()}
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: 13 }}
                  >
                    {saveInfo.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                      : <><Save size={14} /> Save Info</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )
      )}

      {/* ── ROOMS TAB ────────────────────────────────────────────── */}
      {tab === 'rooms' && (
        <>
          {/* ── Setup wizard ─────── */}
          {(!hasRooms || showSetupForm) && (
            <div className="card" style={{ maxWidth: 600 }}>
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {hasRooms ? 'Reconfigure Room Layout' : 'Set Up Your Rooms'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {hasRooms
                      ? 'This will replace all vacant rooms. Occupied rooms are preserved.'
                      : 'Tell us about your residence layout and we\'ll generate the rooms.'
                    }
                  </p>
                </div>
                {hasRooms && (
                  <button
                    onClick={() => setShowSetupForm(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', padding: 4 }}
                  >
                    <ChevronUp size={18} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Mode toggle */}
                <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
                  {([
                    { v: 'simple', label: 'Single type' },
                    { v: 'mixed',  label: 'Mixed types' },
                  ] as const).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setSetupMode(v)}
                      style={{
                        padding: '7px 16px', borderRadius: 7, fontSize: 12, border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: setupMode === v ? 600 : 400,
                        background: setupMode === v ? 'var(--bg2)' : 'transparent',
                        color: setupMode === v ? 'var(--text)' : 'var(--text3)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {setupMode === 'simple' ? (
                  <>
                    {/* Total rooms */}
                    <div>
                      <label className="field-label">How many rooms does your residence have?</label>
                      <input
                        type="number" min={1} max={500} className="input-base"
                        style={{ maxWidth: 140 }}
                        value={roomCount}
                        onChange={e => setRoomCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                      />
                    </div>

                    {/* Sharing type */}
                    <div>
                      <label className="field-label">Room sharing type</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {SHARING_OPTIONS.map(opt => {
                          const active = sharingType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setSharingType(opt.value)}
                              style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
                                border: `1px solid ${active ? opt.color : 'var(--border)'}`,
                                background: active ? `${opt.color}14` : 'var(--hover)',
                                transition: 'all .18s', minWidth: 80,
                                fontFamily: "'Space Grotesk', sans-serif",
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 700, color: active ? opt.color : 'var(--text2)' }}>
                                {opt.label}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{opt.sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Mixed mode — list of {type, count, price} rows */
                  <div>
                    <label className="field-label">Room mix</label>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Add a row per room type — counts and prices apply per slice.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mix.map((slice, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto',
                          gap: 8, alignItems: 'center',
                          padding: '8px 10px', borderRadius: 10,
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                        }}>
                          <select
                            value={slice.type}
                            onChange={e => {
                              const v = e.target.value as SharingType;
                              setMix(m => m.map((s, idx) => idx === i ? { ...s, type: v } : s));
                            }}
                            className="input-base"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                          >
                            {SHARING_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label} ({opt.sub})</option>
                            ))}
                          </select>
                          <input
                            type="number" min={0} className="input-base"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            placeholder="count"
                            value={slice.count}
                            onChange={e => {
                              const v = Math.max(0, parseInt(e.target.value) || 0);
                              setMix(m => m.map((s, idx) => idx === i ? { ...s, count: v } : s));
                            }}
                          />
                          <input
                            type="number" min={0} className="input-base"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            placeholder="rent (R)"
                            value={slice.price}
                            onChange={e => {
                              const v = Math.max(0, parseInt(e.target.value) || 0);
                              setMix(m => m.map((s, idx) => idx === i ? { ...s, price: v } : s));
                            }}
                          />
                          <button
                            onClick={() => setMix(m => m.filter((_, idx) => idx !== i))}
                            disabled={mix.length === 1}
                            className="btn-ghost press-soft"
                            title="Remove row"
                            style={{ padding: 6, borderRadius: 8 }}
                          >
                            <Minus size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setMix(m => [...m, { type: 'SINGLE', count: 1, price: 4000 }])}
                        className="btn-ghost press-soft"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, alignSelf: 'flex-start' }}
                      >
                        <Plus size={12} /> Add room type
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Total: <b style={{ color: 'var(--cyan)' }}>{mixTotal}</b> rooms across {numBlocks} block{numBlocks > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Blocks / wings */}
                <div style={{ display: 'grid', gridTemplateColumns: setupMode === 'mixed' ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="field-label">How many blocks / wings?</label>
                    <input
                      type="number" min={1} max={10} className="input-base"
                      value={numBlocks}
                      onChange={e => setNumBlocks(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    />
                    <p style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Blocks A → {String.fromCharCode(64 + numBlocks)}
                    </p>
                  </div>
                  {setupMode === 'simple' && (
                    <div>
                      <label className="field-label">Price per room (R)</label>
                      <input
                        type="number" min={0} className="input-base"
                        value={pricePerRoom}
                        onChange={e => setPricePerRoom(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                {setupMode === 'simple' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 14px',
                  }}>
                    <DoorOpen size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text3)' }}>
                      {previewMsg}
                    </span>
                  </div>
                )}

                {/* Warning if rooms exist */}
                {hasRooms && (
                  <div style={{
                    fontSize: 12, color: '#fb923c',
                    background: 'rgba(251,146,60,.06)',
                    border: '1px solid rgba(251,146,60,.2)',
                    borderRadius: 8, padding: '8px 12px',
                  }}>
                    ⚠ {vacant} vacant room{vacant !== 1 ? 's' : ''} will be replaced.
                    {occupied > 0 && ` ${occupied} occupied room${occupied !== 1 ? 's' : ''} will not be touched.`}
                  </div>
                )}

                {/* Generate button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => doSetup.mutate()}
                    disabled={
                      doSetup.isPending ||
                      (setupMode === 'simple' && roomCount < 1) ||
                      (setupMode === 'mixed'  && mixTotal < 1)
                    }
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: 13 }}
                  >
                    {doSetup.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                      : <><LayoutGrid size={14} />
                          Generate {setupMode === 'mixed' ? `${mixTotal} rooms (mixed)` : 'Rooms'}
                        </>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Occupancy section ─── */}
          {!occLoading && (
            <>
              {hasRooms && (
                <>
                  {/* Stats + reconfigure header */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {/* KPI strip */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total',    value: rooms.length, color: 'var(--text2)' },
                        { label: 'Occupied', value: occupied,     color: 'var(--cyan)'  },
                        { label: 'Vacant',   value: vacant,       color: '#4ade80'      },
                        { label: 'Reserved', value: reserved,     color: 'var(--rose)'  },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '8px 16px', textAlign: 'center',
                        }}>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700, color }}>{value}</p>
                          <p style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Toolbar — Add single room + Reconfigure */}
                    {!showSetupForm && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setAddingRoom(true)}
                          className="btn-primary press-soft"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          <Plus size={12} /> Add room
                        </button>
                        <button
                          onClick={() => setShowSetupForm(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'var(--hover)', border: '1px solid var(--border)',
                            color: 'var(--text3)', cursor: 'pointer',
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          <RefreshCw size={12} /> Reconfigure
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Block filter */}
                  {blocks.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['', ...blocks]).map(b => (
                        <button
                          key={b || 'all'}
                          onClick={() => setSelectedBlock(b)}
                          style={{
                            padding: '5px 14px', borderRadius: 20, fontSize: 12,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: selectedBlock === b ? 600 : 400,
                            background: selectedBlock === b ? 'var(--cyan)' : 'var(--hover)',
                            color:      selectedBlock === b ? '#0f0f12'    : 'var(--text3)',
                            border: `1px solid ${selectedBlock === b ? 'var(--cyan)' : 'var(--border2)'}`,
                            cursor: 'pointer', transition: 'all .18s',
                          }}
                        >
                          {b ? `Block ${b}` : 'All'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'Occupied', bg: 'rgba(0,204,204,.3)', border: 'rgba(0,204,204,.5)' },
                      { label: 'Vacant',   bg: 'var(--bg3)',         border: 'var(--border)'      },
                    ].map(({ label, bg, border }) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${border}`, display: 'inline-block' }} />
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* Room grid — multi-tenant cards with click-driven actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {rooms.map(room => {
                      const tenants  = room.tenants ?? [];
                      const capacity = room.capacity ?? 1;
                      const occupied = room.occupied ?? 0;
                      const isFull   = tenants.length >= capacity;
                      const tc = TYPE_COLOR[room.type] ?? { color: 'var(--text3)', bg: 'var(--bg3)' };
                      const fillRatio = capacity > 0 ? tenants.length / capacity : 0;
                      const accentBorder = tenants.length === 0
                        ? 'var(--border)'
                        : isFull
                          ? 'rgba(0,204,204,.4)'
                          : 'rgba(251,146,60,.35)';
                      return (
                        <div
                          key={room.id}
                          className="hover-lift"
                          style={{
                            borderRadius: 12, padding: 12, border: '1px solid',
                            borderColor: accentBorder,
                            background:  tenants.length > 0 ? 'rgba(0,204,204,.04)' : 'var(--bg3)',
                            display: 'flex', flexDirection: 'column', gap: 8,
                          }}
                        >
                          {/* Header row: number + type + delete (only when empty) */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                              {room.number}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                                padding: '2px 6px', borderRadius: 4,
                                background: tc.bg, color: tc.color,
                                border: `1px solid ${tc.color}33`,
                              }}>
                                {room.type}
                              </span>
                              {/* Delete — only enabled when no tenants. Locked rooms get a tooltip. */}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (tenants.length > 0) return;     // belt-and-braces, button is disabled below
                                  const ok = await confirm({
                                    title: `Delete room ${room.number}?`,
                                    message: `This removes Block ${room.block} – ${room.number} from your residence permanently. The room has no tenants, so no history is lost.`,
                                    confirmLabel: 'Delete room',
                                    tone: 'rose',
                                    icon: Trash2,
                                  });
                                  if (ok) deleteRoomMut.mutate(room.id);
                                }}
                                disabled={tenants.length > 0 || (deleteRoomMut.isPending && deleteRoomMut.variables === room.id)}
                                title={tenants.length > 0
                                  ? `Locked — ${tenants.length} tenant${tenants.length === 1 ? '' : 's'} still in this room`
                                  : 'Delete this empty room'}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: 5,
                                  padding: 3, display: 'flex',
                                  cursor: tenants.length > 0 ? 'not-allowed' : 'pointer',
                                  color: tenants.length > 0 ? 'var(--text4)' : 'var(--rose)',
                                  opacity: tenants.length > 0 ? .4 : 1,
                                }}
                              >
                                {deleteRoomMut.isPending && deleteRoomMut.variables === room.id
                                  ? <Loader2 size={11} className="animate-spin" />
                                  : <Trash2 size={11} />}
                              </button>
                            </div>
                          </div>
                          {/* Block + capacity */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                              Blk {room.block}
                            </span>
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                              color: isFull ? 'var(--cyan)' : '#fb923c',
                              fontWeight: 600,
                            }}>
                              {tenants.length}/{capacity}
                            </span>
                          </div>
                          {/* Capacity bar */}
                          <div style={{
                            height: 4, borderRadius: 999, background: 'var(--border)', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(100, fillRatio * 100)}%`, height: '100%',
                              background: isFull ? 'var(--cyan)' : 'linear-gradient(90deg, #fb923c, #f87171)',
                              transition: 'width .25s cubic-bezier(.4,0,.2,1)',
                            }} />
                          </div>
                          {/* Tenants list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {tenants.map(t => (
                              <div key={t.allocationId} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                                padding: '5px 8px', borderRadius: 7,
                                background: t.status === 'RESERVED' ? 'rgba(251,146,60,.08)' : 'rgba(0,204,204,.07)',
                                border: `1px solid ${t.status === 'RESERVED' ? 'rgba(251,146,60,.2)' : 'rgba(0,204,204,.18)'}`,
                              }}>
                                <span style={{
                                  fontSize: 11, color: 'var(--text)', fontWeight: 500,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  flex: 1, minWidth: 0,
                                }} title={t.user.email}>
                                  {t.user.name}
                                  {t.status === 'RESERVED' && (
                                    <span style={{ fontSize: 9, color: '#fb923c', marginLeft: 5, fontFamily: "'IBM Plex Mono', monospace" }}>res</span>
                                  )}
                                </span>
                                <button
                                  onClick={async () => {
                                    const ok = await confirm({
                                      title: `Remove ${t.user.name}?`,
                                      message: `Frees their slot in room ${room.number}. The student keeps their account — you can reallocate them later.`,
                                      confirmLabel: 'Remove tenant',
                                      tone: 'rose',
                                      icon: UserMinusIcon,
                                    });
                                    if (ok) removeTenantMut.mutate(t.allocationId);
                                  }}
                                  className="press-soft"
                                  title="Remove tenant"
                                  style={{
                                    padding: 3, borderRadius: 5, border: 'none', cursor: 'pointer',
                                    background: 'transparent', color: 'var(--rose)',
                                    display: 'flex',
                                  }}
                                >
                                  <UserMinus size={11} />
                                </button>
                              </div>
                            ))}
                            {/* Empty slot indicators */}
                            {Array.from({ length: capacity - tenants.length }).map((_, idx) => (
                              <button
                                key={`empty-${idx}`}
                                onClick={() => setAddTenantRoom(room as AdminRoom)}
                                className="press-soft"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                  padding: '5px 8px', borderRadius: 7,
                                  background: 'transparent',
                                  border: '1px dashed var(--border2)',
                                  color: 'var(--text3)', fontSize: 11,
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  cursor: 'pointer',
                                }}
                              >
                                <UserPlus size={10} /> Add tenant
                              </button>
                            ))}
                          </div>
                          {/* Footer — rent */}
                          <p style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text4)',
                            paddingTop: 4, borderTop: '1px solid var(--border)',
                          }}>
                            R{Number(room.price).toLocaleString()} / month
                            {occupied !== tenants.length && ` · ${occupied} active`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* No rooms empty state */}
              {!hasRooms && !doSetup.isPending && (
                <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,204,204,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <DoorOpen size={24} style={{ color: 'var(--cyan)' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No rooms yet</p>
                  <p style={{ fontSize: 13, color: 'var(--text4)' }}>Use the form above to generate your residence rooms.</p>
                </div>
              )}
            </>
          )}

          {/* Loading spinner */}
          {occLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{ width: 32, height: 32, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
            </div>
          )}
        </>
      )}

      {/* Add-room modal */}
      {addingRoom && (
        <AddRoomModal
          existingRooms={rooms}
          loading={addRoomMut.isPending}
          onClose={() => setAddingRoom(false)}
          onSubmit={(vars) => addRoomMut.mutate(vars)}
        />
      )}

      {/* Add-tenant modal */}
      {addTenantRoom && (
        <AddTenantModal
          room={addTenantRoom}
          accounts={accountsList}
          onClose={() => setAddTenantRoom(null)}
          onSubmitNew={(userId, status, electricitySelfManaged) => addTenantMut.mutate({
            userId,
            roomId: addTenantRoom.id,
            rent:   Number(addTenantRoom.price),
            status,
            electricitySelfManaged,
          })}
          onSubmitMove={(userId, status) => moveTenantMut.mutate({
            userId,
            targetRoomId: addTenantRoom.id,
            rent:         Number(addTenantRoom.price),
            status,
          })}
          loading={addTenantMut.isPending || moveTenantMut.isPending}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// AddRoomModal — admin types a single new room and saves it
// ─────────────────────────────────────────────────────────────────

function AddRoomModal({ existingRooms, loading, onClose, onSubmit }: {
  existingRooms: AdminRoom[];
  loading:       boolean;
  onClose:       () => void;
  onSubmit:      (v: { number: string; block: string; type: SharingType | 'STUDIO'; capacity: number; price: number }) => void;
}) {
  // Suggest the next room number for the most recently used block
  const lastBlock = existingRooms[0]?.block ?? 'A';
  const blockRooms = existingRooms.filter(r => r.block === lastBlock);
  const nextNum = blockRooms.reduce((max, r) => {
    const tail = parseInt(r.number.replace(/^[A-Z]+/, ''), 10);
    return Number.isFinite(tail) && tail > max ? tail : max;
  }, 100) + 1;

  const [block,  setBlock]  = useState(lastBlock);
  const [number, setNumber] = useState(`${lastBlock}${nextNum}`);
  const [type,   setType]   = useState<SharingType | 'STUDIO'>('SINGLE');
  const [price,  setPrice]  = useState(4000);
  const [customNumber, setCustomNumber] = useState(false);

  // Auto-update suggested number when block changes (unless user typed their own)
  useEffect(() => {
    if (customNumber) return;
    const inBlock = existingRooms.filter(r => r.block === block);
    const next = inBlock.reduce((max, r) => {
      const tail = parseInt(r.number.replace(/^[A-Z]+/, ''), 10);
      return Number.isFinite(tail) && tail > max ? tail : max;
    }, 100) + 1;
    setNumber(`${block}${next}`);
  }, [block, existingRooms, customNumber]);

  const capacity = type === 'SINGLE' || type === 'STUDIO' ? 1
                 : type === 'DOUBLE' ? 2
                 : type === 'TRIPLE' ? 3 : 4;

  const TYPES: Array<{ value: SharingType | 'STUDIO'; label: string }> = [
    { value: 'SINGLE', label: 'Single' },
    { value: 'DOUBLE', label: 'Double' },
    { value: 'TRIPLE', label: 'Triple' },
    { value: 'QUAD',   label: 'Quad'   },
    { value: 'STUDIO', label: 'Studio' },
  ];

  const valid = number.trim().length > 0 && block.trim().length > 0 && price >= 0;

  return (
    <Modal open={true} onClose={onClose} maxWidth={460}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Add a room</p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 18 }}>
        Adds a single room to the residence. Stays VACANT until a tenant is assigned.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="field-label">Block</label>
          <input value={block} onChange={e => setBlock(e.target.value.toUpperCase())} maxLength={3} className="input-base"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>
        <div>
          <label className="field-label">Room number</label>
          <input value={number}
                 onChange={e => { setNumber(e.target.value.toUpperCase()); setCustomNumber(true); }}
                 className="input-base"
                 style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Type ({capacity} {capacity === 1 ? 'tenant' : 'tenants'})</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {TYPES.map(t => {
              const active = type === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className="press-soft"
                  style={{
                    padding: '8px 6px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                    background: active ? 'rgba(0,204,204,.12)' : 'var(--bg3)',
                    color: active ? 'var(--cyan)' : 'var(--text3)',
                    border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{t.label}</button>
              );
            })}
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="field-label">Price (R / month)</label>
          <input type="number" min={0} step={100} value={price}
                 onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
                 className="input-base"
                 style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={onClose} className="btn-ghost" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Cancel</button>
        <button onClick={() => onSubmit({ number, block, type, capacity, price })}
                disabled={!valid || loading}
                className="btn-primary press-soft"
                style={{ flex: 2, padding: '10px 0', fontSize: 13, justifyContent: 'center' }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {loading ? 'Saving…' : 'Save room'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// AddTenantModal — pick a student (any role except admin) to assign
// ─────────────────────────────────────────────────────────────────

interface AccountListItem {
  id: string; name: string; email: string; role: string;
  allocation: { room: { number: string; block: string } } | null;
}

function AddTenantModal({
  room, accounts, onClose, onSubmitNew, onSubmitMove, loading,
}: {
  room: AdminRoom;
  accounts: AccountListItem[];
  onClose: () => void;
  /** Called when student has no current allocation. */
  onSubmitNew:  (userId: string, status: 'ACTIVE' | 'RESERVED', electricitySelfManaged: boolean) => void;
  /** Called when student needs to be moved from another room to this one. */
  onSubmitMove: (userId: string, status: 'ACTIVE' | 'RESERVED') => void;
  loading: boolean;
}) {
  const confirm = useConfirm();
  // Show every non-admin student. Allocated ones surface a "move from"
  // label so admin sees the cost of the action.
  const eligible = accounts.filter(a => a.role !== 'ADMIN');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'RESERVED'>('ACTIVE');
  const [electricitySelfManaged, setElectricitySelfManaged] = useState(false);

  const selectedStudent = eligible.find(s => s.id === userId);
  const currentRoom = selectedStudent?.allocation?.room;

  async function handleSubmit() {
    if (!userId) return;
    if (!currentRoom) {
      onSubmitNew(userId, status, electricitySelfManaged);
      return;
    }
    // Re-allocation — confirm before moving
    const ok = await confirm({
      title: `Move ${selectedStudent?.name} to ${room.number}?`,
      message: `${selectedStudent?.name} is currently in Block ${currentRoom.block} – ${currentRoom.number}. Moving them frees that slot and assigns them here. Past invoices and history stay attached to them.`,
      confirmLabel: 'Move tenant',
      tone: 'rose',
      icon: UserPlus,
    });
    if (ok) onSubmitMove(userId, status);
  }

  return (
    <Modal open={true} onClose={onClose} maxWidth={460}>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        Add tenant to {room.number}
      </p>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)', marginBottom: 18 }}>
        Block {room.block} · {room.type} · R{Number(room.price).toLocaleString()}/month · {(room.capacity ?? 1) - (room.tenants?.length ?? 0)} slot{(room.capacity ?? 1) - (room.tenants?.length ?? 0) !== 1 ? 's' : ''} open
      </p>

      <label className="field-label">Student</label>
      <select value={userId} onChange={e => setUserId(e.target.value)} className="input-base" style={{ marginBottom: 6 }}>
        <option value="">— pick a student —</option>
        {eligible.length === 0 ? (
          <option disabled>No students available</option>
        ) : eligible.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.allocation?.room
              ? ` · currently in ${s.allocation.room.block}-${s.allocation.room.number}`
              : ` · ${s.email}`}
          </option>
        ))}
      </select>

      {/* Hint when re-allocating */}
      {currentRoom && (
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--rose)',
          marginBottom: 14, marginTop: 2,
        }}>
          ⚠ This student is in {currentRoom.block}-{currentRoom.number}. Saving will move them; we'll confirm first.
        </p>
      )}
      {!currentRoom && <div style={{ marginBottom: 14 }} />}

      <label className="field-label">Allocation status</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['ACTIVE', 'RESERVED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className="press-soft"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${status === s ? 'var(--cyan)' : 'var(--border)'}`,
              background: status === s ? 'rgba(0,204,204,.08)' : 'var(--bg3)',
              color: status === s ? 'var(--text)' : 'var(--text2)',
              fontSize: 12, fontWeight: status === s ? 600 : 500, cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {s === 'ACTIVE' ? 'Move-in immediately' : 'Reserve only'}
          </button>
        ))}
      </div>

      {/* Electricity — per-tenant choice. Default: admin handles bulk. */}
      {!currentRoom && (
        <>
          <label className="field-label">Electricity</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 18 }}>
            {([
              { val: false, label: 'Admin handles',  hint: 'Bulk-bought · billed back' },
              { val: true,  label: 'Tenant self-loads', hint: 'Own meter top-ups' },
            ] as const).map(opt => {
              const active = electricitySelfManaged === opt.val;
              return (
                <button key={String(opt.val)}
                  type="button"
                  onClick={() => setElectricitySelfManaged(opt.val)}
                  className="press-soft"
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${active ? 'var(--cyan)' : 'var(--border)'}`,
                    background: active ? 'rgba(0,204,204,.08)' : 'var(--bg3)',
                    color: active ? 'var(--text)' : 'var(--text2)',
                    fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  }}>
                  <span>{opt.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={!userId || loading}
          className="btn-primary press-soft"
          style={{ minWidth: 160, padding: '10px 22px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          {loading ? 'Working…' : currentRoom ? 'Move tenant' : 'Add tenant'}
        </button>
        <button onClick={onClose} className="btn-ghost" style={{ minWidth: 120, padding: '10px 22px', fontSize: 13, justifyContent: 'center' }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
