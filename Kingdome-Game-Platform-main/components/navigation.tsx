"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const leftLinks = [
  { href: "#home", label: "Home" },
  { href: "#story", label: "Story" },
  { href: "#characters", label: "Characters" },
  { href: "#game-modes", label: "Game Modes" },
  { href: "/lobby", label: "Lobby" },
]

const rightLinks = [
  { href: "#rules", label: "Rules" },
  { href: "#play", label: "Play Online" },
  { href: "#order", label: "Order" },
  { href: "#fan-club", label: "Fan Club" },
]

const allLinks = [...leftLinks, ...rightLinks]

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick() // mobile menu close

    if (href.startsWith("#")) {
      e.preventDefault()
      if (pathname === "/") {
        // Already home — smoothly scroll
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
      } else {
        // Dusre page se — home pe jao phir anchor
        router.push(`/${href}`)
      }
    }
  }

  return (
    <Link
      href={href.startsWith("#") ? `/${href}` : href}
      onClick={handleClick}
      className="relative px-4 py-2 group transition-all duration-300"
      style={{
        fontFamily: "ui-serif, Georgia, Cambria, Times New Roman, serif",
        fontSize: "13px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        color: "rgba(201, 168, 76, 0.7)",
        fontWeight: "500",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#c9a84c" }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(201, 168, 76, 0.7)" }}
    >
      {label}
      <span
        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-px transition-all duration-300 group-hover:w-4/5 w-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.6), transparent)",
        }}
      />
    </Link>
  )
}

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      router.push("/")
    }
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: isScrolled
          ? "rgba(5, 5, 8, 0.97)"
          : "linear-gradient(to bottom, rgba(5, 5, 8, 0.8), transparent)",
        borderBottom: isScrolled
          ? "1px solid rgba(201, 168, 76, 0.12)"
          : "1px solid transparent",
        backdropFilter: isScrolled ? "blur(20px)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20 md:h-24">

          {/* ── LEFT LINKS (Desktop) ── */}
          <div className="hidden lg:flex items-center flex-1">
            {leftLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          {/* ── CENTER LOGO ── */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex flex-col items-center flex-shrink-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2 group"
          >
            <div className="relative transition-transform duration-300 group-hover:scale-105">
              <img
                src="/logo/logo.png"
                alt="Kingdom Come Logo"
                style={{
                  // Desktop: bada, Mobile: chota aur fit
                  height: "clamp(98px, 10vw, 100px)",
                  width: "auto",
                  objectFit: "contain",
                  maxWidth: "120px",
                }}
              />
            </div>
          </Link>

          {/* ── RIGHT LINKS (Desktop) ── */}
          <div className="hidden lg:flex items-center flex-1 justify-end">
            {rightLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          {/* ── MOBILE CONTROLS ── */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded border border-[rgba(201,168,76,0.2)] text-[rgba(201,168,76,0.6)] bg-transparent hover:bg-[rgba(201,168,76,0.1)] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE DROPDOWN MENU ── */}
   <div
  className={cn(
    "lg:hidden absolute top-full left-0 right-0 overflow-hidden transition-all duration-400 ease-in-out",
    isMobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
  )}
  style={{
    background: "rgba(5, 5, 8, 0.55)",
    borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)"
  }}
>
  {/* 🎥 Background Video */}
  <video
    autoPlay
    loop
    muted
    playsInline
    className="absolute top-0 right-0 w-[140%] h-full object-cover object-left z-0"
>
    <source src="https://www.pexels.com/download/video/7670836/" type="video/mp4" />
  </video>

  <div className="px-6 py-6 flex flex-col gap-4">
    {allLinks.map((link) => (
      <NavLink
        key={link.href}
        href={link.href}
        label={link.label}
        onClick={() => setIsMobileMenuOpen(false)}
      />
    ))}
  </div>
</div>
    </nav>
  )
}