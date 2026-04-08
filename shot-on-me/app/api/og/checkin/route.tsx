import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name  = searchParams.get('name')  || 'Someone'
  const venue = searchParams.get('venue') || 'a venue'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1105 60%, #0a0a0a 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%',
          transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(184,148,90,0.15) 0%, transparent 65%)',
          display: 'flex',
        }} />

        <div style={{ position: 'absolute', top: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: 'rgba(184,148,90,0.55)', textTransform: 'uppercase', display: 'flex' }}>
            SHOT ON ME
          </div>
          <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, rgba(184,148,90,0.5), transparent)', display: 'flex' }} />
        </div>

        <div style={{ fontSize: 100, marginBottom: 24, display: 'flex' }}>📍</div>

        <div style={{ fontSize: 50, fontWeight: 800, color: '#FFFFFF', textAlign: 'center', padding: '0 80px', lineHeight: 1.2, marginBottom: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {name} is out tonight
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(184,148,90,0.12)', border: '1.5px solid rgba(184,148,90,0.3)',
          borderRadius: 100, padding: '10px 28px',
        }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#B8945A', display: 'flex' }}>
            at {venue}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: '#B8945A', letterSpacing: 2, display: 'flex' }}>Shot On Me</div>
          <div style={{ fontSize: 20, color: 'rgba(184,148,90,0.5)', display: 'flex' }}>shotonme.com — Buy someone a drink</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
