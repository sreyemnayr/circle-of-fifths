import { MyErrorHandler } from '@/SpotifyProfile';

export async function GET(_request: Request) {
  const eh = new MyErrorHandler()
  eh.handleErrors("The app has exceeded its rate limits.")
  return new Response("", { status: 200 })
}

