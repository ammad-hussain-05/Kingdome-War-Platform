"use client"

import { useRef } from "react"
import { Cross } from "lucide-react"

export function StorySection() {
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section
      id="story"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background with parchment texture effect */}
      <div className="absolute inset-0 parchment-bg opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      {/* Decorative corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-primary/30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-primary/30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-primary/30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-primary/30" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary/60 text-2xl mb-4">&#9733;</span>
          <h2 className="font-serif text-4xl md:text-5xl text-primary glow-gold mb-4">
            The Tale of Kingdom Come
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
        </div>

        {/* Story scroll container */}
        <div className="relative">
          {/* Scroll decoration top */}
          <div className="h-8 bg-gradient-to-b from-primary/20 to-transparent rounded-t-lg" />

          {/* Main story content */}
          <div className="bg-card/40 backdrop-blur-sm px-6 md:px-12 py-10 medieval-border">
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-foreground/90 leading-relaxed mb-6 first-letter:text-5xl first-letter:font-serif first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                In the heart of America, a young boy named Jose grew up in a family of eleven, 
                where new toys were but a distant dream. Yet within the walls of their humble 
                home burned a flame of imagination that no poverty could extinguish.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                Jose&apos;s brother Bert was blessed with a gift rare and precious — the soul of a 
                storyteller and the mind of an inventor. Night after night, Bert would weave 
                tales of knights and kingdoms, of magical creatures and epic battles. But his 
                greatest dream was one that seemed impossible: to create a chess board where 
                six players could wage war together.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                &ldquo;Imagine it, Jose,&rdquo; Bert would say, eyes gleaming in the candlelight. 
                &ldquo;A game where the Super Queen reigns supreme, where Dragons take flight, 
                and where Wizards bend the very rules of reality.&rdquo;
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                In the year 2012, Bert departed this mortal realm, leaving behind only fragments 
                of his grand vision — riddles wrapped in sketches, dreams encoded in scattered notes. 
                Jose, consumed by grief yet determined to honor his brother&apos;s legacy, embarked on 
                a quest that would span years.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-8">
                Through countless nights and tireless days, Jose unraveled each riddle, tested 
                each concept, until finally — Kingdom Come was born. And with it, The Super Queen, 
                the most powerful piece ever conceived, the crown jewel of Bert&apos;s impossible dream 
                made gloriously real.
              </p>
            </div>

            {/* Memorial tribute box */}
            <div className="mt-12 p-6 bg-background/50 border border-primary/30 rounded-lg text-center">
              <div className="flex items-center justify-center mb-3 text-primary">
                <Cross className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-2xl text-primary mb-2">In Loving Memory</h3>
              <p className="text-xl text-foreground/90 font-semibold mb-2">Bert Ramos</p>
              <p className="text-muted-foreground italic text-sm max-w-md mx-auto">
                &ldquo;A dreamer whose vision transcended the boundaries of any board, 
                whose spirit now lives on in every game of Kingdom Come.&rdquo;
              </p>
            </div>
          </div>

          {/* Scroll decoration bottom */}
          <div className="h-8 bg-gradient-to-t from-primary/20 to-transparent rounded-b-lg" />
        </div>

        {/* Bottom flourish */}
        <div className="text-center mt-8">
          <span className="inline-block text-primary/40 text-3xl">&#9830; &#9830; &#9830;</span>
        </div>
      </div>
    </section>
  )
}
