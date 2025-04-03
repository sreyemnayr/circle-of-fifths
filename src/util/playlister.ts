import { RecommendationsRequest, TrackItemWithAudioFeatures } from "@/types";
import { getRecommendedTracks, isTrack } from "./spotify";

import { keyString, relativeKey } from "./keys";

import { PlaylistedTrack } from "@/types";
import { nextKeys } from "./spotify";
import { RateLimit } from "async-sema";

import { app_settings } from "@/data/data";

export const getNextTracks = async (
  seeds: PlaylistedTrack<TrackItemWithAudioFeatures>[],
  filters: RecommendationsRequest = {},
  remaining_tracks: number = app_settings.max_tracks,
  remaining_time: number = app_settings.min_time,
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const seed_ids = seeds.map((s) => s.track.id);
  const seed_artists = seeds
    .slice(-5)
    .map((s) => ("album" in s.track ? s?.track?.album?.artists[0]?.name : ""));
  console.log("Seed artists", seed_artists);
  let next_key = nextKeys(seeds[seeds.length - 1]);

  const batch_filters = {
    seed_tracks: seeds.slice(-5).map((seed) => seed.track.id),
    limit: 100,
    ...filters,
  };

  const next_tracks_batch: PlaylistedTrack<TrackItemWithAudioFeatures>[] =
    await getRecommendedTracks(batch_filters, rate_limiter);

  // const next_tracks = [...next_tracks_minor.tracks, ...next_tracks_major.tracks].filter((t)=>!seed_ids.includes(t.id) && t.album.artists[0].name != last_artist)
  const next_tracks_data = next_tracks_batch.filter(
    (t) =>
      isTrack(t.track) &&
      !seed_ids.includes(t.track.id) &&
      !seed_artists.includes(t?.track?.album?.artists[0]?.name) &&
      (app_settings.allow_explicit || !t.track.explicit)
  );

  const add_to_playlist: PlaylistedTrack<TrackItemWithAudioFeatures>[] = [];
  let keep_going = true;
  while (keep_going) {
    const tracks_in_key = next_tracks_data.filter(
      (track) =>
        isTrack(track.track) &&
        !seed_ids.includes(track.track.id) &&
        !seed_artists.includes(track?.track?.album?.artists[0]?.name) &&
        ((track.track.features?.key == next_key[0] &&
          track.track.features?.mode == 0) ||
          (track.track.features?.key == next_key[1] &&
            track.track.features?.mode == 1))
    );
    if (
      tracks_in_key.length == 0 ||
      add_to_playlist.length >= remaining_tracks ||
      add_to_playlist.reduce((a, b) => a + b.track.duration_ms, 0) >=
        remaining_time
    ) {
      keep_going = false;
    } else {
      const next_track =
        tracks_in_key[Math.floor(Math.random() * tracks_in_key.length)];

      if (next_track) {
        seed_ids.push(next_track?.track?.id || "");
        seed_artists.push(
          isTrack(next_track?.track)
            ? next_track?.track?.album?.artists[0]?.name
            : ""
        );
        console.log("Seed artists", seed_artists);
        add_to_playlist.push(next_track);
        // console.log("Target key", keyString(next_key[0], 0), keyString(next_key[1], 1))
        console.log(
          "Next track",
          next_track.track.name,
          keyString(
            next_track.track.features?.key || 0,
            next_track.track.features?.mode || 0
          ),
          keyString(
            relativeKey(
              next_track.track.features?.key || 0,
              next_track.track.features?.mode || 0
            ),
            next_track.track.features?.mode == 1 ? 0 : 1
          )
        );
        next_key = nextKeys(next_track);
      }
    }
  }
  return add_to_playlist;
};

export const chooseStartingFive = (
  tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[],
  firstTrack: PlaylistedTrack<TrackItemWithAudioFeatures>
) => {
  const seeds = [firstTrack];

  for (let i = 0; i < 4; i++) {
    let next_key = nextKeys(seeds[i]);
    let next_track = tracks.find(
      (track) =>
        (track.track.features?.key == next_key[0] &&
          track.track.features?.mode == 0) ||
        (track.track.features?.key == next_key[1] &&
          track.track.features?.mode == 1)
    );
    if (next_track) {
      seeds.push(next_track);
    } else {
      break;
    }
  }

  return seeds;
};
