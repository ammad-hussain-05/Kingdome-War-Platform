"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Crown, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type FooterNavItem = {
  id: string
  number: string
  label: string
  href: string
  anchor?: string
}

const FOOTER_NAV: FooterNavItem[] = [
  { id: "home", number: "01", label: "Home", href: "/", anchor: "home" },
  { id: "story", number: "02", label: "Story", href: "/#story", anchor: "story" },
  { id: "characters", number: "03", label: "Characters", href: "/#characters", anchor: "characters" },
  { id: "game-modes", number: "04", label: "Game Modes", href: "/#game-modes", anchor: "game-modes" },
  { id: "lobby", number: "05", label: "Lobby", href: "/lobby" },
]

const CONTACT_EMAIL = "joseartisticphotos@gmail.com"

function FooterNavLink({ item }: { item: FooterNavItem }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = (e: React.MouseEvent) => {
    if (!item.anchor) return
    e.preventDefault()
    if (pathname === "/") {
      document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth" })
      history.replaceState(null, "", item.anchor === "home" ? "/" : `/#${item.anchor}`)
    } else {
      router.push(item.href)
    }
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn("ft-nav-row", item.id === "lobby" && "ft-nav-lobby")}
    >
      <span className="ft-nav-number">{item.number}</span>
      <span className="ft-nav-label">{item.label}</span>
      {item.id === "lobby" && <span className="ft-nav-dot" aria-hidden="true" />}
      <span className="ft-nav-line" aria-hidden="true" />
    </Link>
  )
}

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = footerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const year = new Date().getFullYear()

  return (
    <footer ref={footerRef} className={cn("ft-footer ft-enter", visible && "ft-in")}>
      <div className="ft-bg-gradient" aria-hidden="true" />
      <div className="ft-bg-pattern" aria-hidden="true" />

      <div className="ft-content relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
        <div className="ft-grid">
          {/* ── LEFT: NAVIGATION ── */}
          <nav className="ft-nav" aria-label="Footer navigation">
            {FOOTER_NAV.map((item) => (
              <FooterNavLink key={item.id} item={item} />
            ))}
          </nav>

          {/* ── CENTER: BRANDING ── */}
          <div className="ft-center">
            <div className="ft-crown-row" aria-hidden="true">
              <span className="ft-crown-line" />
              <Crown className="h-5 w-5" />
              <span className="ft-crown-line ft-crown-line-r" />
            </div>

            <h2 className="ft-heading">
              Enter
              <br />
              the
              <br />
              Kingdom.
            </h2>

            <p className="ft-subtext">Adventure awaits beyond the gates.</p>

            <Link href="/lobby" className="ft-cta">
              <span className="ft-cta-fill" aria-hidden="true" />
              <span className="ft-cta-label">Enter the Lobby</span>
            </Link>

            <div className="ft-stay">
              <Shield className="ft-stay-icon h-5 w-5" aria-hidden="true" />
              <span className="ft-stay-text">
                <span className="ft-stay-label">Stay connected</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="ft-stay-email">
                  {CONTACT_EMAIL}
                </a>
              </span>
            </div>
          </div>

          {/* ── RIGHT: CONTACT TICKER ── */}
          <div className="ft-contact">
            <div className="ft-ticker">
              <div className="ft-ticker-track">
                <div className="ft-ticker-line">Let&apos;s Contact</div>
                <div className="ft-ticker-line" aria-hidden="true">
                  Let&apos;s Contact
                </div>
              </div>
            </div>
            <a href={`mailto:${CONTACT_EMAIL}`} className="ft-contact-email">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="ft-bottom">
        <span className="ft-bottom-ornament" aria-hidden="true" />
        <div className="ft-bottom-inner relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
          <div className="ft-bottom-row">
            <Link href="/" className="ft-bottom-brand">
              <img src="/logo/logo.png" alt="Kingdom Come" className="ft-bottom-logo" />
              <span className="ft-bottom-brand-name">Kingdom Come</span>
            </Link>

            <div className="ft-bottom-social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <span className="ft-bottom-social-sep" aria-hidden="true">
                |
              </span>
              <a href="https://gf.me/u/y96hdg" target="_blank" rel="noopener noreferrer">
                Support
              </a>
            </div>

            <span className="ft-bottom-copy">&copy; {year} Jose Ramos. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
