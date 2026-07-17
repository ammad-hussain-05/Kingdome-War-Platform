"use client";

import { useEffect, useRef } from "react";

// ─── FIREWORKS ────────────────────────────────────────────────────────────────
// Shared victory-screen particle-burst canvas, used by every board type
// (8x8, 12x12, 16x16, Tri) so the effect only needs to be maintained once.
export default function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    type P = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number };
    const particles: P[] = [];
    const colors = ["#FFD700", "#FFF700", "#FF6B35", "#E8DFC0", "#C8A96E", "#FF4500", "#FFA500", "#FFFFFF", "#FFB6C1", "#00FFFF", "#FF00FF", "#ADFF2F"];
    const burst = (x: number, y: number, big = false) => {
      for (let i = 0; i < (big ? 120 : 70); i++) {
        const angle = Math.random() * Math.PI * 2, speed = big ? Math.random() * 14 + 4 : Math.random() * 10 + 3;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (big ? 5 : 3), alpha: 1, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * (big ? 6 : 4) + 2 });
      }
    };
    const timers = [
      setTimeout(() => burst(canvas.width * .3, canvas.height * .35, true), 0),
      setTimeout(() => burst(canvas.width * .7, canvas.height * .3, true), 150),
      setTimeout(() => burst(canvas.width * .5, canvas.height * .25, true), 300),
    ];
    let frame = 0;
    let raf = 0;
    const loop = () => {
      ctx.fillStyle = "rgba(0,0,0,0.13)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frame % 18 === 0) burst(Math.random() * canvas.width, Math.random() * canvas.height * .65, frame % 54 === 0);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += .12; p.alpha -= .014;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        if (p.size > 4) { ctx.shadowBlur = 10; ctx.shadowColor = p.color; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      frame++;
      if (frame < 420) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    loop();
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 99, pointerEvents: "none" }} />;
}
