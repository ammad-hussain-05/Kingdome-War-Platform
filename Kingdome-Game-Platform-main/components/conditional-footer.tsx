"use client"

import { usePathname } from "next/navigation"
import { Footer } from "@/components/footer"
import { DisclaimerFeedback } from "@/components/disclaimer-feedback"

// Routes that render <Footer /> explicitly themselves (lobby + every
// dynamic game/room route). The root layout must skip rendering it here
// so it appears exactly once on those routes.
const EXPLICIT_FOOTER_PREFIXES = ["/lobby", "/game", "/room"]

export function ConditionalFooter() {
  const pathname = usePathname()
  const hasRouteLevelFooter = EXPLICIT_FOOTER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (hasRouteLevelFooter) return null
  return (
    <>
      <DisclaimerFeedback />
      <Footer />
    </>
  )
}
