import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Loader2, ShieldCheck, ShieldX, LogIn, LogOut, RotateCcw } from 'lucide-react';
import { gateScan, GateScanResult } from '../services/gate.service';
import { ResiMark } from '../components/Brand';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * Public gate-scan page. No auth required — accessible directly by:
 *   - phone camera scanning a visitor QR (URL contains ?code=...)
 *   - gate guard manually pasting a code
 *   - gate guard using the device camera scanner (BarcodeDetector API
 *     where supported; falls back to manual entry otherwise)
 *
 * The backend toggles the pass between ACTIVE (entry) and EXPIRED (exit)
 * so the same QR can be used for both arrival and departure.
 */
export default function Gate() {
  usePageTitle('Gate · ResiHub');
  const [params, setParams] = useSearchParams();

  const [scanning, setScanning] = useState(false);
  const [result,   setResult]   = useState<GateScanResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  // ── Auto-process the ?code= query string (deep-linked from QR scan) ──
  useEffect(() => {
    const code = params.get('code');
    if (code && !scanning && !result && !error) {
      runScan(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function runScan(rawCode: string) {
    const code = rawCode.trim();
    if (!code) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const r = await gateScan(code);
      setResult(r);
    } catch (e) {
      const ax = e as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error ?? 'Could not process this code. Try again.');
    } finally {
      setScanning(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setManualCode('');
    // Clear ?code= so a refresh doesn't re-trigger the same scan
    if (params.has('code')) {
      const next = new URLSearchParams(params);
      next.delete('code');
      setParams(next, { replace: true });
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      padding: '32px 16px',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <ResiMark size={36} />
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-.02em', fontFamily: "'Space Grotesk', sans-serif" }}>
              ResiHub
            </p>
            <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 1 }}>
              Gate Scanner
            </p>
          </div>
        </div>

        {/* Body */}
        {scanning ? (
          <ScanningCard />
        ) : result ? (
          <ResultCard result={result} onReset={reset} />
        ) : error ? (
          <ErrorCard message={error} onReset={reset} />
        ) : (
          <ScannerHome onSubmit={(code) => runScan(code)} manualCode={manualCode} setManualCode={setManualCode} />
        )}

        {/* Footer */}
        <p style={{
          marginTop: 28, textAlign: 'center', fontSize: 10,
          color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.05em',
        }}>
          Scan again to check the visitor out · Built by Athera
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// States
// ─────────────────────────────────────────────────────────────────

function ScanningCard() {
  return (
    <div className="card" style={{ padding: '36px 28px', textAlign: 'center' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--cyan)', margin: '0 auto 14px' }} />
      <p style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Verifying QR code…</p>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
        contacting gate server
      </p>
    </div>
  );
}

function ResultCard({ result, onReset }: { result: GateScanResult; onReset: () => void }) {
  const isEntry = result.action === 'ENTRY';
  const Icon = isEntry ? LogIn : LogOut;
  const accent = isEntry ? '#4ade80' : 'var(--rose)';
  const tone   = isEntry ? 'GRANTED' : 'CHECKED OUT';

  return (
    <div className="card appear" style={{
      padding: 0, overflow: 'hidden',
      borderTop: `4px solid ${accent}`,
    }}>
      {/* Status banner */}
      <div style={{
        padding: '24px 28px',
        background: isEntry ? 'rgba(74,222,128,.08)' : 'rgba(232,25,122,.06)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: isEntry ? 'rgba(74,222,128,.18)' : 'rgba(232,25,122,.16)',
          border: `1px solid ${isEntry ? 'rgba(74,222,128,.4)' : 'rgba(232,25,122,.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isEntry
            ? <ShieldCheck size={26} style={{ color: accent }} />
            : <Icon size={26} style={{ color: accent }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
            color: accent, fontFamily: "'IBM Plex Mono', monospace",
          }}>
            ENTRY {tone}
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em', marginTop: 3 }}>
            {result.pass.visitorName}
          </p>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 14, rowGap: 10 }}>
        <Label>Host</Label>
        <Value>
          {result.host.name}
          {result.host.room && (
            <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
              · Room {result.host.room.number}, Blk {result.host.room.block}
            </span>
          )}
        </Value>

        <Label>Purpose</Label>
        <Value>{result.pass.purpose}</Value>

        <Label>Slot</Label>
        <Value>
          {new Date(result.pass.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
          {' · '}{result.pass.timeFrom}–{result.pass.timeTo}
        </Value>

        <Label>Phone</Label>
        <Value>{result.pass.visitorPhone}</Value>

        {result.pass.checkedInAt && (
          <>
            <Label>{isEntry ? 'Checked in' : 'Was checked in'}</Label>
            <Value>{new Date(result.pass.checkedInAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</Value>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onReset} className="btn-primary press-soft" style={{
          width: '100%', padding: '11px 0', fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <RotateCcw size={13} /> Scan another
        </button>
      </div>
    </div>
  );
}

function ErrorCard({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="card appear" style={{ padding: 0, overflow: 'hidden', borderTop: '4px solid var(--rose)' }}>
      <div style={{
        padding: '24px 28px',
        background: 'rgba(232,25,122,.06)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'rgba(232,25,122,.16)',
          border: '1px solid rgba(232,25,122,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldX size={26} style={{ color: 'var(--rose)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--rose)', fontFamily: "'IBM Plex Mono', monospace" }}>
            ENTRY DENIED
          </p>
          <p style={{ fontSize: 14, color: 'var(--text)', marginTop: 6, lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
      <div style={{ padding: '16px 28px 24px' }}>
        <button onClick={onReset} className="btn-ghost press-soft" style={{
          width: '100%', padding: '11px 0', fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <RotateCcw size={13} /> Try another code
        </button>
      </div>
    </div>
  );
}

function ScannerHome({
  onSubmit, manualCode, setManualCode,
}: {
  onSubmit: (code: string) => void;
  manualCode: string;
  setManualCode: (v: string) => void;
}) {
  return (
    <div className="card appear" style={{ padding: '28px 24px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
        background: 'rgba(0,204,204,.14)',
        border: '1px solid rgba(0,204,204,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Camera size={26} style={{ color: 'var(--cyan)' }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
        Visitor pass scan
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 4, lineHeight: 1.55 }}>
        Point the visitor's QR at this device's camera, or paste the code below.
      </p>

      <div style={{ marginTop: 22 }}>
        <label className="field-label" style={{ marginBottom: 6 }}>Visitor code</label>
        <input
          type="text"
          autoFocus
          value={manualCode}
          onChange={e => setManualCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) onSubmit(manualCode); }}
          placeholder="QR-A101-20261225-XXXXXX"
          className="input-base"
          style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.05em' }}
        />
      </div>

      <button
        onClick={() => onSubmit(manualCode)}
        disabled={!manualCode.trim()}
        className="btn-primary press-soft"
        style={{
          width: '100%', padding: '11px 0', fontSize: 13, marginTop: 14,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <ShieldCheck size={13} /> Verify
      </button>

      <p style={{
        fontSize: 10, color: 'var(--text4)',
        fontFamily: "'IBM Plex Mono', monospace",
        textAlign: 'center', marginTop: 14, lineHeight: 1.6,
      }}>
        Scanning the same code twice will check the visitor out.<br />
        Cancelled / expired passes are rejected automatically.
      </p>

      {/* Camera scanner — best-effort, native BarcodeDetector */}
      <CameraButton onCode={onSubmit} />
    </div>
  );
}

/**
 * Optional camera scanner. Uses the native BarcodeDetector API where
 * available (Chrome / Edge on Android). Falls back to nothing on iOS
 * Safari since BarcodeDetector isn't supported — those users can use
 * their phone's built-in camera app to open the QR URL directly.
 */
function CameraButton({ onCode }: { onCode: (code: string) => void }) {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Lazy probe — don't block first paint
    setSupported('BarcodeDetector' in window);
  }, []);

  async function start() {
    if (!('BarcodeDetector' in window)) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      tickScan();
    } catch {
      setActive(false);
    }
  }

  async function tickScan() {
    if (!videoRef.current || !streamRef.current) return;
    // @ts-expect-error BarcodeDetector is not yet in TS lib
    const det = new window.BarcodeDetector({ formats: ['qr_code'] });
    const id = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const found = await det.detect(videoRef.current);
        if (found?.[0]?.rawValue) {
          clearInterval(id);
          stop();
          // Codes encoded as URLs include /gate?code=… — strip back to code
          const raw = found[0].rawValue as string;
          const m = /[?&]code=([^&]+)/.exec(raw);
          onCode(m ? decodeURIComponent(m[1]) : raw);
        }
      } catch { /* keep ticking */ }
    }, 350);
  }

  function stop() {
    setActive(false);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  if (supported === null) return null;
  if (!supported) return (
    <p style={{ fontSize: 10, color: 'var(--text4)', fontFamily: "'IBM Plex Mono', monospace", textAlign: 'center', marginTop: 14 }}>
      ℹ Tip: open your phone's camera app — it can scan the QR and open the gate page automatically.
    </p>
  );

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
      {active ? (
        <>
          <video ref={videoRef} playsInline muted style={{
            width: '100%', borderRadius: 10, background: '#000', maxHeight: 240, objectFit: 'cover',
          }} />
          <button onClick={stop} className="btn-ghost press-soft" style={{ width: '100%', marginTop: 10, padding: '9px 0', fontSize: 12 }}>
            Stop camera
          </button>
        </>
      ) : (
        <button onClick={start} className="btn-ghost press-soft" style={{
          width: '100%', padding: '10px 0', fontSize: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Camera size={12} /> Use device camera
        </button>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
      color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase',
      paddingTop: 3,
    }}>{children}</span>
  );
}
function Value({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{children}</span>;
}
