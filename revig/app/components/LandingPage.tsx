'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Gift, MapPin, Sparkles, Star, ChevronDown } from 'lucide-react'

interface LandingPageProps {
  onSignIn: () => void
  onCreateAccount: () => void
}

/* ── Floating bubble specs ────────────────────────────── */
const BUBBLES = [
  { s: 14, l: '7%',  d: '4.2s', delay: '0s',    c: 'rgba(200,241,53,0.55)'  },
  { s:  8, l: '18%', d: '3.6s', delay: '1.1s',  c: 'rgba(0,212,255,0.50)'  },
  { s: 18, l: '35%', d: '5.0s', delay: '0.4s',  c: 'rgba(255,95,87,0.40)'  },
  { s: 10, l: '52%', d: '4.6s', delay: '2.2s',  c: 'rgba(200,241,53,0.45)' },
  { s: 22, l: '68%', d: '5.4s', delay: '0.9s',  c: 'rgba(0,212,255,0.35)'  },
  { s:  7, l: '80%', d: '3.8s', delay: '1.7s',  c: 'rgba(255,95,87,0.50)'  },
  { s: 12, l: '92%', d: '4.9s', delay: '0.2s',  c: 'rgba(200,241,53,0.40)' },
]

/* ── Venue categories ─────────────────────────────────── */
const CATEGORIES = [
  { icon: '🥤', label: 'Dirty Soda',    sub: 'The viral trend',         hot: true  },
  { icon: '☕', label: 'Coffee Shops',  sub: 'Espresso & specialty',     hot: false },
  { icon: '🧋', label: 'Boba Tea',     sub: 'Bubble tea & taro',        hot: true  },
  { icon: '🍵', label: 'Tea Houses',   sub: 'Matcha & chai',            hot: false },
  { icon: '🥝', label: 'Smoothie Bars',sub: 'Bowls & blends',           hot: false },
  { icon: '🧁', label: 'Bakeries',     sub: 'Pastries & treats',        hot: false },
  { icon: '🥐', label: 'Cafes',        sub: 'Coffee & bites',           hot: false },
  { icon: '🍦', label: 'Ice Cream',    sub: 'Gelato & frozen treats',   hot: false },
]

/* ── Feature cards ────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🧋',
    title: 'Send a Revig',
    body: 'Gift a dirty soda, boba tea, or coffee to anyone in seconds. No cash. No awkward Venmo. Just a good vibe delivered instantly.',
    accent: '#C8F135',
    bg: 'rgba(200,241,53,0.07)',
    border: 'rgba(200,241,53,0.15)',
  },
  {
    icon: '📍',
    title: 'Discover Your Spot',
    body: 'Find the best dirty soda shops, boba spots, and coffee bars near you — with live deals and "Reviging Now" alerts.',
    accent: '#00D4FF',
    bg: 'rgba(0,212,255,0.07)',
    border: 'rgba(0,212,255,0.15)',
  },
  {
    icon: '✨',
    title: 'Celebrate Everything',
    body: 'Good morning texts. Birthdays. A random Tuesday. Any moment is worth a Revig — always fun, always personal.',
    accent: '#FF5F57',
    bg: 'rgba(255,95,87,0.07)',
    border: 'rgba(255,95,87,0.15)',
  },
]

/* ── Social proof quotes ──────────────────────────────── */
const REVIEWS = [
  { text: 'I sent my bestie a dirty soda Revig before her big presentation. She cried (in the best way).', name: 'Mia T.', city: 'Salt Lake City' },
  { text: 'My roommate Reviged me a boba tea during finals week. I literally screamed. This app gets it.', name: 'Priya K.', city: 'Chicago' },
  { text: 'My whole crew uses Revig to meet up at the best soda and boba spots in Indy. It just works.', name: 'Joel R.', city: 'Indianapolis' },
  { text: 'My whole family uses Revig now. Even my mom figured it out in like 30 seconds.', name: 'Kai R.', city: 'Nashville' },
]

export default function LandingPage({ onSignIn, onCreateAccount }: LandingPageProps) {
  const [mounted, setMounted] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setReviewIdx(i => (i + 1) % REVIEWS.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0F0F1E' }}>

      {/* ── Ambient glow orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.12] blur-3xl" style={{ background: '#C8F135' }} />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-[0.10] blur-3xl" style={{ background: '#FF5F57' }} />
        <div className="absolute bottom-1/3 left-1/3 w-72 h-72 rounded-full opacity-[0.09] blur-3xl" style={{ background: '#00D4FF' }} />
        {mounted && BUBBLES.map((b, i) => (
          <div key={i} className="bubble" style={{ width: b.s, height: b.s, left: b.l, bottom: '-20px', background: b.c, animationDuration: b.d, animationDelay: b.delay }} />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 safe-top">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-black shadow-lg" style={{ background: 'linear-gradient(135deg,#C8F135,#00D4FF)' }}>
            🧋
          </div>
          <span className="revig-wordmark text-[26px]">
            <span style={{ color: '#C8F135' }}>Re</span><span style={{ color: '#FF5F57' }}>vig</span>
          </span>
        </div>
        <button onClick={onSignIn} className="revig-btn-ghost px-5 py-2.5 text-sm">
          Sign In
        </button>
      </nav>

      {/* ═══════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 pt-6 pb-14 text-center">

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-7 border" style={{ background: 'rgba(200,241,53,0.08)', borderColor: 'rgba(200,241,53,0.25)', color: '#C8F135' }}>
          <Zap className="w-3.5 h-3.5" />
          Now live in 7 cities · Dirty soda & boba drops weekly
        </div>

        {/* Headline */}
        <h1 className="revig-wordmark text-[52px] leading-[1.0] tracking-tight mb-5">
          <span className="gradient-text">Send the moment.</span>
          <br />
          <span className="text-white">Find your spot.</span>
        </h1>

        <p className="text-[17px] leading-relaxed mb-3 max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.60)' }}>
          Gift a <strong className="text-white font-semibold">dirty soda</strong>, <strong className="text-white font-semibold">boba tea</strong>, or coffee to anyone you love.
          Discover the best sip spots in your city.
        </p>

        {/* Dirty soda callout */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-8 text-sm font-semibold" style={{ background: 'rgba(255,95,87,0.12)', color: '#FF9A57', border: '1px solid rgba(255,95,87,0.20)' }}>
          🥤 The dirty soda trend is here — and Revig is how you share it
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 max-w-[300px] mx-auto">
          <button onClick={onCreateAccount} className="revig-btn-primary w-full py-[15px] text-[15px] gap-2" style={{ boxShadow: '0 8px 32px rgba(200,241,53,0.30)' }}>
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* App store placeholders */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {['🍎 App Store', '▶ Google Play'].map(s => (
            <div key={s} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {s} <span style={{ color: 'rgba(255,255,255,0.20)', fontSize: 10 }}>(soon)</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          DIRTY SODA HERO SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 mb-10">
        <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1C1216 0%, #231C18 100%)', border: '1px solid rgba(255,95,87,0.20)' }}>
          {/* Glow */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-3xl" style={{ background: '#FF5F57' }} />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: '#C8F135' }} />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="dirty-soda-badge inline-block mb-2">🔥 Trending Now</div>
                <h2 className="revig-wordmark text-3xl text-white leading-tight">
                  Dirty Soda<br />
                  <span style={{ color: '#FF9A57' }}>is a vibe.</span>
                </h2>
              </div>
              <div className="text-6xl animate-float">🥤</div>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Soda + cream + flavor shots = the drink everyone&apos;s obsessed with.
              Popular in Utah. Spreading everywhere. Revig has the best spots.
            </p>

            {/* Dirty soda ingredients */}
            <div className="flex gap-2 flex-wrap mb-5">
              {['Diet Dr Pepper', 'Coconut cream', 'Raspberry', 'Lime', 'Mango'].map(f => (
                <span key={f} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(255,154,87,0.12)', color: '#FF9A57', border: '1px solid rgba(255,154,87,0.20)' }}>
                  {f}
                </span>
              ))}
            </div>

            <button onClick={onCreateAccount} className="revig-btn-primary w-full py-3.5 gap-2 text-[14px]" style={{ background: 'linear-gradient(90deg,#FF5F57,#FF9A57)', color: '#fff' }}>
              Find Dirty Soda Spots Near Me
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CATEGORIES
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 mb-10">
        <p className="text-center text-xs font-bold uppercase tracking-widest mb-4 px-6" style={{ color: 'rgba(255,255,255,0.30)' }}>
          What are you in the mood for?
        </p>
        <div className="flex gap-3 px-5 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={onCreateAccount}
              className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl text-center transition-all hover:scale-105"
              style={{ background: '#1C1C32', border: cat.hot ? '1px solid rgba(255,95,87,0.35)' : '1px solid rgba(255,255,255,0.07)', minWidth: 98 }}
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-[11px] font-bold text-white leading-tight">{cat.label}</span>
              <span className="text-[10px]" style={{ color: cat.hot ? '#FF9A57' : 'rgba(255,255,255,0.35)' }}>{cat.sub}</span>
              {cat.hot && <span className="dirty-soda-badge" style={{ fontSize: 9, padding: '2px 8px' }}>HOT</span>}
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 mb-10">
        <h2 className="revig-wordmark text-3xl text-white text-center mb-6">
          Why <span style={{ color: '#C8F135' }}>Revig</span>?
        </h2>
        <div className="flex flex-col gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="p-5 rounded-2xl flex items-start gap-4" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
              <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-[15px] mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          ROTATING REVIEW
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 mb-10">
        <div className="p-6 rounded-3xl text-center" style={{ background: 'linear-gradient(135deg,rgba(200,241,53,0.06),rgba(0,212,255,0.06))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex justify-center mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current mx-0.5" style={{ color: '#C8F135' }} />)}
          </div>
          <div className="min-h-[60px] flex items-center justify-center">
            <p className="text-[14px] leading-relaxed transition-all" style={{ color: 'rgba(255,255,255,0.70)', fontStyle: 'italic' }}>
              &ldquo;{REVIEWS[reviewIdx].text}&rdquo;
            </p>
          </div>
          <p className="text-xs font-bold mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            — {REVIEWS[reviewIdx].name}, {REVIEWS[reviewIdx].city}
          </p>
          <div className="flex justify-center gap-1.5 mt-4">
            {REVIEWS.map((_, i) => (
              <div key={i} className="rounded-full transition-all" style={{ width: i === reviewIdx ? 20 : 6, height: 6, background: i === reviewIdx ? '#C8F135' : 'rgba(255,255,255,0.20)' }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          COMMUNITY CALLOUT
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 mb-10">
        <div className="p-5 rounded-3xl" style={{ background: '#1C1C32', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="revig-wordmark text-xl text-white mb-2">
            Built for <span style={{ color: '#C8F135' }}>everyone.</span>
          </h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Whether you&apos;re with your crew, your family, your coworkers, or just treating yourself — Revig is yours.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '⛪', label: 'Faith communities' },
              { emoji: '👨‍👩‍👧', label: 'Families' },
              { emoji: '🥤', label: 'Dirty soda lovers' },
              { emoji: '🧋', label: 'Boba tea fans' },
              { emoji: '🎓', label: 'Students' },
              { emoji: '💼', label: 'Anyone, really' },
            ].map(i => (
              <div key={i.label} className="flex items-center gap-2 py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-lg">{i.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>{i.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════ */}
      <section className="relative z-10 px-5 pb-16 text-center safe-bottom">
        <div className="rounded-3xl p-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C2318,#18231C)' }}>
          <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg,rgba(200,241,53,0.08),rgba(0,212,255,0.05))', pointerEvents: 'none' }} />
          <div className="absolute top-3 right-6 text-5xl animate-float opacity-60">🧋</div>
          <div className="relative z-10">
            <h2 className="revig-wordmark text-4xl text-white mb-2">
              Ready to <span style={{ color: '#C8F135' }}>Revig?</span>
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Join thousands celebrating every moment — one Revig at a time.
            </p>
            <button onClick={onCreateAccount} className="revig-btn-primary w-full max-w-xs mx-auto py-4 text-[15px] gap-2" style={{ boxShadow: '0 12px 36px rgba(200,241,53,0.30)' }}>
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; 2026 Revig · A Shot On Me platform &nbsp;·&nbsp;
            <a href="/privacy" className="underline hover:text-white/50 transition-colors">Privacy</a>
            &nbsp;·&nbsp;
            <a href="/terms" className="underline hover:text-white/50 transition-colors">Terms</a>
            &nbsp;·&nbsp;
            <a href="/venue-signup" className="underline hover:text-white/50 transition-colors">List your venue</a>
          </p>
        </div>
      </section>

    </div>
  )
}
