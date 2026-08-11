"use client"

import { useEffect, useRef, useState } from "react"

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"], [data-cursor-hover]'
const MAGNETIC_SELECTOR = "[data-magnetic]"
const MAGNETIC_STRENGTH = 0.35

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (isCoarsePointer || prefersReducedMotion) return
    setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let ringX = mouseX
    let ringY = mouseY
    let pressScale = 1
    let magneticEl: HTMLElement | null = null
    let rafId = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`

      if (magneticEl) {
        const rect = magneticEl.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = (mouseX - cx) * MAGNETIC_STRENGTH
        const dy = (mouseY - cy) * MAGNETIC_STRENGTH
        magneticEl.style.transform = `translate(${dx}px, ${dy}px)`
      }
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const magnet = target.closest(MAGNETIC_SELECTOR) as HTMLElement | null
      if (magnet) {
        magneticEl = magnet
        magnet.style.transition = "transform 0.15s ease-out"
      }
      if (target.closest(INTERACTIVE_SELECTOR)) {
        ring.style.width = "52px"
        ring.style.height = "52px"
        ring.style.borderColor = "rgba(232,201,106,0.9)"
        ring.style.boxShadow = "0 0 24px rgba(201,168,76,0.55)"
      }
    }

    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (magneticEl && target.closest(MAGNETIC_SELECTOR) === magneticEl) {
        magneticEl.style.transform = "translate(0px, 0px)"
        magneticEl = null
      }
      if (!target.closest(INTERACTIVE_SELECTOR)) {
        ring.style.width = "28px"
        ring.style.height = "28px"
        ring.style.borderColor = "rgba(201,168,76,0.55)"
        ring.style.boxShadow = "0 0 10px rgba(201,168,76,0.25)"
      }
    }

    const onDown = () => {
      pressScale = 0.85
    }
    const onUp = () => {
      pressScale = 1
    }

    const tick = () => {
      ringX += (mouseX - ringX) * 0.18
      ringY += (mouseY - ringY) * 0.18
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${pressScale})`
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true })
    document.addEventListener("mouseover", onOver, true)
    document.addEventListener("mouseout", onOut, true)
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseover", onOver, true)
      document.removeEventListener("mouseout", onOut, true)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      cancelAnimationFrame(rafId)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <style>{`
        html, html * { cursor: none !important; }
      `}</style>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-9999 rounded-full"
        style={{
          width: 6,
          height: 6,
          background: "#e8c96a",
          boxShadow: "0 0 8px rgba(232,201,106,0.9)",
          transform: "translate3d(-50%, -50%, 0)",
          willChange: "transform",
        }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-9998 rounded-full"
        style={{
          width: 28,
          height: 28,
          border: "1px solid rgba(201,168,76,0.55)",
          boxShadow: "0 0 10px rgba(201,168,76,0.25)",
          transform: "translate3d(-50%, -50%, 0)",
          transition: "width 0.25s ease, height 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.1s ease-out",
          willChange: "transform",
        }}
      />
    </>
  )
}
