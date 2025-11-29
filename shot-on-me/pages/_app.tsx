import { AppProps } from 'next/app'
import { Elements } from '@stripe/react-stripe-js'
import { AuthProvider } from '../app/contexts/AuthContext'
import { GoogleMapsProvider } from '../app/contexts/GoogleMapsContext'
import { SocketProvider } from '../app/contexts/SocketContext'
import { StripeProvider, useStripeContext } from '../app/contexts/StripeContext'
import '../app/globals.css'

// Inner component that uses Stripe context
function AppWithStripe({ Component, pageProps }: AppProps) {
  const { stripe, loading } = useStripeContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <>
      {stripe ? (
        <Elements stripe={stripe}>
          <Component {...pageProps} />
        </Elements>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <SocketProvider>
          <StripeProvider>
            <AppWithStripe Component={Component} pageProps={pageProps} />
          </StripeProvider>
        </SocketProvider>
      </GoogleMapsProvider>
    </AuthProvider>
  )
}

