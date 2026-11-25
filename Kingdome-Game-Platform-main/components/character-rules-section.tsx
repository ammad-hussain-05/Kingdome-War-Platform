"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, Shield, X, ZoomIn } from "lucide-react"
import { CHARACTER_POSTS, type CharacterPost } from "@/data/character-posts"

/* ──────────────────────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────────────────────── */
const ALL = "all"

function boardKey(p: CharacterPost) {
  return p.boardType && p.boardSize ? `${p.boardType} ${p.boardSize}` : p.boardType ?? p.boardSize ?? ""
}

function boardLabel(key: string) {
  return key.replace("x", "×")
}

/** Reveals an element once when it scrolls into view. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

/* ──────────────────────────────────────────────────────────────
   Card
─────────────────────────────────────────────────────────────── */
function PostCard({ post, index, onOpen }: { post: CharacterPost; index: number; onOpen: () => void }) {
  const { ref, visible } = useReveal<HTMLElement>()
  const board = boardKey(post)

  return (
    <article
      ref={ref}
      className="mc-card group relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(36px)",
        transitionDelay: visible ? `${(index % 3) * 110}ms` : "0ms",
      }}
    >
      {/* top accent line (same flowing gold as The Sacred Rules cards) */}
      <div
        className="h-[3px] w-full shrink-0"
        style={{
          background: "linear-gradient(90deg, #3a2600, #ffb347, #e8c96a, #ffb347, #3a2600)",
          backgroundSize: "200% 100%",
          animation: "mc-border-flow 5s linear infinite",
        }}
      />

      {/* Image */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full aspect-square overflow-hidden cursor-zoom-in focus-visible:outline-none"
        style={{ background: "#0a0805" }}
        aria-label={`View full post: ${post.title} — ${post.characters.join(" & ")}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.thumbnail ?? post.image}
          alt={`${post.title} — ${post.characters.join(" and ")} character rules`}
          loading="lazy"
          decoding="async"
          width={900}
          height={900}
          className="mc-img absolute inset-0 w-full h-full object-contain"
        />
        <span
          className="mc-zoom absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,0,0,0.15), rgba(0,0,0,0.55))" }}
        >
          <span
            className="flex items-center justify-center w-12 h-12 rounded-full"
            style={{
              background: "linear-gradient(145deg,#241705,#0a0805)",
              border: "1px solid rgba(232,201,106,.6)",
              boxShadow: "0 0 22px rgba(201,168,76,.45)",
            }}
          >
            <ZoomIn className="w-5 h-5" style={{ color: "#e8c96a" }} />
          </span>
        </span>
      </button>

      {/* Text */}
      <div className="relative flex flex-col flex-1 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-[11px] uppercase tracking-[0.22em] pt-1" style={{ color: "rgba(201,168,76,0.6)" }}>
            {post.title}
          </p>
          {board && (
            <span
              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap"
              style={{ background: "rgba(36,23,5,0.7)", border: "1px solid rgba(212,168,67,0.35)", color: "#e8c96a" }}
            >
              {boardLabel(board)}
            </span>
          )}
        </div>
        <h3 className="font-serif text-lg sm:text-xl font-bold leading-snug mb-3" style={{ color: "#f0d080" }}>
          {post.characters.map((name, i) => (
            <span key={name}>
              {i > 0 && (
                <span className="mx-1.5" style={{ color: "rgba(201,168,76,0.55)" }}>
                  &amp;
                </span>
              )}
              {name}
            </span>
          ))}
        </h3>
        <div className="w-12 h-px mb-3" style={{ background: "linear-gradient(90deg, #c9a84c, transparent)" }} />
        <p className="text-[15px] leading-relaxed" style={{ color: "rgba(232,223,200,0.74)" }}>
          {post.description}
        </p>
      </div>

      {/* corner accents on hover */}
      {["top-2 left-2 border-t border-l", "top-2 right-2 border-t border-r", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"].map(
        (cls, i) => (
          <span
            key={i}
            className={`mc-corner absolute w-2.5 h-2.5 ${cls} pointer-events-none`}
            style={{ borderColor: "rgba(232,201,106,0.6)" }}
          />
        ),
      )}
    </article>
  )
}

/* ──────────────────────────────────────────────────────────────
   Lightbox
─────────────────────────────────────────────────────────────── */
function Lightbox({
  posts,
  index,
  onClose,
  onIndex,
}: {
  posts: CharacterPost[]
  index: number | null
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const open = index !== null
  const post = open ? posts[index] : null
  const many = posts.length > 1

  const go = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return
      onIndex((index + dir + posts.length) % posts.length)
    },
    [index, onIndex, posts.length],
  )

  useEffect(() => {
    if (!open || !many) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, many, go])

  const navBtn =
    "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a]"
  const navStyle: React.CSSProperties = {
    background: "linear-gradient(145deg,#241705,#0a0805)",
    border: "1px solid rgba(212,168,67,.45)",
    boxShadow: "0 8px 24px rgba(0,0,0,.6)",
    color: "#e8c96a",
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="mc-overlay fixed inset-0 z-[9998]" style={{ background: "rgba(3,3,6,0.92)", backdropFilter: "blur(6px)" }} />
        <Dialog.Content
          className="mc-dialog fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8 focus:outline-none"
          data-lenis-prevent
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {post && (
            <figure className="relative flex flex-col items-center max-w-full">
              <Dialog.Title className="sr-only">
                {post.title} — {post.characters.join(" & ")}
              </Dialog.Title>
              <Dialog.Description className="sr-only">{post.description}</Dialog.Description>

              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(232,201,106,0.55)",
                  boxShadow: "0 30px 90px rgba(0,0,0,.8), 0 0 60px rgba(201,168,76,.25)",
                  background: "#0a0805",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={post.id}
                  src={post.image}
                  alt={`${post.title} — ${post.characters.join(" and ")} character rules`}
                  className="mc-lightbox-img block w-auto h-auto object-contain"
                  style={{ maxWidth: "min(92vw, 1100px)", maxHeight: "calc(100vh - 140px)" }}
                />
              </div>

              <figcaption className="mt-3 sm:mt-4 text-center px-2">
                <span className="font-serif text-base sm:text-lg font-bold" style={{ color: "#f0d080" }}>
                  {post.characters.join(" & ")}
                </span>
                {many && (
                  <span className="ml-3 text-xs tracking-widest" style={{ color: "rgba(201,168,76,0.6)" }}>
                    {(index ?? 0) + 1} / {posts.length}
                  </span>
                )}
              </figcaption>
            </figure>
          )}

          {many && (
            <>
              <button type="button" onClick={() => go(-1)} className={`${navBtn} left-2 sm:left-6`} style={navStyle} aria-label="Previous post">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => go(1)} className={`${navBtn} right-2 sm:right-6`} style={navStyle} aria-label="Next post">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <Dialog.Close
            className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a]"
            style={navStyle}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ──────────────────────────────────────────────────────────────
   Section
─────────────────────────────────────────────────────────────── */
export function CharacterRulesSection({ posts = CHARACTER_POSTS }: { posts?: CharacterPost[] }) {
  const header = useReveal<HTMLDivElement>()

  // Filter chips are derived from the data, so future boards appear automatically.
  const boards = useMemo(() => Array.from(new Set(posts.map(boardKey).filter(Boolean))), [posts])
  const [filter, setFilter] = useState<string>(ALL)
  const visiblePosts = useMemo(() => (filter === ALL ? posts : posts.filter((p) => boardKey(p) === filter)), [posts, filter])

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (posts.length === 0) return null

  return (
    <section id="master-characters" className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#050508" }}>
      <style>{`
        @keyframes mc-border-flow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes mc-heading-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes mc-flicker { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.06); } }
        @keyframes mc-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mc-zoom-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

        .mc-card {
          background: linear-gradient(150deg, rgba(0,0,0,.62), rgba(18,12,3,.5));
          border: 1px solid rgba(212,168,67,0.22);
          box-shadow: 0 10px 26px rgba(0,0,0,.4);
          transition: opacity .8s cubic-bezier(0.16,1,0.3,1), transform .8s cubic-bezier(0.16,1,0.3,1),
                      box-shadow .4s ease, border-color .4s ease;
          will-change: transform;
        }
        .mc-img { transition: transform .7s cubic-bezier(0.16,1,0.3,1); }
        .mc-zoom, .mc-corner { opacity: 0; transition: opacity .35s ease; }
        @media (hover: hover) {
          .mc-card:hover {
            transform: translateY(-8px) !important;
            transition-delay: 0ms !important;
            border-color: rgba(232,201,106,0.75);
            box-shadow: 0 26px 60px rgba(0,0,0,.6), 0 0 42px rgba(201,168,76,.35), inset 0 1px 0 rgba(255,255,255,.1);
          }
          .mc-card:hover .mc-img { transform: scale(1.03); }
          .mc-card:hover .mc-zoom, .mc-card:hover .mc-corner { opacity: 1; }
        }
        .mc-card:focus-within { border-color: rgba(232,201,106,0.75); }
        .mc-card:focus-within .mc-zoom { opacity: 1; }

        .mc-overlay[data-state="open"] { animation: mc-fade .25s ease-out; }
        .mc-dialog[data-state="open"] .mc-lightbox-img { animation: mc-zoom-in .3s cubic-bezier(0.16,1,0.3,1); }

        @media (prefers-reduced-motion: reduce) {
          .mc-card, .mc-img, .mc-header { transition: none !important; transform: none !important; opacity: 1 !important; }
          .mc-overlay, .mc-lightbox-img { animation: none !important; }
        }
      `}</style>

      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)" }}
      />
      {/* thin gold divider separating this section from The Sacred Rules */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.35), transparent)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={header.ref}
          className="mc-header text-center mb-12 md:mb-14"
          style={{
            opacity: header.visible ? 1 : 0,
            transform: header.visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity .9s ease, transform .9s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute -inset-2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,140,40,0.35), transparent 70%)", filter: "blur(14px)", animation: "mc-flicker 3s ease-in-out infinite" }}
            />
            <div
              className="relative flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                background: "linear-gradient(145deg,#241705,#0a0805)",
                border: "1px solid rgba(212,168,67,.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.6)",
              }}
            >
              <Shield className="w-7 h-7" style={{ color: "#e8c96a" }} />
            </div>
          </div>

          <h2
            className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold mb-4"
            style={{
              backgroundImage: "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.03em",
              filter: "drop-shadow(0 0 30px rgba(201,168,76,0.35)) drop-shadow(0 0 60px rgba(201,168,76,0.18))",
              animation: "mc-heading-shimmer 7s linear infinite alternate",
            }}
          >
            Master the Characters
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base leading-relaxed" style={{ color: "rgba(232,223,200,0.55)" }}>
            Discover the unique abilities, movements, and special powers that shape every battle in Kingdome.
          </p>
          <div className="w-24 h-1 mx-auto mt-6" style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />

          {/* Board filter — only shown when more than one board has posts */}
          {boards.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Filter by board">
              {[ALL, ...boards].map((key) => {
                const active = filter === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    aria-pressed={active}
                    className="px-4 py-1.5 rounded-full text-xs sm:text-sm uppercase tracking-[0.16em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8c96a]"
                    style={{
                      background: active ? "linear-gradient(145deg,#3a2600,#1a1004)" : "rgba(0,0,0,0.45)",
                      border: `1px solid ${active ? "rgba(232,201,106,0.75)" : "rgba(212,168,67,0.25)"}`,
                      color: active ? "#f0d080" : "rgba(232,223,200,0.6)",
                      boxShadow: active ? "0 0 18px rgba(201,168,76,0.3)" : "none",
                    }}
                  >
                    {key === ALL ? "All Boards" : boardLabel(key)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Grid: 1 / 2 / 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {visiblePosts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} onOpen={() => setLightboxIndex(i)} />
          ))}
        </div>
      </div>

      <Lightbox posts={visiblePosts} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndex={setLightboxIndex} />
    </section>
  )
}
