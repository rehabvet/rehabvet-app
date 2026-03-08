import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJY_ZBds8Z2jERjMFPzYxwLxI'
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

let cache: { data: any; ts: number } | null = null
const CACHE_MS = 6 * 60 * 60 * 1000

function formatDate(unixTs: number): string {
  const d = new Date(unixTs * 1000)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data)
    }

    if (!API_KEY) {
      return NextResponse.json({ rating: 4.8, total: 194, reviews: [] })
    }

    // Fetch newest reviews (Places API returns max 5 per call, sorted by newest)
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&key=${API_KEY}&reviews_sort=newest`,
      { next: { revalidate: 21600 } }
    )
    const json = await res.json()
    const result = json.result

    const reviews = (result.reviews || [])
      .filter((r: any) => r.rating >= 4 && r.text?.length > 20)
      .slice(0, 10)
      .map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text.length > 300 ? r.text.slice(0, 297) + '…' : r.text,
        date: formatDate(r.time),
        photo: r.profile_photo_url,
      }))

    const data = {
      rating: result.rating,
      total: result.user_ratings_total,
      reviews,
    }

    cache = { data, ts: Date.now() }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ rating: 4.8, total: 194, reviews: [] })
  }
}
