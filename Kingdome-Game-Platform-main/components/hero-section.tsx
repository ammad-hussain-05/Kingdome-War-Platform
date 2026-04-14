"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

const products = [
  { name: "KC Style 8x8", players: "2 Player", price: "$20" },
  { name: "KC Tri-Board 8x8", players: "3 Player", price: "$30" },
  { name: "KC Quad X 8x8", players: "4 Player", price: "$40" },
  { name: "KC Duel 12x12", players: "2 Player", price: "$40" },
  { name: "KC Tri-Board 12x12", players: "3 Player", price: "$50" },
  { name: "KC Quad X Parabellum 12x12", players: "4 Player", price: "$60" },
  { name: "KC Mastery 16x16", players: "2 Player", price: "$60" },
]

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
      }}
    />
  )
}

export function HeroSection() {
  const [embers, setEmbers] = useState<number[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setEmbers(Array.from({ length: 25 }, (_, i) => i))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

    const sliderHeadings = [
    { icon: "♚", title: "Kingdom Siege", meta: "8×8" },
    { icon: "🐉", title: "Dragon Realms", meta: "12×12" },
    { icon: "🗡", title: "Shadow War", meta: "16×16" },
  ]

  const sliderHighlights = [
    { icon: "♚", title: "Kingdom Siege", desc: "Classic battlefield where every move decides the throne." },
    { icon: "🐉", title: "Dragon Realms", desc: "Expanded war grid where dragons and strategy rule the skies." },
    { icon: "🗡", title: "Shadow War", desc: "Massive tactical arena built for deep strategy and stealth combat." },
  ]

  const loop1 = [...sliderHeadings, ...sliderHeadings, ...sliderHeadings, ...sliderHeadings]
  const loop2 = [...sliderHighlights, ...sliderHighlights, ...sliderHighlights]

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#050508" }}
    >
      {/* ── VIDEO BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          // style={{ opacity: 0.35 }}
        >
          <source src="/video/kingdome-come.mp4" type="video/mp4" />
        </video>

        {/* Multi-layer overlay — text ko clearly readable banata hai */}

        {/* Layer 1 — base dark */}
        <div
          className="absolute inset-0"
          // style={{ background: "rgba(5,5,8,0.55)" }}
        />

        {/* Layer 2 — center light, edges dark (vignette) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(5,5,8,0.1) 0%, rgba(5,5,8,0.7) 70%, rgba(5,5,8,0.95) 100%)",
          }}
        />

        {/* Layer 3 — top dark (nav ke liye) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(5,5,8,0.8) 0%, transparent 25%, transparent 65%, rgba(5,5,8,0.95) 100%)",
          }}
        />

        {/* Layer 4 — subtle gold glow center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 60%)",
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
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">

    

        {/* Thin line above title */}
        <div
          className="mx-auto mb-6"
          style={{
            width: "80px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #c9a84c, transparent)",
          }}
        />

        {/* Main Title */}
        <h1
          className="mb-6 select-none"
          style={{
            fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",
            fontSize: "clamp(36px, 8vw, 90px)",
            fontWeight: "700",
            color: "#c9a84c",
            textShadow:
              "0 0 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.3), 0 2px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.08em",
            lineHeight: 1.1,
          }}
        >
          Kingdom Come
        </h1>

        {/* Tagline */}
        <p
          className="mb-5"
          style={{
            // fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",
            fontSize: "clamp(11px, 1.8vw, 15px)",
            letterSpacing: "6px",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.8)",
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          }}
        >
          The New Phenomenon Adventure Game
        </p>

        {/* Divider */}
        <div
          className="mx-auto mb-6"
          style={{
            width: "60px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
          }}
        />

        {/* Subtitle */}
        <p
          className="max-w-2xl mx-auto mb-12"
          style={{
            fontFamily: "var(--font-crimson-text), 'Crimson Text', serif",
            fontSize: "clamp(15px, 2vw, 19px)",
            color: "rgba(232,223,200,0.75)",
            lineHeight: 1.8,
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}
        >
          Enter a world of medieval fantasy where chess meets magic.
          Command legendary characters with unique abilities
          in epic battles for the crown.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">

          {/* Primary — Play Now */}
          <a
            href="#play"
            style={{
                          fontFamily: "var(--font-cinzel-decorative), 'Cinzel Decorative', serif",

              fontSize: "11px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#050508",
              background: "linear-gradient(135deg, #8b6914, #c9a84c, #8b6914)",
              padding: "16px 40px",
              borderRadius: "4px",
              display: "inline-block",
              fontWeight: "700",
              boxShadow: "0 4px 20px rgba(201,168,76,0.3), 0 0 40px rgba(201,168,76,0.1)",
              transition: "all 0.3s ease",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)"
              e.currentTarget.style.transform = "translateY(-2px)"
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(201,168,76,0.4)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #8b6914, #c9a84c, #8b6914)"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,168,76,0.3)"
            }}
          >
            ⚔ Play Now
          </a>

          {/* Secondary — Order */}
          <a
            href="#order"
            style={{
              fontFamily: "var(--font-cinzel-decorative), serif",
              fontSize: "11px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#c9a84c",
              background: "transparent",
              padding: "15px 40px",
              borderRadius: "4px",
              display: "inline-block",
              border: "1px solid rgba(201,168,76,0.4)",
              transition: "all 0.3s ease",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,168,76,0.08)"
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.7)"
              e.currentTarget.style.transform = "translateY(-2px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            Order Your Board
          </a>
        </div>
        
           
       
      </div>


      

        {/* Keyframes */}
      <style jsx>{`
        @keyframes ember {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-60vh) scale(0.8) translateX(20px); opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(0.3) translateX(-10px); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </section>

   

  )
  
}





