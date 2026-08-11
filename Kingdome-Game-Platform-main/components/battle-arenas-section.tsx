"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────────
   DATA — all 9 live battlefields
─────────────────────────────────────────────────────────────── */
type ArenaBoard = {
  id: string
  name: string
  size: string
  image: string
  players: string
  tagline: string
  features: string[]
}

type ArenaGroup = {
  key: string
  iconSrc: string
  title: string
  subtitle: string
  boards: ArenaBoard[]
}

// Same three mode icons already used in the lobby's create-room mode selection.
const SIZE_ICON: Record<string, string> = {
  "8×8": "/icons/basic.png",
  "12×12": "/icons/kingdome.png",
  "16×16": "/icons/empire.png",
}

const ARENA_GROUPS: ArenaGroup[] = [
  {
    key: "classic",
    iconSrc: "/icons/basic.png",
    title: "Classic Boards",
    subtitle: "2-Player Warfare",
    boards: [
      {
        id: "classic-8x8",
        name: "Classic 8x8",
        size: "8×8",
        image: "/modes/image-classic-8x8.png",
        players: "2 Players",
        tagline: "Standard Kingdom Warfare",
        features: [
          "2 Player Battle",
          "Classic Kingdom Warfare",
          "Strategic Movement",
          "Capture System",
          "Competitive Gameplay",
        ],
      },
      {
        id: "classic-12x12",
        name: "Classic 12x12",
        size: "12×12",
        image: "/modes/image-classic-12x12.png",
        players: "2 Players",
        tagline: "Expanded Battlefield",
        features: [
          "2 Player Advanced Battle",
          "Expanded Battlefield",
          "New Special Pieces",
          "Wizard & Sorceress Magic",
          "Deeper Strategic Warfare",
        ],
      },
      {
        id: "classic-16x16",
        name: "Classic 16x16",
        size: "16×16",
        image: "/modes/image-classic-16x16.png",
        players: "2 Players",
        tagline: "Ultimate Classic Warfare",
        features: [
          "2 Player Master Battle",
          "Full Empire Roster",
          "Advanced Characters & Abilities",
          "Ethereal Spellcasters",
          "The Ultimate Challenge",
        ],
      },
    ],
  },
  {
    key: "tri",
    iconSrc: "/icons/kingdome.png",
    title: "Tri Boards",
    subtitle: "3-Player Warfare",
    boards: [
      {
        id: "tri-8x8",
        name: "Tri Board 8x8",
        size: "8×8",
        image: "/modes/image-tri-8x8.png",
        players: "3 Players",
        tagline: "Shared Tri Battlefield",
        features: [
          "3 Player Kingdom Battle",
          "Shared Tri Battlefield",
          "White vs Black vs Grey",
          "Strategic Alliances",
          "Triangular Warfare",
        ],
      },
      {
        id: "tri-12x12",
        name: "Tri Board 12x12",
        size: "12×12",
        image: "/modes/image-tri-12x12.png",
        players: "3 Players",
        tagline: "Advanced Kingdom War",
        features: [
          "3 Player Advanced Kingdom War",
          "Spells & Special Abilities",
          "Shared Battlefield",
          "Sorceress & Wizard Magic",
          "Expanded Tri Combat",
        ],
      },
      {
        id: "tri-16x16",
        name: "Tri Board 16x16",
        size: "16×16",
        image: "/modes/image-tri-16x16.png",
        players: "3 Players",
        tagline: "Ultimate 3-Player Battlefield",
        features: [
          "3 Player Empire Warfare",
          "Full Spell Arsenal",
          "Advanced Characters & Abilities",
          "Ultimate Tri Battlefield",
          "Grand-Scale Kingdom War",
        ],
      },
    ],
  },
  {
    key: "x",
    iconSrc: "/icons/empire.png",
    title: "X Boards",
    subtitle: "4-Player Warfare",
    boards: [
      {
        id: "x-8x8",
        name: "X Board 8x8",
        size: "8×8",
        image: "/modes/image-X-8x8.png",
        players: "4 Players",
        tagline: "Multiplayer X Battlefield",
        features: [
          "4 Player Multiplayer Battle",
          "Cross-Shaped Battlefield",
          "Shifting Alliances",
          "4-Way Warfare",
          "Classic Board Combat",
        ],
      },
      {
        id: "x-12x12",
        name: "X Board 12x12",
        size: "12×12",
        image: "/modes/image-X-12x12.png",
        players: "4 Players",
        tagline: "Advanced X Warfare",
        features: [
          "4 Player Advanced Warfare",
          "Special Abilities",
          "Expanded X-Shaped Grid",
          "Sorceress & Wizard Magic",
          "Total Kingdom War",
        ],
      },
      {
        id: "x-16x16",
        name: "X Board 16x16",
        size: "16×16",
        image: "/modes/image-X-16x16.png",
        players: "4 Players",
        tagline: "Ultimate X Battlefield",
        features: [
          "4 Player Empire Warfare",
          "Advanced Characters & Abilities",
          "Full Spell Arsenal",
          "Grand-Scale X Combat",
          "The Largest Battlefield",
        ],
      },
    ],
  },
]

/* ──────────────────────────────────────────────────────────────
   SCROLL REVEAL HOOK
─────────────────────────────────────────────────────────────── */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, inView }
}

/* ──────────────────────────────────────────────────────────────
   FLOATING MODE EMBLEM — the actual mode icon, no circle backing,
   just a slow 3D rotation + float + glow.
─────────────────────────────────────────────────────────────── */
function ModeEmblem({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative inline-flex items-center justify-center mb-5" style={{ perspective: 900 }}>
      <div
        className="absolute -inset-6 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,140,40,0.4), transparent 70%)",
          filter: "blur(24px)",
          animation: "ba-emblem-flicker 3.2s ease-in-out infinite",
        }}
      />
      <img
        src={src}
        alt={alt}
        className="relative w-20 h-20 sm:w-24 sm:h-24 object-contain"
        style={{
          filter: "drop-shadow(0 0 16px rgba(255,180,60,0.6)) drop-shadow(0 8px 16px rgba(0,0,0,0.55))",
          animation: "ba-emblem-spin 9s linear infinite",
          transformStyle: "preserve-3d",
        }}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   ARENA CARD — stable dark premium card, no motion/animation
─────────────────────────────────────────────────────────────── */
function ArenaCard({ board }: { board: ArenaBoard }) {
  const sizeIcon = SIZE_ICON[board.size]

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(12,9,5,0.94), rgba(5,5,8,0.97))",
        border: "1px solid rgba(201,168,76,0.32)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* LIVE badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-[#7dbd6e]/40 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7dbd6e] animate-pulse-glow" />
        <span className="text-[10px] font-bold tracking-widest text-[#a8e89a] uppercase">Live</span>
      </div>

      {/* Preview image */}
      <div className="relative h-48 overflow-hidden border-b border-[#c9a84c]/20">
        <img src={board.image} alt={board.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/50 to-transparent" />
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/55 border border-[#c9a84c]/25 text-[11px] font-semibold text-[#e8c96a] tracking-wide backdrop-blur-sm">
          {board.size}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <h3 className="font-serif text-xl font-bold text-[#f4ddb0] mb-1 drop-shadow-[0_0_12px_rgba(201,168,76,0.25)]">
          {board.name}
        </h3>
        <p className="text-xs italic text-[#c9a84c]/60 mb-3">{board.tagline}</p>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] px-2 py-1 rounded bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
            {board.players}
          </span>
        </div>

        <ul className="space-y-1.5 mb-5">
          {board.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-[#e8dfc8]/75 leading-snug">
              <span className="mt-0.5 text-[#c9a84c]">◆</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/lobby"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-[12px] uppercase tracking-[0.15em] text-[#f0d080] border border-[#c9a84c]/50 bg-[#c9a84c]/10 shadow-[0_0_18px_rgba(201,168,76,0.12)] transition-colors duration-300 hover:bg-[#c9a84c] hover:text-[#1a0d00] hover:border-[#e8c96a] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)]"
        >
          {sizeIcon && <img src={sizeIcon} alt="" className="w-4 h-4 object-contain" />}
          Enter Battle
        </Link>
      </div>

      {/* corner accents */}
      <div className="pointer-events-none absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-[#c9a84c]/40" />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   GROUP — centered floating emblem + heading, card grid
─────────────────────────────────────────────────────────────── */
function ArenaGroupSection({ group }: { group: ArenaGroup }) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div ref={ref} className="mb-20 last:mb-0">
      <div
        className={cn(
          "flex flex-col items-center text-center mb-10 transition-all duration-700",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}
      >
        <ModeEmblem src={group.iconSrc} alt={group.title} />
        <h3
          className="font-serif text-2xl sm:text-3xl font-extrabold uppercase tracking-wide"
          style={{ color: "#f0d080", textShadow: "0 0 25px rgba(201,168,76,0.4)" }}
        >
          {group.title}
        </h3>
        <p className="text-[11px] uppercase tracking-[0.25em] mt-2" style={{ color: "rgba(201,168,76,0.55)" }}>
          {group.subtitle}
        </p>
        <div className="w-16 h-px mt-4" style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {group.boards.map((board, i) => (
          <div
            key={board.id}
            className={cn(
              "transition-all duration-700",
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            )}
            style={{ transitionDelay: inView ? `${i * 120}ms` : "0ms" }}
          >
            <ArenaCard board={board} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   SECTION
─────────────────────────────────────────────────────────────── */
export function BattleArenasSection() {
  return (
    <section
      id="battle-arenas"
      className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-b from-[#050508] via-[#0a0704] to-[#050508]"
    >
      <style>{`
        @keyframes ba-emblem-spin {
          0%   { transform: translateY(0)    rotateY(0deg); }
          25%  { transform: translateY(-5px) rotateY(90deg); }
          50%  { transform: translateY(0)    rotateY(180deg); }
          75%  { transform: translateY(-5px) rotateY(270deg); }
          100% { transform: translateY(0)    rotateY(360deg); }
        }
        @keyframes ba-emblem-flicker {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes ba-heading-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* ambient glow orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#c9a84c]/10 blur-[100px] animate-float" />
      <div
        className="pointer-events-none absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#c9a84c]/[0.08] blur-[120px] animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/25 text-[11px] uppercase tracking-[0.3em] text-[#e8c96a] font-bold mb-6">
            ⚜ 9 Live Battlefields
          </span>
          <h2
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4"
            style={{
              backgroundImage: "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              filter: "drop-shadow(0 0 30px rgba(201,168,76,0.4)) drop-shadow(0 0 60px rgba(201,168,76,0.2))",
              animation: "ba-heading-shimmer 7s linear infinite alternate",
            }}
          >
            Kingdom Come Arenas
          </h2>
          <p className="text-[#c9a84c]/60 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Three battle systems. Nine living battlefields. Choose your kingdom, gather your army, and step onto
            the board that suits your strategy — every arena below is live and ready for war.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mt-6" />
        </div>

        {ARENA_GROUPS.map((group) => (
          <ArenaGroupSection key={group.key} group={group} />
        ))}

        {/* Bottom CTA */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#c9a84c]/40 uppercase tracking-widest mb-6">
            Every battlefield connects to the live Kingdom Come lobby — create a room or join an ally in seconds
          </p>
          <Link
            href="/lobby"
            className="group/cta relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest text-[#1a0d00] overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #d4a843, #e8c96a, #c4912a)",
              boxShadow: "0 10px 30px rgba(212,168,67,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <span
              className="absolute inset-0 -translate-x-[150%] group-hover/cta:translate-x-[150%] transition-transform duration-700 ease-out"
              style={{ background: "linear-gradient(75deg,transparent 40%, rgba(255,255,255,0.45) 50%, transparent 60%)" }}
            />
            <span className="relative z-10">⚔ Enter the Lobby</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
