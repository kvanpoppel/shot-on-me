'use client'

import { useState, useEffect } from 'react'
import { Zap, MapPin, Gift, Coffee, Star, ArrowRight, Sparkles } from 'lucide-react'

interface LandingPageProps {
  onSignIn: () => void
  onCreateAccount: () => void
}

const VENUE_CATEGORIES = [
  { icon: '☕', label: 'Coffee Shops', color: 'from-amber-400 to-orange-500' },
  { icon: '🥤', label: 'Juice Bars', color: 'from-green-400 to-emerald-500' },
  { icon: '🫧', label: 'Soda Shops', color: 'from-cyan-400 to-blue-500' },
  { icon: '🍵', label: 'Tea Houses', color: 'from-teal-400 to-green-600' },
  { icon: '🥝', label: 'Smoothie Bars', color: 'from-lime-400 to-green-500' },
]

const FEATURES = [
  {
    icon: <Gift className="w-7 h-7" />,
    title: 'Social Gifting',
    description: 'Send a Fizz to anyone — a coffee, juice, or treat — right from your phone. No cash needed.',
    color: '#FF5F57',
    bg: 'rgba(255, 95, 87, 0.1)',
  },
  {
    icon: <MapPin className="w-7 h-7" />,
    title: 'Local Discovery',
    description: 'Find the best coffee shops, juice bars, soda shops, and tea houses near you with live deals.',
    color: '#00D4FF',
    bg: 'rgba(0, 212, 255, 0.1)',
  },
  {
    icon: <Sparkles className="w-7 h-7" />,
    title: 'Celebrate Everything',
    description: 'Good morning texts. Thank you notes. Birthdays. Any moment is worth celebrating with Fizz.',
    color: '#C8F135',
    bg: 'rgba(200, 241, 53, 0.1)',
  },
]

const BUBBLES = [
  { size: 12, left: '10%', delay: '0s', duration: '4s', color: 'rgba(200, 241, 53, 0.5)' },
  { size: 8, left: '25%', delay: '1s', duration: '3.5s', color: 'rgba(0, 212, 255, 0.5)' },
  { size: 16, left: '45%', delay: '0.5s', duration: '5s', color: 'rgba(255, 95, 87, 0.4)' },
  { size: 10, left: '65%', delay: '2s', duration: '4.5s', color: 'rgba(200, 241, 53, 0.4)' },
  { size: 14, left: '80%', delay: '1.5s', duration: '3.8s', color: 'rgba(0, 212, 255, 0.4)' },
  { size: 6, left: '90%', delay: '0.8s', duration: '4.2s', color: 'rgba(255, 95, 87, 0.5)' },
]

export default function LandingPage({ onSignIn, onCreateAccount }: LandingPageProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#1A1A2E' }}>
      {/* Animated bubble background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {mounted && BUBBLES.map((b, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              width: b.size,
              height: b.size,
              left: b.left,
              bottom: '-20px',
              background: b.color,
              animationDuration: b.duration,
              animationDelay: b.delay,
            }}
          />
        ))}
        {/* Glow orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: '#C8F135' }} />
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: '#FF5F57' }} />
        <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full opacity-15 blur-3xl" style={{ background: '#00D4FF' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-black" style={{ background: 'linear-gradient(135deg, #C8F135, #00D4FF)' }}>
            🫧
          </div>
          <span className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <span style={{ color: '#C8F135' }}>Fi</span><span style={{ color: '#FF5F57' }}>zz</span>
          </span>
        </div>
        <button
          onClick={onSignIn}
          className="text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition-all"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-8 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 border" style={{ background: 'rgba(200, 241, 53, 0.1)', borderColor: 'rgba(200, 241, 53, 0.3)', color: '#C8F135' }}>
          <Zap className="w-3 h-3" />
          Now in 7 cities
        </div>

        <h1 className="text-5xl font-black leading-tight mb-4 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <span className="gradient-text">Send the moment.</span>
          <br />
          <span className="text-white">Find your spot.</span>
        </h1>

        <p className="text-lg text-white/60 max-w-sm mx-auto mb-10 leading-relaxed">
          Gift a coffee, discover juice bars, and celebrate every moment — no alcohol required.
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <button
            onClick={onCreateAccount}
            className="fizz-btn-primary w-full py-4 text-base flex items-center justify-center gap-2 animate-pulse-lime"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onSignIn}
            className="fizz-btn-outline w-full py-4 text-base"
          >
            Sign In
          </button>
        </div>

        {/* App Store buttons placeholder */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-xs">
            <span>🍎</span> App Store (soon)
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-xs">
            <span>▶</span> Google Play (soon)
          </div>
        </div>
      </section>

      {/* Category Scroll */}
      <section className="relative z-10 pb-10">
        <h2 className="text-center text-xs font-bold uppercase tracking-widest text-white/40 mb-4 px-6">Discover local spots</h2>
        <div className="flex gap-3 px-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {VENUE_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={onCreateAccount}
              className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
              style={{ background: '#252540', minWidth: 90 }}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-semibold text-white/70 text-center whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-12">
        <h2 className="text-2xl font-black text-white mb-6 text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Why Fizz?
        </h2>
        <div className="flex flex-col gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="fizz-card p-5 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center" style={{ background: feature.bg, color: feature.color }}>
                {feature.icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-base mb-1">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 px-6 pb-12 text-center">
        <div className="fizz-card p-6" style={{ background: 'linear-gradient(135deg, rgba(200,241,53,0.08), rgba(0,212,255,0.08))' }}>
          <div className="flex justify-center mb-3">
            {['🧑', '👩', '👦', '👧', '🧑‍🦱'].map((emoji, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-base -ml-1 first:ml-0" style={{ borderColor: '#1A1A2E', background: '#252540' }}>
                {emoji}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" style={{ color: '#C8F135' }} />)}
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            &ldquo;Finally an app for people like me. Perfect for our faith community — we can celebrate each other without the bar scene.&rdquo;
          </p>
          <p className="text-white/40 text-xs mt-2 font-semibold">— Sarah K., Indianapolis</p>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 px-6 pb-16 text-center safe-bottom">
        <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Ready to <span style={{ color: '#C8F135' }}>Fizz</span>?
        </h2>
        <p className="text-white/50 text-sm mb-6">Join thousands celebrating every moment</p>
        <button
          onClick={onCreateAccount}
          className="fizz-btn-primary w-full max-w-xs mx-auto py-4 text-base flex items-center justify-center gap-2"
        >
          Get Started — It&apos;s Free
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-white/30 text-xs">
            &copy; 2026 Fizz. A Shot On Me platform.{' '}
            <a href="/privacy" className="underline">Privacy</a>
            {' · '}
            <a href="/terms" className="underline">Terms</a>
          </p>
        </div>
      </section>
    </div>
  )
}
