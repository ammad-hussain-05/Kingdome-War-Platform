"use client"

import { useEffect } from "react"
import Lenis from "lenis"

declare global {
  interface Window {
    // Read-only handle other components (e.g. Back To Top) can use to drive
    // scrolling through the same Lenis instance instead of fighting it with
    // native scrollTo calls. Set/cleared here only — behavior is unchanged.
    __lenis?: Lenis
  }
}

// Adds cinematic momentum/inertia scrolling site-wide. Purely a scroll-feel
// upgrade — it drives real window scroll (via RAF), so existing
// IntersectionObserver-based reveal effects in other sections keep working
// unchanged. Skipped entirely for prefers-reduced-motion.
export function SmoothScrollProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    window.__lenis = lenis

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      if (window.__lenis === lenis) window.__lenis = undefined
    }
  }, [])

  return null
}
