import { useEffect, useRef, useState, useCallback } from 'react';
import { Eraser } from 'lucide-react';

interface Props {
  onChange: (dataUrl: string | null) => void;
  /** Optional initial signature (data URL). */
  value?: string | null;
  height?: number;
}

/**
 * Tiny vanilla-canvas signature pad.
 *  - Mouse + touch + pen support
 *  - Resizes with parent (uses ResizeObserver)
 *  - Calls onChange(dataUrl) on every stroke end, onChange(null) on clear
 *
 * Why not pull in a library: ~120 lines, no deps, fully styled to ResiHub.
 */
export default function SignaturePad({ onChange, value, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const drawing   = useRef(false);
  const lastPt    = useRef<{ x: number; y: number } | null>(null);
  const [hasInk,  setHasInk] = useState(!!value);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr  = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    canvas.width  = rect.width * dpr;
    canvas.height = height       * dpr;
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#fff';

    // Re-paint the existing value (if any) — fit-to-canvas
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, height);
      img.src = value;
    }
  }, [height, value]);

  useEffect(() => {
    fitCanvas();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(fitCanvas);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitCanvas]);

  function ptFromEvent(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPt.current  = ptFromEvent(e);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPt.current) return;
    const pt = ptFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
  }
  function onUp() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPt.current  = null;
    const data = canvasRef.current?.toDataURL('image/png') ?? null;
    setHasInk(true);
    onChange(data);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          display: 'block', width: '100%', height,
          background: 'rgba(255,255,255,.03)',
          border: '1.5px dashed rgba(0,204,204,.35)',
          borderRadius: 10,
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />
      {!hasInk && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
        }}>
          Sign here using mouse / finger / stylus
        </div>
      )}
      {hasInk && (
        <button type="button" onClick={clear}
          style={{
            position: 'absolute', top: 8, right: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 6,
            background: 'rgba(0,0,0,.55)', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          }}>
          <Eraser size={11} /> Clear
        </button>
      )}
    </div>
  );
}
