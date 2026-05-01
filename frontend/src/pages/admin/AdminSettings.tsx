import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Save, Loader2, Settings2, LayoutGrid,
  DoorOpen, RefreshCw, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getSettings, updateSettings, getOccupancy,
  setupRooms, ResidenceSettings,
} from '../../services/admin.service';
import { usePageTitle } from '../../hooks/usePageTitle';

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

  const { data: occupancy, isLoading: occLoading } = useQuery({
    queryKey: ['admin-occupancy', selectedBlock],
    queryFn:  () => getOccupancy(selectedBlock || undefined),
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

  const doSetup = useMutation({
    mutationFn: () => setupRooms({ count: roomCount, type: sharingType, blocks: numBlocks, pricePerRoom }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-occupancy'] });
      toast.success(`${data.length} rooms generated!`);
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

                {/* Blocks / wings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                  <div>
                    <label className="field-label">Price per room (R)</label>
                    <input
                      type="number" min={0} className="input-base"
                      value={pricePerRoom}
                      onChange={e => setPricePerRoom(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>

                {/* Preview */}
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
                    disabled={doSetup.isPending || roomCount < 1}
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: 13 }}
                  >
                    {doSetup.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                      : <><LayoutGrid size={14} /> Generate Rooms</>
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

                    {/* Reconfigure toggle */}
                    {!showSetupForm && (
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
                        <RefreshCw size={12} /> Reconfigure Rooms
                      </button>
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

                  {/* Room grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {rooms.map(room => {
                      const isOccupied = room.status === 'OCCUPIED';
                      const resident   = room.allocation?.user;
                      const tc = TYPE_COLOR[room.type] ?? { color: 'var(--text3)', bg: 'var(--bg3)' };
                      return (
                        <div
                          key={room.id}
                          style={{
                            borderRadius: 12, padding: 12, border: '1px solid',
                            borderColor: isOccupied ? 'rgba(0,204,204,.3)' : 'var(--border)',
                            background:  isOccupied ? 'rgba(0,204,204,.06)' : 'var(--bg3)',
                            transition: 'all .18s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                              {room.number}
                            </span>
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                              padding: '1px 5px', borderRadius: 4,
                              background: tc.bg, color: tc.color,
                              border: `1px solid ${tc.color}33`,
                            }}>
                              {room.type === 'SINGLE' ? 'S'
                                : room.type === 'DOUBLE' ? 'D'
                                : room.type === 'TRIPLE' ? '3x'
                                : room.type === 'QUAD'   ? '4x'
                                : room.type.charAt(0)}
                            </span>
                          </div>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)' }}>
                            Blk {room.block}
                          </p>
                          {resident ? (
                            <p style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {resident.name}
                            </p>
                          ) : (
                            <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 5 }}>
                              {room.status === 'RESERVED' ? 'Reserved' : 'Vacant'}
                            </p>
                          )}
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
    </div>
  );
}
