"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

const characters = [
  {
    name: "The Super Queen",
    tagline: "She Moves Twice. She Kills Twice.",
    description: "A force that bends the battlefield to her will. She glides across the board with unmatched speed and grace, striking twice as hard, twice as fast — a storm that no pawn or knight can outrun.",  
    image: "/characters/super-queen.jpg",
    type: "legendary",
    board: "All Boards",
    ability: "Double Move • Unlimited Range",
  },
  {
    name: "The Mystic King",
    tagline: "The Last One Standing Wins The Crown.",
    description: "Leaps in a lethal L-shaped strike, unpredictable and untouchable. When trapped, he summons the Wizard's magic, transforming into a new threat — one final gambit that can turn the tide.",
    image: "/characters/mystic-king.jpg",
    type: "royalty",
    board: "12x12 • 16x16",
    ability: "L-Shape Move • Morph Ability",
  },
  {
    name: "The Dragon",
    tagline: "Wings of Fire. Death From Above.",
    description: "Soars above allies with deadly precision, slicing across the board like a storm. Every move scorches the battlefield, leaving nothing but ashes in its wake.",
    image: "/characters/dragon.jpg",
    type: "creature",
    board: "12x12 • 16x16",
    ability: "Fly Over Pieces • Queen Range",
  },
  {
    name: "The Sorceress",
    tagline: "Three Spells. One Wish. Game Over.",
    description: "Vanishing and reappearing at will, she bends the board to her whim. With three devastating spells at her command — Sleep, Teleport, and the fateful Wish — she turns strategy into pure sorcery.",
    image: "/characters/sorceress.jpg",
    type: "magic",
    board: "12x12 • 16x16",
    ability: "3 Spells • Teleport • Dice Wish",
  },
  {
    name: "The Trickster",
    tagline: "Kill Him In 10 Moves... Or YOU Lose.",
    description: "A master of chaos, lurking in plain sight. Survive ten moves under his shadow, and the opponent falls — for he rewrites the rules of victory itself.",
    image: "/characters/trickster.jpg",
    type: "legendary",
    board: "16x16",
    ability: "10-Move Curse • Game Over Power",
  },
  {
    name: "The Wizard",
    tagline: "Master of Teleportation. Ethereal Guardian.",
    description: "Dwelling between realms, untouchable and wise. He bends space itself, teleporting allies across the board, and can lay down his life to grant the King a final, decisive miracle.",
    image: "/characters/wizard.jpg",
    type: "magic",
    board: "12x12 • 16x16",
    ability: "Teleport • Ethereal • Last Wish",
  },
  {
    name: "The Elven Archer",
    tagline: "Moves Like A Queen. Fights Like A Knight.",
    description: "Strikes with unerring precision from afar, raining arrows across the board. When the enemy closes in, she switches to lethal L-shaped dagger strikes — swift, silent, and unstoppable.",
    image: "/characters/elven-archer.jpg",
    type: "warrior",
    board: "12x12 • 16x16",
    ability: "Queen Range • L-Shape Attack",
  },
  {
    name: "The Executioner",
    tagline: "One Strike. Total Annihilation.",
    description: "Sweeps the battlefield in a merciless straight strike. Before the dust settles, his colossal axe arcs again — one block left or right — delivering a second, bone-crushing blow.",
    image: "/characters/executioner.jpg",
    type: "warrior",
    board: "12x12 • 16x16",
    ability: "Straight Kill • Axe Swing Attack",
  },
]

function WarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; type: string }[] = []
    for (let i = 0; i < 120; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 1.5 - 0.5, size: Math.random() * 3 + 1, opacity: Math.random() * 0.8 + 0.2, type: Math.random() > 0.6 ? "ember" : "dust" })
    }

    const drawGrid = () => {
      ctx.strokeStyle = "rgba(201,168,76,0.03)"; ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
      for (let y = 0; y < canvas.height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke() }
    }

    const drawHex = (time: number) => {
      ctx.strokeStyle = `rgba(201,168,76,${0.02 + Math.sin(time * 0.001) * 0.01})`; ctx.lineWidth = 0.5
      const size = 40
      for (let row = 0; row < canvas.height / size + 1; row++) {
        for (let col = 0; col < canvas.width / size + 1; col++) {
          const x = col * size * 1.5; const y = row * size * Math.sqrt(3) + (col % 2) * size * (Math.sqrt(3) / 2)
          ctx.beginPath()
          for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; i === 0 ? ctx.moveTo(x + size * Math.cos(a), y + size * Math.sin(a)) : ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a)) }
          ctx.closePath(); ctx.stroke()
        }
      }
    }

    let animFrame: number; let time = 0
    const animate = () => {
      time++; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#050508"; ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawGrid(); drawHex(time)
      const pulse = 0.3 + Math.sin(time * 0.02) * 0.1
      const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.5)
      g.addColorStop(0, `rgba(201,168,76,${pulse * 0.08})`); g.addColorStop(0.5, `rgba(139,26,26,${pulse * 0.04})`); g.addColorStop(1, "transparent")
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width }
        if (p.x < -10) p.x = canvas.width + 10; if (p.x > canvas.width + 10) p.x = -10
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        if (p.type === "ember") { const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2); eg.addColorStop(0, `rgba(255,180,50,${p.opacity})`); eg.addColorStop(1, `rgba(201,168,76,0)`); ctx.fillStyle = eg } else { ctx.fillStyle = `rgba(201,168,76,${p.opacity * 0.4})` }
        ctx.fill(); p.opacity = Math.max(0.1, Math.min(1, p.opacity + (Math.random() - 0.5) * 0.05))
      })
      if (time % 3 === 0) { const sy = (time * 2) % canvas.height; ctx.strokeStyle = "rgba(201,168,76,0.03)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke() }
      animFrame = requestAnimationFrame(animate)
    }
    animate()
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener("resize", onResize)
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener("resize", onResize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
}

function Character3DCard({ character, isActive }: { character: typeof characters[0]; isActive: boolean }) {
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
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setIsHovered(false) }} onMouseEnter={() => setIsHovered(true)} className="relative cursor-pointer select-none" style={{ perspective: "1000px", width: "100%", maxWidth: "380px", margin: "0 auto" }}>
      <div style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`, transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out", transformStyle: "preserve-3d" }}>
        <div className="relative rounded-xl overflow-hidden" style={{ height: "clamp(360px, 100vw, 580px)", border: "1px solid rgba(201,168,76,0.3)", boxShadow: isActive ? "0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1)" : "0 20px 60px rgba(0,0,0,0.5)", background: "#0a0a12" }}>
          
          {/* IMAGE instead of video */}
          <img
            key={character.image}
            src={character.image}
            alt={character.name}
            className="w-full h-full object-cover"
            style={{
              transform: `translateZ(0) scale(${isHovered ? 1.05 : 1})`,
              transition: "transform 0.5s ease-out",
              filter: isActive ? "brightness(1.1) contrast(1.05)" : "brightness(0.7) grayscale(0.3)",
            }}
          />

          {isHovered && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(201,168,76,0.15) 0%, transparent 60%)` }} />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,5,8,0.95) 0%, rgba(5,5,8,0.4) 40%, transparent 70%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,5,8,0.6) 0%, transparent 30%)" }} />
          <div className="absolute top-4 right-4 text-xs font-mono tracking-widest px-4 py-1 rounded" style={{ background: "black", border: "3px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>{character.board}</div>
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="inline-block text-xs font-mono px-3 py-1 rounded mb-3" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", color: "rgba(201,168,76,0.8)" }}>⚡ {character.ability}</div>
            <h3 className="font-serif text-2xl mb-1" style={{ color: "#c9a84c", textShadow: "0 0 20px rgba(201,168,76,0.5)" }}>{character.name}</h3>
            <p className="text-white/60 text-sm font-mono italic">"{character.tagline}"</p>
          </div>
          {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((cls, i) => (
            <div key={i} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: "rgba(201,168,76,0.6)" }} />
          ))}
        </div>
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(201,168,76,${isHovered ? 0.08 : 0.02}) 0%, transparent 50%, rgba(201,168,76,${isHovered ? 0.04 : 0.01}) 100%)` }} />
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
    setTimeout(() => { setCurrentIndex(index); setIsTransitioning(false) }, 400)
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
      <WarBackground />
      <div className="absolute inset-0" style={{ backgroundImage: "url('/characters/battle-scene.jpg')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.05, zIndex: 1 }} />

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* Header */}
        <div className="text-center mb-12 sm:mb-20">
          <div className="inline-block text-xs font-sans tracking-[6px] sm:tracking-[8px] uppercase mb-6 px-4 py-2 rounded" style={{ color: "rgba(201,168,76,0.6)", border: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)" }}>◆ Kingdom Come ◆</div>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-7xl mb-6" style={{ color: "#c9a84c", textShadow: "0 0 40px rgba(201,168,76,0.4), 0 0 80px rgba(201,168,76,0.2)", letterSpacing: "0.05em" }}>
            Warriors of<br /><span style={{ color: "#e8c96a" }}>the Realm</span>
          </h2>
          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: "rgba(232,223,200,0.5)" }}>20+ legendary characters. Each with unique powers.<br />Only one kingdom survives.</p>
          <div className="mx-auto" style={{ width: "120px", height: "1px", background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          <div className={cn("w-full transition-all duration-400", isTransitioning ? "opacity-0 scale-95 -translate-x-4" : "opacity-100 scale-100 translate-x-0")}>
            <Character3DCard character={current} isActive={true} />
          </div>

          <div className={cn("w-full transition-all duration-400", isTransitioning ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0")}>
            <div className="hidden sm:block font-serif text-9xl leading-none mb-4 select-none" style={{ color: "rgba(201,168,76,0.06)" }}>{String(currentIndex + 1).padStart(2, "0")}</div>
            <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-4" style={{ color: "#c9a84c", textShadow: "0 0 30px rgba(201,168,76,0.3)", marginTop: "-40px" }}>{current.name}</h3>
            <div style={{ width: "60px", height: "2px", background: "linear-gradient(90deg, #c9a84c, transparent)", marginBottom: "20px" }} />
            <p className="text-lg sm:text-xl md:text-2xl font-mono italic mb-6" style={{ color: "rgba(201,168,76,0.7)" }}>"{current.tagline}"</p>
            <p className="text-base sm:text-lg leading-relaxed mb-6 sm:mb-8" style={{ color: "rgba(232,223,200,0.55)" }}>{current.description}</p>
            <div className="inline-flex items-center gap-3 px-4 sm:px-5 py-3 rounded mb-8 sm:mb-10" style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", color: "#c9a84c", fontFamily: "monospace", fontSize: "13px", letterSpacing: "2px" }}>
              <span style={{ opacity: 0.6 }}>⚡</span>{current.ability}
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

        {/* CTA */}
        <div className="mt-20 sm:mt-32 text-center">
          <div className="inline-block px-6 sm:px-12 py-8 sm:py-12 rounded-xl w-full sm:w-auto" style={{ background: "rgba(5,5,8,0.9)", border: "1px solid rgba(201,168,76,0.15)", boxShadow: "0 0 60px rgba(201,168,76,0.05)" }}>
            <div className="text-4xl sm:text-5xl mb-6" style={{ textShadow: "0 0 30px rgba(201,168,76,0.5)" }}>♛</div>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-4" style={{ color: "#c9a84c" }}>Ready to Command Legends?</h3>
            <p className="text-base sm:text-lg mb-8 sm:mb-10 max-w-lg mx-auto" style={{ color: "rgba(232,223,200,0.45)" }}>The battlefield awaits. Your kingdom needs a ruler. Will you rise to the challenge?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#play" className="font-serif text-sm px-8 sm:px-10 py-4 rounded transition-all duration-300 text-center" style={{ background: "linear-gradient(135deg, #8b6914, #c9a84c, #8b6914)", color: "#050508", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #c9a84c, #e8c96a, #c9a84c)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(201,168,76,0.3)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #8b6914, #c9a84c, #8b6914)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}>
                ⚔ Play Now
              </a>
              <a href="#order" className="font-serif text-sm px-8 sm:px-10 py-4 rounded transition-all duration-300 text-center" style={{ background: "transparent", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.35)", letterSpacing: "2px", textTransform: "uppercase" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(201,168,76,0.08)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.6)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; e.currentTarget.style.transform = "translateY(0)" }}>
                Order Your Board
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}