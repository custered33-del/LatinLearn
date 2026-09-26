import { prefersReducedMotion } from './hooks';

/** A short, dependency-free confetti burst on a temporary canvas. */
export function confetti(colors: string[] = ['#7c4dff', '#ff4f79', '#ff9f43', '#12b886', '#3d7bff']): void {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 140 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    s: 6 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
