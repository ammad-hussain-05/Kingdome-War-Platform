"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ThumbsUp, MessageCircle, Bell, Send, User, Swords } from "lucide-react"

const CLIENT_ID_KEY = "kc_visitor_id"
const LIKED_FLAG_KEY = "kc_liked_kingdom_come"
const SUBSCRIBED_FLAG_KEY = "kc_subscribed_kingdom_come"

type Comment = { id: string; username: string; text: string; timestamp: number }

// Flavor-only "recent activity" ticker names — never mixed into real comment data.
const DUMMY_SUPPORTERS = ["Alex Morgan", "Elena Voss", "Marcus Reed", "Sofia Chen", "Liam O'Brien", "Ryan Blake"]
const DUMMY_SUBSCRIBERS = ["John Carter", "Nadia Petrov", "Isabella Cruz", "Ethan Kim", "Grace Sullivan", "Omar Farouk"]

const AVATAR_PALETTE = [
  "linear-gradient(145deg, #d4a843, #6b4a10)",
  "linear-gradient(145deg, #c9a84c, #4a2f08)",
  "linear-gradient(145deg, #e8c96a, #5a3a12)",
  "linear-gradient(145deg, #b8862e, #3a2600)",
]

function getOrCreateClientId(): string {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY)
    if (existing) return existing
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `kc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(CLIENT_ID_KEY, fresh)
    return fresh
  } catch {
    return `kc-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function avatarFor(username: string) {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function useCountTween(initial: number) {
  const [displayed, setDisplayed] = useState(initial)
  const rafRef = useRef<number | null>(null)

  const animateTo = useCallback((from: number, to: number) => {
    if (from === to) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const duration = 700
    const diff = to - from
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(Math.round(from + diff * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else setDisplayed(to)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return [displayed, animateTo] as const
}

/** Cycles through a pool of names every few seconds, fading between them. */
function useActivityTicker(pool: string[]) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % pool.length)
        setVisible(true)
      }, 350)
    }, 4200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { name: pool[index], visible }
}

const EMBERS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 4 + ((i * 43.1) % 94),
  top: 6 + ((i * 61.7) % 90),
  dur: 4 + ((i * 1.5) % 4),
  del: (i * 0.5) % 3,
}))

export function GamingQuizSection() {
  const [likes, animateLikes] = useCountTween(1500)
  const [subscribers, animateSubscribers] = useCountTween(66)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsRevealed, setCommentsRevealed] = useState(false)
  const [liked, setLiked] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [username, setUsername] = useState("")
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [likePulse, setLikePulse] = useState(false)
  const [subPulse, setSubPulse] = useState(false)

  const supporterTicker = useActivityTicker(DUMMY_SUPPORTERS)
  const subscriberTicker = useActivityTicker(DUMMY_SUBSCRIBERS)

  useEffect(() => {
    try {
      setLiked(window.localStorage.getItem(LIKED_FLAG_KEY) === "1")
      setSubscribed(window.localStorage.getItem(SUBSCRIBED_FLAG_KEY) === "1")
    } catch {}

    let cancelled = false
    fetch("/api/community")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { likes: number; subscribers: number; comments: Comment[] }) => {
        if (cancelled) return
        animateLikes(likes, data.likes)
        animateSubscribers(subscribers, data.subscribers)
        setComments(data.comments)
        setTimeout(() => setCommentsRevealed(true), 100)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLike = () => {
    if (liked) return
    setLiked(true)
    try {
      window.localStorage.setItem(LIKED_FLAG_KEY, "1")
    } catch {}
    fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", clientId: getOrCreateClientId() }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { likes: number }) => {
        animateLikes(likes, data.likes)
        setLikePulse(true)
        setTimeout(() => setLikePulse(false), 900)
      })
      .catch(() => {})
  }

  const handleSubscribe = () => {
    if (subscribed) return
    setSubscribed(true)
    try {
      window.localStorage.setItem(SUBSCRIBED_FLAG_KEY, "1")
    } catch {}
    fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", clientId: getOrCreateClientId() }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { subscribers: number }) => {
        animateSubscribers(subscribers, data.subscribers)
        setSubPulse(true)
        setTimeout(() => setSubPulse(false), 900)
      })
      .catch(() => {})
  }

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", username, text: commentText }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { comments: Comment[] }) => {
        setComments(data.comments)
        setCommentText("")
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: "#050508" }}>
      <style>{`
        @keyframes gq-border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gq-border-flow-rev {
          0% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes gq-flicker {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes gq-ember-float {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 0.85; }
          85% { opacity: 0.5; }
          100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
        }
        @keyframes gq-heading-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes gq-count-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(201,168,76,0.35); }
          50% { text-shadow: 0 0 28px rgba(255,190,90,0.9), 0 0 46px rgba(201,168,76,0.5); }
        }
        @keyframes gq-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gq-scroll::-webkit-scrollbar { width: 4px; }
        .gq-scroll::-webkit-scrollbar-track { background: transparent; }
        .gq-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.35); border-radius: 4px; }
        .gq-like-btn:hover, .gq-sub-btn:hover { transform: translateY(-2px) scale(1.03); }
      `}</style>

      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(201,168,76,0.12), transparent 70%)" }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute -inset-2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,140,40,0.35), transparent 70%)", filter: "blur(14px)", animation: "gq-flicker 3s ease-in-out infinite" }}
            />
            <div
              className="relative flex items-center justify-center w-16 h-16 rounded-full"
              style={{
                background: "linear-gradient(145deg,#241705,#0a0805)",
                border: "1px solid rgba(212,168,67,.4)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.6)",
              }}
            >
              <Swords className="w-7 h-7" style={{ color: "#e8c96a" }} />
            </div>
          </div>

          <h2
            className="font-serif text-4xl sm:text-5xl font-bold mb-4"
            style={{
              backgroundImage: "linear-gradient(100deg, #8a611c 0%, #e8c96a 22%, #fff3d0 45%, #c9a84c 68%, #8a611c 100%)",
              backgroundSize: "220% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              filter: "drop-shadow(0 0 30px rgba(201,168,76,0.35)) drop-shadow(0 0 60px rgba(201,168,76,0.18))",
              animation: "gq-heading-shimmer 7s linear infinite alternate",
            }}
          >
            Gaming Quiz
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base leading-relaxed" style={{ color: "rgba(232,223,200,0.55)" }}>
            Want to bring Kingdom Come physical boards into the real world? Support the Kingdom by liking,
            commenting, and subscribing to help make the physical board experience possible.
          </p>
          <div className="w-24 h-1 mx-auto mt-6" style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        </div>

        {/* Main glass panel — dual counter-flowing gold border, ember ambience */}
        <div
          className="relative rounded-3xl mb-10"
          style={{
            padding: 3,
            background: "linear-gradient(120deg, #2a1800, #ffcf6b, #ff7a1a, #e8c96a, #5a1400, #ffb347, #2a1800)",
            backgroundSize: "300% 300%",
            animation: "gq-border-flow 6s ease infinite",
            boxShadow: "0 26px 65px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.18)",
          }}
        >
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none opacity-60"
            style={{
              padding: 3,
              background: "linear-gradient(60deg, transparent, rgba(255,255,255,0.5), transparent, rgba(255,140,40,0.4), transparent)",
              backgroundSize: "250% 250%",
              animation: "gq-border-flow-rev 4.5s linear infinite",
              mixBlendMode: "overlay",
            }}
          />

          <div
            className="relative rounded-3xl overflow-hidden backdrop-blur-xl p-6 sm:p-9"
            style={{ background: "linear-gradient(160deg, rgba(12,7,2,0.94), rgba(4,3,6,0.97))" }}
          >
            {EMBERS.map((e) => (
              <span
                key={e.id}
                className="pointer-events-none absolute rounded-full"
                style={{
                  left: `${e.left}%`,
                  top: `${e.top}%`,
                  width: 3,
                  height: 3,
                  background: "#ffb347",
                  boxShadow: "0 0 7px 2px rgba(255,179,71,0.7)",
                  animation: `gq-ember-float ${e.dur}s ${e.del}s ease-in-out infinite`,
                }}
              />
            ))}

            {/* corner accents */}
            {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls, i) => (
              <div key={i} className={`pointer-events-none absolute w-3 h-3 ${cls}`} style={{ borderColor: "rgba(232,201,106,0.5)" }} />
            ))}

            {/* Live activity stats */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,168,76,0.18)" }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ThumbsUp className="w-4 h-4" style={{ color: "rgba(201,168,76,0.7)" }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(201,168,76,0.65)" }}>
                    Likes
                  </span>
                </div>
                <div
                  className="font-serif text-3xl sm:text-4xl font-bold tabular-nums mb-2"
                  style={{ color: "#f0d080", animation: likePulse ? "gq-count-glow 1s ease-in-out" : "none" }}
                >
                  {likes.toLocaleString()}
                </div>
                <p
                  className="text-xs italic transition-opacity duration-300"
                  style={{ color: "rgba(232,223,200,0.45)", opacity: supporterTicker.visible ? 1 : 0 }}
                >
                  "{supporterTicker.name} liked the Kingdom"
                </p>
              </div>

              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(201,168,76,0.18)" }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Bell className="w-4 h-4" style={{ color: "rgba(201,168,76,0.7)" }} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(201,168,76,0.65)" }}>
                    Subscribers
                  </span>
                </div>
                <div
                  className="font-serif text-3xl sm:text-4xl font-bold tabular-nums mb-2"
                  style={{ color: "#f0d080", animation: subPulse ? "gq-count-glow 1s ease-in-out" : "none" }}
                >
                  {subscribers.toLocaleString()}
                </div>
                <p
                  className="text-xs italic transition-opacity duration-300"
                  style={{ color: "rgba(232,223,200,0.45)", opacity: subscriberTicker.visible ? 1 : 0 }}
                >
                  "{subscriberTicker.name} subscribed"
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="relative flex flex-wrap items-center justify-center gap-4 mb-10">
              <button
                type="button"
                data-magnetic
                onClick={handleLike}
                disabled={liked}
                className="gq-like-btn flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-[12px] uppercase tracking-widest transition-all duration-300"
                style={
                  liked
                    ? { background: "rgba(125,189,110,0.16)", border: "1px solid rgba(125,189,110,0.45)", color: "#a8e89a", boxShadow: "0 0 20px rgba(125,189,110,0.15)" }
                    : { background: "linear-gradient(135deg, #d4a843, #e8c96a, #c4912a)", color: "#1a0d00", boxShadow: "0 10px 28px rgba(212,168,67,0.4)" }
                }
              >
                <ThumbsUp className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
                {liked ? "Liked" : "Like"}
              </button>

              <button
                type="button"
                data-magnetic
                onClick={handleSubscribe}
                disabled={subscribed}
                className="gq-sub-btn flex items-center gap-2.5 px-7 py-3.5 rounded-full font-bold text-[12px] uppercase tracking-widest border transition-all duration-300"
                style={
                  subscribed
                    ? { background: "rgba(0,0,0,0.4)", borderColor: "rgba(201,168,76,0.35)", color: "#e8c96a" }
                    : { background: "linear-gradient(135deg, #d4a843, #e8c96a, #c4912a)", borderColor: "transparent", color: "#1a0d00", boxShadow: "0 10px 28px rgba(212,168,67,0.4)" }
                }
              >
                <Bell className="w-4 h-4" fill={subscribed ? "currentColor" : "none"} />
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>

            <div className="relative h-px mb-8" style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }} />

            {/* Comments */}
            <div className="relative flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4" style={{ color: "#c9a84c" }} />
              <h3 className="font-serif text-lg font-bold" style={{ color: "#e8c96a" }}>
                Kingdom Discussion
              </h3>
              <span className="font-mono text-[11px]" style={{ color: "rgba(201,168,76,0.5)" }}>
                ({comments.length})
              </span>
            </div>

            <form onSubmit={handleSubmitComment} className="relative mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 mb-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(201,168,76,0.5)" }} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your name"
                    maxLength={30}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors duration-300 focus:border-[#e8c96a]/60"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,168,76,0.2)", color: "#e8d8b0" }}
                  />
                </div>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on Kingdom Come..."
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors duration-300 focus:border-[#e8c96a]/60"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,168,76,0.2)", color: "#e8d8b0" }}
                />
              </div>
              <button
                type="submit"
                data-magnetic
                disabled={!commentText.trim() || submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all duration-300 disabled:opacity-40 hover:shadow-[0_8px_24px_rgba(212,168,67,0.4)] hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #d4a843, #e8c96a)", color: "#1a0d00" }}
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </form>

            <div className="gq-scroll relative space-y-3 max-h-80 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-sm italic text-center py-6" style={{ color: "rgba(201,168,76,0.4)" }}>
                  Be the first to leave a message for the Kingdom.
                </p>
              ) : (
                comments.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{
                      background: "linear-gradient(145deg, rgba(0,0,0,.5), rgba(18,12,3,.4))",
                      border: "1px solid rgba(212,168,67,.16)",
                      opacity: commentsRevealed ? 1 : 0,
                      transform: commentsRevealed ? "translateY(0)" : "translateY(14px)",
                      transition: "opacity 0.5s ease, transform 0.5s ease",
                      transitionDelay: commentsRevealed ? `${Math.min(i, 8) * 60}ms` : "0ms",
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 font-serif font-bold text-sm"
                      style={{ background: avatarFor(c.username), color: "#fff3d0", border: "1px solid rgba(232,201,106,0.35)" }}
                    >
                      {c.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-serif text-sm font-bold" style={{ color: "#f0d080" }}>
                          {c.username}
                        </span>
                        <span className="font-mono text-[10px] shrink-0" style={{ color: "rgba(201,168,76,0.45)" }}>
                          {timeAgo(c.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words" style={{ color: "rgba(232,223,200,0.72)" }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
