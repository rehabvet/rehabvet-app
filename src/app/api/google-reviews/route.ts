import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJY_ZBds8Z2jERjMFPzYxwLxI'
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'AIzaSyAgtDO5Ep19b69eCE-kWsu7R1TM3yiJ3xo'

// Cache reviews in memory for 6 hours
let cache: { data: any; ts: number } | null = null
const CACHE_MS = 6 * 60 * 60 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json(cache.data)
    }

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=name,rating,user_ratings_total,reviews&key=${API_KEY}&reviews_sort=most_relevant`,
      { next: { revalidate: 21600 } }
    )
    const json = await res.json()
    const result = json.result

    const reviews = (result.reviews || [])
      .filter((r: any) => r.rating >= 4 && r.text?.length > 80)
      .slice(0, 5)
      .map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text.length > 320 ? r.text.slice(0, 317) + '…' : r.text,
        time: r.relative_time_description,
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
    return NextResponse.json({ rating: 4.8, total: 193, reviews: [] })
  }
}
