'use client'

import { useEffect, useRef, useState } from 'react'

type Props = { loading: boolean }

const COLS = 7
const ROWS = 5

export default function PageLoader({ loading }: Props) {
  const [mounted, setMounted]   = useState(true)
  const [closing, setClosing]   = useState(false)
  const [progress, setProgress] = useState(0)
  const tilesRef  = useRef<HTMLDivElement>(null)
  const rafRef    = useRef<number | null>(null)
  const closeRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── build tiles (called on mount + resize) ── */
  const buildTiles = () => {
    const el = tilesRef.current
    if (!el) return
    el.innerHTML = ''
    const W = el.offsetWidth || window.innerWidth
    const H = el.offsetHeight || window.innerHeight
    const tw = W / COLS
    const th = H / ROWS
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const cx  = col - (COLS - 1) / 2
      const cy  = row - (ROWS - 1) / 2
      const tx  = Math.round(cx * 200 + (Math.random() * 80 - 40))
      const ty  = Math.round(cy * 200 + (Math.random() * 80 - 40))
      const rot = (Math.random() * 70 - 35).toFixed(1)
      const rx  = (Math.random() * 60 - 30).toFixed(1)
      const ry  = (Math.random() * 60 - 30).toFixed(1)
      const dist  = Math.sqrt(cx * cx + cy * cy)
      const delay = (dist * 0.065 + Math.random() * 0.07).toFixed(3)
      const d = document.createElement('div')
      d.style.cssText = `
        position:absolute;
        left:${col * tw}px;top:${row * th}px;
        width:${tw + 1}px;height:${th + 1}px;
        background:rgba(8,5,1,0.94);
        border:1px solid rgba(210,170,60,0.05);
        will-change:transform,opacity;
        transform-origin:center center;
        --tx:${tx}px;--ty:${ty}px;
        --rot:${rot}deg;--rx:${rx}deg;--ry:${ry}deg;
        animation-delay:${delay}s;
      `
      d.className = 'kcTile'
      el.appendChild(d)
    }
  }

  /* ── progress 0→100 with easing ── */
  const startProgress = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setProgress(0)
    const start = performance.now()
    const dur   = 2200
    const tick  = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      setProgress(Math.round(e * 100))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  /* ── show loader ── */
  useEffect(() => {
    if (!loading) return
    if (closeRef.current) clearTimeout(closeRef.current)
    setMounted(true)
    setClosing(false)
    setProgress(0)
    const t = setTimeout(() => { buildTiles(); startProgress() }, 30)
    return () => clearTimeout(t)
  }, [loading])

  /* ── hide loader ── */
  useEffect(() => {
    if (loading) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setClosing(true)
    closeRef.current = setTimeout(() => setMounted(false), 1700)
    return () => { if (closeRef.current) clearTimeout(closeRef.current) }
  }, [loading])

  /* ── resize ── */
  useEffect(() => {
    const onResize = () => { if (!closing) buildTiles() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [closing])

  if (!mounted) return null

  const contentStyle: React.CSSProperties = closing ? {
    animation: 'kcContentOut 0.35s ease forwards',
  } : {}

  return (
    <>
      {/* ── all styles scoped inside this component ── */}
      <style>{`
        .kcLoader {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          overflow: hidden;
          pointer-events: all;
          background: #050201;
        }
        /* golden ambient bg */
        .kcBg {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            radial-gradient(ellipse at 30% 60%, #1a1000 0%, #050201 60%),
            linear-gradient(135deg, #0c0800 0%, #050201 50%, #0e0900 100%);
        }
        .kcBg::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 65% 38%, rgba(200,150,30,0.18) 0%, transparent 52%),
            radial-gradient(circle at 22% 68%, rgba(160,110,10,0.13) 0%, transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(180,130,20,0.10) 0%, transparent 40%);
          animation: kcBgPulse 4s ease-in-out infinite;
        }
        /* vignette */
        .kcVignette {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: radial-gradient(ellipse at center, transparent 28%, rgba(3,2,0,0.78) 100%);
          pointer-events: none;
        }
        /* video */
        .kcVideo {
          position: absolute;
          inset: 0;
          z-index: 3;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.02);
        }
        /* tiles container */
        .kcTiles {
          position: absolute;
          inset: 0;
          z-index: 10;
        }
        /* tile scatter animation applied when closing */
        .kcClosing .kcTile {
          animation: kcTileOut 1s cubic-bezier(0.15,0,0.3,1) forwards !important;
        }
        @keyframes kcTileOut {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
          25%  { opacity: 1; }
          100% {
            transform:
              translate(var(--tx), var(--ty))
              rotate(var(--rot))
              scale(0.65)
              perspective(400px)
              rotateX(var(--rx))
              rotateY(var(--ry));
            opacity: 0;
          }
        }
        /* content */
        .kcContent {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          padding: 20px;
          text-align: center;
          pointer-events: none;
        }
        @keyframes kcContentOut {
          0%   { opacity:1; transform:scale(1) translateY(0); filter:blur(0); }
          100% { opacity:0; transform:scale(0.93) translateY(-10px); filter:blur(8px); }
        }
        /* logo ring */
        .kcLogoRing {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          border: 1px solid rgba(255,210,120,0.35);
          background: radial-gradient(circle, rgba(255,220,160,0.1), transparent 70%);
          box-shadow:
            0 0 0 8px rgba(210,160,50,0.07),
            0 0 50px rgba(210,160,50,0.22),
            0 0 90px rgba(210,160,50,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: kcLogoPulse 2s ease-in-out infinite;
        }
        .kcLogoImg {
          width: 90px;
          height: 90px;
          object-fit: contain;
          filter:
            drop-shadow(0 0 8px rgba(255,220,142,0.6))
            drop-shadow(0 0 24px rgba(212,168,67,0.35));
        }
        @keyframes kcLogoPulse {
          0%,100% {
            transform: scale(0.97);
            box-shadow:
              0 0 0 8px rgba(210,160,50,0.05),
              0 0 40px rgba(210,160,50,0.15),
              0 0 80px rgba(210,160,50,0.07);
          }
          50% {
            transform: scale(1.03);
            box-shadow:
              0 0 0 8px rgba(210,160,50,0.12),
              0 0 60px rgba(210,160,50,0.32),
              0 0 110px rgba(210,160,50,0.14);
          }
        }
        /* title shimmer */
        .kcTitle {
          margin: 0;
          font-family: var(--font-cinzel-decorative, Georgia, serif);
          font-size: clamp(28px, 5vw, 76px);
          line-height: 1;
          letter-spacing: 0.18em;
          font-weight: 900;
          background: linear-gradient(
            105deg,
            #c9a84c 0%, #f5e49c 38%, #fffbe8 50%, #f5e49c 62%, #c9a84c 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: kcShimmer 3s linear infinite;
        }
        @keyframes kcShimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        /* subtitle */
        .kcSubtitle {
          margin: -4px 0 0;
          font-family: var(--font-crimson-text, Georgia, serif);
          font-size: clamp(9px, 1.4vw, 13px);
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(255,220,160,0.62);
        }
        /* progress bar */
        .kcBarWrap {
          position: relative;
          width: min(320px, 76vw);
          height: 3px;
          background: rgba(255,220,140,0.12);
          border-radius: 99px;
          overflow: hidden;
        }
        .kcBarFill {
          position: absolute;
          left: 0; top: 0;
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #a07820, #f0d060, #fffacc, #f0d060, #a07820);
          background-size: 200% auto;
          transition: width 0.08s linear;
          animation: kcBarShimmer 1.5s linear infinite;
        }
        @keyframes kcBarShimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .kcBarPct {
          font-family: var(--font-crimson-text, Georgia, serif);
          font-size: 11px;
          letter-spacing: 0.22em;
          color: rgba(255,210,120,0.5);
          margin-top: -6px;
        }
        @keyframes kcBgPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.65; }
        }
        /* responsive */
        @media (max-width: 640px) {
          .kcLogoRing { width: 100px; height: 100px; }
          .kcLogoImg  { width: 68px;  height: 68px;  }
          .kcTitle    { font-size: clamp(22px, 9vw, 42px); letter-spacing: 0.1em; }
          .kcSubtitle { font-size: 9px; letter-spacing: 0.2em; }
          .kcBarWrap  { width: min(240px, 80vw); }
        }
        @media (max-width: 380px) {
          .kcLogoRing { width: 84px; height: 84px; }
          .kcLogoImg  { width: 56px; height: 56px; }
          .kcTitle    { font-size: clamp(18px, 8vw, 32px); letter-spacing: 0.08em; }
        }
      `}</style>

      <div className={`kcLoader${closing ? ' kcClosing' : ''}`}>
        <div className="kcBg" />
        <div className="kcVignette" />

        {/* video — loader ke saath hi unmount hogi */}
        <video className="kcVideo" autoPlay muted loop playsInline preload="auto">
          <source src="/videos/loader-bg.mp4" type="video/mp4" />
        </video>

        {/* 35 tiles — JS se build */}
        <div className="kcTiles" ref={tilesRef} />

        {/* content */}
        <div className="kcContent" style={contentStyle}>
          <div className="kcLogoRing">
            <img src="/logo/logo.png" alt="Kingdom Come" className="kcLogoImg" />
          </div>
          <h1 className="kcTitle">KINGDOM COME</h1>
          <p className="kcSubtitle">Preparing the battlefield</p>
          <div className="kcBarWrap">
            <div className="kcBarFill" style={{ width: `${progress}%` }} />
          </div>
          <span className="kcBarPct">{progress}%</span>
        </div>
      </div>
    </>
  )
}