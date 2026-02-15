'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/LoginForm'
import FeatureDetailModal from './components/FeatureDetailModal'
import FAQ from './components/FAQ'
import axios from 'axios'
import { getApiUrl } from './utils/api'
import { Sparkles, TrendingUp, Users, BarChart3, Zap, Shield, Bot, CalendarClock, ArrowRight } from 'lucide-react'

type PortalRole = 'owner' | 'manager' | 'staff'

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null)
  const [mode, setMode] = useState<'login' | 'register' | null>(null)
  const [selectedPortalRole, setSelectedPortalRole] = useState<PortalRole>('owner')
  const [venueContextName, setVenueContextName] = useState<string | null>(null)
  const venueSlug = searchParams.get('venue')

  // Memoize features to prevent re-creation on every render
  // MUST be called before any conditional returns (Rules of Hooks)
  const features = useMemo(() => [
    {
      icon: Sparkles,
      title: 'AI-Powered Analytics',
      description: 'Intelligent recommendations for optimal promotional strategies.',
      details: 'Our AI analyzes your venue\'s performance data, customer behavior patterns, and market trends to provide actionable insights. The system learns from your historical data to suggest the best times to run promotions, optimal discount percentages, and target demographics that are most likely to convert.',
      integration: 'When users browse the Shot on Me app, they see your AI-optimized promotions at the right times. The AI ensures your deals appear when users are most likely to visit, increasing check-ins and redemptions. Real-time data from app interactions feeds back into the analytics engine, creating a continuous improvement cycle.',
      benefits: [
        'Increase promotion effectiveness by up to 40%',
        'Reduce wasted ad spend on low-performing promotions',
        'Automatically adjust strategies based on performance',
        'Get insights into customer preferences and behaviors',
        'Predict optimal promotion timing for maximum impact'
      ]
    },
    {
      icon: TrendingUp,
      title: 'Revenue Forecasting',
      description: 'Predict future revenue with advanced analytics.',
      details: 'Using machine learning algorithms, our system analyzes your historical revenue data, seasonal patterns, promotion performance, and external factors to generate accurate revenue forecasts. You can see projected revenue for the next week, month, or quarter, helping you make informed business decisions.',
      integration: 'Revenue forecasts are based on real-time data from the Shot on Me app, including active user engagement, check-in trends, and promotion redemption rates. As users interact with your venue through the app, the forecasting model continuously updates to reflect current trends.',
      benefits: [
        'Plan inventory and staffing with confidence',
        'Identify revenue opportunities before they happen',
        'Track performance against projections',
        'Make data-driven business decisions',
        'Optimize promotion budgets for maximum ROI'
      ]
    },
    {
      icon: Users,
      title: 'Customer Engagement',
      description: 'Track check-ins and send personalized promotions.',
      details: 'Monitor customer interactions in real-time, from app views to check-ins and promotion redemptions. Build detailed customer profiles based on their preferences, visit frequency, and spending patterns. Send targeted promotions to specific customer segments to maximize engagement.',
      integration: 'Every customer interaction in the Shot on Me app is tracked and synced to your portal. When a user checks in at your venue, views your promotions, or redeems a deal, you see it instantly. You can then send personalized follow-up promotions directly through the app to encourage repeat visits.',
      benefits: [
        'Track customer lifetime value and loyalty',
        'Send targeted promotions to specific customer segments',
        'Identify your most valuable customers',
        'Increase repeat visits with personalized offers',
        'Build stronger customer relationships'
      ]
    },
    {
      icon: BarChart3,
      title: 'Real-Time Insights',
      description: 'Monitor live activity and analyze performance.',
      details: 'Get instant visibility into what\'s happening at your venue right now. See live check-ins, active promotions, current foot traffic, and revenue in real-time. Historical analytics help you understand trends, peak hours, and customer patterns over time.',
      integration: 'All data from the Shot on Me app flows into your portal dashboard in real-time. When a user checks in, you see it immediately. Promotion views, redemptions, and customer feedback are all synchronized, giving you a complete picture of your venue\'s performance through the app.',
      benefits: [
        'Monitor venue activity as it happens',
        'Make quick decisions based on live data',
        'Identify trends and patterns in customer behavior',
        'Compare performance across different time periods',
        'React quickly to changes in demand'
      ]
    },
    {
      icon: Zap,
      title: 'Quick Actions',
      description: 'Create promotions instantly with templates.',
      details: 'Launch new promotions in seconds using our pre-built templates. Whether it\'s a happy hour special, weekend deal, or holiday promotion, you can create and publish to the Shot on Me app instantly. Templates are optimized based on what works best for your venue type.',
      integration: 'Promotions created in the portal immediately appear in the Shot on Me app for all users in your area. Users receive push notifications about new deals, and your promotions are featured prominently in the app\'s discovery feed. Changes and updates sync instantly.',
      benefits: [
        'Launch promotions in under 60 seconds',
        'Use proven templates that drive results',
        'Schedule promotions in advance',
        'Duplicate successful promotions with one click',
        'A/B test different promotion strategies'
      ]
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Integrated Stripe with escrow protection.',
      details: 'All transactions are processed securely through Stripe with escrow protection. When customers purchase promotions through the Shot on Me app, funds are held securely until the promotion is redeemed. This protects both you and your customers, ensuring fair transactions.',
      integration: 'When users purchase your promotions in the Shot on Me app, payments are processed securely and held in escrow. Once a customer checks in and redeems the promotion at your venue, funds are automatically released to your account. All payment data is encrypted and PCI-compliant.',
      benefits: [
        'Secure, PCI-compliant payment processing',
        'Escrow protection for both parties',
        'Automatic fund release upon redemption',
        'Detailed transaction history and reporting',
        'Support for multiple payment methods'
      ]
    }
  ], [])

  const aiOptions = useMemo(() => [
    {
      icon: Sparkles,
      title: 'Generate Smart Promotions',
      description: 'Create high-converting promotions in under a minute using AI templates built for bars and venues.',
      bestFor: 'Last-minute slow nights and quick campaign launches',
      featureIndex: 4
    },
    {
      icon: Bot,
      title: 'Run AI Auto Mode',
      description: 'Let AI monitor performance and recommend timing, discount, and audience strategy throughout the week.',
      bestFor: 'Hands-off optimization and consistent growth',
      featureIndex: 0
    },
    {
      icon: CalendarClock,
      title: 'Forecast Busy vs Slow Nights',
      description: 'Use AI predictions to plan staffing, inventory, and offers before the week starts.',
      bestFor: 'Planning labor, inventory, and revenue targets',
      featureIndex: 1
    }
  ], [])

  const setAuthMode = (nextMode: 'login' | 'register') => {
    if (mode === nextMode) {
      setMode(null)
      router.push(buildAuthPath(null), { scroll: false })
      return
    }

    setMode(nextMode)
    router.push(buildAuthPath(nextMode), { scroll: false })
  }

  useEffect(() => {
    // Auto-redirect to dashboard if user is already logged in
    if (!loading && user) {
      console.log('User already logged in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const role = searchParams.get('role')
    if (tab === 'login' || tab === 'register') {
      setMode(tab)
    } else {
      setMode(null)
    }

    if (role === 'owner' || role === 'manager' || role === 'staff') {
      setSelectedPortalRole(role)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchVenueContext = async () => {
      if (!venueSlug) {
        setVenueContextName(null)
        return
      }

      try {
        const apiUrl = getApiUrl()
        const response = await axios.get(`${apiUrl}/venues/slug/${encodeURIComponent(venueSlug)}/public`)
        setVenueContextName(response.data?.venue?.name || null)
      } catch {
        setVenueContextName(null)
      }
    }

    fetchVenueContext()
  }, [venueSlug])

  const buildAuthPath = (tab: 'login' | 'register' | null) => {
    const params = new URLSearchParams()
    if (tab) params.set('tab', tab)
    if (venueSlug) params.set('venue', venueSlug)
    params.set('role', selectedPortalRole)
    const query = params.toString()
    return query ? `/?${query}` : '/'
  }

  const roleDescriptions: Record<PortalRole, string> = {
    owner: 'Full control of venue settings, AI strategy, billing, and staff permissions.',
    manager: 'Manage day-to-day operations, promotions, and performance with owner-approved access.',
    staff: 'Execute daily tasks, track activity, and support guest experience.'
  }

  // Show loading spinner while checking for saved login
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Checking login status...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col" suppressHydrationWarning>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-black to-black" aria-hidden="true"></div>
      
      {/* Top Navigation - Tabs */}
      <div className="relative z-10 w-full border-b border-primary-500/20 bg-black/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setAuthMode('login')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAuthMode('login')
                }
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black ${
                mode === 'login'
                  ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                  : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 hover:text-primary-500 border-primary-500/30'
              }`}
              aria-label="Sign in to your account"
              aria-pressed={mode === 'login'}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('register')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAuthMode('register')
                }
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black ${
                mode === 'register'
                  ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                  : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 hover:text-primary-500 border-primary-500/30'
              }`}
              aria-label="Create a new account"
              aria-pressed={mode === 'register'}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center justify-center container mx-auto px-4 py-8 w-full max-w-6xl">
        <div className="w-full space-y-8">
          {/* Centered Branding */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-5xl lg:text-7xl logo-script text-primary-500 animate-scale-in">
              Shot On Me
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-primary-500 to-transparent mx-auto mb-2 animate-slide-up"></div>
            <p className="text-xl lg:text-2xl text-primary-400 font-light animate-slide-up">
              AI tools made for venue operators
            </p>
            <p className="text-base lg:text-lg text-primary-500/70 max-w-2xl mx-auto animate-slide-up">
              Launch smarter promotions, fill slow nights, and keep regulars coming back with less manual work.
            </p>
            {venueSlug && (
              <p className="text-sm text-primary-400/80">
                Venue Portal URL: <span className="text-primary-500 font-semibold">/v/{venueSlug}</span>
                {venueContextName ? ` - ${venueContextName}` : ''}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setAuthMode('register')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                Start with AI
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAuthMode('login')}
                className="inline-flex items-center rounded-lg border border-primary-500/40 bg-black/40 px-5 py-2.5 text-sm font-semibold text-primary-400 transition-all hover:border-primary-500/70 hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
              >
                Sign in to continue
              </button>
            </div>
            <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-primary-500/25 bg-black/45 p-4">
              <p className="text-sm font-medium text-primary-400">Who is using this portal today?</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {(['owner', 'manager', 'staff'] as PortalRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedPortalRole(role)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black ${
                      selectedPortalRole === role
                        ? 'bg-primary-500 text-black'
                        : 'border border-primary-500/40 bg-black/50 text-primary-400 hover:border-primary-500/70 hover:text-primary-300'
                    }`}
                    aria-pressed={selectedPortalRole === role}
                    aria-label={`Set portal role to ${role}`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-primary-400/75">
                {roleDescriptions[selectedPortalRole]}
              </p>
            </div>
          </div>

          {/* AI Options - Venue Friendly */}
          <div className="max-w-5xl mx-auto pt-2">
            <div className="text-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-primary-500">Pick what you want AI to handle</h2>
              <p className="text-sm md:text-base text-primary-400/80 mt-2">
                Yes - AI continuously reviews live analytics to optimize your specials over time.
              </p>
            </div>
            <div className="mb-4 rounded-xl border border-primary-500/20 bg-black/45 p-4 max-w-4xl mx-auto">
              <p className="text-sm font-medium text-primary-400">How AI optimization works</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-primary-400/80">
                <div className="rounded-lg border border-primary-500/15 bg-black/35 p-3">
                  <span className="text-primary-500 font-semibold">1) Track</span> live views, clicks, redemptions, and revenue.
                </div>
                <div className="rounded-lg border border-primary-500/15 bg-black/35 p-3">
                  <span className="text-primary-500 font-semibold">2) Analyze</span> timing, offer type, and audience behavior.
                </div>
                <div className="rounded-lg border border-primary-500/15 bg-black/35 p-3">
                  <span className="text-primary-500 font-semibold">3) Optimize</span> the next specials with confidence scoring.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiOptions.map((option, idx) => {
                const Icon = option.icon
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedFeature(option.featureIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedFeature(option.featureIndex)
                      }
                    }}
                    className="text-left bg-black/50 border border-primary-500/25 rounded-xl p-5 hover:border-primary-500/60 hover:bg-black/70 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black"
                    aria-label={`Open details for ${option.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary-500/15">
                        <Icon className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-primary-500">{option.title}</h3>
                        <p className="text-sm text-primary-400/80 leading-relaxed">{option.description}</p>
                        <p className="text-xs text-primary-400/60">
                          Best for: <span className="text-primary-400">{option.bestFor}</span>
                        </p>
                        <span className="inline-flex items-center text-xs text-primary-500/80">
                          See AI details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Login/Registration Form - Centered (only shown when tab is selected) */}
          {mode === 'login' || mode === 'register' ? (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className="bg-black/60 backdrop-blur-sm border border-primary-500/30 rounded-xl shadow-lg p-6 md:p-8 hover:border-primary-500/50 transition-all duration-300 transform hover:scale-[1.01]">
                <LoginForm initialMode={mode} selectedRole={selectedPortalRole} />
              </div>
            </div>
          ) : null}

          {/* Features Grid - Clickable */}
          <div className="max-w-4xl mx-auto pt-6">
            <h3 className="text-center text-base md:text-lg font-medium text-primary-400/90 mb-4">Everything included in the venue portal</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedFeature(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedFeature(idx)
                    }
                  }}
                  className="bg-black/40 border border-primary-500/20 rounded-lg p-4 hover:border-primary-500/50 hover:bg-black/60 transition-all duration-300 group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black transform hover:scale-[1.02] active:scale-[0.98]"
                  aria-label={`Learn more about ${feature.title}`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-primary-500/10 rounded-lg group-hover:bg-primary-500/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary-500 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-primary-400/70 leading-tight">
                        {feature.description}
                      </p>
                    </div>
                    <span className="text-xs text-primary-500/60 group-hover:text-primary-500 transition-colors">
                      Learn more →
                    </span>
                  </div>
                </button>
              )
            })}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 pt-4 text-sm text-primary-400/60">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              <span>Real-Time</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span>AI-Powered</span>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="pt-12 pb-8">
            <FAQ />
          </div>
        </div>
      </div>

      {/* Feature Detail Modal */}
      {selectedFeature !== null && (
        <FeatureDetailModal
          isOpen={selectedFeature !== null}
          onClose={() => setSelectedFeature(null)}
          feature={features[selectedFeature]}
        />
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-primary-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
