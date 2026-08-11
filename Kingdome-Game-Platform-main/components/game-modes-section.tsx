"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import * as THREE from "three"
import { Plus, Swords, Play } from "lucide-react"

// The big faint background letter matches the board's kingdom system, per the reference design.
const GROUP_LETTER: Record<string, string> = { Classic: "C", Tri: "T", X: "X" }

const SPARKLES = [
  { top: "8%", left: "62%", size: 5 },
  { top: "18%", left: "88%", size: 4 },
  { top: "42%", left: "70%", size: 3 },
  { top: "55%", left: "92%", size: 4 },
]

/* ──────────────────────────────────────────────────────────────
   DATA (unchanged)
─────────────────────────────────────────────────────────────── */
const products = [
  // ── Classic Boards ──
  {
    id: "kc-classic-8x8",
    name: "Classic 8x8",
    group: "Classic",
    players: "2 Player",
    boardSize: "8x8",
    price: 20,
    description: "Classic chess with Kingdom Come rules. The perfect introduction to the realm.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-classic-12x12",
    name: "Classic 12x12",
    group: "Classic",
    players: "2 Player",
    boardSize: "12x12",
    price: 40,
    description: "Dominion of Kingdom Come. All special pieces unleashed in a grand duel.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-classic-16x16",
    name: "Classic 16x16",
    group: "Classic",
    players: "2 Player",
    boardSize: "16x16",
    price: 60,
    description: "Beware the Trickster. Expert mode for masters of the realm. The ultimate challenge.",
    status: "Available Now",
    featured: true,
  },
  // ── Tri Boards ──
  {
    id: "kc-tri-8x8",
    name: "Tri 8x8",
    group: "Tri",
    players: "3 Player",
    boardSize: "8x8",
    price: 30,
    description: "Phantom Dimension mode. Three kingdoms clash in an epic triangular battle.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-tri-12x12",
    name: "Tri 12x12",
    group: "Tri",
    players: "3 Player",
    boardSize: "12x12",
    price: 50,
    description: "Phantom Dimension medieval battle. Dragons, Wizards, and three armies collide.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-tri-16x16",
    name: "Tri 16x16",
    group: "Tri",
    players: "3 Player",
    boardSize: "16x16",
    price: 75,
    description: "The ultimate three-kingdom war. Every Empire piece, every spell, three armies fighting to the last banner.",
    status: "Available Now",
    featured: true,
  },
  // ── X Boards ──
  {
    id: "kc-x-8x8",
    name: "X 8x8",
    group: "X",
    players: "4 Player",
    boardSize: "8x8",
    price: 40,
    description: "Four-way warfare on a classic board. Alliances form and break.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-x-12x12",
    name: "X 12x12",
    group: "X",
    players: "4 Player",
    boardSize: "12x12",
    price: 60,
    description: "The ultimate medieval battle. Four kingdoms, all special pieces, total war.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-x-16x16",
    name: "X 16x16",
    group: "X",
    players: "4 Player",
    boardSize: "16x16",
    price: 90,
    description: "Four Empire kingdoms collide from every side. The largest, longest, most punishing battle in the realm.",
    status: "Available Now",
    featured: true,
  },
]

/* ──────────────────────────────────────────────────────────────
   THREE.JS BACKGROUND — floating golden embers (medieval vibe)
─────────────────────────────────────────────────────────────── */
function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 18

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)

    // golden particles
    const geometry = new THREE.BufferGeometry()
    const count = 700
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xc9a84c,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // rotating golden torus knot (subtle, low-poly)
    const knotGeo = new THREE.TorusKnotGeometry(3.2, 0.6, 120, 20)
    const knotMat = new THREE.MeshBasicMaterial({
      color: 0xc9a84c,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const knot = new THREE.Mesh(knotGeo, knotMat)
    knot.position.z = -6
    scene.add(knot)

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      particles.rotation.y += 0.003
      particles.rotation.x += 0.001
      knot.rotation.y += 0.006
      knot.rotation.x -= 0.003
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      geometry.dispose()
      material.dispose()
      knotGeo.dispose()
      knotMat.dispose()
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0 z-0" aria-hidden="true" />
}

/* ──────────────────────────────────────────────────────────────
   PRODUCT CARD — matches the reference design in public/modes-card
   (stable, no motion — a static premium stat-card, not a photo card)
─────────────────────────────────────────────────────────────── */
function ProductCard({ product }: { product: typeof products[0] }) {
  const letter = GROUP_LETTER[product.group] ?? product.group.charAt(0)

  return (
    <div
      className="relative rounded-3xl overflow-hidden transition-colors duration-300 hover:border-[#e8c96a]/60"
      style={{
        background: "#060504",
        border: "1px solid rgba(201,168,76,0.35)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
      }}
    >
      {/* ambient top glow */}
      <div
        className="pointer-events-none absolute -top-16 right-0 w-64 h-64 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.35), transparent 70%)", filter: "blur(20px)" }}
      />

      {/* giant watermark letter — matches this board's kingdom system */}
      <div
        className="pointer-events-none absolute top-0 right-0 select-none font-serif font-bold"
        style={{ fontSize: 210, lineHeight: 1, color: "rgba(201,168,76,0.1)", transform: "translate(8%, -10%)" }}
      >
        {letter}
      </div>

      {/* faint diagonal rune grid */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-2/3 h-56"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(201,168,76,0.07) 0 1px, transparent 1px 26px), repeating-linear-gradient(-45deg, rgba(201,168,76,0.07) 0 1px, transparent 1px 26px)",
          maskImage: "radial-gradient(ellipse at top right, black, transparent 75%)",
        }}
      />

      {/* sparkle diamonds */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute"
          style={{ top: s.top, left: s.left, color: "rgba(201,168,76,0.5)", fontSize: s.size }}
        >
          ◆
        </span>
      ))}

      {product.featured && (
        <div className="absolute top-6 right-6 z-20 px-2 py-1 bg-[#c9a84c] text-[#050508] text-[10px] font-bold uppercase tracking-widest rounded">
          Featured
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-7">
        <div
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg mb-6"
          style={{ border: "1px solid rgba(201,168,76,0.4)" }}
        >
          <Plus className="w-4 h-4" style={{ color: "#c9a84c" }} />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#c9a84c" }}>
          Kingdom Series
        </p>
        <h3
          className="font-serif font-bold uppercase mb-4"
          style={{ fontSize: "clamp(26px, 5vw, 36px)", color: "#f4ecd8", lineHeight: 1.05 }}
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-2 mb-5">
          <span
            className="text-[11px] px-3 py-1.5 rounded-full border"
            style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}
          >
            {product.players}
          </span>
          <span
            className="text-[11px] px-3 py-1.5 rounded-full border"
            style={{ borderColor: "rgba(201,168,76,0.4)", color: "#c9a84c" }}
          >
            {product.boardSize}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(232,223,200,0.55)" }}>
          {product.description}
        </p>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-serif font-bold" style={{ fontSize: 38, color: "#c9a84c" }}>
            ${product.price}
          </span>
          <span className="text-xs uppercase tracking-widest" style={{ color: "rgba(201,168,76,0.6)" }}>
            USD
          </span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ade80" }}>
            {product.status}
          </span>
        </div>

        <Link
          href={`#order?board=${product.id}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(201,168,76,0.35)]"
          style={{ background: "linear-gradient(135deg, #d4a843, #e8c96a)", color: "#1a0d00" }}
        >
          <Swords className="w-4 h-4" />
          Order Now
        </Link>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.25)" }} />
          <span style={{ color: "#c9a84c", fontSize: 6 }}>◆</span>
          <div className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.25)" }} />
        </div>

        <Link
          href="#play"
          className="flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-300 hover:text-[#e8c96a]"
          style={{ color: "#c9a84c" }}
        >
          <Play className="w-3.5 h-3.5" />
          Play Online Free
        </Link>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   SECTION — with Three.js background
─────────────────────────────────────────────────────────────── */
export function GameModesSection() {
  return (
    <section id="game-modes" className="relative py-24 md:py-32 overflow-hidden bg-[#050508]">
      <ThreeBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[#c9a84c]/70 text-2xl mb-4 drop-shadow-[0_0_10px_rgba(201,168,76,0.25)]">
            ♔
          </span>
          <h2 className="font-serif text-4xl md:text-5xl text-[#f4ddb0] drop-shadow-[0_0_20px_rgba(201,168,76,0.2)] mb-4">
            Game Modes
          </h2>
          <p className="text-[#c9a84c]/60 max-w-2xl mx-auto text-sm leading-relaxed">
            Nine unique battlefields await. From classic 2-player duels to epic 4-player campaigns,
            find your perfect battlefield — forged in gold, ruled by strategy.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mt-4" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center">
          <p className="text-[11px] text-[#c9a84c]/40 uppercase tracking-widest">
            All boards include complete rulebook • all pieces • free shipping
          </p>
        </div>
      </div>
    </section>
  )
}