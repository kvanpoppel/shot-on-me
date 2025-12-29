'use client'

export function CardSkeleton() {
  return (
    <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 animate-pulse">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-primary-500/10 rounded-lg w-12 h-12"></div>
        <div className="space-y-2 w-full">
          <div className="h-4 bg-primary-500/20 rounded w-3/4 mx-auto"></div>
          <div className="h-3 bg-primary-500/10 rounded w-full"></div>
        </div>
        <div className="h-3 bg-primary-500/10 rounded w-1/2"></div>
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="bg-black/60 backdrop-blur-sm border border-primary-500/30 rounded-xl shadow-lg p-6 md:p-8 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-primary-500/20 rounded w-1/4"></div>
        <div className="h-10 bg-primary-500/10 rounded"></div>
        <div className="h-4 bg-primary-500/20 rounded w-1/4"></div>
        <div className="h-10 bg-primary-500/10 rounded"></div>
        <div className="h-10 bg-primary-500/20 rounded w-full"></div>
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="bg-black/40 border border-primary-500/20 rounded-lg p-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-primary-500/20 rounded w-1/2"></div>
        <div className="h-8 bg-primary-500/10 rounded w-3/4"></div>
      </div>
    </div>
  )
}

