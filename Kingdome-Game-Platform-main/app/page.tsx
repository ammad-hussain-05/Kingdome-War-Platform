import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import { StorySection } from "@/components/story-section"
import CharactersSection  from "@/components/characters-section"
import { GameModesSection } from "@/components/game-modes-section"
import { RulesSection } from "@/components/rules-section"
import { GameCanvas } from "@/components/game-canvas"
import { OrderSection } from "@/components/order-section"
import { FanClubSection } from "@/components/fan-club-section"
import { MontageSection } from "@/components/montage-section"
import { Footer } from "@/components/footer"

export default function KingdomComePage() {
  return (
    <main className="relative min-h-screen">
      <Navigation />
      <HeroSection />
      <StorySection />
      <CharactersSection />
      <MontageSection />
      <RulesSection />
      <GameModesSection />
      <GameCanvas />
      <OrderSection />
      <FanClubSection />
      <Footer />
    </main>
  )
}
