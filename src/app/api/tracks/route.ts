import { getCachedTracks, cacheTracks, TrackItemWithAudioFeatures } from "@/TrackCache"

export async function GET(_request: Request) {
    const url = new URL(_request.url)
    const track_ids = url.searchParams.get("ids")?.split(",") as string[]
    const tracks = await getCachedTracks(track_ids)
    return new Response(JSON.stringify(tracks), { status: 200 })
  }

export async function POST(_request: Request) {
    const tracks = await _request.json() as TrackItemWithAudioFeatures[]
    const posted = await cacheTracks(tracks)
    return new Response(JSON.stringify(posted), { status: 200 })
}

