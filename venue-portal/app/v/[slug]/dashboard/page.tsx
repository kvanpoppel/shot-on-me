import { redirect } from 'next/navigation'

interface VenueSlugDashboardPageProps {
  params: {
    slug: string
  }
}

export default function VenueSlugDashboardPage({ params }: VenueSlugDashboardPageProps) {
  const slug = encodeURIComponent(params.slug || '')
  redirect(`/dashboard?venue=${slug}`)
}

