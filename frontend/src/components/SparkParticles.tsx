import { useEffect, useRef } from 'react';

interface Spark {
  x:     number;
  y:     number;
  vx:    number;
  vy:    number;
  size:  number;
  alpha: number;
  decay: number;
}

interface Props {
  /** Primary hex colour, e.g. '#E8197A' */
  color?: string;
  /** Average sparks spawned per frame (0–1 for <1/frame) */
  rate?:  number;
}

export default function SparkParticles({ color = '#E8197A', rate = 0.14 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sparks: Spark[] = [];
    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawn() {
      if (!canvas) return;
      sparks.push({
        x:     Math.random() * canvas.width,
        y:     canvas.height + 6,
        // Slow drift — building floats at ~0.09-0.15 px/frame; sparks match that scale
        vx:    (Math.random() - 0.5) * 0.28,
        vy:    -(Math.random() * 0.42 + 0.11),
        size:  Math.random() * 2.2 + 0.7,
        alpha: Math.random() * 0.65 + 0.22,
        // Slow fade — each spark lives ~10–14 s at 60 fps
        decay: 0.0012 + Math.random() * 0.0015,
      });
    }

    /** Append two-digit hex for alpha 0–1 */
    function aa(a: number) {
      return Math.round(a * 255).toString(16).padStart(2, '0');
    }

    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < rate) spawn();

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x     += s.vx;
        s.y     += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0 || s.y < -12) { sparks.splice(i, 1); continue; }

        // Core glowing dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${aa(s.alpha)}`;
        ctx.fill();

        // Soft glow halo
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 5);
        g.addColorStop(0, `${color}${aa(s.alpha * 0.4)}`);
        g.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [color, rate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
