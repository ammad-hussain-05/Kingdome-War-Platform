"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const rulesCategories = [
  {
    id: "standard",
    title: "Standard Piece Movements",
    icon: "&#9823;",
    rules: [
      { piece: "King", movement: "Moves one square in any direction. Must be protected at all costs." },
      { piece: "Queen", movement: "Moves unlimited squares in any direction (horizontal, vertical, or diagonal)." },
      { piece: "Bishop", movement: "Moves unlimited squares diagonally. Stays on its starting color." },
      { piece: "Knight", movement: "Moves in an L-shape: two squares in one direction, then one square perpendicular. Can jump over pieces." },
      { piece: "Rook", movement: "Moves unlimited squares horizontally or vertically." },
      { piece: "Paladin", movement: "Moves one square in any direction. Has a surprise three-square attack usable once per game." },
    ],
  },
  {
    id: "special",
    title: "Special Piece Abilities",
    icon: "&#9733;",
    rules: [
      { piece: "Super Queen", movement: "Moves unlimited squares in all directions AND can move TWICE per turn. The most powerful piece." },
      { piece: "Mystic King", movement: "Moves in L-shape three squares. Can morph using the Wizard to escape capture." },
      { piece: "Wizard", movement: "Ethereal being. Can teleport any character to any empty square. Cannot directly kill human pieces." },
      { piece: "Sorceress", movement: "Can teleport and cast three spells. Sleep spell immobilizes for 3 rounds (requires 10-sided dice roll)." },
      { piece: "Dragon/Gargoyle", movement: "Move like a queen. Can fly over allied pieces to deliver a kill." },
      { piece: "Super Knight", movement: "Double L-shape jump. Can make two kills in a single turn." },
      { piece: "Trickster", movement: "Must be killed within 10 moves of entering play or opponent automatically loses." },
      { piece: "Conjurer", movement: "Can revive one fallen teammate. This power is used only once per game." },
      { piece: "Warlock", movement: "Can bind ALL characters on the board, freezing them for one complete round." },
    ],
  },
  {
    id: "spells",
    title: "The Spell System",
    icon: "&#10038;",
    rules: [
      { piece: "Spell Declaration", movement: "All spell casters MUST say their spell aloud while making their move." },
      { piece: "Forfeit Rule", movement: "If a player forgets to announce their spell, the spell is forfeited and cannot be used." },
      { piece: "Sleep Spell", movement: "Immobilizes target piece for 3 rounds. Requires successful 10-sided dice roll." },
      { piece: "Teleport Spell", movement: "Move any piece to any empty square on the board." },
      { piece: "Bind Spell", movement: "Freezes all opponent pieces for one complete turn." },
      { piece: "Revival Spell", movement: "Brings back one captured allied piece to the board." },
    ],
  },
  {
    id: "win",
    title: "Win Conditions",
    icon: "&#9813;",
    rules: [
      { piece: "Standard Victory", movement: "Capture the opponent's King to win the game." },
      { piece: "Adult Version", movement: "Killing the King is NOT enough. You must eliminate the ENTIRE enemy army." },
      { piece: "Trickster Rule", movement: "If the Trickster survives 10 moves, the opposing player automatically loses." },
      { piece: "Checkmate", movement: "When the King is in check and cannot escape, the game ends." },
      { piece: "Resignation", movement: "A player may resign at any time by laying down their King." },
    ],
  },
  {
    id: "special-rules",
    title: "Special Rules",
    icon: "&#9830;",
    rules: [
      { piece: "Mexican Standoff", movement: "A player may pass their turn by hitting the chess clock instead of moving." },
      { piece: "Pawn Promotion", movement: "When a pawn reaches the opposite end, it may be promoted to any piece." },
      { piece: "First Move", movement: "The player with the lighter colored pieces moves first." },
      { piece: "Touch Move", movement: "If you touch a piece, you must move it (if legal)." },
    ],
  },
  {
    id: "tri-board",
    title: "Tri-Board Phantom Dimension",
    icon: "&#9820;",
    rules: [
      { piece: "Three Players", movement: "Three kingdoms battle simultaneously on a triangular battlefield." },
      { piece: "Crown Board", movement: "When one player is eliminated, their board becomes the Crown Board." },
      { piece: "Crown Transfer", movement: "The Crown Board goes to the highest-ranking last-standing player." },
      { piece: "Alliance Breaking", movement: "Temporary alliances are permitted but not binding." },
      { piece: "Turn Order", movement: "Play proceeds clockwise from the starting player." },
    ],
  },
]

function RuleCategory({ category }: { category: typeof rulesCategories[0] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-primary/20 rounded-lg overflow-hidden bg-card/30 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span
            className="text-3xl text-primary"
            dangerouslySetInnerHTML={{ __html: category.icon }}
          />
          <h3 className="font-serif text-xl text-primary">{category.title}</h3>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-primary transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-6 pt-0 space-y-4">
          {category.rules.map((rule, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-start gap-2 p-4 bg-background/30 rounded-lg"
            >
              <span className="font-serif text-primary font-semibold min-w-[140px]">
                {rule.piece}:
              </span>
              <span className="text-foreground/80 text-sm leading-relaxed">
                {rule.movement}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RulesSection() {
  return (
    <section id="rules" className="relative py-24 md:py-32">
      {/* Background with parchment effect */}
      <div className="absolute inset-0 parchment-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary/60 text-2xl mb-4">&#128220;</span>
          <h2 className="font-serif text-4xl md:text-5xl text-primary glow-gold mb-4">
            The Sacred Rules
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            These ancient scrolls contain the laws that govern the realm. 
            Study them well, for knowledge is the key to victory.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4" />
        </div>

        {/* Rules accordion */}
        <div className="space-y-4">
          {rulesCategories.map((category) => (
            <RuleCategory key={category.id} category={category} />
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 p-6 border border-primary/20 rounded-lg bg-card/20 text-center">
          <p className="text-sm text-muted-foreground italic">
            &ldquo;He who knows the rules controls the game. He who masters them, controls the kingdom.&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-2">— The Kingdom Come Codex</p>
        </div>
      </div>
    </section>
  )
}
