import {
  getRepresentativeTrack,
  TrackItemWithAudioFeatures,
} from "@/TrackCache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ feature: string; min: string; max: string }> }
) {
  const { feature, min, max } = await params;
  const track = await getRepresentativeTrack(
    feature,
    parseFloat(min),
    parseFloat(max)
  );
  return new Response(JSON.stringify(track as TrackItemWithAudioFeatures), {
    status: 200,
  });
}
