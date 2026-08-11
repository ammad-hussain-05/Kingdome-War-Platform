"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react"

type Ability = { name: string; effect: string; note?: string }
type Spell = { name: string; effect: string; usage: string; limit?: string }

type Character = {
  name: string
  tagline: string
  description: string
  image: string
  board: string
  abilities: Ability[]
  spells?: Spell[]
}

const characters: Character[] = [
  {
    name: "The King",
    tagline: "The Crown That Refuses To Fall.",
    description:
      "The heart of every kingdom, the King commands from the center of the battlefield rather than hiding behind it. Unlike traditional chess, losing the King does not end the war — his fall is treated as an ordinary casualty, and the fight rages on until one army is wiped out entirely. Every piece is built to shield him, and an exposed King is a weakness the enemy will exploit.",
    image: "/all-characters/King.png",
    board: "8x8 Boards",
    abilities: [
      { name: "Royal Step", effect: "Moves and strikes one square in any of the eight directions." },
      { name: "Unbreakable Reign", effect: "Capturing the King does not end the battle — the war continues until an entire army is eliminated.", note: "Applies in every game mode." },
    ],
  },
  {
    name: "The Queen",
    tagline: "One Queen. Every Direction. No Mercy.",
    description:
      "The single most versatile weapon in any classic army, the Queen commands every rank, file, and diagonal at once. She is usually the first piece an opponent tries to neutralize, and the first a smart commander protects — losing her early can decide a battle before it truly begins.",
    image: "/all-characters/Queen.png",
    board: "8x8 Boards",
    abilities: [
      { name: "Sovereign Slide", effect: "Slides an unlimited number of squares in any of the eight directions, combining a Rook's power with a Bishop's reach.", note: "No cooldown — usable every turn." },
    ],
  },
  {
    name: "The Rook",
    tagline: "Fortress on the Move.",
    description:
      "A wall given legs — the Rook holds open lines and punishes any army that leaves a file or rank undefended. Weakest in cramped positions, it becomes nearly unstoppable once the board opens up in the late game.",
    image: "/all-characters/Rook.png",
    board: "8x8 Boards",
    abilities: [
      { name: "Siege Line", effect: "Slides an unlimited number of squares along any rank or file.", note: "Blocked by the first piece in its path." },
    ],
  },
  {
    name: "The Bishop",
    tagline: "One Color. Total Control.",
    description:
      "The Bishop patrols a single diagonal color for its entire life, weaving through the battlefield to control long-range diagonals the enemy can't easily close off. Two Bishops working together can pin down an entire wing of the board.",
    image: "/all-characters/Bishop.png",
    board: "8x8 Boards",
    abilities: [
      { name: "Diagonal Reach", effect: "Slides an unlimited number of squares along any diagonal.", note: "Permanently restricted to the square color it started on." },
    ],
  },
  {
    name: "The Knight",
    tagline: "Over Every Wall.",
    description:
      "The only classic piece that ignores the battlefield's clutter entirely, the Knight vaults over allies and enemies alike to land where nothing else can reach. It thrives in closed positions where sliding pieces are boxed in.",
    image: "/all-characters/Knight.png",
    board: "8x8 Boards",
    abilities: [
      { name: "L-Leap", effect: "Jumps in an L-shape to one of eight possible squares, clearing any piece in between.", note: "Fixed range — cannot be extended." },
    ],
  },
  {
    name: "The Paladin",
    tagline: "The Shield That Strikes Back.",
    description:
      "The backbone of every army, the Paladin replaces the pawn entirely — it moves and attacks in all eight directions instead of only forward, making it a far more dangerous frontline unit. Beneath its simple stance hides real firepower: a one-time Super Strike that catches overextended enemies off guard, and a Reverse Castle that lets it trade places with a stronger ally to bring firepower to the front line.",
    image: "/all-characters/Paladin.png",
    board: "All Boards",
    abilities: [
      { name: "Vanguard Step", effect: "Moves and attacks one square in any of the eight directions — forward, backward, or sideways.", note: "No forward-only restriction, unlike a traditional pawn." },
      { name: "Super Strike", effect: "Leaps 2 squares in any direction to strike a distant target (3 squares on 12x12 and 16x16 boards). Orthogonal strikes can jump over an occupied square; diagonal strikes need a clear path.", note: "Usable only once per Paladin, per game." },
      { name: "Reverse Castle", effect: "Swaps places with any adjacent friendly piece, pulling a stronger ally into the front line while the Paladin steps back.", note: "Unlimited uses, no cooldown." },
      { name: "Back-Rank Retrieval", effect: "Reaching the enemy's back rank lets its owner resurrect one previously captured piece onto that square.", note: "8x8 boards only — requires at least one piece already in the graveyard." },
    ],
  },
  {
    name: "The Mystic King",
    tagline: "The Last One Standing Wins The Crown.",
    description:
      "A stronger, more mobile King fit for the grander battlefields of Kingdom War and Empire. He leaps like a Knight while retaining a King's one-square step, making him far harder to corner. When the battle turns desperate, he can call on his own Wizard for one final, game-changing transformation.",
    image: "/all-characters/Mystic King.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Regal Leap", effect: "Moves either one square in any direction or in a Knight's L-shape.", note: "Combines two movement types into one piece." },
    ],
    spells: [
      {
        name: "Last Wish (Wizard Morph)",
        effect: "Sacrifices his own Wizard to permanently transform into any other piece in the army — Super Queen, Dragon, Gargoyle, Sorceress, Super Knight, Assassin, Executioner, Cavalier, Mage, Elven Archer, or Paladin.",
        usage: "Requires the player's own Wizard to still be alive on the board.",
        limit: "One-time — the Wizard is lost the moment the morph is used.",
      },
    ],
  },
  {
    name: "The Super Queen",
    tagline: "She Moves Twice. She Kills Twice.",
    description:
      "The Queen's more dangerous evolution — everything the Queen can do, doubled. While her Sorceress remains alive, the Super Queen gets to move again immediately after her first move in the same turn, letting her strike twice as far and twice as fast as any other piece on the board.",
    image: "/all-characters/Super Queen.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Sovereign Slide", effect: "Slides an unlimited number of squares in any of the eight directions." },
      { name: "Double Move", effect: "Immediately takes a second move in the same turn.", note: "Active only while her own Sorceress is alive; lost the instant the Sorceress falls, and restorable only by a Mage's Sacrifice." },
    ],
  },
  {
    name: "The Dragon",
    tagline: "Wings of Fire. Death From Above.",
    description:
      "The most versatile striker in the Kingdom, the Dragon combines a Queen's mobility with an L-shaped aerial strike that ignores everything standing in its path — including its own allies. No formation is truly safe from a Dragon that can fly clean over a wall of pieces to land the kill.",
    image: "/all-characters/Dragon.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Dragon's Wing", effect: "Slides an unlimited number of squares in any direction, or strikes one square away with claw and tail." },
      { name: "Fly-Over Strike", effect: "Executes an L-shaped strike that flies over every piece in between — friend or foe — landing only on an enemy.", note: "Can only be used to capture; cannot land on an empty square." },
    ],
  },
  {
    name: "The Gargoyle",
    tagline: "Stone by Day. Death by Night.",
    description:
      "The Gargoyle trades a sliding attack for pure close-range devastation. It never moves far, but every single turn it can lash out with two different strikes, making it a nightmare for any piece that strays within two squares.",
    image: "/all-characters/Gargoyle.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Wing & Tail Sweep", effect: "Strikes exactly one square away in any of the eight directions." },
      { name: "Fire Attack", effect: "Strikes exactly two squares away in any of the eight directions, ignoring the square in between.", note: "Both attacks are available every turn with no cooldown." },
    ],
  },
  {
    name: "The Wizard",
    tagline: "Master of Teleportation. Ethereal Guardian.",
    description:
      "Dwelling half outside the physical battlefield, the Wizard slides like a Queen but cannot be touched by ordinary pieces — only another Wizard or Sorceress can end his life. His true power isn't in combat, though: with a touch, he can fold space itself, relocating any piece on the board to reshape the battlefield in an instant.",
    image: "/all-characters/Wizard.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Ethereal Slide", effect: "Slides an unlimited number of squares in any direction, but cannot capture non-magical pieces — human pieces block his path like a wall.", note: "Can only capture an enemy Wizard or Sorceress." },
    ],
    spells: [
      {
        name: "Teleport",
        effect: "Instantly moves any piece on the board — friend or foe — to any empty square.",
        usage: "Click the Wizard, then the piece to relocate.",
        limit: "Unlimited uses, no cooldown.",
      },
    ],
  },
  {
    name: "The Sorceress",
    tagline: "Three Spells. One Wish. Game Over.",
    description:
      "The Sorceress fights with magic instead of muscle — an ethereal slider who can reshape the battlefield with three devastating spells. But her power is finite: every spell cast burns one of only three charges for her entire life, and once they're spent, she vanishes from the board.",
    image: "/all-characters/Sorceress.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Ethereal Slide", effect: "Slides an unlimited number of squares in any direction, but cannot capture non-magical pieces.", note: "Can only capture an enemy Wizard or Sorceress." },
    ],
    spells: [
      { name: "Sleep", effect: "Puts any enemy piece anywhere on the board to sleep for 3 rounds — it cannot move or act at all.", usage: "Target any enemy piece, anywhere on the battlefield.", limit: "Guaranteed effect, no dice roll — consumes 1 of her 3 charges." },
      { name: "Teleport", effect: "Moves any of her own pieces to any empty square on the board.", usage: "Target any friendly piece and an empty destination square.", limit: "Guaranteed effect — consumes 1 of her 3 charges." },
      { name: "Wish", effect: "Rolls a 10-sided die. Rolling above 5 grants a free global teleport with the Wizard's full reach; rolling 5 or below ends her turn with no effect.", usage: "Cast like any other spell — the outcome is decided by the dice.", limit: "The charge is spent either way, win or lose the roll." },
    ],
  },
  {
    name: "The Super Knight",
    tagline: "Strikes Where None Can Follow.",
    description:
      "A pure knight-shaped striker built for the larger battlefields of Kingdom War and Empire. It gives up every other movement option in exchange for an unpredictable jump that ignores the clutter of a crowded board.",
    image: "/all-characters/Super Knight.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "L-Leap", effect: "Jumps in a Knight's L-shape to reach squares no sliding piece can touch, clearing anything standing in between." },
    ],
  },
  {
    name: "The Assassin",
    tagline: "Three Weapons. One Target.",
    description:
      "The Assassin fuses three different fighting styles into a single blade — able to slide across open ground, leap like a Knight, or strike at point-blank range, all in the same turn. There is no safe distance from an Assassin.",
    image: "/all-characters/Assassin.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Triple Threat", effect: "Combines an unlimited slide in any direction with a Knight's L-jump and a one-square strike — every option is available on every turn." },
    ],
  },
  {
    name: "The Executioner",
    tagline: "One Strike. Then The Axe Falls.",
    description:
      "The Executioner marches in straight lines like a Rook, but the real danger comes after the slide stops — its axe swings automatically at any enemy caught adjacent to where it lands, turning a single move into a double kill.",
    image: "/all-characters/Executioner.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Straight March", effect: "Slides an unlimited number of squares along any rank or file." },
      { name: "Axe Swing", effect: "Immediately after completing its slide, it may strike one adjacent enemy piece for free, without moving onto its square.", note: "Triggers automatically after any completed slide. Unlimited uses." },
    ],
  },
  {
    name: "The Cavalier Prince",
    tagline: "Noble Blood. Battlefield Instinct.",
    description:
      "Part knight, part royal guard, the Cavalier Prince blends a Knight's unpredictable leap with a bodyguard's short-range strike, letting him cover ground and protect key squares in the same breath.",
    image: "/all-characters/Cavalier Prince.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Prince's Gambit", effect: "Moves in a Knight's L-shape or steps one square in any direction, choosing whichever suits the position." },
    ],
  },
  {
    name: "The Mage Princess",
    tagline: "Her Sacrifice Saves The Crown.",
    description:
      "The Mage slides freely across the battlefield, but her true value is what she's willing to give up. Standing beside the Super Queen, she can lay down her own life to restore her queen's deadliest power — even after it's been lost.",
    image: "/all-characters/Mage-Princess.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Arcane Glide", effect: "Slides an unlimited number of squares in any direction." },
      { name: "Sacrifice", effect: "Removes herself from the board to fully restore the adjacent Super Queen's Double Move.", note: "Requires standing directly next to her own Super Queen. Works even after that Super Queen's Sorceress has already fallen." },
    ],
  },
  {
    name: "The Elven Archer",
    tagline: "Moves Like A Queen. Fights Like A Knight.",
    description:
      "Deceptively versatile, the Elven Archer combines long-range mobility with a Knight's leap and a Paladin-style close strike, giving commanders a piece that adapts to almost any battlefield situation.",
    image: "/all-characters/Elven Archer.png",
    board: "12x12 • 16x16",
    abilities: [
      { name: "Ranger's Instinct", effect: "Combines an unlimited slide in any direction with a Knight's L-jump and a one-square strike, all usable on the same turn." },
    ],
  },
  {
    name: "The Conjurer",
    tagline: "Death Is Not The End.",
    description:
      "A lesser spirit of the ethereal order, the Conjurer slides through the battlefield untouched by ordinary weapons, though even a Wizard or Sorceress remains beyond its reach. Its true gift is defying the graveyard itself, pulling a single fallen soldier back into the fight.",
    image: "/all-characters/Conjurer.png",
    board: "16x16 Only",
    abilities: [
      { name: "Spectral Slide", effect: "Slides an unlimited number of squares in any direction and can capture other ethereal pieces.", note: "Cannot capture a Wizard or Sorceress." },
    ],
    spells: [
      { name: "Revive", effect: "Brings one of its own captured pieces back onto an empty square on the battlefield.", usage: "Choose any previously captured friendly piece and an empty destination square.", limit: "One charge for the entire game." },
    ],
  },
  {
    name: "The Warlock",
    tagline: "One Chain. Every Enemy Frozen.",
    description:
      "The Warlock moves like the Conjurer but wields a far more terrifying gift — the power to freeze an entire enemy army in place. A single successful Bind can steal an opponent's whole turn, and with it, the initiative.",
    image: "/all-characters/Warlock.png",
    board: "16x16 Only",
    abilities: [
      { name: "Spectral Slide", effect: "Slides an unlimited number of squares in any direction and can capture other ethereal pieces.", note: "Cannot capture a Wizard or Sorceress." },
    ],
    spells: [
      { name: "Bind", effect: "Freezes every enemy piece on the board for one full round — none of them can move or act.", usage: "Can only be cast immediately after the Warlock completes a normal move.", limit: "Unlimited uses on Classic and X boards; only once per game on Tri boards." },
    ],
  },
  {
    name: "The Trickster",
    tagline: "Hunt Him In Ten, Or Watch The Battle Reset.",
    description:
      "A living paradox on the battlefield — the Trickster slides like a Queen and can relocate any piece, friend or foe, without ever making a kill. But his true weapon is fear: if he ever becomes an army's last piece, the enemy has exactly ten turns to hunt him down, or the entire board resets to the start.",
    image: "/all-characters/Trickster.png",
    board: "16x16 Only",
    abilities: [
      { name: "Phantom Slide", effect: "Slides an unlimited number of squares in any direction, capturing only other ethereal pieces." },
      { name: "Reposition", effect: "Teleports any piece on the board — friend or foe — to any empty square without capturing it.", note: "Unlimited uses on Classic and X boards." },
      { name: "Last Stand Curse", effect: "If the Trickster becomes the only piece left in its army, the opponent has 10 turns to eliminate it.", note: "Failing to kill it in time resets the entire board to its starting position." },
    ],
  },
  {
    name: "The Thief",
    tagline: "One Jump. Gone Forever.",
    description:
      "The Thief hides in plain sight as a simple slider, but hoards one devastating trick — a triple-range jump that steals an enemy piece clean off the board, vanishing it without a trace while the Thief calmly takes its place.",
    image: "/all-characters/Thief.png",
    board: "16x16 Only",
    abilities: [
      { name: "Shadow Slide", effect: "Slides an unlimited number of squares in any direction." },
      { name: "Triple-Jump Steal", effect: "Strikes a target 2 or 3 squares away in any direction, ignoring anything in between — the target simply disappears, and the Thief ends up standing on its square.", note: "Usable only once per game. Cannot be used while asleep or bound." },
    ],
  },
  {
    name: "The Archer",
    tagline: "Precision Without Sorcery.",
    description:
      "The purest ranged striker in the Empire's ranks, the Archer relies on nothing but reach and accuracy — no spells, no gimmicks, just a bow that can reach any square on an open line.",
    image: "/all-characters/Archer.png",
    board: "16x16 Only",
    abilities: [
      { name: "Longbow Volley", effect: "Slides an unlimited number of squares in any of the eight directions.", note: "No special ability beyond its full-board mobility." },
    ],
  },
  {
    name: "The Acrobat Assassin",
    tagline: "No Wall. No Escape.",
    description:
      "The deadliest version of the Assassin bloodline, the Acrobat Assassin adds a final twist to its L-shaped leap — it can now vault clean over any piece, even an enemy, to land its strike. Nothing on the board can safely stand between it and its target.",
    image: "/all-characters/Acrobat Assassin.png",
    board: "16x16 Only",
    abilities: [
      { name: "Acrobat's Gambit", effect: "Combines an unlimited slide in any direction with a one-square strike and an L-shaped jump that ignores every piece in its path — even enemies." },
    ],
  },
]

function Character3DCard({ character, isActive }: { character: Character; isActive: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current; if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left; const y = e.clientY - rect.top
    setTilt({ x: ((y - rect.height / 2) / (rect.height / 2)) * -15, y: ((x - rect.width / 2) / (rect.width / 2)) * 15 })
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }, [])

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setIsHovered(false) }} onMouseEnter={() => setIsHovered(true)} className="relative cursor-pointer select-none" style={{ perspective: "1200px", width: "100%", maxWidth: "400px", margin: "0 auto" }}>
      <div style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`, transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out", transformStyle: "preserve-3d" }}>

        {/* flame-glow ambience, bleeds outside the border */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-2xl"
          style={{
            zIndex: -1,
            background: "radial-gradient(circle, rgba(255,130,40,0.4), rgba(201,168,76,0.14) 45%, transparent 75%)",
            filter: "blur(24px)",
            animation: "kc-flame-flicker 2.6s ease-in-out infinite",
          }}
        />

        {/* animated fantasy border — living flame gradient */}
        <div
          className="relative rounded-2xl"
          style={{
            padding: 3,
            background: "linear-gradient(120deg, #3a2600, #ffb347, #ff7a1a, #c9a84c, #6b1a00, #ffb347, #3a2600)",
            backgroundSize: "300% 300%",
            animation: "kc-border-flow 8s ease infinite",
            boxShadow: isActive ? "0 0 60px rgba(255,140,40,0.25), 0 0 130px rgba(201,168,76,0.15)" : "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <div className="relative rounded-2xl overflow-hidden" style={{ height: "clamp(380px, 100vw, 620px)", background: "#0a0a12" }}>

            {/* IMAGE instead of video */}
            <img
              key={character.image}
              src={character.image}
              alt={character.name}
              className="w-full h-full object-contain"
              style={{
                transform: `translateZ(0) scale(${isHovered ? 1.05 : 1})`,
                transition: "transform 0.5s ease-out",
                filter: isActive ? "brightness(1.1) contrast(1.05) drop-shadow(0 0 40px rgba(201,168,76,0.25))" : "brightness(0.7) grayscale(0.3)",
                padding: "24px",
              }}
            />

            {isHovered && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(201,168,76,0.15) 0%, transparent 60%)` }} />}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,5,8,0.95) 0%, rgba(5,5,8,0.4) 40%, transparent 70%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,8,0.6) 0%, transparent 30%)" }} />
            <div className="absolute top-4 right-4 text-xs font-mono tracking-widest px-4 py-1 rounded" style={{ background: "black", border: "3px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>{character.board}</div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="inline-block text-xs font-mono px-3 py-1 rounded mb-3" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.8)" }}>⚡ {character.abilities[0]?.name}</div>
              <h3 className="font-serif text-2xl mb-1" style={{ color: "#c9a84c", textShadow: "0 0 20px rgba(201,168,76,0.5)" }}>{character.name}</h3>
              <p className="text-white/60 text-sm font-mono italic">"{character.tagline}"</p>
            </div>
            {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: "rgba(201,168,76,0.6)" }} />
            ))}
          </div>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(201,168,76,${isHovered ? 0.08 : 0.02}) 0%, transparent 50%, rgba(201,168,76,${isHovered ? 0.04 : 0.01}) 100%)` }} />
        </div>
      </div>
    </div>
  )
}

function AbilityRow({ ability, index, revealed }: { ability: Ability; index: number; revealed: boolean }) {
  return (
    <div
      className="group relative rounded-lg pl-4 pr-3.5 py-3.5 sm:pr-4 sm:py-4 overflow-hidden transition-all duration-500"
      style={{
        background: "linear-gradient(145deg, rgba(0,0,0,.58), rgba(18,12,3,.5))",
        border: "1px solid rgba(212,168,67,.16)",
        boxShadow: "0 12px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(212,168,67,.08)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(10px)",
        transitionDelay: revealed ? `${index * 70}ms` : "0ms",
      }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-0.75" style={{ background: "linear-gradient(180deg, #ffb347, #c9a84c, #6b4a10)" }} />
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] shrink-0" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", color: "#e8c96a" }}>⚔</span>
          <span className="font-serif text-[14px] sm:text-[15px]" style={{ color: "#f0d080" }}>{ability.name}</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(201,168,76,0.35)" }}>Ability {String(index + 1).padStart(2, "0")}</span>
      </div>
      <p className="text-[13px] sm:text-sm leading-relaxed mt-2 pl-7" style={{ color: "rgba(232,223,200,0.65)" }}>{ability.effect}</p>
      {ability.note && (
        <p className="text-xs mt-2 pl-7 italic flex items-start gap-1.5" style={{ color: "rgba(201,168,76,0.55)" }}>
          <span style={{ flexShrink: 0 }}>◆</span><span>{ability.note}</span>
        </p>
      )}
    </div>
  )
}

function SpellRow({ spell, index, revealed }: { spell: Spell; index: number; revealed: boolean }) {
  return (
    <div
      className="group relative rounded-lg pl-4 pr-3.5 py-3.5 sm:pr-4 sm:py-4 overflow-hidden transition-all duration-500"
      style={{
        background: "linear-gradient(145deg, rgba(40,25,5,.55), rgba(10,6,2,.6))",
        border: "1px solid rgba(232,201,106,.25)",
        boxShadow: "0 12px 30px rgba(0,0,0,.4), inset 0 1px 0 rgba(212,168,67,.1)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(10px)",
        transitionDelay: revealed ? `${index * 70}ms` : "0ms",
      }}
    >
      <span className="absolute left-0 top-0 bottom-0 w-0.75" style={{ background: "linear-gradient(180deg, #ffe08a, #e8c96a, #8a5a10)" }} />
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] shrink-0" style={{ background: "rgba(232,201,106,0.15)", border: "1px solid rgba(232,201,106,0.4)", color: "#ffe08a" }}>✨</span>
          <span className="font-serif text-[14px] sm:text-[15px]" style={{ color: "#f0d080" }}>{spell.name}</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(232,201,106,0.4)" }}>Spell {String(index + 1).padStart(2, "0")}</span>
      </div>
      <p className="text-[13px] sm:text-sm leading-relaxed mt-2 pl-7" style={{ color: "rgba(232,223,200,0.65)" }}>{spell.effect}</p>
      <div className="flex flex-col gap-1 mt-2 pl-7">
        <p className="text-xs" style={{ color: "rgba(201,168,76,0.6)" }}><span style={{ opacity: 0.7 }}>Usage: </span>{spell.usage}</p>
        {spell.limit && <p className="text-xs italic" style={{ color: "rgba(201,168,76,0.5)" }}><span style={{ opacity: 0.7 }}>Limit: </span>{spell.limit}</p>}
      </div>
    </div>
  )
}

export function MontageSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const audio = new Audio("/audio/background-theme.mp3")
    audio.loop = true
    audio.volume = 0
    audioRef.current = audio
    return () => { audio.pause(); audio.src = "" }
  }, [])

  const fadeTo = useCallback((target: number, ms = 1500) => {
    const audio = audioRef.current; if (!audio) return
    if (fadeRef.current) clearInterval(fadeRef.current)
    const steps = 30; const stepMs = ms / steps; const start = audio.volume; const diff = target - start; let step = 0
    fadeRef.current = setInterval(() => {
      step++
      audio.volume = Math.min(1, Math.max(0, start + (diff * step) / steps))
      if (step >= steps) {
        clearInterval(fadeRef.current!)
        if (target === 0) audio.pause()
      }
    }, stepMs)
  }, [])

  useEffect(() => {
    const section = sectionRef.current; if (!section) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const audio = audioRef.current; if (!audio) return
        if (entry.isIntersecting && !isMuted) {
          audio.play().catch(() => {})
          fadeTo(0.5)
        } else {
          fadeTo(0)
        }
      })
    }, { threshold: 0.2 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [fadeTo, isMuted])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current; if (!audio) return
    if (isMuted) {
      setIsMuted(false)
      audio.play().catch(() => {})
      fadeTo(0.5)
    } else {
      setIsMuted(true)
      fadeTo(0)
    }
  }, [isMuted, fadeTo])

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => { setCurrentIndex(index); setIsTransitioning(false) }, 420)
  }, [isTransitioning])

  const goNext = useCallback(() => goToSlide((currentIndex + 1) % characters.length), [currentIndex, goToSlide])
  const goPrev = useCallback(() => goToSlide((currentIndex - 1 + characters.length) % characters.length), [currentIndex, goToSlide])

  useEffect(() => {
    if (isPlaying) { intervalRef.current = setInterval(goNext, 5000) }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, goNext])

  const current = characters[currentIndex]
  const navBtn: React.CSSProperties = { border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", background: "rgba(201,168,76,0.03)" }

  return (
    <section ref={sectionRef} id="montage" className="relative min-h-screen overflow-hidden" style={{ background: "#050508" }}>
      <style>{`
        @keyframes kc-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes kc-flame-flicker {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          25% { opacity: 0.85; transform: scale(1.04); }
          50% { opacity: 0.6; transform: scale(0.97); }
          75% { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes kc-gold-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .montage-scroll::-webkit-scrollbar { width: 4px; }
        .montage-scroll::-webkit-scrollbar-track { background: transparent; }
        .montage-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.35); border-radius: 4px; }
      `}</style>
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 2 }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/video/montage-section-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "rgba(5,5,8,0.6)", zIndex: 1 }} />

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300"
        style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(5,5,8,0.8)", color: "#c9a84c", backdropFilter: "blur(8px)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,168,76,0.1)" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(5,5,8,0.8)" }}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        <span className="hidden sm:inline font-mono text-xs tracking-widest">{isMuted ? "UNMUTE" : "MUTE"}</span>
      </button>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">

        {/* Header */}
        <div className="text-center mb-12 sm:mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div style={{ height: 1, width: 60, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5))" }} />
            <span style={{ color: "rgba(201,168,76,0.7)", fontSize: 16 }}>⚔</span>
            <div style={{ height: 1, width: 60, background: "linear-gradient(90deg, rgba(201,168,76,0.5), transparent)" }} />
          </div>
          <h2
            className="font-serif text-4xl sm:text-5xl md:text-7xl mb-6"
            style={{
              backgroundImage: "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.05em",
              filter: "drop-shadow(0 0 40px rgba(201,168,76,0.35)) drop-shadow(0 0 80px rgba(201,168,76,0.18))",
              animation: "kc-gold-shimmer 7s linear infinite alternate",
            }}
          >
            Warriors of<br />the Realm
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "rgba(232,223,200,0.5)" }}>24 legendary characters. Each with unique powers.<br />Only one kingdom survives.</p>
          <div className="mx-auto" style={{ width: "120px", height: "1px", background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-20">

          <div className="w-full flex lg:items-center justify-center">
            <div
              className="w-full"
              style={{
                transition: "opacity 0.42s cubic-bezier(0.16,1,0.3,1), transform 0.42s cubic-bezier(0.16,1,0.3,1), filter 0.42s cubic-bezier(0.16,1,0.3,1)",
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? "scale(0.9) translateY(16px)" : "scale(1) translateY(0)",
                filter: isTransitioning ? "blur(10px)" : "blur(0px)",
                willChange: "transform, opacity, filter",
              }}
            >
              <Character3DCard character={current} isActive={true} />
            </div>
          </div>

          <div
            className="w-full"
            style={{
              transition: "opacity 0.42s cubic-bezier(0.16,1,0.3,1) 0.06s, transform 0.42s cubic-bezier(0.16,1,0.3,1) 0.06s, filter 0.42s cubic-bezier(0.16,1,0.3,1) 0.06s",
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? "translateY(20px)" : "translateY(0)",
              filter: isTransitioning ? "blur(8px)" : "blur(0px)",
              willChange: "transform, opacity, filter",
            }}
          >
            <div className="hidden sm:block font-serif text-9xl leading-none mb-4 select-none" style={{ color: "rgba(201,168,76,0.06)" }}>{String(currentIndex + 1).padStart(2, "0")}</div>
            <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-4 mt-0 sm:-mt-10" style={{ color: "#c9a84c", textShadow: "0 0 30px rgba(201,168,76,0.3)" }}>{current.name}</h3>
            <div style={{ width: "60px", height: "2px", background: "linear-gradient(90deg, #c9a84c, transparent)", marginBottom: "20px" }} />
            <p className="text-lg sm:text-xl md:text-2xl font-mono italic mb-6" style={{ color: "rgba(201,168,76,0.7)" }}>"{current.tagline}"</p>

            {/* Fixed-height scroll zone — keeps section height constant across every character,
                regardless of how many abilities/spells they have. */}
            <div className="montage-scroll h-90 sm:h-100 md:h-110 overflow-y-auto pr-2 mb-8 sm:mb-10" data-lenis-prevent>
              <div
                className="rounded-lg p-4 sm:p-5 mb-8"
                style={{
                  background: "linear-gradient(145deg, rgba(0,0,0,.45), rgba(18,12,3,.35))",
                  border: "1px solid rgba(212,168,67,.14)",
                  boxShadow: "inset 0 1px 0 rgba(212,168,67,.06)",
                }}
              >
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: "rgba(232,223,200,0.6)" }}>{current.description}</p>
              </div>

              {/* Abilities */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span style={{ color: "#c9a84c" }}>⚔</span>
                  <h4 className="font-serif text-lg tracking-wide" style={{ color: "#e8c96a" }}>Abilities</h4>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.25), transparent)" }} />
                </div>
                <div className="space-y-3">
                  {current.abilities.map((a, i) => <AbilityRow key={a.name} ability={a} index={i} revealed={!isTransitioning} />)}
                </div>
              </div>

              {/* Spells */}
              {current.spells && current.spells.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span style={{ color: "#c9a84c" }}>✨</span>
                    <h4 className="font-serif text-lg tracking-wide" style={{ color: "#e8c96a" }}>Spells</h4>
                    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(232,201,106,0.3), transparent)" }} />
                  </div>
                  <div className="space-y-3">
                    {current.spells.map((s, i) => <SpellRow key={s.name} spell={s} index={i} revealed={!isTransitioning} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              {[{ onClick: goPrev, icon: <ChevronLeft className="w-5 h-5" /> }, { onClick: () => setIsPlaying(!isPlaying), icon: isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" /> }, { onClick: goNext, icon: <ChevronRight className="w-5 h-5" /> }].map((btn, i) => (
                <button key={i} onClick={btn.onClick} className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300" style={navBtn}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(201,168,76,0.03)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)" }}>
                  {btn.icon}
                </button>
              ))}
              <span className="font-mono text-xs sm:text-sm ml-1 sm:ml-2" style={{ color: "rgba(201,168,76,0.35)" }}>{String(currentIndex + 1).padStart(2, "0")} / {String(characters.length).padStart(2, "0")}</span>
            </div>

            {/* Progress dots */}
            <div className="flex flex-wrap gap-2">
              {characters.map((_, index) => (
                <button key={index} onClick={() => goToSlide(index)} className="rounded-full transition-all duration-300" style={{ height: "3px", width: index === currentIndex ? "32px" : "8px", background: index === currentIndex ? "#c9a84c" : "rgba(201,168,76,0.2)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
