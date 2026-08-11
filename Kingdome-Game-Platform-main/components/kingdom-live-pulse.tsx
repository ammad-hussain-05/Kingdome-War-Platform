"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eye, Radio, Hourglass, Gamepad2, ChevronUp, ChevronDown } from "lucide-react"

const VISITOR_STORAGE_KEY = "kc_visitor_id"
const DAY_MS = 24 * 60 * 60 * 1000

function getOrCreateVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY)
    if (existing) return existing
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `kc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(VISITOR_STORAGE_KEY, fresh)
    return fresh
  } catch {
    return `kc-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

// Formats elapsed ms as a rolling 24h clock — wraps to 00:00:00 the instant it hits 24h,
// without waiting for the next server sync.
function formatDayClock(ms: number): string {
  const wrapped = ((ms % DAY_MS) + DAY_MS) % DAY_MS
  const totalSeconds = Math.floor(wrapped / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const EMBERS = Array.from({ length: 7 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 37.9) % 92),
  top: 4 + ((i * 59.3) % 92),
  dur: 3.5 + ((i * 1.6) % 4),
  del: (i * 0.55) % 3,
}))

// Generic eased count-up tween — used for both the visitor and games-played counters,
// each with its own RAF ref so the two animations never cancel one another.
function useCountTween(initial: number) {
  const [displayed, setDisplayed] = useState(initial)
  const rafRef = useRef<number | null>(null)

  const animateTo = useCallback((from: number, to: number) => {
    if (from === to) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const duration = 900
    const diff = to - from
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(from + diff * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setDisplayed(to)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return [displayed, animateTo] as const
}

export function KingdomLivePulse() {
  const [displayedCount, animateTo] = useCountTween(772)
  const [displayedGames, animateGamesTo] = useCountTween(520)
  const [dayStart, setDayStart] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const [gamesPulsing, setGamesPulsing] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [collapsed, setCollapsed] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const visitorId = getOrCreateVisitorId()

    fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { count: number; dayStart: number }) => {
        if (cancelled) return
        animateTo(displayedCount, data.count)
        setPulsing(true)
        setTimeout(() => setPulsing(false), 1200)
        setDayStart(data.dayStart)
      })
      .catch(() => {
        if (cancelled) return
        setDayStart(Date.now())
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Games Played — read-only display; the actual increment happens from the game board page.
  useEffect(() => {
    let cancelled = false
    fetch("/api/games-played")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { count: number }) => {
        if (cancelled) return
        animateGamesTo(displayedGames, data.count)
        setGamesPulsing(true)
        setTimeout(() => setGamesPulsing(false), 1200)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-syncs with the server periodically so the daily fallback growth and
  // the 24h timer rollover reflect on-screen even on a long-lived tab.
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/visitors")
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data: { count: number; dayStart: number }) => {
          if (data.count !== displayedCount) animateTo(displayedCount, data.count)
          setDayStart(data.dayStart)
        })
        .catch(() => {})

      fetch("/api/games-played")
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data: { count: number }) => {
          if (data.count !== displayedGames) animateGamesTo(displayedGames, data.count)
        })
        .catch(() => {})
    }, 60_000)
    return () => clearInterval(id)
  }, [displayedCount, animateTo, displayedGames, animateGamesTo])

  useEffect(() => {
    if (dayStart === null) return
    setElapsedMs(Date.now() - dayStart)
    const id = setInterval(() => setElapsedMs(Date.now() - dayStart), 1000)
    return () => clearInterval(id)
  }, [dayStart])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -9, y: px * 9 })
  }
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40 pointer-events-none">
      <style>{`
        @keyframes kcp-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes kcp-border-flow-rev {
          0% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes kcp-flicker {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes kcp-ember-float {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.6; }
          100% { transform: translateY(-28px) scale(1.1); opacity: 0; }
        }
        @keyframes kcp-count-glow {
          0%, 100% { text-shadow: 0 0 12px rgba(201,168,76,0.4); }
          50% { text-shadow: 0 0 32px rgba(255,190,90,1), 0 0 54px rgba(201,168,76,0.6); }
        }
        @keyframes kcp-dot-pulse {
          0%, 100% { box-shadow: 0 0 4px 1px rgba(125,189,110,0.6); }
          50% { box-shadow: 0 0 12px 4px rgba(160,230,140,0.95); }
        }
        @keyframes kcp-heading-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative pointer-events-auto select-none"
        style={{ perspective: 700 }}
      >
        <div
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.25s ease-out",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ambient embers */}
          {!collapsed &&
            EMBERS.map((e) => (
              <span
                key={e.id}
                className="absolute rounded-full"
                style={{
                  left: `${e.left}%`,
                  top: `${e.top}%`,
                  width: 3,
                  height: 3,
                  background: "#ffb347",
                  boxShadow: "0 0 7px 2px rgba(255,179,71,0.75)",
                  animation: `kcp-ember-float ${e.dur}s ${e.del}s ease-in-out infinite`,
                  pointerEvents: "none",
                }}
              />
            ))}

          {/* flame-glow ambience — stronger, wider bleed */}
          <div
            className="pointer-events-none absolute -inset-5 rounded-2xl"
            style={{
              zIndex: -1,
              background:
                "radial-gradient(circle, rgba(255,140,40,0.45), rgba(201,168,76,0.16) 45%, transparent 75%)",
              filter: "blur(26px)",
              animation: "kcp-flicker 2.8s ease-in-out infinite",
            }}
          />

          {/* dual-layer animated flame border — two counter-flowing gradients for a visibly alive edge */}
          <div
            className="relative rounded-2xl"
            style={{
              padding: 3,
              background:
                "linear-gradient(120deg, #2a1800, #ffcf6b, #ff7a1a, #e8c96a, #5a1400, #ffb347, #2a1800)",
              backgroundSize: "300% 300%",
              animation: "kcp-border-flow 5.5s ease infinite",
              boxShadow:
                "0 22px 60px rgba(0,0,0,0.65), 0 0 55px rgba(255,140,40,0.3), 0 0 100px rgba(201,168,76,0.18)",
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none opacity-70"
              style={{
                padding: 3,
                background:
                  "linear-gradient(60deg, transparent, rgba(255,255,255,0.5), transparent, rgba(255,140,40,0.4), transparent)",
                backgroundSize: "250% 250%",
                animation: "kcp-border-flow-rev 4s linear infinite",
                mixBlendMode: "overlay",
              }}
            />

            <div
              className="relative rounded-2xl overflow-hidden backdrop-blur-xl"
              style={{
                background: "linear-gradient(160deg, rgba(12,7,2,0.94), rgba(4,3,6,0.97))",
              }}
            >
              {/* corner accents */}
              {["top-1.5 left-1.5 border-t border-l", "top-1.5 right-1.5 border-t border-r", "bottom-1.5 left-1.5 border-b border-l", "bottom-1.5 right-1.5 border-b border-r"].map(
                (cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-2.5 h-2.5 ${cls} pointer-events-none`}
                    style={{ borderColor: "rgba(232,201,106,0.6)" }}
                  />
                )
              )}

              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand realm status" : "Collapse realm status"}
                className="absolute top-1 right-1 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full z-10"
                style={{ color: "rgba(201,168,76,0.6)" }}
              >
                {collapsed ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              </button>

              {collapsed ? (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#7dbd6e", animation: "kcp-dot-pulse 2s infinite" }}
                  />
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-wider" style={{ color: "#e8c96a" }}>
                    {displayedCount.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div className="px-3 py-2.5 sm:px-5 sm:py-4 min-w-40 sm:min-w-55">
                  {/* Title bar */}
                  <div
                    className="flex items-center gap-1.5 mb-2 pb-1.5 sm:mb-3 sm:pb-2"
                    style={{ borderBottom: "1px solid rgba(201,168,76,0.18)" }}
                  >
                    <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: "#ffb347" }} />
                    <span
                      className="font-serif text-[10px] sm:text-[13px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.14em]"
                      style={{
                        backgroundImage:
                          "linear-gradient(100deg, #8a611c 0%, #ffe08a 30%, #fff3d0 50%, #e8c96a 70%, #8a611c 100%)",
                        backgroundSize: "220% auto",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        color: "transparent",
                        animation: "kcp-heading-shimmer 6s linear infinite alternate",
                      }}
                    >
                      Kingdom Live Pulse
                    </span>
                  </div>

                  {/* Visitors */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Eye className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: "rgba(201,168,76,0.7)" }} />
                    <span
                      className="font-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em]"
                      style={{ color: "rgba(201,168,76,0.65)" }}
                    >
                      Kingdom Visitors
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <span
                      className="font-serif text-lg sm:text-[28px] font-bold tabular-nums"
                      style={{
                        color: "#f0d080",
                        animation: pulsing ? "kcp-count-glow 1.1s ease-in-out" : "none",
                      }}
                    >
                      {displayedCount.toLocaleString()}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-1 py-0.5 sm:px-1.5 rounded"
                      style={{ background: "rgba(125,189,110,0.14)", border: "1px solid rgba(125,189,110,0.4)" }}
                    >
                      <span
                        className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0"
                        style={{ background: "#7dbd6e", animation: "kcp-dot-pulse 2s infinite" }}
                      />
                      <span className="font-mono text-[7px] sm:text-[9px] font-bold tracking-widest" style={{ color: "#a8e89a" }}>
                        LIVE
                      </span>
                    </span>
                  </div>

                  <div
                    className="h-px mb-2 sm:mb-3"
                    style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.4), transparent)" }}
                  />

                  {/* Games Played */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Gamepad2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: "rgba(201,168,76,0.7)" }} />
                    <span
                      className="font-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em]"
                      style={{ color: "rgba(201,168,76,0.65)" }}
                    >
                      Games Played
                    </span>
                  </div>
                  <div
                    className="font-serif text-lg sm:text-[28px] font-bold tabular-nums mb-2 sm:mb-3"
                    style={{
                      color: "#f0d080",
                      animation: gamesPulsing ? "kcp-count-glow 1.1s ease-in-out" : "none",
                    }}
                  >
                    {displayedGames.toLocaleString()}
                  </div>

                  <div
                    className="h-px mb-2 sm:mb-3"
                    style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.4), transparent)" }}
                  />

                  {/* Realm timer */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hourglass className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: "rgba(201,168,76,0.7)" }} />
                    <span
                      className="font-mono text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.2em]"
                      style={{ color: "rgba(201,168,76,0.65)" }}
                    >
                      Realm Active Time
                    </span>
                  </div>
                  <div className="font-mono text-xs sm:text-lg font-bold tabular-nums" style={{ color: "#e8c96a" }}>
                    {dayStart === null ? "--:--:--" : formatDayClock(elapsedMs)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
