import { AppProps } from 'next/app'
import { AuthProvider } from '../app/contexts/AuthContext'
import { GoogleMapsProvider } from '../app/contexts/GoogleMapsContext'
import { SocketProvider } from '../app/contexts/SocketContext'
import '../app/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <SocketProvider>
          <Component {...pageProps} />
        </SocketProvider>
      </GoogleMapsProvider>
    </AuthProvider>
  )
}

