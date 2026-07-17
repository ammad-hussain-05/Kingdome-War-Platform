"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Poppins, Bungee } from "next/font/google"
import { cn } from "@/lib/utils"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
})

type NavItem = {
  id: string
  number: string
  label: string
  href: string
  anchor?: string
}

const COLUMN_A: NavItem[] = [
  { id: "home", number: "01", label: "Home", href: "/", anchor: "home" },
  { id: "story", number: "02", label: "Story", href: "/#story", anchor: "story" },
  { id: "characters", number: "03", label: "Characters", href: "/#characters", anchor: "characters" },
  { id: "game-modes", number: "04", label: "Game Modes", href: "/#game-modes", anchor: "game-modes" },
  { id: "lobby", number: "05", label: "Lobby", href: "/lobby" },
]

const COLUMN_B: NavItem[] = [
  { id: "rules", number: "06", label: "Rules", href: "/#rules", anchor: "rules" },
  { id: "play", number: "07", label: "Play Online", href: "/#play", anchor: "play" },
  { id: "order", number: "08", label: "Order", href: "/#order", anchor: "order" },
  { id: "fan-club", number: "09", label: "Fan Club", href: "/#fan-club", anchor: "fan-club" },
]

const CTA_ITEM: NavItem = { id: "cta", number: "", label: "Enter the Kingdome", href: "/lobby" }

const MENU_ID = "kc-fullscreen-menu"
const CLOSE_MS = 520

function NavRow({
  item,
  rowIndex,
  active,
  open,
  onNavigate,
}: {
  item: NavItem
  rowIndex: number
  active: boolean
  open: boolean
  onNavigate: (item: NavItem, e: React.MouseEvent) => void
}) {
  return (
    <li className="kc-nav-row">
      <a
        href={item.href}
        onClick={(e) => onNavigate(item, e)}
        tabIndex={open ? 0 : -1}
        aria-current={active ? "page" : undefined}
        className={cn("kc-nav-link", active && "kc-nav-link-active")}
        style={{ transitionDelay: open ? `${180 + rowIndex * 55}ms` : "0ms" }}
      >
        <span className="kc-nav-number">{item.number}</span>
        <span className="kc-nav-label">{item.label}</span>
        <span className="kc-nav-underline" aria-hidden="true" />
        {active && <span className="kc-nav-dot" aria-hidden="true" />}
      </a>
    </li>
  )
}

export function Navigation() {
  const [open, setOpen] = useState(false)
  const [hash, setHash] = useState("")
  const [reducedMotion, setReducedMotion] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash)
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [pathname])

  // Lock background scroll while the menu is open
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    return () => {
      body.style.position = ""
      body.style.top = ""
      body.style.left = ""
      body.style.right = ""
      body.style.width = ""
      window.scrollTo(0, scrollY)
    }
  }, [open])

  const closeMenu = useCallback(() => setOpen(false), [])

  // Escape to close + basic focus trap
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        closeMenu()
        return
      }
      if (e.key === "Tab") {
        const container = panelRef.current
        if (!container) return
        const focusables = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, closeMenu])

  // Move focus into the panel on open, return it to the trigger on close
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>("[data-kc-autofocus]")?.focus()
      }, 80)
      return () => window.clearTimeout(t)
    }
    triggerRef.current?.focus()
  }, [open])

  useEffect(() => {
    return () => {
      if (navigateTimeout.current) clearTimeout(navigateTimeout.current)
    }
  }, [])

  const isActive = (item: NavItem) => {
    if (item.href === "/lobby") return pathname === "/lobby"
    if (pathname !== "/") return false
    if (!hash) return item.id === "home"
    return hash === `#${item.anchor}`
  }

  const handleNavigate = (item: NavItem, e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)

    const go = () => {
      if (item.href === "/lobby") {
        router.push("/lobby")
        return
      }
      if (pathname === "/") {
        document
          .getElementById(item.anchor!)
          ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })
        history.replaceState(null, "", item.anchor === "home" ? "/" : `/#${item.anchor}`)
      } else {
        router.push(item.href)
      }
    }

    if (navigateTimeout.current) clearTimeout(navigateTimeout.current)
    navigateTimeout.current = setTimeout(go, reducedMotion ? 0 : CLOSE_MS)
  }

  const year = new Date().getFullYear()

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={MENU_ID}
        className={cn("kc-burger", open && "kc-burger-open")}
      >
        <span className="kc-burger-box" aria-hidden="true">
          <span className="kc-burger-line" />
          <span className="kc-burger-line" />
          <span className="kc-burger-line" />
        </span>
      </button>

      <div
        id={MENU_ID}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        aria-hidden={!open}
        inert={!open}
        className={cn("kc-menu", poppins.variable, bungee.variable, open && "kc-menu-open")}
      >
        <div className="kc-menu-backdrop" aria-hidden="true">
          <div className="kc-piece kc-piece-left kc-piece-left-a" />
          <div className="kc-piece kc-piece-left kc-piece-left-b" />
          <div className="kc-piece kc-piece-right kc-piece-right-a" />
          <div className="kc-piece kc-piece-right kc-piece-right-b" />
        </div>

        <div className="kc-menu-content">
          <div className="kc-menu-left">
            <div className="kc-brand">
              <p className="kc-title">Game Fantasy</p>
              <Link
                href="/"
                onClick={(e) => handleNavigate(COLUMN_A[0], e)}
                tabIndex={open ? 0 : -1}
                data-kc-autofocus
                className="kc-logo-link"
                aria-label="Kingdom Come home"
              >
                <img src="/logo/logo.png" alt="Kingdom Come" className="kc-logo-img" />
              </Link>
            </div>

            <nav className="kc-nav-grid" aria-label="Primary">
              <ul className="kc-nav-col">
                {COLUMN_A.map((item, i) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    rowIndex={i}
                    active={isActive(item)}
                    open={open}
                    onNavigate={handleNavigate}
                  />
                ))}
              </ul>
              <ul className="kc-nav-col">
                {COLUMN_B.map((item, i) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    rowIndex={i}
                    active={isActive(item)}
                    open={open}
                    onNavigate={handleNavigate}
                  />
                ))}
              </ul>
            </nav>

            <a
              href={CTA_ITEM.href}
              onClick={(e) => handleNavigate(CTA_ITEM, e)}
              tabIndex={open ? 0 : -1}
              className="kc-cta"
            >
              <span className="kc-cta-fill" aria-hidden="true" />
              <span className="kc-cta-label">{CTA_ITEM.label}</span>
            </a>

            <p className="kc-copyright">&copy; {year} Jose Ramos. All rights reserved.</p>
          </div>

          <div className="kc-menu-right" aria-hidden="true">
            <video
              className="kc-menu-right-video"
              src="/video/nav-video.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="kc-menu-right-scrim" />
          </div>
        </div>
      </div>
    </>
  )
}
