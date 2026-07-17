"use client"

import { useRef } from "react"

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
            My Story
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
                Hello everyone. My name is Jose Ramos. I&apos;m hoping you will purchase my new
                adventure board game, &ldquo;Kingdom Come.&rdquo;
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                Let me tell you a little about my background.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                Coming from a poor family of 11, you can imagine the fights over everything.
                Growing up poor, we didn&apos;t have very much. We had food, but when it came to
                money, we lacked severely. I never received anything brand new. Everything was
                handed down. Also, another thing we never had was toys. When I played with my
                friend&apos;s toys, I lit up with joy, and my imagination grew.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                My second oldest brother, Bert, was a gifted storyteller. When he told you a
                story, it was like a higher power or intelligence took over his body. When he
                spoke, you saw the story like a movie. It was so detailed. He would take you on
                an adventure, create characters out of thin air, create various personalities,
                and bring you out as a superhero every time in the end.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                One day, my brother said to me, &ldquo;I&apos;m going to invent a 6-player chess
                board.&rdquo; I looked at him like, &ldquo;Okay, but how?&rdquo; He never told me.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                My brother, Bert, died in 2012.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                I didn&apos;t want his dream to die with him. Years went by, and I had this riddle
                locked in my head: &ldquo;What would a 6-player chess board look like?&rdquo;
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                Then one day, I had a vision. While playing chess, I asked myself, &ldquo;Why
                can&apos;t I do this?&rdquo; I thought of my brother&apos;s riddle, &ldquo;a
                6-player board,&rdquo; and how he created things so easily. So I opened my
                imagination, took the challenge, understood the riddle, and &ldquo;The Super
                Queen&rdquo; was born.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                To make a long story short, there is a 6-player board game now, and many others.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                I want to continue Bert&apos;s idea and make him proud. I will make sure that his
                legacy to create this board game comes to fruition. His dream is also my dream.
              </p>

              <p className="text-foreground/90 leading-relaxed mb-6">
                &ldquo;Will you help me make these games come into reality?&rdquo;
              </p>

              <p className="text-foreground/90 leading-relaxed mb-8">
                With your order or subscription, you help others believe in their dreams as well.
                Just like I made mine,
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
