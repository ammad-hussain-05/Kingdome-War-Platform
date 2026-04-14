"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as THREE from "three"

/* ──────────────────────────────────────────────────────────────
   DATA (unchanged)
─────────────────────────────────────────────────────────────── */
const products = [
  {
    id: "kc-style-8x8",
    name: "KC Style 8x8",
    players: "2 Player",
    boardSize: "8x8",
    price: 20,
    description: "Classic chess with Kingdom Come rules. The perfect introduction to the realm.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-tri-8x8",
    name: "KC Tri-Board 8x8",
    players: "3 Player",
    boardSize: "8x8",
    price: 30,
    description: "Phantom Dimension mode. Three kingdoms clash in an epic triangular battle.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-quad-8x8",
    name: "KC Quad X 8x8",
    players: "4 Player",
    boardSize: "8x8",
    price: 40,
    description: "Four-way warfare on a classic board. Alliances form and break.",
    status: "Available Now",
    featured: false,
  },
  {
    id: "kc-duel-12x12",
    name: "KC Duel 12x12",
    players: "2 Player",
    boardSize: "12x12",
    price: 40,
    description: "Dominion of Kingdom Come. All special pieces unleashed in a grand duel.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-tri-12x12",
    name: "KC Tri-Board 12x12",
    players: "3 Player",
    boardSize: "12x12",
    price: 50,
    description: "Phantom Dimension medieval battle. Dragons, Wizards, and three armies collide.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-quad-12x12",
    name: "KC Quad X Parabellum 12x12",
    players: "4 Player",
    boardSize: "12x12",
    price: 60,
    description: "The ultimate medieval battle. Four kingdoms, all special pieces, total war.",
    status: "Available Now",
    featured: true,
  },
  {
    id: "kc-mastery-16x16",
    name: "KC Mastery 16x16",
    players: "2 Player",
    boardSize: "16x16",
    price: 60,
    description: "Beware the Trickster. Expert mode for masters of the realm. The ultimate challenge.",
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
   PRODUCT CARD — 3D hover, medieval gold/black theme
─────────────────────────────────────────────────────────────── */
function ProductCard({ product }: { product: typeof products[0] }) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setRotateX(y * -12)
    setRotateY(x * 12)
  }

  const handleLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "relative group rounded-xl border border-[#c9a84c]/30 bg-[#050508]/85 overflow-hidden",
        "transition-all duration-300 hover:shadow-[0_0_40px_rgba(201,168,76,0.25)]",
        product.featured ? "ring-1 ring-[#c9a84c]/50" : ""
      )}
      style={{
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Featured badge */}
      {product.featured && (
        <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-[#c9a84c] text-[#050508] text-[10px] font-bold uppercase tracking-widest rounded">
          Featured
        </div>
      )}

      {/* 3D board visual — golden grid with depth */}
      <div className="h-40 bg-gradient-to-br from-[#0b0a09] to-[#050508] flex items-center justify-center border-b border-[#c9a84c]/25 relative overflow-hidden">
        <div
          className="grid gap-0.5 opacity-70"
          style={{
            gridTemplateColumns: `repeat(${parseInt(product.boardSize)}, 1fr)`,
            width: "90px",
            height: "90px",
            transform: "rotateX(20deg) rotateY(-10deg)",
            filter: "drop-shadow(0 0 6px rgba(201,168,76,0.35))",
          }}
        >
          {Array.from({ length: parseInt(product.boardSize) * parseInt(product.boardSize) }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-full h-full",
                (Math.floor(i / parseInt(product.boardSize)) + i) % 2 === 0
                  ? "bg-[#c9a84c]/30"
                  : "bg-[#c9a84c]/10"
              )}
            />
          ))}
        </div>
        {/* golden glow orb */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.18),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="p-6 relative z-10" style={{ transform: "translateZ(20px)" }}>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-xl text-[#f4ddb0] drop-shadow-[0_0_10px_rgba(201,168,76,0.25)]">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] px-2 py-1 bg-[#c9a84c]/10 text-[#c9a84c] rounded border border-[#c9a84c]/20">
            {product.players}
          </span>
          <span className="text-[11px] px-2 py-1 bg-[#0b0a09] text-[#e8dfc8] rounded border border-[#c9a84c]/15">
            {product.boardSize}
          </span>
        </div>

        <p className="text-sm text-[#c9a84c]/70 leading-relaxed mb-4">{product.description}</p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-serif text-[#c9a84c] drop-shadow-[0_0_10px_rgba(201,168,76,0.3)]">
            ${product.price}
          </span>
          <span className="text-[11px] text-[#c9a84c]/50 uppercase tracking-widest">USD</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 bg-[#c9a84c] rounded-full animate-pulse shadow-[0_0_8px_#c9a84c]" />
          <span className="text-[11px] text-[#c9a84c]/80 uppercase tracking-widest">{product.status}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            asChild
            className="bg-[#c9a84c] text-[#050508] hover:bg-[#e8c96a] hover:shadow-[0_0_20px_rgba(201,168,76,0.45)] transition-all"
          >
            <Link href={`#order?board=${product.id}`}>⚔ Order Now</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]/60 transition-all"
          >
            <Link href="#play">▶ Play Online Free</Link>
          </Button>
        </div>
      </div>

      {/* corner accents for medieval vibe */}
      <div className="pointer-events-none absolute top-2 left-2 w-2 h-2 border-t border-l border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute top-2 right-2 w-2 h-2 border-t border-r border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute bottom-2 left-2 w-2 h-2 border-b border-l border-[#c9a84c]/40" />
      <div className="pointer-events-none absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[#c9a84c]/40" />
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
            Seven unique board configurations await. From classic 2-player duels to epic 4-player battles,
            find your perfect battlefield — forged in gold, ruled by strategy.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mt-4" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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