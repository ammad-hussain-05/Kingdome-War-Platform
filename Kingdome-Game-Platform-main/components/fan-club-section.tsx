"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sparkles, Send, Check, Loader2 } from "lucide-react"

// Seeded community spells
const communitySpells = [
  {
    id: "1",
    name: "I Bind You",
    creator: "Kingdom Come Federation",
    description: "Prevents any one opposing character from moving for three rounds. The caster must declare the target and say 'I Bind You' aloud.",
    official: true,
  },
  {
    id: "2",
    name: "Shadow Step",
    creator: "Community Submission",
    description: "Your next submission could appear here. Submit a spell that has been tested in at least 10 games.",
    official: false,
  },
]

interface SpellFormData {
  playerName: string
  email: string
  spellName: string
  spellDescription: string
  howItWorks: string
}

export function FanClubSection() {
  const [formData, setFormData] = useState<SpellFormData>({
    playerName: "",
    email: "",
    spellName: "",
    spellDescription: "",
    howItWorks: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setSubmitStatus("success")
    setIsSubmitting(false)
    
    // Reset after showing success
    setTimeout(() => {
      setSubmitStatus("idle")
      setFormData({
        playerName: "",
        email: "",
        spellName: "",
        spellDescription: "",
        howItWorks: "",
      })
    }, 3000)
  }

  return (
    <section id="fan-club" className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 parchment-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary/60 text-2xl mb-4">&#10038;</span>
          <h2 className="font-serif text-4xl md:text-5xl text-primary glow-gold mb-4">
            The Kingdom Come Federation
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join our community of players. Create new spells, contribute to the lore, 
            and shape the future of Kingdom Come.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Spell submission form */}
          <div>
            <div className="p-6 bg-card/50 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="font-serif text-2xl text-primary">Submit a New Spell</h3>
              </div>

              {/* Requirements */}
              <div className="mb-6 p-4 bg-background/50 border border-border/50 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Requirements:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>You must have played at least 10 games</li>
                  <li>Spell must be documented with name and mechanics</li>
                  <li>Submitted to the Kingdom Come Federation for review</li>
                  <li>If accepted, becomes an official rule for all games</li>
                </ul>
              </div>

              {submitStatus === "success" ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h4 className="font-serif text-xl text-primary mb-2">Spell Submitted!</h4>
                  <p className="text-muted-foreground text-sm">
                    The Federation will review your spell and contact you if accepted.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="playerName" className="block text-sm text-foreground/80 mb-2">
                        Player Name *
                      </label>
                      <input
                        type="text"
                        id="playerName"
                        name="playerName"
                        value={formData.playerName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm text-foreground/80 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="spellName" className="block text-sm text-foreground/80 mb-2">
                      Spell Name *
                    </label>
                    <input
                      type="text"
                      id="spellName"
                      name="spellName"
                      value={formData.spellName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Name your spell"
                    />
                  </div>

                  <div>
                    <label htmlFor="spellDescription" className="block text-sm text-foreground/80 mb-2">
                      Spell Description *
                    </label>
                    <textarea
                      id="spellDescription"
                      name="spellDescription"
                      value={formData.spellDescription}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Describe the spell's effect..."
                    />
                  </div>

                  <div>
                    <label htmlFor="howItWorks" className="block text-sm text-foreground/80 mb-2">
                      How It Works in Gameplay *
                    </label>
                    <textarea
                      id="howItWorks"
                      name="howItWorks"
                      value={formData.howItWorks}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Explain the mechanics and rules..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full bg-primary text-primary-foreground font-serif",
                      isSubmitting && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Spell
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Community spells gallery */}
          <div>
            <h3 className="font-serif text-2xl text-primary mb-6 flex items-center gap-3">
              <span>&#128220;</span>
              Community Spell Archive
            </h3>

            <div className="space-y-4">
              {communitySpells.map((spell) => (
                <div
                  key={spell.id}
                  className={cn(
                    "p-6 rounded-lg border transition-all",
                    spell.official
                      ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30"
                      : "bg-card/30 border-border/50 border-dashed"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-serif text-lg text-primary">{spell.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Created by: {spell.creator}
                      </p>
                    </div>
                    {spell.official && (
                      <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                        Official
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {spell.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Call to action */}
            <div className="mt-8 p-6 bg-card/30 border border-primary/20 rounded-lg text-center">
              <h4 className="font-serif text-xl text-primary mb-2">Become a Spell Creator</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your spell could become part of Kingdom Come history. Play 10 games, 
                design your spell, and submit it to the Federation.
              </p>
              <div className="flex justify-center gap-2 text-2xl text-primary/50">
                <span>&#9733;</span>
                <span>&#9733;</span>
                <span>&#9733;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
