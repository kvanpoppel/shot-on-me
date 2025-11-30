import { AppProps } from 'next/app'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AuthProvider } from '@/app/contexts/AuthContext'
import { GoogleMapsProvider } from '@/app/contexts/GoogleMapsContext'
import { SocketProvider } from '@/app/contexts/SocketContext'
import '@/app/globals.css'

// Initialize Stripe with publishable key from environment variable
// Falls back to placeholder if not set (for development)
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
const stripePromise = loadStripe(stripePublishableKey)

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <SocketProvider>
          <Elements stripe={stripePromise}>
            <Component {...pageProps} />
          </Elements>
        </SocketProvider>
      </GoogleMapsProvider>
    </AuthProvider>
  )
}

