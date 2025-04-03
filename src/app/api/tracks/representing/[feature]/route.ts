import { getRepresentativeTrack } from "@/TrackCache";

import { KnownKey } from "@/types";

import { option_settings } from "@/data/data";

export async function GET(
  _request: Request,
  { params }: { params: { feature: KnownKey } }
) {
  const { feature } = params;
  const option = option_settings.find((option) => option.key === feature);

  if (!option) {
    return new Response(JSON.stringify({ error: "Invalid feature" }), {
      status: 400,
    });
  }

  const tracks = [];
  const mins = [
    option.range[0] || 0,
    ...(option.quartiles || [0.25, 0.5, 0.75]),
  ];
  const maxes = [
    ...(option.quartiles || [0.25, 0.5, 0.75]),
    option.range[1] || 1,
  ];

  for (let i = 0; i < mins.length; i++) {
    const min = mins[i] || 0;
    const max = maxes[i] || 1;
    const track = await getRepresentativeTrack(
      option.key,
      option.integer ? Math.round(min) : min,
      option.integer ? Math.round(max) : max
    );
    tracks.push(track);
  }

  return new Response(JSON.stringify(tracks), {
    status: 200,
  });
}
