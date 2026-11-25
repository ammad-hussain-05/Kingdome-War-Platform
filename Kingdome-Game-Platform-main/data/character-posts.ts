/**
 * Character-rule posts shown in the "Master the Characters" homepage section.
 *
 * To add a new post:
 *   1. Put the full-size image in   public/posts/<board-folder>/post-XX.jpg
 *   2. (Optional) put a smaller grid thumbnail in public/posts/<board-folder>/thumbs/post-XX.webp
 *      — if `thumbnail` is omitted, the full image is used in the grid as well.
 *   3. Add an entry below. Board filter chips are generated automatically from
 *      `boardType` + `boardSize`, so new boards (Tri, X, 8x8…) appear on their own.
 */

export type BoardType = "Classic" | "Tri" | "X"
export type BoardSize = "8x8" | "12x12" | "16x16"

export type CharacterPost = {
  /** Unique, stable id */
  id: string
  /** Full-size image (used in the lightbox) */
  image: string
  /** Optional lighter image for the grid card */
  thumbnail?: string
  /** Headline printed on the post itself */
  title: string
  /** Character(s) featured in the post */
  characters: string[]
  /** Short gameplay explanation, taken from what the post shows */
  description: string
  boardType?: BoardType
  boardSize?: BoardSize
}

const c12 = (n: string) => ({
  image: `/posts/classic-12x12/post-${n}.jpg`,
  thumbnail: `/posts/classic-12x12/thumbs/post-${n}.webp`,
  boardType: "Classic" as const,
  boardSize: "12x12" as const,
})

const c16 = (n: string) => ({
  image: `/posts/classic-16x16/post-${n}.jpg`,
  thumbnail: `/posts/classic-16x16/thumbs/post-${n}.webp`,
  boardType: "Classic" as const,
  boardSize: "16x16" as const,
})

export const CHARACTER_POSTS: CharacterPost[] = [
  // ── Classic 12x12 ──
  {
    id: "c12-sorceress-executioner",
    ...c12("01"),
    title: "Three Spells, One Axe",
    characters: ["Sorceress", "Executioner"],
    description:
      "The Sorceress uses Ethereal Slide to glide through pieces and casts three spells — Sleep, Teleport and Wish. The Executioner marches in straight lines and earns a free Axe Swing after completing a march.",
  },
  {
    id: "c12-cavalier-dragon",
    ...c12("02"),
    title: "Noble Blood, Wings of Fire",
    characters: ["Cavalier Prince", "Dragon"],
    description:
      "The Cavalier Prince guards the crown with a Knight L-shape or a one-square step. The Dragon slides, flies over any piece, and attacks with its Claw & Tail Strike and Fly-Over L-Strike.",
  },
  {
    id: "c12-superknight-gargoyle",
    ...c12("03"),
    title: "Strikes Where None Can Follow",
    characters: ["Super Knight", "Gargoyle"],
    description:
      "The Super Knight's L-Leap jumps over any piece. The Gargoyle hits everything within two squares using its Wing & Tail Sweep and a Fire Attack that strikes two squares away.",
  },
  {
    id: "c12-archer-mystic-king",
    ...c12("04"),
    title: "Moves Like a Queen, Fights Like a Knight",
    characters: ["Elven Archer", "Mystic King"],
    description:
      "The Elven Archer slides, makes a Knight L-jump, and lands a one-square strike. The Mystic King escapes any corner with a one-square step or a Knight L-leap.",
  },
  {
    id: "c12-superqueen-paladin",
    ...c12("05"),
    title: "She Moves Twice, He Strikes Back",
    characters: ["Super Queen", "Paladin"],
    description:
      "The Super Queen's Sovereign Slide grants a Double Move — two moves in one turn. The Paladin takes a Vanguard Step, can Reverse Castle to swap with an ally, and has a once-per-game Super Strike of 3 squares.",
  },
  {
    id: "c12-assassin-mage-princess",
    ...c12("06"),
    title: "Three Weapons, One Sacrifice",
    characters: ["Assassin", "Mage Princess"],
    description:
      "The Assassin slides, makes a Knight L-jump, and lands a one-square strike. The Mage Princess moves with Arcane Glide and can sacrifice herself to restore the Super Queen.",
  },
  {
    id: "c12-wizard-assassin",
    ...c12("07"),
    title: "Master of Teleportation",
    characters: ["Wizard", "Assassin"],
    description:
      "The Wizard's Ethereal Slide stops at the first piece, and his Teleport relocates any piece on the board. The Assassin slides, leaps and strikes in one turn.",
  },

  // ── Classic 16x16 ──
  {
    id: "c16-paladin-executioner",
    ...c16("01"),
    title: "One Strike, Then the Axe Falls",
    characters: ["Executioner", "Paladin"],
    description:
      "The Executioner marches straight and swings again with a free Axe Swing after the slide. The Paladin's Vanguard Step, Reverse Castle swap and once-per-game Super Strike let his shield strike back.",
  },
  {
    id: "c16-gargoyle-assassin",
    ...c16("02"),
    title: "Stone by Day, Death by Night",
    characters: ["Gargoyle", "Assassin"],
    description:
      "The Gargoyle strikes up close with its Wing & Tail Sweep and reaches two squares away with Fire Attack. The Assassin has three weapons for one target: slide, Knight L-jump and one-square strike.",
  },
  {
    id: "c16-archer-conjurer",
    ...c16("03"),
    title: "Death Is Not the End",
    characters: ["Archer", "Conjurer"],
    description:
      "The Archer's Longbow Volley strikes down any open line, stopping at the first piece. The Conjurer's Spectral Slide passes through pieces, and Revive brings one fallen piece back.",
  },
  {
    id: "c16-paladin-cavalier",
    ...c16("04"),
    title: "The Shield That Strikes Back",
    characters: ["Paladin", "Cavalier Prince"],
    description:
      "The Paladin holds the front line with Vanguard Step, Reverse Castle and a once-per-game 3-square Super Strike. The Cavalier Prince leaps in to guard the crown with a Knight L-shape or one-square step.",
  },
  {
    id: "c16-thief-wizard",
    ...c16("05"),
    title: "One Jump, Gone Forever",
    characters: ["Thief", "Wizard"],
    description:
      "The Thief moves with Shadow Slide and steals with a Triple-Jump Steal that strikes 2–3 squares away. The Wizard's Ethereal Slide and Teleport let him fold space and relocate any piece.",
  },
  {
    id: "c16-acrobat-warlock",
    ...c16("06"),
    title: "No Wall, No Escape",
    characters: ["Acrobat Assassin", "Warlock"],
    description:
      "The Acrobat Assassin vaults over anything with an L-jump, slides, and lands a one-square strike. The Warlock's Spectral Slide moves freely, and Bind freezes the entire enemy army.",
  },
  {
    id: "c16-trickster-archer",
    ...c16("07"),
    title: "Hunt Him in Ten",
    characters: ["Trickster", "Elven Archer"],
    description:
      "The Trickster's Phantom Slide phases through every piece. The Elven Archer slides, makes a Knight L-jump and strikes one square away — all in one turn.",
  },
  {
    id: "c16-dragon-superqueen",
    ...c16("08"),
    title: "Wings of Fire, Twice the Fury",
    characters: ["Dragon", "Super Queen"],
    description:
      "The Dragon slides, flies over any wall, and attacks with Claw & Tail Strike and Fly-Over L-Strike. The Super Queen's Sovereign Slide gives her two moves a turn — she moves twice and kills twice.",
  },
  {
    id: "c16-superknight-mage-princess",
    ...c16("09"),
    title: "Leap Over, Glide Across",
    characters: ["Super Knight", "Mage Princess"],
    description:
      "The Super Knight's L-Leap jumps over any piece. The Mage Princess sweeps the board with Arcane Glide and can sacrifice herself to restore the Super Queen.",
  },
  {
    id: "c16-mystic-king-sorceress",
    ...c16("10"),
    title: "The King Leaps, the Sorceress Phases",
    characters: ["Mystic King", "Sorceress"],
    description:
      "The Mystic King moves like a knight with a Knight L-leap or takes a one-square step. The Sorceress's Ethereal Slide passes through pieces — no wall can stop her.",
  },
]
