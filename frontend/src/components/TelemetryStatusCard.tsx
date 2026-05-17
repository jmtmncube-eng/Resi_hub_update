import { Sun, Camera as CameraIcon, Wifi, WifiOff, Clock } from 'lucide-react';

/**
 * Telemetry status card — placeholder for future API integrations.
 * Shows the live-monitoring inputs the residence will eventually pull
 * from (solar inverter, camera DVR, smart-meter API, etc) with their
 * current connection state. Right now everything is "Manual" or
 * "Not connected" — these flip to "Live" once the integration is wired.
 *
 * Keep this card honest — don't fake live data. It's better to show
 * "Coming soon · API pending" than fabricate readings.
 */
export default function TelemetryStatusCard({
  solarKwh30,
  compact = false,
}: {
  /** Last 30 days of MANUALLY-logged solar kWh (already shown elsewhere). */
  solarKwh30?: number;
  /** When true, the two sources sit side-by-side in a grid and the long
   *  hint paragraphs are hidden. Heading + status pill always show. */
  compact?: boolean;
}) {
  return (
    <div className="card-sm" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="micro-label">Live monitoring</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: 'rgba(251,146,60,.10)', color: '#fb923c',
          border: '1px solid rgba(251,146,60,.3)',
          fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.06em',
        }}>
          API pending
        </span>
      </div>

      <div style={compact ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 8,
      } : {
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <Source
          icon={Sun}
          label="Solar inverter"
          status="manual"
          color="#f472b6"
          line2={solarKwh30 != null
            ? `${solarKwh30.toFixed(0)} kWh logged manually (last 30d)`
            : 'No readings logged yet'}
          hint="Goipotle / Sunsynk / Victron API integration on the roadmap — readings will auto-pull once wired."
          compact={compact}
        />
        <Source
          icon={CameraIcon}
          label="Camera feeds"
          status="not-connected"
          color="#60a5fa"
          line2="0 cameras connected"
          hint="Hikvision / Dahua / Reolink IP camera integration coming. Live thumbnails + motion alerts will surface here."
          compact={compact}
        />
      </div>
    </div>
  );
}

function Source({ icon: Icon, label, status, color, line2, hint, compact }: {
  icon: typeof Sun;
  label: string;
  status: 'live' | 'manual' | 'not-connected';
  color: string;
  line2: string;
  hint: string;
  compact?: boolean;
}) {
  const statusMeta = {
    live:           { icon: Wifi,    color: '#4ade80',   label: 'Live'           },
    manual:         { icon: Clock,   color: '#fb923c',   label: 'Manual entry'   },
    'not-connected':{ icon: WifiOff, color: 'var(--text4)', label: 'Not connected' },
  }[status];
  const StatusIcon = statusMeta.icon;

  return (
    <div style={{
      borderRadius: 9, padding: '10px 12px',
      background: 'var(--bg3)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${color}1a`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            {line2}
          </p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 999,
          fontSize: 10, fontWeight: 600,
          color: statusMeta.color,
          background: `${statusMeta.color === 'var(--text4)' ? 'rgba(255,255,255,.04)' : statusMeta.color + '1a'}`,
          border: `1px solid ${statusMeta.color === 'var(--text4)' ? 'var(--border)' : statusMeta.color + '40'}`,
          fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.05em',
          flexShrink: 0,
        }}>
          <StatusIcon size={10} /> {statusMeta.label}
        </span>
      </div>
      {/* Hide the long explanatory paragraph in compact mode — the
          heading + status pill carry the message; the hint is more
          context that belongs in the list view. */}
      {!compact && (
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
