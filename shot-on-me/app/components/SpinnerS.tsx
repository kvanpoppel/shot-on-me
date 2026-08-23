'use client'

interface SpinnerSProps {
  /** 'splash' = 80px, 'inline' = 36px, or pass a custom number */
  size?: 'splash' | 'inline' | number
  /** Animation style */
  animation?: 'spin' | 'entrance' | 'toss' | 'land'
  className?: string
}

export default function SpinnerS({ size = 'inline', animation = 'spin', className = '' }: SpinnerSProps) {
  const px = size === 'splash' ? 80 : size === 'inline' ? 36 : size

  const animClass = {
    spin: 'coin-spin',
    entrance: 'coin-entrance',
    toss: 'coin-toss',
    land: 'coin-land',
  }[animation]

  return (
    <div className={`coin-perspective ${className}`} style={{ width: px, height: px }}>
      <div className={animClass} style={{ width: px, height: px }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/app-icons/icon-192.png"
          alt=""
          width={px}
          height={px}
          style={{ width: px, height: px, borderRadius: '50%', display: 'block' }}
        />
      </div>
    </div>
  )
}
