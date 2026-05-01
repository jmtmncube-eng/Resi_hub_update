import { Camera, Wifi, Cpu, ShieldCheck, Sparkles, MapPin } from 'lucide-react';

/**
 * Coming-soon placeholder for camera + sensor telemetry. Once the
 * gateway integration is in (RTSP/MQTT bridge → backend → SSE/WebSocket
 * to this view), each card slot will host a live tile.
 */
export default function ResidenceTelemetry() {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card" style={{
        padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(0,204,204,.08), var(--bg2))',
        border: '1px solid rgba(0,204,204,.25)',
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'rgba(0,204,204,.16)',
          border: '1px solid rgba(0,204,204,.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Camera size={26} style={{ color: 'var(--cyan)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>
            Camera & sensor telemetry
            <span style={{
              marginLeft: 10, padding: '2px 9px', borderRadius: 999,
              fontSize: 10, fontWeight: 600,
              background: 'rgba(0,204,204,.14)', color: 'var(--cyan)',
              border: '1px solid rgba(0,204,204,.3)',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '.05em', verticalAlign: 'middle',
            }}>
              Coming soon
            </span>
          </p>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, lineHeight: 1.55 }}>
            Live entrance feeds, common-area motion alerts, and environmental
            telemetry will surface here once the on-site gateway is connected.
          </p>
        </div>
      </div>

      {/* Capability tiles — preview of what's planned */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        <Tile
          icon={<Camera size={18} style={{ color: 'var(--cyan)' }} />}
          title="Entry / exit feeds"
          body="Front gate and reception live tiles with on-tap full-screen view. Visitor pass scans correlate to the camera frame."
        />
        <Tile
          icon={<MapPin size={18} style={{ color: 'var(--cyan)' }} />}
          title="Per-block coverage map"
          body="See which corridors are covered, last-keepalive per camera, dead zones flagged in rose."
        />
        <Tile
          icon={<ShieldCheck size={18} style={{ color: 'var(--rose)' }} />}
          title="Motion & tamper alerts"
          body="After-hours motion in maintenance areas, tampered units, or offline cameras push to the on-call admin."
        />
        <Tile
          icon={<Cpu size={18} style={{ color: 'var(--cyan)' }} />}
          title="Environment sensors"
          body="Power, water, smoke, temperature — read-only at first, with thresholds → notification rules."
        />
        <Tile
          icon={<Wifi size={18} style={{ color: 'var(--cyan)' }} />}
          title="Network heartbeat"
          body="Gateway uptime, residence Wi-Fi reachability, last sync timestamp."
        />
        <Tile
          icon={<Sparkles size={18} style={{ color: 'var(--rose)' }} />}
          title="AI summaries"
          body="Daily digest: 'Quiet night, 2 entries logged, all sensors green.' Optional, opt-in."
        />
      </div>

      {/* Roadmap note */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 10,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12, color: 'var(--text3)',
        lineHeight: 1.6,
      }}>
        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Roadmap:</span>{' '}
        gateway pairing (Q1) → camera feed proxy (Q2) → motion-based alerts in
        the existing notification stream (Q2) → environment sensor thresholds (Q3).
        Reach out if you want to be on the early-access list.
      </div>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-sm hover-lift" style={{ padding: '16px 18px' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}
