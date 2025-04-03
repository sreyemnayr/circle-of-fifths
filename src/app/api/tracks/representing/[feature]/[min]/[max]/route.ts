import {
  getRepresentativeTrack,
  TrackItemWithAudioFeatures,
} from "@/TrackCache";

export async function GET(
  _request: Request,
  { params }: { params: { feature: string; min: string; max: string } }
) {
  const { feature, min, max } = params;
  const track = await getRepresentativeTrack(
    feature,
    parseFloat(min),
    parseFloat(max)
  );
  return new Response(JSON.stringify(track as TrackItemWithAudioFeatures), {
    status: 200,
  });
}
