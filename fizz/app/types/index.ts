export type Tab = 'home' | 'discover' | 'send' | 'feed' | 'messages' | 'wallet' | 'profile'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  name?: string
  username?: string
  profilePicture?: string
  location?: {
    latitude?: number
    longitude?: number
    isVisible?: boolean
  }
  wallet: {
    balance: number
    pendingBalance: number
  }
  fizzWallet?: {
    balance: number
    pendingBalance: number
  }
  fizzProfile?: {
    firstName?: string
    lastName?: string
    username?: string
    bio?: string
    profilePicture?: string
  }
}

export interface Venue {
  _id: string
  id?: string
  name: string
  category: string
  address?: string
  neighborhood?: string
  city?: string
  description?: string
  imageUrl?: string
  photos?: string[]
  rating?: number
  reviewCount?: number
  promotions?: Promotion[]
  isFizzing?: boolean
  distance?: number
}

export interface Promotion {
  _id: string
  title: string
  description: string
  endDate?: string
  discountAmount?: number
}

export interface FizzGift {
  _id: string
  amount: number
  message?: string
  occasion?: string
  sender: { id: string; firstName: string; lastName: string; profilePicture?: string }
  recipient: { id: string; firstName: string; lastName: string; profilePicture?: string }
  venue?: Venue
  createdAt: string
}

export type VenueCategory =
  | 'Coffee Shop'
  | 'Juice Bar'
  | 'Dirty Soda Shop'
  | 'Soda Shop'
  | 'Tea House'
  | 'Smoothie Bar'
  | 'Bakery'
  | 'Cafe'

export const FIZZ_CATEGORIES: VenueCategory[] = [
  'Dirty Soda Shop',
  'Coffee Shop',
  'Juice Bar',
  'Soda Shop',
  'Tea House',
  'Smoothie Bar',
  'Bakery',
  'Cafe',
]

export const EXCLUDED_CATEGORIES = ['Bar', 'Nightclub', 'Lounge', 'Brewery', 'Winery', 'Tavern']

export const FIZZ_CITIES = [
  'Indianapolis',
  'Chicago',
  'Louisville',
  'Nashville',
  'Detroit',
  'Columbus',
  'Salt Lake City',
]

export const OCCASION_TAGS = [
  { label: 'Coffee Date', emoji: '☕' },
  { label: 'Birthday', emoji: '🎂' },
  { label: 'Just Because', emoji: '💚' },
  { label: 'Congrats', emoji: '🎉' },
  { label: 'Thank You', emoji: '🙏' },
  { label: 'Good Morning', emoji: '🌅' },
  { label: 'You Got This', emoji: '💪' },
]

export const CATEGORY_ICONS: Record<string, string> = {
  'Dirty Soda Shop': '🧋',
  'Coffee Shop': '☕',
  'Juice Bar': '🥤',
  'Soda Shop': '🫧',
  'Tea House': '🍵',
  'Smoothie Bar': '🥝',
  'Bakery': '🥐',
  'Cafe': '🫶',
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Dirty Soda Shop': 'bg-orange-900/40 text-orange-300',
  'Coffee Shop': 'bg-amber-900/40 text-amber-300',
  'Juice Bar': 'bg-green-900/40 text-green-300',
  'Soda Shop': 'bg-cyan-900/40 text-cyan-300',
  'Tea House': 'bg-emerald-900/40 text-emerald-300',
  'Smoothie Bar': 'bg-lime-900/40 text-lime-300',
  'Bakery': 'bg-orange-900/40 text-orange-300',
  'Cafe': 'bg-purple-900/40 text-purple-300',
}
