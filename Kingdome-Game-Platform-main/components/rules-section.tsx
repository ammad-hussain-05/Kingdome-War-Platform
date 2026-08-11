"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { ScrollText, Swords, Move, Sparkles, Castle, Crown } from "lucide-react"

type RuleCard = {
  icon: LucideIcon
  title: string
  points: string[]
}

const RULE_CARDS: RuleCard[] = [
  {
    icon: Swords,
    title: "Battle System",
    points: [
      "Turn-based combat across nine unique battlefields — 2-player Classic duels, 3-player Tri wars, and 4-player X campaigns.",
      "There are no pawns. The Paladin holds the front line instead, moving and striking in all eight directions rather than forward-only.",
      "Every move is graded Great, Safe, or Risky in real time, helping commanders read the board like a true strategist.",
      "The Mexican Standoff: a player may pass their turn at any time, with no limit on how many times.",
    ],
  },
  {
    icon: Move,
    title: "Movement Rules",
    points: [
      "Standard pieces move as their rank demands — the King one square, the Queen/Rook/Bishop in unlimited slides, the Knight in an L-leap that clears anything in its path.",
      "Ethereal casters — the Wizard and Sorceress on every board, plus the Conjurer, Warlock, and Trickster on Empire (16x16) boards — pass through ordinary pieces like ghosts.",
      "Only a Wizard or Sorceress can kill a Wizard or Sorceress. Lesser ethereals can kill one another, but never the privileged pair.",
      "Board size scales the roster: 8x8 fields six piece types, 12x12 thirteen, and the full 16x16 Empire boards nineteen.",
    ],
  },
  {
    icon: Sparkles,
    title: "Abilities & Spells",
    points: [
      "The Paladin's Super Strike leaps past its normal range once per game (2 squares on 8x8 boards, 3 on 12x12/16x16), and its Reverse Castle can swap places with an ally at any time, unlimited.",
      "The Sorceress carries 3 spell charges — Sleep and Teleport always succeed, but Wish alone is decided by a ten-sided die: roll above 5 for a free global teleport, or lose the charge for nothing.",
      "The Super Queen's Double Move only holds while her own Sorceress is alive — a Mage can sacrifice itself beside her to restore it if the Sorceress falls.",
      "The Executioner's Axe Swing triggers automatically the instant its slide ends beside an enemy — a second strike for free.",
      "On Empire (16x16) boards: the Conjurer's one-time Revive, the Warlock's Bind that freezes every enemy piece for a full round, the Thief's one-time Triple-Jump Steal, and the Trickster's unlimited reposition teleport.",
    ],
  },
  {
    icon: Castle,
    title: "Kingdom Warfare",
    points: [
      "Classic Boards (8x8 / 12x12 / 16x16): a 2-player duel, White against Black.",
      "Tri Kingdom Boards (8x8 / 12x12 / 16x16): three kingdoms — White, Black, and Grey — clash across a shared triangular battlefield.",
      "X Kingdom Boards (8x8 / 12x12 / 16x16): four kingdoms — White, Black, Grey, and Golden — converge from every side of a cross-shaped battlefield.",
      "If a player leaves or is eliminated in a Tri or X battle, the remaining kingdoms fight on without interruption.",
    ],
  },
  {
    icon: Crown,
    title: "Victory Conditions",
    points: [
      "A player is eliminated only when every single one of their pieces has been removed from the battlefield.",
      "Capturing the enemy King is treated as an ordinary casualty — it does not end the game and does not eliminate that player by itself.",
      "The last kingdom standing wins. When only one player remains on the battlefield, that player is declared the winner.",
      "The Trickster's Last Stand: if it becomes an army's only remaining piece, the hunt begins. On Classic and X boards, failing to destroy it within 10 turns resets the entire board to its starting position. On Tri boards, that player is eliminated once their Trickster survives 10 of their own turns.",
    ],
  },
]

const CARD_HEIGHT = 380

function IconBadge({ Icon, active }: { Icon: LucideIcon; active: boolean }) {
  return (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all duration-300"
      style={{
        background: "linear-gradient(145deg,#241705,#0a0805)",
        border: `1px solid ${active ? "rgba(232,201,106,.6)" : "rgba(212,168,67,.3)"}`,
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,.1), 0 0 22px rgba(201,168,76,.45)"
          : "inset 0 1px 0 rgba(255,255,255,.06), 0 6px 18px rgba(0,0,0,.5)",
        transform: active ? "scale(1.08)" : "scale(1)",
      }}
    >
      <Icon className="w-5 h-5" style={{ color: "#e8c96a" }} />
    </div>
  )
}

function TreeCard({
  card,
  isHovered,
  isDimmed,
  centerShift = 0,
  onEnter,
  onLeave,
  isMobile = false,
  isExpanded = false,
  onToggle,
}: {
  card: RuleCard
  isHovered: boolean
  isDimmed: boolean
  centerShift?: number
  onEnter?: () => void
  onLeave?: () => void
  isMobile?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}) {
  const Icon = card.icon
  // Desktop: hover pops the card up/out with a 3D scale. Mobile: tapping instead
  // grows the card's own height in place (scaling on a full-width mobile card
  // pushed it past the viewport edges, clipping the text) so nothing is ever cut off.
  const active = isMobile ? isExpanded : isHovered

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isMobile || !onToggle) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div
      onMouseEnter={isMobile ? undefined : onEnter}
      onMouseLeave={isMobile ? undefined : onLeave}
      onFocus={isMobile ? undefined : onEnter}
      onBlur={isMobile ? undefined : onLeave}
      onClick={isMobile ? onToggle : undefined}
      onKeyDown={isMobile ? handleKeyDown : undefined}
      tabIndex={0}
      role={isMobile ? "button" : undefined}
      aria-expanded={isMobile ? isExpanded : undefined}
      className="relative rounded-2xl overflow-hidden outline-none w-full"
      style={
        isMobile
          ? {
              maxHeight: isExpanded ? 900 : CARD_HEIGHT,
              transition:
                "max-height 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease",
              cursor: "pointer",
              background: "linear-gradient(150deg, rgba(0,0,0,.62), rgba(18,12,3,.5))",
              border: `1px solid ${active ? "rgba(232,201,106,0.8)" : "rgba(212,168,67,0.22)"}`,
              boxShadow: active
                ? "0 24px 60px rgba(0,0,0,.6), 0 0 50px rgba(201,168,76,.4), inset 0 1px 0 rgba(255,255,255,.12)"
                : "0 10px 26px rgba(0,0,0,.4)",
            }
          : {
              height: CARD_HEIGHT,
              transformStyle: "preserve-3d",
              transform: isHovered
                ? `translate(${centerShift}px, -32px) translateZ(110px) scale(1.45)`
                : "translate(0px, 0px) translateZ(0) scale(1)",
              transition:
                "transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease, filter 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease",
              opacity: isDimmed ? 0.4 : 1,
              filter: isDimmed ? "saturate(0.5) brightness(0.65)" : "none",
              zIndex: isHovered ? 50 : 1,
              background: "linear-gradient(150deg, rgba(0,0,0,.62), rgba(18,12,3,.5))",
              border: `1px solid ${isHovered ? "rgba(232,201,106,0.8)" : "rgba(212,168,67,0.22)"}`,
              boxShadow: isHovered
                ? "0 44px 100px rgba(0,0,0,.7), 0 0 80px rgba(201,168,76,.55), inset 0 1px 0 rgba(255,255,255,.12)"
                : "0 10px 26px rgba(0,0,0,.4)",
            }
      }
    >
      {/* shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-1100 ease-out"
        style={{
          transform: active ? "translateX(150%)" : "translateX(-150%)",
          background: "linear-gradient(75deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)",
        }}
      />
      {/* top accent line */}
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, #3a2600, #ffb347, #e8c96a, #ffb347, #3a2600)",
          backgroundSize: "200% 100%",
          animation: "sr-border-flow 5s linear infinite",
        }}
      />

      <div className={`relative flex flex-col p-5 ${isMobile ? "" : "h-full"}`}>
        <div className="flex items-center gap-2.5 mb-3 shrink-0">
          <IconBadge Icon={Icon} active={active} />
          <h3 className="font-serif text-lg sm:text-xl font-bold leading-tight" style={{ color: "#f0d080" }}>
            {card.title}
          </h3>
        </div>

        <ul
          className={`sr-scroll space-y-2.5 ${isMobile ? "max-h-full overflow-y-auto pr-1" : "flex-1 overflow-y-auto pr-1"}`}
          data-lenis-prevent
        >
          {card.points.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] sm:text-sm leading-relaxed"
              style={{ color: "rgba(232,223,200,0.72)" }}
            >
              <span
                className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ background: "#c9a84c", boxShadow: "0 0 6px rgba(201,168,76,0.6)" }}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {["top-2 left-2 border-t border-l", "top-2 right-2 border-t border-r", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-2.5 h-2.5 ${cls} pointer-events-none transition-opacity`}
          style={{ borderColor: "rgba(232,201,106,0.6)", opacity: active ? 1 : 0 }}
        />
      ))}
    </div>
  )
}

function RuleTree({ cards }: { cards: RuleCard[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const enter = (i: number) => setHoveredIndex(i)
  const leave = () => setHoveredIndex(null)

  // Mobile uses explicit tap-to-expand (hover/focus don't map cleanly to touch),
  // kept as separate state so it never interferes with the desktop hover tree.
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null)
  const toggleMobile = (i: number) => setMobileExpanded((prev) => (prev === i ? null : i))

  const tickStyle = (i: number): React.CSSProperties => ({
    background: hoveredIndex === i ? "#e8c96a" : "rgba(201,168,76,0.3)",
    boxShadow: hoveredIndex === i ? "0 0 12px rgba(232,201,106,0.8)" : "none",
    transition: "all 0.35s ease",
  })

  return (
    <div className="relative" style={{ perspective: 1600 }}>
      {/* Root hub */}
      <div className="flex justify-center mb-2">
        <div
          className="relative flex items-center justify-center w-12 h-12 rounded-full"
          style={{
            background: "linear-gradient(145deg,#241705,#0a0805)",
            border: "1px solid rgba(212,168,67,.4)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 0 20px rgba(201,168,76,0.25)",
            animation: "sr-hub-pulse 3.5s ease-in-out infinite",
          }}
        >
          <ScrollText className="w-5 h-5" style={{ color: "#e8c96a" }} />
        </div>
      </div>

      {/* ── Desktop / tablet horizontal tree ── */}
      <div className="hidden sm:block">
        <div className="flex justify-center">
          <div className="w-px h-8" style={{ background: "linear-gradient(180deg, rgba(201,168,76,0.5), rgba(201,168,76,0.15))" }} />
        </div>
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }} />
        <div className="grid grid-cols-5">
          {cards.map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="w-px h-8" style={tickStyle(i)} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-4 sm:gap-5 py-6">
          {cards.map((card, i) => (
            <TreeCard
              key={card.title}
              card={card}
              isHovered={hoveredIndex === i}
              isDimmed={hoveredIndex !== null && hoveredIndex !== i}
              centerShift={(2 - i) * 70}
              onEnter={() => enter(i)}
              onLeave={leave}
            />
          ))}
        </div>
      </div>

      {/* ── Mobile vertical tree ── */}
      <div className="sm:hidden relative pl-6">
        <div
          className="absolute left-3 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(180deg, rgba(201,168,76,0.5), rgba(201,168,76,0.15))" }}
        />
        <div className="space-y-6">
          {cards.map((card, i) => (
            <div key={card.title} className="relative">
              <div className="absolute -left-6 top-9 w-6 h-px" style={tickStyle(i)} />
              <TreeCard
                card={card}
                isHovered={hoveredIndex === i}
                isDimmed={hoveredIndex !== null && hoveredIndex !== i}
                isMobile
                isExpanded={mobileExpanded === i}
                onToggle={() => toggleMobile(i)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RulesSection() {
  return (
    <section id="rules" className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#050508" }}>
      <style>{`
        @keyframes sr-border-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes sr-flicker {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes sr-heading-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes sr-hub-pulse {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 20px rgba(201,168,76,0.25); }
          50% { box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 32px rgba(201,168,76,0.5); }
        }
        .sr-scroll::-webkit-scrollbar { width: 4px; }
        .sr-scroll::-webkit-scrollbar-track { background: transparent; }
        .sr-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.35); border-radius: 4px; }
      `}</style>

      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute -inset-2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,140,40,0.35), transparent 70%)", filter: "blur(14px)", animation: "sr-flicker 3s ease-in-out infinite" }}
            />
            <div
              className="relative flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                background: "linear-gradient(145deg,#241705,#0a0805)",
                border: "1px solid rgba(212,168,67,.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.6)",
              }}
            >
              <ScrollText className="w-7 h-7" style={{ color: "#e8c96a" }} />
            </div>
          </div>

          <h2
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold mb-4"
            style={{
              backgroundImage: "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.03em",
              filter: "drop-shadow(0 0 30px rgba(201,168,76,0.35)) drop-shadow(0 0 60px rgba(201,168,76,0.18))",
              animation: "sr-heading-shimmer 7s linear infinite alternate",
            }}
          >
            The Sacred Rules
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed" style={{ color: "rgba(232,223,200,0.55)" }}>
            The official codex of Kingdom Come — the battle laws that govern every kingdom, every board,
            and every war fought across the realm.
          </p>
          <div className="w-24 h-1 mx-auto mt-6" style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        </div>

        {/* Rule tree */}
        <RuleTree cards={RULE_CARDS} />

        {/* Bottom note */}
        <div
          className="mt-24 p-6 sm:p-8 rounded-2xl text-center"
          style={{
            background: "linear-gradient(150deg, rgba(0,0,0,.55), rgba(18,12,3,.4))",
            border: "1px solid rgba(212,168,67,.22)",
            boxShadow: "0 16px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(212,168,67,.08)",
          }}
        >
          <p className="text-sm sm:text-base italic font-serif" style={{ color: "rgba(240,208,128,0.85)" }}>
            &ldquo;A king may fall, yet the kingdom fights on. Only when the last banner is torn from the field
            does a realm truly perish.&rdquo;
          </p>
          <p className="text-xs mt-3 uppercase tracking-widest" style={{ color: "rgba(201,168,76,0.5)" }}>— The Kingdom Come Codex</p>
        </div>
      </div>
    </section>
  )
}
