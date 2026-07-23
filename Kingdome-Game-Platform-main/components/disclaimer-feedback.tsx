"use client"

import { useState } from "react"
import { Crown, Shield, ScrollText, Mail, User, MessageSquare, Send, ChevronDown } from "lucide-react"
import { MODE_CONFIG } from "@/lib/lobby/types"

const FEEDBACK_EMAIL = "joseartisticphotos@gmail.com"

const GAME_OPTIONS = ["General Feedback", ...Object.values(MODE_CONFIG).map((c) => c.label), "Other"]

const RATINGS = ["Poor", "Fair", "Good", "Very Good", "Excellent"]

export function DisclaimerFeedback() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [game, setGame] = useState("")
  const [message, setMessage] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and feedback before submitting.")
      return
    }

    setError("")

    const subject = `KingdomCome Feedback${game ? ` — ${game}` : ""}`
    const lines = [`Name: ${name.trim()}`, `Email: ${email.trim()}`]
    if (game) lines.push(`Game: ${game}`)
    if (rating) lines.push(`Rating: ${RATINGS[rating - 1]}`)
    lines.push("", "Feedback:", message.trim())

    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`
    setSent(true)
  }

  return (
    <section className="df-section" aria-labelledby="df-feedback-heading">
      <div className="df-bg-gradient" aria-hidden="true" />

      <div className="df-inner relative z-10 max-w-6xl mx-auto px-6 lg:px-10">
        {/* ── DISCLAIMER ── */}
        <div className="df-disclaimer">
          <div className="df-crown-row" aria-hidden="true">
            <span className="df-crown-line" />
            <Crown className="h-6 w-6" />
            <span className="df-crown-line df-crown-line-r" />
          </div>

          <h2 className="df-title">Welcome to Kingdom Come</h2>

          <div className="df-disclaimer-box">
            <div className="df-scroll-icon" aria-hidden="true">
              <ScrollText className="h-7 w-7" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="df-disclaimer-text">
                Thank you for being part of the journey. Kingdom Come is currently in active development, and our team is dedicated to continuously improving the game by adding new features, refining gameplay mechanics, optimizing performance, and creating a more immersive battlefield experience.
              </p>
              <p className="df-disclaimer-text">
                As development continues, some features may still be adjusted, balanced, or improved over time. Players may occasionally encounter minor issues or changes as we test and refine different aspects of the game.
              </p>
              <p className="df-disclaimer-text">
                Your feedback is extremely valuable to us. Whether you discover a bug, have a suggestion, or want to share your experience, your input helps us improve the game and create a better experience for the entire community.
              </p>
              <p className="df-disclaimer-text">
                We appreciate your support, patience, and involvement as Kingdom Come continues to evolve.
              </p>
              <p className="df-disclaimer-text">
                Thank you for helping us build the future of the battlefield.
              </p>
            </div>
          </div>

          <div className="df-mini-divider" aria-hidden="true">
            <span className="df-crown-line" />
            <Crown className="h-3.5 w-3.5" />
            <span className="df-crown-line df-crown-line-r" />
          </div>
        </div>

        {/* ── FEEDBACK ── */}
        <div className="df-feedback">
          <div className="df-feedback-header">
            <h2 id="df-feedback-heading" className="df-title">
              We Value Your Feedback
            </h2>
            <p className="df-subtext">
              Your feedback helps us improve and create better experiences in KingdomCome. Please
              share your thoughts with us.
            </p>
          </div>

          <div className="df-feedback-grid">
            {/* ── Side card ── */}
            <div className="df-side-card">
              <div className="df-side-icon" aria-hidden="true">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="df-side-title">Share Your Voice</h3>
              <p className="df-side-text">
                Every suggestion brings us closer to building the ultimate kingdom experience for
                you.
              </p>
              <div
                className="df-side-image"
                style={{ backgroundImage: "url(/bg-images/lobby-main.avif)" }}
                aria-hidden="true"
              />
            </div>

            {/* ── Form ── */}
            <form className="df-form" onSubmit={handleSubmit}>
              <div className="df-form-row">
                <label className="df-field">
                  <span className="df-field-label">
                    <User className="h-3.5 w-3.5" /> Your Name
                  </span>
                  <input
                    className="df-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name..."
                    maxLength={60}
                  />
                </label>

                <label className="df-field">
                  <span className="df-field-label">
                    <Mail className="h-3.5 w-3.5" /> Your Email
                  </span>
                  <input
                    className="df-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={100}
                  />
                </label>
              </div>

              <label className="df-field">
                <span className="df-field-label">Which game are you giving feedback for?</span>
                <div className="df-select-wrap">
                  <select
                    className="df-input df-select"
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                  >
                    <option value="">Select a game...</option>
                    {GAME_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="df-select-icon h-4 w-4" aria-hidden="true" />
                </div>
              </label>

              <label className="df-field">
                <span className="df-field-label">
                  <MessageSquare className="h-3.5 w-3.5" /> Your Feedback / Suggestions / Ideas
                </span>
                <textarea
                  className="df-input df-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={5}
                  maxLength={2000}
                />
              </label>

              <div className="df-rating">
                <span className="df-field-label">How would you rate your experience?</span>
                <div className="df-rating-row">
                  {RATINGS.map((label, i) => (
                    <button
                      type="button"
                      key={label}
                      className={`df-rating-btn ${rating === i + 1 ? "df-rating-selected" : ""}`}
                      onClick={() => setRating(i + 1)}
                      aria-pressed={rating === i + 1}
                    >
                      <Crown className="h-5 w-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="df-error">⚠ {error}</p>}

              <button type="submit" className="df-submit">
                <span>Submit Feedback</span>
                <Send className="h-4 w-4" />
              </button>

              {sent && (
                <p className="df-sent-note">
                  Your email app should now be opening with your feedback ready to send to Joseph.
                  Thank you!
                </p>
              )}
            </form>
          </div>

          <p className="df-footnote">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Your feedback will be sent directly to our team. Thank you for being a part of the
            KingdomCome community!
          </p>
        </div>
      </div>
    </section>
  )
}
