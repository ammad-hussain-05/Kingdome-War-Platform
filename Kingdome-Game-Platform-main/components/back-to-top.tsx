"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"

const SHOW_AFTER_PX = 480

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const tickingRef = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER_PX)
        tickingRef.current = false
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleClick = () => {
    // Routes through the site's existing Lenis instance (exposed by
    // SmoothScrollProvider) so this never fights its momentum scrolling.
    // Falls back to native scrolling only if Lenis isn't running (e.g. the
    // user has prefers-reduced-motion, which Lenis itself is skipped for).
    const lenis = window.__lenis
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2 })
      return
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  }

  return (
    <div className="fixed z-40 pointer-events-none bottom-3 left-3 sm:bottom-6 sm:left-6">
      <style>{`
        @keyframes btt-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes btt-flicker {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        .btt-btn {
          position: relative;
          display: inline-flex;
          width: 46px;
          height: 46px;
          border-radius: 9999px;
          perspective: 500px;
          transform: translateZ(0) scale(0.85) translateY(10px);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
        }
        @media (min-width: 640px) {
          .btt-btn { width: 52px; height: 52px; }
        }
        .btt-btn.is-visible {
          opacity: 1;
          transform: translateZ(0) scale(1) translateY(0);
          pointer-events: auto;
        }
        .btt-glow {
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255,140,40,0.4), rgba(201,168,76,0.14) 45%, transparent 75%);
          filter: blur(16px);
          z-index: -1;
          animation: btt-flicker 2.8s ease-in-out infinite;
          transition: opacity 0.3s ease;
        }
        .btt-border {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: linear-gradient(120deg, #3a2600, #ffb347, #ff7a1a, #c9a84c, #6b1a00, #ffb347, #3a2600);
          background-size: 300% 300%;
          animation: btt-border-flow 6s ease infinite;
        }
        .btt-inner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px;
          width: calc(100% - 4px);
          height: calc(100% - 4px);
          border-radius: 9999px;
          background: linear-gradient(150deg, rgba(12,7,2,0.94), rgba(4,3,6,0.97));
          color: #e8c96a;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.1),
            0 10px 24px rgba(0,0,0,0.5);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, color 0.35s ease;
          transform-style: preserve-3d;
        }
        .btt-btn:hover .btt-inner {
          transform: translateY(-3px) rotateX(8deg);
          color: #ffe08a;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 16px 32px rgba(0,0,0,0.55),
            0 0 26px rgba(201,168,76,0.4);
        }
        .btt-btn:hover .btt-glow { opacity: 1; filter: blur(20px); }
        .btt-btn:active .btt-inner { transform: translateY(0) rotateX(0); }
        .btt-btn:focus-visible .btt-inner {
          outline: 2px solid rgba(232,201,106,0.85);
          outline-offset: 2px;
        }
        .btt-icon {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btt-btn:hover .btt-icon { transform: translateY(-2px); }

        @media (prefers-reduced-motion: reduce) {
          .btt-btn { transition: opacity 0.2s ease; }
          .btt-border, .btt-glow { animation: none; }
        }
      `}</style>

      <button
        type="button"
        onClick={handleClick}
        aria-label="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={`btt-btn${visible ? " is-visible" : ""}`}
      >
        <span className="btt-glow" aria-hidden />
        <span className="btt-border" aria-hidden />
        <span className="btt-inner">
          <ArrowUp className="btt-icon w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  )
}
