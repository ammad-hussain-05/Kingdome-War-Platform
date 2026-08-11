"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

function EmberParticle({ delay }: { delay: number }) {
  const left = Math.random() * 100
  const size = 2 + Math.random() * 3
  const duration = 3 + Math.random() * 4

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${left}%`,
        bottom: "0%",
        width: `${size}px`,
        height: `${size}px`,
        background: "radial-gradient(circle, #fbbf24, #c9a84c)",
        opacity: 0.7,
        animation: `ember ${duration}s ease-out ${delay}s infinite`,
        willChange: "transform, opacity",
      }}
    />
  )
}

export function HeroSection() {
  const [embers, setEmbers] = useState<number[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Whether the Hero is currently the section in view — the single source of
  // truth for "should be audible right now". Read by every recovery path
  // below so none of them fight each other over the mute state.
  const wantsAudioRef = useRef(false)

  useEffect(() => {
    setEmbers(Array.from({ length: 25 }, (_, i) => i))
  }, [])

  // Smoothly fades the hero video's own audio in/out. Reaching 0 also mutes
  // the element (belt-and-braces — muted is what actually guarantees the
  // browser allows playback to continue).
  const fadeVolumeTo = (target: number, ms = 900) => {
    const video = videoRef.current
    if (!video) return
    if (fadeRef.current) clearInterval(fadeRef.current)
    const steps = 24
    const stepMs = ms / steps
    const start = video.volume
    const diff = target - start
    let step = 0
    fadeRef.current = setInterval(() => {
      step++
      video.volume = Math.min(1, Math.max(0, start + (diff * step) / steps))
      if (step >= steps) {
        clearInterval(fadeRef.current!)
        if (target === 0) video.muted = true
      }
    }, stepMs)
  }

  // Single place that reconciles the video's actual mute/volume state with
  // `wantsAudioRef`. Safe to call as often as we like — it's a no-op once
  // the element already matches what's wanted.
  const syncAudio = () => {
    const video = videoRef.current
    if (!video) return
    if (wantsAudioRef.current) {
      if (video.muted) {
        video.muted = false
        const p = video.play()
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Browser autoplay policy blocked unmuted playback because no
            // user gesture has happened yet on this page load — stay muted
            // (never leave it paused/broken) and let the first-interaction
            // listener below retry the instant a real gesture occurs.
            video.muted = true
          })
        }
      }
      fadeVolumeTo(1)
    } else {
      fadeVolumeTo(0)
    }
  }

  // Guarantees the background video is always actually playing, on every
  // mount — first server start, client-side nav, or a hard browser refresh
  // alike. A plain `video.play()` on mount isn't enough on its own: after a
  // reload the element can come back with readyState still 0 (no media data
  // decoded yet) right when the effect runs, so the play() call has nothing
  // to play and silently resolves/rejects with no retry. `load()` forces the
  // browser to (re)start the decode pipeline in that case, and the
  // `loadedmetadata`/`canplay` listeners give play() a second, later chance
  // once the browser confirms it's actually ready.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = 0
    video.muted = true

    const tryPlay = () => {
      const p = video.play()
      if (p && typeof p.catch === "function") p.catch(() => {})
    }

    if (video.readyState === 0) {
      video.load()
    }
    tryPlay()

    video.addEventListener("loadedmetadata", tryPlay)
    video.addEventListener("canplay", tryPlay)

    // Safety net: if the video ever ends up paused on its own (an unmuted
    // play() the browser refused mid-stream, a stray user/OS media-key
    // pause, a bfcache restore that resumes the page but not the media)
    // bring the background visual back immediately instead of leaving it
    // frozen. This only forces mute as a last resort — if the resume itself
    // fails while unmuted — so it never silently overrides a working,
    // intentionally-unmuted video the way it used to.
    const resumeIfPaused = () => {
      if (document.visibilityState !== "visible") return
      if (!video.paused) return
      const p = video.play()
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          video.muted = true
          video.play().catch(() => {})
        })
      }
    }
    video.addEventListener("pause", resumeIfPaused)
    document.addEventListener("visibilitychange", resumeIfPaused)
    window.addEventListener("pageshow", resumeIfPaused)

    return () => {
      video.removeEventListener("loadedmetadata", tryPlay)
      video.removeEventListener("canplay", tryPlay)
      video.removeEventListener("pause", resumeIfPaused)
      document.removeEventListener("visibilitychange", resumeIfPaused)
      window.removeEventListener("pageshow", resumeIfPaused)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          wantsAudioRef.current = entry.isIntersecting
          syncAudio()
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Browsers require a genuine user gesture before allowing audible
  // playback. If the Hero is in view but the initial programmatic unmute
  // above got blocked, the very next tap/click/keypress anywhere on the
  // page — inside this synchronous handler, so it still counts as the
  // gesture — retries it. Stops listening once audio has actually unlocked.
  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "touchstart"]
    const removeAll = () => events.forEach((evt) => document.removeEventListener(evt, tryUnlock))
    function tryUnlock() {
      const video = videoRef.current
      if (video && !video.muted) {
        removeAll()
        return
      }
      syncAudio()
    }
    events.forEach((evt) => document.addEventListener(evt, tryUnlock))
    return removeAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050508" }}
    >
      {/* ── VIDEO BACKGROUND ── */}
      {/* Promoted to its own GPU compositor layer (translateZ/backface-hidden + contain)
          so the smooth-scroll rAF loop never forces the video to repaint on the main
          thread — this is what was causing the stutter/freeze while scrolling. */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: "translateZ(0)", contain: "paint layout size" }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          className="w-full h-full object-cover"
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            willChange: "transform",
          }}
        >
          <source src="/video/kingdome-background.mp4" type="video/mp4" />
        </video>

        {/* Single merged overlay — combines the vignette, top/bottom fade and
            center gold glow into one painted layer instead of three, cutting
            paint cost while keeping the exact same look. */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 60%)",
              "linear-gradient(to bottom, rgba(5,5,8,0.8) 0%, transparent 25%, transparent 65%, rgba(5,5,8,0.95) 100%)",
              "radial-gradient(ellipse at 50% 40%, rgba(5,5,8,0.1) 0%, rgba(5,5,8,0.7) 70%, rgba(5,5,8,0.95) 100%)",
            ].join(", "),
          }}
        />
      </div>

      {/* ── EMBER PARTICLES ── */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {embers.map((i) => (
          <EmberParticle key={i} delay={i * 0.2} />
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-20 text-center px-5 sm:px-6 max-w-4xl mx-auto flex flex-col items-center">
        {/* Eyebrow badge */}
        <div
          className="hero-fade inline-flex items-center gap-2.5 mb-7 sm:mb-8 px-4 py-1.5 rounded-full"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "1px solid rgba(201,168,76,0.35)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 24px rgba(201,168,76,0.08)",
            animationDelay: "0ms",
          }}
        >
          <span style={{ color: "#e8c96a", fontSize: 13 }}>⚔</span>
          <span
            style={{
              fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "rgba(232,201,106,0.85)",
            }}
          >
            Premium Strategy Experience
          </span>
        </div>

        {/* Main Title */}
        <div className="hero-title-wrap relative mb-5 sm:mb-6">
          <span className="hero-title-flame" aria-hidden />
          <h1
            className="hero-fade select-none relative"
            style={{
              fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",
              fontSize: "clamp(38px, 9vw, 94px)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              lineHeight: 1.08,
              backgroundImage:
                "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              animation:
                "hero-heading-shimmer 7s linear infinite alternate, hero-title-pulse 3.6s ease-in-out infinite",
              animationDelay: "80ms, 0ms",
            }}
          >
            Kingdom Come
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="hero-fade mb-6"
          style={{
            fontSize: "clamp(11px, 1.8vw, 15px)",
            letterSpacing: "6px",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.8)",
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            animationDelay: "140ms",
          }}
        >
          The New Phenomenon Adventure Game
        </p>

        {/* Divider */}
        <div
          className="hero-fade mx-auto mb-7"
          style={{
            width: "60px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
            animationDelay: "180ms",
          }}
        />

        {/* Subtitle */}
        <p
          className="hero-fade max-w-2xl mx-auto mb-11 sm:mb-12"
          style={{
            fontFamily: "var(--font-crimson-text), 'Crimson Text', serif",
            fontSize: "clamp(16px, 2.1vw, 20px)",
            fontWeight: 500,
            color: "rgba(255,251,240,0.92)",
            lineHeight: 1.85,
            letterSpacing: "0.01em",
            textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.6)",
            animationDelay: "220ms",
          }}
        >
          Enter a world of medieval fantasy where chess meets magic.
          Command legendary characters with unique abilities
          in epic battles for the crown.
        </p>

        {/* CTA */}
        <div className="hero-fade" style={{ animationDelay: "280ms" }}>
          <Link href="/lobby" className="hero-play-btn group">
            <span className="hero-play-btn-glow" aria-hidden />
            <span className="hero-play-btn-border" aria-hidden />
            <span className="hero-play-btn-inner">
              <span className="hero-btn-shine" aria-hidden />
              <span className="relative flex items-center justify-center gap-2.5">
                <span aria-hidden>⚔</span>
                Play Now
              </span>
            </span>
          </Link>
        </div>
      </div>

      {/* ── SCROLL CUE ── */}
      <a
        href="#story"
        aria-label="Scroll to next section"
        className="hero-fade absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5"
        style={{ color: "rgba(201,168,76,0.6)", animationDelay: "420ms" }}
      >
        <span
          style={{
            fontSize: "9px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",
          }}
        >
          Explore
        </span>
        <ChevronDown className="w-4 h-4" style={{ animation: "bounce 2s ease-in-out infinite" }} />
      </a>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes ember {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-60vh) scale(0.8) translateX(20px); opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(0.3) translateX(-10px); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes hero-heading-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade {
          animation: hero-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* ── Heading flame aura ── */
        .hero-title-wrap { display: inline-flex; }
        .hero-title-flame {
          position: absolute;
          inset: -18% -6%;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 55%, rgba(255,130,40,0.32) 0%, rgba(201,168,76,0.14) 45%, transparent 75%);
          filter: blur(26px);
          animation: hero-flame-flicker 2.8s ease-in-out infinite;
          z-index: 0;
        }
        @keyframes hero-flame-flicker {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          25% { opacity: 0.85; transform: scale(1.04); }
          50% { opacity: 0.65; transform: scale(0.98); }
          75% { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes hero-title-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 30px rgba(201,168,76,0.4)) drop-shadow(0 0 64px rgba(201,168,76,0.18));
          }
          50% {
            filter: drop-shadow(0 0 42px rgba(255,150,60,0.55)) drop-shadow(0 0 84px rgba(201,168,76,0.28));
          }
        }

        /* ── Premium "Play Now" battlefield CTA ── */
        .hero-play-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          perspective: 700px;
          border-radius: 12px;
          text-decoration: none;
          transform: translateZ(0);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-play-btn:hover { transform: translateY(-4px); }
        .hero-play-btn:active { transform: translateY(-1px) scale(0.98); }

        .hero-play-btn-glow {
          position: absolute;
          inset: -16px;
          border-radius: 22px;
          background: radial-gradient(circle, rgba(255,140,40,0.4), rgba(201,168,76,0.16) 45%, transparent 75%);
          filter: blur(20px);
          z-index: -1;
          animation: hero-flame-flicker 2.6s ease-in-out infinite;
          transition: opacity 0.35s ease;
        }
        .hero-play-btn:hover .hero-play-btn-glow { opacity: 1; filter: blur(24px); }

        .hero-play-btn-border {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: linear-gradient(120deg, #3a2600, #ffb347, #ff7a1a, #c9a84c, #6b1a00, #ffb347, #3a2600);
          background-size: 300% 300%;
          animation: hero-border-flow 6s ease infinite;
        }

        .hero-play-btn-inner {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 3px;
          padding: 17px 46px;
          border-radius: 9px;
          overflow: hidden;
          background: linear-gradient(135deg, #a67c1e, #e8c96a 45%, #a67c1e);
          color: #1a0d00;
          font-family: var(--font-cinzel-decorative), "Cinzel Decorative", serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -4px 8px rgba(60,30,0,0.35),
            0 10px 24px rgba(0,0,0,0.5);
          transition: background 0.35s ease, box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          transform: rotateX(0deg);
          transform-style: preserve-3d;
        }
        .hero-play-btn:hover .hero-play-btn-inner {
          background: linear-gradient(135deg, #c9a84c, #ffe08a 45%, #c9a84c);
          transform: rotateX(6deg) translateZ(2px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.55),
            inset 0 -4px 8px rgba(60,30,0,0.3),
            0 16px 34px rgba(0,0,0,0.55),
            0 0 30px rgba(201,168,76,0.35);
        }
        .hero-play-btn:active .hero-play-btn-inner {
          transform: rotateX(0deg) translateZ(0);
          box-shadow:
            inset 0 2px 6px rgba(60,30,0,0.4),
            0 4px 14px rgba(0,0,0,0.5);
        }

        @keyframes hero-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .hero-btn-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%);
          transform: translateX(-150%);
          pointer-events: none;
        }
        .hero-play-btn:hover .hero-btn-shine {
          transform: translateX(150%);
          transition: transform 0.9s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade { animation: none; }
          .hero-title-flame,
          .hero-play-btn-glow,
          .hero-play-btn-border { animation: none; }
          h1 { animation: none !important; }
          .hero-play-btn:hover .hero-btn-shine { transition: none; }
        }
      `}</style>
    </section>
  )
}
