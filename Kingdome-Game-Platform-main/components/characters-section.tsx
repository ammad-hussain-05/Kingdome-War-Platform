"use client"

import { useEffect, useState } from "react"

const characters = [
  { name: "Bishop",          file: "/all-characters/Bishop.png",          num: "01" },
  { name: "King",            file: "/all-characters/King.png",            num: "02" },
  { name: "Queen",           file: "/all-characters/Queen.png",           num: "03" },
  { name: "Knight",          file: "/all-characters/Knight.png",          num: "04" },
  { name: "Rook",            file: "/all-characters/Rook.png",            num: "05" },
  { name: "Aerobat Assassin",file: "/all-characters/Aerobat Assassin.png",num: "06" },
  { name: "Conjurer",        file: "/all-characters/Conjurer.png",        num: "07" },
  { name: "Mage Princess",   file: "/all-characters/Mage-Princess.png",   num: "08" },
  { name: "Mystic King",     file: "/all-characters/Mystic King.png",     num: "09" },
  { name: "Sorceress",       file: "/all-characters/Sorceress.png",       num: "10" },
  { name: "Super Knight",    file: "/all-characters/Super Knight.png",    num: "11" },
  { name: "Super Queen",     file: "/all-characters/Super Queen.png",     num: "12" },
  { name: "Thief",           file: "/all-characters/Thief.png",           num: "13" },
  { name: "Trickster",       file: "/all-characters/Trickster.png",       num: "14" },
  { name: "Wizard",          file: "/all-characters/Wizard.png",          num: "15" },
  { name: "Gargoyle",        file: "/all-characters/Gargoyle.png",        num: "16" },
  { name: "Executioner",     file: "/all-characters/Executioner.png",     num: "17" },
  { name: "Elven Archer",    file: "/all-characters/Elven Archer.png",    num: "18" },
  { name: "Dragon",          file: "/all-characters/Dragon.png",          num: "19" },
  { name: "Cavalier Prince", file: "/all-characters/Cavalier Prince.png", num: "20" },
  { name: "Archer",          file: "/all-characters/Archer.png",          num: "21" },
]

const TOTAL = characters.length

// Stable random data — generated once outside component so never changes
const SPARKS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  left:  10 + (i * 37.3) % 80,
  top:   5  + (i * 53.7) % 90,
  w:     1  + (i * 0.7)  % 3,
  dur:   6  + (i * 1.3)  % 10,
  del:   (i * 0.7) % 8,
  color: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#c9a84c" : "#ffe066",
}))

// ─────────────────────────────────────────────
// CHARACTER CARD — pure CSS 3D rotation, no Three.js
// No unmount issues, no flicker, always visible
// ─────────────────────────────────────────────
function CharCard({ ch }: { ch: typeof characters[0] }) {
  return (
    <div style={{
      width: "100%",
      height: "300px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "cs-spin 6s linear infinite",
    }}>
      <img
        src={ch.file}
        alt={ch.name}
        style={{
          maxHeight: "100%",
          maxWidth: "100%",
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 0 18px rgba(201,168,76,0.55))",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export default function CharactersSection() {
  const [active,   setActive]  = useState(0)
  const [isMobile, setMobile]  = useState(false)
  const [paused,   setPaused]  = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setActive(p => (p + 1) % TOTAL), 3000)
    return () => clearInterval(id)
  }, [paused])

  const CW  = isMobile ? 170 : 230
  const SW  = isMobile ? 110 : 155
  const GAP = isMobile ? 10  : 22

  const slotX = (s: number) => {
    if (s === 0) return 0
    const sign = Math.sign(s), abs = Math.abs(s)
    let x = CW / 2 + GAP + SW / 2
    if (abs === 2) x += SW + GAP
    return sign * x
  }

  const containerH = isMobile ? 320 : 440

  return (
    <>
      {/* ── Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cinzel+Decorative:wght@700&display=swap');

        @keyframes cs-spin {
          0%   { transform: rotateY(0deg)   translateY(0px); }
          25%  { transform: rotateY(90deg)  translateY(-6px); }
          50%  { transform: rotateY(180deg) translateY(0px); }
          75%  { transform: rotateY(270deg) translateY(-6px); }
          100% { transform: rotateY(360deg) translateY(0px); }
        }
        @keyframes cs-float {
          0%   { transform: translateY(0);      opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.8; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes cs-twinkle {
          0%,100% { opacity: 0.15; transform: scale(0.8); }
          50%     { opacity: 0.9;  transform: scale(1.3); }
        }
        @keyframes cs-pulse-dot {
          0%,100% { box-shadow: 0 0 4px 1px #c9a84c; }
          50%     { box-shadow: 0 0 10px 3px #ffd700; }
        }
      `}</style>

      {/*
        ════════════════════════════════════════
        SECTION WRAPPER
        background is set HERE with inline style
        — no canvas, no Three.js for background
        — black is guaranteed
        ════════════════════════════════════════
      */}
      <div
        id="characters"
        style={{
          position:   "relative",
          width:      "100%",
          minHeight:  "100vh",
          background: "#050508",   /* ← hard dark, always visible */
          overflow:   "hidden",
        }}
      >
        {/* ── Deep radial glows ── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%,   rgba(201,168,76,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 50%,  rgba(201,168,76,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 50%,  rgba(201,168,76,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 50% 100%, rgba(201,168,76,0.08) 0%, transparent 60%)
          `,
        }} />

        {/* ── SVG grid — medieval game board feel ── */}
        <svg
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:0, pointerEvents:"none", opacity:0.15 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="cs-grid"    width="60"  height="60"  patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60"   fill="none" stroke="#c9a84c" strokeWidth="0.4"/>
            </pattern>
            <pattern id="cs-grid-lg" width="180" height="180" patternUnits="userSpaceOnUse">
              <path d="M 180 0 L 0 0 0 180" fill="none" stroke="#c9a84c" strokeWidth="0.9"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cs-grid)" />
          <rect width="100%" height="100%" fill="url(#cs-grid-lg)" />
        </svg>

        {/* ── Vignette — dark edges ── */}
        <div style={{
          position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
          background:"radial-gradient(ellipse 90% 90% at 50% 50%, transparent 35%, rgba(2,2,4,0.9) 100%)",
        }} />

        {/* ── CSS spark particles ── */}
        {SPARKS.map(s => (
          <div
            key={s.id}
            style={{
              position:     "absolute",
              left:         `${s.left}%`,
              top:          `${s.top}%`,
              width:        s.w,
              height:       s.w,
              borderRadius: "50%",
              background:   s.color,
              boxShadow:    `0 0 ${s.w * 3}px ${s.w}px ${s.color}88`,
              animation:    s.id % 2 === 0
                ? `cs-float   ${s.dur}s    ${s.del}s linear      infinite`
                : `cs-twinkle ${s.dur*.7}s ${s.del}s ease-in-out infinite`,
              pointerEvents: "none",
              zIndex:        1,
            }}
          />
        ))}

        {/* ══════════════════════════════════════
            CONTENT  (zIndex 10 — above everything)
            ══════════════════════════════════════ */}
        <div style={{
          position:       "relative",
          zIndex:         10,
          minHeight:      "100vh",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "center",
          alignItems:     "center",
          padding:        isMobile ? "32px 12px" : "56px 24px",
        }}>

          {/* ── HEADER ── */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 60, width: "100%" }}>

            {/* Top ornament */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:14 }}>
              <div style={{ height:1, width: isMobile ? 40 : 80, background:"linear-gradient(90deg,transparent,rgba(201,168,76,.6))" }} />
              <span style={{ color:"rgba(201,168,76,.7)", fontSize: isMobile ? 14 : 18, filter:"drop-shadow(0 0 6px #c9a84c)" }}>⚔</span>
              <div style={{ height:1, width: isMobile ? 40 : 80, background:"linear-gradient(90deg,rgba(201,168,76,.6),transparent)" }} />
            </div>

            {/* Sub-label */}
            <p style={{
              fontFamily:    "'Cinzel', serif",
              fontSize:      isMobile ? 8 : 10,
              letterSpacing: "5px",
              color:         "rgba(201,168,76,.45)",
              textTransform: "uppercase",
              margin:        "0 0 10px",
            }}>
              Kingdom Come Chess
            </p>

            {/* Main heading */}
            <h2 style={{
              fontFamily:    "'Cinzel Decorative', serif",
              fontSize:      isMobile ? "clamp(22px,6vw,32px)" : "clamp(32px,5vw,60px)",
              fontWeight:    700,
              letterSpacing: isMobile ? "0.08em" : "0.12em",
              textTransform: "uppercase",
              color:         "#f0d080",
              margin:        "0 0 8px",
              lineHeight:    1.1,
              textShadow:    "0 0 40px rgba(201,168,76,.5), 0 0 80px rgba(201,168,76,.2), 0 2px 0 rgba(0,0,0,.9)",
            }}>
              The Characters
            </h2>

            {/* Bottom ornament */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:12 }}>
              <div style={{ height:1, flex:1, maxWidth: isMobile ? 50 : 100, background:"linear-gradient(90deg,transparent,rgba(201,168,76,.4))" }} />
              <span style={{ color:"rgba(201,168,76,.5)", fontSize:10 }}>✦ Choose Your Warrior ✦</span>
              <div style={{ height:1, flex:1, maxWidth: isMobile ? 50 : 100, background:"linear-gradient(90deg,rgba(201,168,76,.4),transparent)" }} />
            </div>
          </div>

          {/* ── CAROUSEL ── */}
          <div
            style={{ position:"relative", width:"100%", height: containerH, overflow:"hidden" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* perspective wrapper */}
            <div style={{ position:"absolute", top:0, left:"50%", height:"100%", perspective:"1200px" }}>
              {characters.map((ch, i) => {
                let slot = i - active
                const half = Math.floor(TOTAL / 2)
                if (slot >  half) slot -= TOTAL
                if (slot < -half) slot += TOTAL

                const abs     = Math.abs(slot)
                const visible = abs <= 2

                const opacity = visible ? (abs===0 ? 1 : abs===1 ? 0.52 : 0.25) : 0
                const blur    = visible ? (abs===0 ? 0 : abs===1 ? 3    : 7   ) : 0
                const scale   = visible ? (abs===0 ? 1.08 : abs===1 ? 0.80 : 0.62) : 0.3
                const zDrop   = visible ? (abs===0 ? 0 : abs===1 ? -80 : -180)    : -400
                const xBase   = visible ? slotX(slot) : slotX(Math.sign(slot || 1) * 3)
                const cw      = abs === 0 ? CW : SW

                return (
                  <div
                    key={ch.num}
                    onClick={() => { if (visible) { setActive(i); setPaused(false) } }}
                    style={{
                      position:       "absolute",
                      top:            "50%",
                      width:          cw,
                      transform:      `translateX(calc(${xBase}px - 50%)) translateY(-50%) scale(${scale}) translateZ(${zDrop}px)`,
                      opacity,
                      filter:         blur ? `blur(${blur}px)` : "none",
                      transition:     "transform .6s cubic-bezier(.25,.46,.45,.94), opacity .6s ease, filter .6s ease",
                      transformStyle: "preserve-3d",
                      cursor:         visible ? "pointer" : "default",
                      pointerEvents:  visible ? "auto"   : "none",
                      zIndex:         abs===0 ? 5 : abs===1 ? 3 : 1,
                      display:        "flex",
                      flexDirection:  "column",
                      alignItems:     "center",
                    }}
                  >
                    {/* Card — no border, pure transparent */}
                    <div style={{ width: "100%", minHeight: 200 }}>
                      <CharCard ch={ch} />
                    </div>

                    {/* Name tag */}
                    <div style={{
                      marginTop:      8,
                      width:          "88%",
                      padding:        "7px 10px",
                      background:     abs === 0
                        ? "linear-gradient(90deg,#3a2600,#6b4a00,#3a2600)"
                        : "rgba(30,20,0,.8)",
                      border:         `1px solid rgba(201,168,76,${abs===0 ? .6 : .2})`,
                      borderRadius:   3,
                      display:        "flex",
                      justifyContent: "center",
                      alignItems:     "center",
                      gap:            6,
                    }}>
                      {abs === 0 && (
                        <span style={{
                          width:6, height:6, borderRadius:"50%",
                          background:"#c9a84c",
                          animation:"cs-pulse-dot 2s infinite",
                          flexShrink: 0,
                        }} />
                      )}
                      <span style={{
                        fontFamily:    "'Cinzel', serif",
                        fontSize:      isMobile ? 9 : 11,
                        fontWeight:    700,
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        color:         abs === 0 ? "#f0d080" : "rgba(201,168,76,.6)",
                        textAlign:     "center",
                      }}>
                        {ch.name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── DOT NAV ── */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:28 }}>
            {characters.map((_, i) => (
              <div
                key={i}
                onClick={() => { setActive(i); setPaused(false) }}
                style={{
                  width:        i === active ? 22 : 6,
                  height:       6,
                  borderRadius: 3,
                  background:   i === active
                    ? "linear-gradient(90deg,#8a6200,#ffd700,#8a6200)"
                    : "rgba(201,168,76,.2)",
                  cursor:       "pointer",
                  transition:   "all .4s ease",
                  boxShadow:    i === active ? "0 0 8px rgba(201,168,76,.7)" : "none",
                }}
              />
            ))}
          </div>

        </div>{/* end content */}
      </div>{/* end section */}
    </>
  )
}