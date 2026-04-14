"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#story", label: "Story" },
  { href: "#characters", label: "Characters" },
  { href: "#game-modes", label: "Game Modes" },
  { href: "#rules", label: "Rules" },
  { href: "#play", label: "Play Online" },
  { href: "#order", label: "Order" },
  { href: "#fan-club", label: "Fan Club" },
]

export function Footer() {
  return (
    <footer className="relative border-t border-[#c9a84c]/20">
      {/* Medieval pattern background */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/80 to-transparent opacity-40" />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='%23c9a84c' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* ── LEFT: Large Clean Logo ── */}
          <div className="lg:col-span-1 flex justify-center lg:justify-start items-start">
            <Link href="#home" className="inline-block">
              <img
                src="/logo/logo.png"
                alt="Kingdom Come Logo"
                style={{
                  height: "360px",
                  width: "350%",
                  display: "inline-block",
                }}
              />
            </Link>
          </div>

          {/* ── RIGHT: About + Links + Contact ── */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-42">
            
            {/* About */}
            <div>
              <p
                className="text-sm leading-relaxed"
                style={{
                  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  color: "rgba(232,223,200,0.7)",
                }}
              >
                A revolutionary medieval fantasy board game featuring 20+ unique characters 
                with special abilities. Experience chess reimagined with The Super Queen, 
                Dragons, Wizards, and more.
              </p>
              <p
                className="mt-4 text-xs italic"
                style={{
                  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  color: "rgba(201,168,76,0.55)",
                }}
              >
                These are first edition prototypes — first of their kind.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4
                className="text-lg mb-4"
                style={{
                  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  color: "#c9a84c",
                }}
              >
                Quick Links
              </h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors"
                      style={{
                        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                        color: "rgba(232,223,200,0.65)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#c9a84c"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(232,223,200,0.65)"
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Support */}
            <div>
              <h4
                className="text-lg mb-4"
                style={{
                  fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  color: "#c9a84c",
                }}
              >
                Contact & Support
              </h4>
              <ul className="space-y-4">
                <li>
                  <span
                    className="text-xs block mb-1"
                    style={{ color: "rgba(201,168,76,0.5)" }}
                  >
                    Email
                  </span>
                  <a
                    href="mailto:joseartisticphotos@gmail.com"
                    className="text-sm transition-colors"
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      color: "rgba(232,223,200,0.85)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#c9a84c"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(232,223,200,0.85)"
                    }}
                  >
                    joseartisticphotos@gmail.com
                  </a>
                </li>
                <li>
                  <span
                    className="text-xs block mb-1"
                    style={{ color: "rgba(201,168,76,0.5)" }}
                  >
                    Support the Project
                  </span>
                  <a
                    href="https://gf.me/u/y96hdg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm transition-colors"
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      color: "#c9a84c",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#e8c96a"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#c9a84c"
                    }}
                  >
                    GoFundMe
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <span
                    className="text-xs block mb-1"
                    style={{ color: "rgba(201,168,76,0.5)" }}
                  >
                    Follow Us
                  </span>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm transition-colors"
                    style={{
                      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      color: "rgba(232,223,200,0.8)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#c9a84c"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(232,223,200,0.8)"
                    }}
                  >
                    Facebook Videos
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── CENTERED COPYRIGHT ROW ── */}
        {/* <div className="mt-12 pt-8 border-t border-[#c9a84c]/10">
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 text-center">
            <span
              className="text-sm"
              style={{
                fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                color: "rgba(201,168,76,0.5)",
              }}
            >
              &copy; {new Date().getFullYear()} Jose Ramos. All rights reserved.
            </span>
            <span className="text-[#c9a84c]/30">|</span>
            <span
              className="text-xs"
              style={{
                fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                color: "rgba(201,168,76,0.4)",
              }}
            >
              Created with passion for strategy games • In memory of Bert Ramos
            </span>
          </div>
        </div> */}
      </div>
    </footer>
  )
}