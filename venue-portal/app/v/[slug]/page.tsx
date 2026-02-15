import { redirect } from 'next/navigation'

interface VenueSlugPageProps {
  params: {
    slug: string
  }
}

export default function VenueSlugPage({ params }: VenueSlugPageProps) {
  const slug = encodeURIComponent(params.slug || '')
  redirect(`/?tab=login&venue=${slug}`)
}

