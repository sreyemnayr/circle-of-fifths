import {
  PlaylistedTrack,
  TrackItemWithAudioFeatures,
  Playlist,
  TrackItem,
  CreatePlaylistRequest,
  RecommendationsRequest,
  OptionSettings,
  RecommendationsResponse,
  IExampleTrack,
  KnownKey,
  Track,
  Market,
  MaxInt,
  PartialSearchResult,
  ItemTypes,
  Page,
  SimplifiedPlaylist,
} from "@/types";
import sdk from "@/lib/spotify-sdk/ClientInstance";
import { RateLimit } from "async-sema";
import { upOneFifth } from "./keys";

/**
 * Wraps a function with a rate limiter
 * @param func The function to wrap
 * @param args The arguments to pass to the function
 * @returns The result of the function
 */
export const doWithRateLimiter = async (
  rate_limiter: () => Promise<void>,
  func: (...args: any[]) => Promise<any>,
  args: any[],
  setWarning: (warning: string) => void = (s) => {
    console.log(s);
  }
) => {
  await rate_limiter();
  try {
    return func(...args);
  } catch (e: any) {
    setWarning(e.message);
  }
};

export const getTracksData = async (
  tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[],
  rate_limiter: (() => Promise<void>) | undefined = undefined
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const track_ids = tracks
    .filter((track) => track?.track?.id)
    .map((track) => track.track.id);
  const cached_tracks = [];
  const cached_promises = [];

  for (let i = 0; i < track_ids.length; i += 100) {
    const chunk = track_ids.slice(i, i + 100);
    cached_promises.push(
      fetch(`/api/tracks?ids=${chunk.join(",")}`, { method: "GET" }).then(
        (res) => res.json()
      )
    );
  }

  const cached_results = await Promise.allSettled(cached_promises);
  for (let result of cached_results) {
    if (result.status == "fulfilled") {
      cached_tracks.push(...result.value);
    }
  }

  const cached_track_ids = cached_tracks.map(
    (track: TrackItemWithAudioFeatures) => track.id
  );

  for (let cached_track of cached_tracks) {
    const track = tracks.find((track) => track.track.id == cached_track.id);
    if (track) {
      track.track.features = cached_track.features;
    }
  }

  const uncached_tracks = tracks.filter(
    (track) => !cached_track_ids.includes(track.track.id)
  );
  const uncached_track_ids = uncached_tracks
    .filter((track) => track?.track?.id)
    .map((track) => track.track.id);
  // Slice track_ids into 100-item chunks

  const promises = [];
  for (let i = 0; i < uncached_track_ids.length; i += 100) {
    const chunk = uncached_track_ids.slice(i, i + 100);
    promises.push(
      doWithRateLimiter(
        rate_limiter,
        (params: string[]) => sdk.tracks.audioFeatures(params),
        [chunk]
      )
    );
  }

  const results = await Promise.allSettled(promises);
  console.log(results);
  for (let result of results) {
    if (result.status == "fulfilled") {
      for (let trackFeatures of result.value) {
        const uncached_track = uncached_tracks.find(
          (track) => track.track.id == trackFeatures.id
        );
        if (uncached_track) {
          uncached_track.track.features = trackFeatures;
        }
        const track = tracks.find(
          (track) => track.track.id == trackFeatures.id
        );
        if (track) {
          track.track.features = trackFeatures;
        }
      }
    }
  }
  if (uncached_tracks.length > 0) {
    await fetch(`/api/tracks`, {
      method: "POST",
      body: JSON.stringify(uncached_tracks.map((track) => track.track)),
    });
  }

  return tracks;
};

export const makePlaylist = async (
  user_id: string,
  tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[],
  name: string = "Circle of Fifths",
  rate_limiter: (() => Promise<void>) | undefined = undefined
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const playlist: Playlist<TrackItem> = await doWithRateLimiter(
    rate_limiter,
    (user_id: string, request: CreatePlaylistRequest) =>
      sdk.playlists.createPlaylist(user_id, request),
    [user_id, { name }]
  );

  const results = [];
  for (let i = 0; i < tracks.length; i += 100) {
    const chunk = tracks.slice(i, i + 100);
    results.push(
      await doWithRateLimiter(
        rate_limiter,
        (
          playlist_id: string,
          uris?: string[] | undefined,
          position?: number | undefined
        ) => sdk.playlists.addItemsToPlaylist(playlist_id, uris, position),
        [playlist.id, chunk.map((track) => track.track.uri), i]
      )
    );
  }

  // const results = await Promise.allSettled(promises)
  return results;
};

export const nextKeys = (
  track: PlaylistedTrack<TrackItemWithAudioFeatures> | undefined
) => {
  if (!track) {
    return [0, 0];
  }
  const key = track.track.features?.key || 0;
  const mode = track.track.features?.mode || 0;
  return upOneFifth(key, mode);
};

export const findRepresentativeTrack = async (
  option: string,
  min: number,
  max: number,
  rate_limiter: (() => Promise<void>) | undefined = undefined
) => {
  const fetch_results = await fetch(
    `/api/tracks/representing/${option}/${min}/${max}`,
    {
      method: "GET",
    }
  );
  const json = await fetch_results.json();
  const track = json;
  if (!track) {
    if (!rate_limiter) {
      rate_limiter = RateLimit(20, { timeUnit: 10000 });
    }
    const results: RecommendationsResponse = await doWithRateLimiter(
      rate_limiter,
      (params: RecommendationsRequest) => sdk.recommendations.get(params),
      [
        {
          limit: 1,
          seed_genres: ["pop", "rock", "country", "acoustic", "r-n-b"],
          [`min_${option}`]: min,
          [`max_${option}`]: max,
        },
      ]
    );
    const result_tracks = results.tracks.map(
      (track) =>
        ({
          track: track,
        } as PlaylistedTrack<TrackItemWithAudioFeatures>)
    );
    const tracks = await getTracksData(result_tracks, rate_limiter);
    return tracks[0] || ({} as PlaylistedTrack<TrackItemWithAudioFeatures>);
  }
  return { track: track } as PlaylistedTrack<TrackItemWithAudioFeatures>;
};

export const findRepresentativeTracks = async (
  option: OptionSettings,
  rate_limiter: (() => Promise<void>) | undefined = undefined
) => {
  if (option.key === "popularity") {
    return await findPopularTracks(rate_limiter);
  }
  const fetch_results = await fetch(`/api/tracks/representing/${option.key}`, {
    method: "GET",
  });
  const tracks = (await fetch_results.json()).map(
    (track: TrackItemWithAudioFeatures) =>
      ({
        track: track,
      } as PlaylistedTrack<TrackItemWithAudioFeatures>)
  ) as (PlaylistedTrack<TrackItemWithAudioFeatures> | null)[];

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
    if (!tracks[i]) {
      const track = await findRepresentativeTrack(
        option.key,
        option.integer ? Math.round(min) : min,
        option.integer ? Math.round(max) : max,
        rate_limiter
      );
      tracks[i] = track || ({} as PlaylistedTrack<TrackItemWithAudioFeatures>);
    }
  }
  return tracks
    .filter((track) => track !== null)
    .map((track) => ({
      value: track.track.features?.[option.key as KnownKey],
      name: track.track.name,
      artist: "album" in track.track ? track.track.album.artists[0]?.name : "",
      img: "album" in track.track ? track.track.album.images[0]?.url : "",
    })) as IExampleTrack[];
};

export const findPopularTracks = async (
  rate_limiter: (() => Promise<void>) | null = null
) => {
  console.log("Getting popular examples");
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const all_results = Promise.all(
    [0, 20, 30, 40, 50, 70, 90].map(async (popularity) => {
      const results: RecommendationsResponse = await doWithRateLimiter(
        rate_limiter,
        (params: RecommendationsRequest) => sdk.recommendations.get(params),
        [{ limit: 1, seed_genres: ["pop"], target_popularity: popularity }]
      );
      return {
        value: results.tracks[0]?.popularity,
        name: results.tracks[0]?.name,
        artist: results.tracks[0]?.album?.artists[0]?.name,
        img: results.tracks[0]?.album?.images[0]?.url,
      } as IExampleTrack;
    })
  );
  return all_results;
};

export const getPlaylist = async (
  id: string,
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  return (await doWithRateLimiter(
    rate_limiter,
    (params: string) => sdk.playlists.getPlaylist(params),
    [id]
  )) as Playlist<TrackItem>;
};

export const getPlaylistTracks = async (
  playlist: Playlist<TrackItem>,
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  let total = playlist.tracks.total;
  let limit: MaxInt<50> = playlist.tracks.limit as MaxInt<50>;
  let offset: number = playlist.tracks.offset + limit;
  let playlistTracks: PlaylistedTrack<TrackItemWithAudioFeatures>[] =
    playlist.tracks.items;
  while (total > offset) {
    const results = await doWithRateLimiter(
      rate_limiter,
      (
        playlist_id: string,
        market?: Market,
        fields?: string,
        limit?: MaxInt<50>,
        offset?: number
      ) =>
        sdk.playlists.getPlaylistItems(
          playlist_id,
          market,
          fields,
          limit,
          offset
        ),
      [
        playlist.id,
        undefined,
        "items(added_by.id,track(name,href,album(name,href,artists(name))))",
        limit,
        offset,
      ]
    );
    playlistTracks.push(...results.items);
    offset += limit;
  }
  const playlistTracksWithData = await getTracksData(
    playlistTracks,
    rate_limiter
  );
  return playlistTracksWithData;
};

export const searchTracks = async (
  query: string,
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const results: Required<Pick<PartialSearchResult, "tracks">> =
    await doWithRateLimiter(
      rate_limiter,
      (q: string, types: ItemTypes[]) => sdk.search(q, types),
      [query, ["track"]]
    );
  const playlistTracks = results.tracks.items.map((track) => {
    return {
      track: track,
    } as PlaylistedTrack<TrackItemWithAudioFeatures>;
  });
  const tracks_with_data = await getTracksData(playlistTracks, rate_limiter);
  return tracks_with_data;
};

export const userPlaylists = async (
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  let limit: MaxInt<50> = 50;
  let offset = 0;
  const items: SimplifiedPlaylist[] = [];
  let total: number = 1;
  try {
    while (total > offset) {
      const results: Page<SimplifiedPlaylist> = await doWithRateLimiter(
        rate_limiter,
        (limit: MaxInt<50>, offset: number) =>
          sdk.currentUser.playlists.playlists(limit, offset),
        [limit, offset]
      );
      items.push(...results.items);
      total = results.total;
      offset += limit;
    }
    return items;
  } catch (e: any) {
    console.log(e);
    return [];
  }
};

export const getRecommendedTracks = async (
  filters: RecommendationsRequest,
  rate_limiter: (() => Promise<void>) | null = null
) => {
  if (!rate_limiter) {
    rate_limiter = RateLimit(20, { timeUnit: 10000 });
  }
  const results: RecommendationsResponse = await doWithRateLimiter(
    rate_limiter,
    (params: RecommendationsRequest) => sdk.recommendations.get(params),
    [filters]
  );
  const playlistTracks = results.tracks.map((track) => {
    return {
      track: track,
    } as PlaylistedTrack<TrackItemWithAudioFeatures>;
  });
  const tracks_with_data = await getTracksData(playlistTracks, rate_limiter);
  return tracks_with_data;
};

export function isTrack(item: any): item is Track {
  return (item as Track).album !== undefined;
}
