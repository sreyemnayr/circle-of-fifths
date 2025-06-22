import {
  // SearchResults,
  PartialSearchResult,
  Page,
  Market,
  ItemTypes,
  SimplifiedPlaylist,
  Playlist,
  SpotifyApi,
  MaxInt,
  TrackItem,
  AudioFeatures,
  Track,
  // AudioAnalysis,
  PlaylistedTrack,
  RecommendationsRequest,
  RecommendationsResponse,
} from "@spotify/web-api-ts-sdk";

export type TrackItemWithAudioFeatures = TrackItem & {
  features?: AudioFeatures;
};

export interface CreatePlaylistRequest {
  name: string;
  public?: boolean;
  collaborative?: boolean;
  description?: string;
}

export type KnownKey =
  | "acousticness"
  | "danceability"
  | "energy"
  | "instrumentalness"
  | "liveness"
  | "loudness"
  | "speechiness"
  | "valence"
  | "duration_ms"
  | "key"
  | "mode"
  | "tempo"
  | "time_signature";

export type PopularityKey = "popularity";

export type TargetKey = `target_${KnownKey | PopularityKey}`;
export type MinKey = `min_${KnownKey | PopularityKey}`;
export type MaxKey = `max_${KnownKey | PopularityKey}`;

export interface OptionSettings {
  label: string;
  range: [number, number];
  quartiles?: [number, number, number] | null;
  qualitative: boolean;
  integer: boolean;
  step: number;
  description: string;
  key: KnownKey | PopularityKey;
  target?: boolean;
  exact?: boolean;
  value?: [number, number];
  enabled?: boolean;
  emoji_scale?: string[];
}

export interface IExampleTrack {
  artist: string;
  name: string;
  img: string;
  value: number | string;
  highlight?: boolean;
}

export type ExampleTracks = {
  [K in KnownKey | PopularityKey]: IExampleTrack[];
};

export interface RecommendationsRequestPreset {
  name: string;
  emoji: string;
  description: string;
  filters: RecommendationsRequest;
}

export type {
  PartialSearchResult,
  Page,
  Market,
  ItemTypes,
  SimplifiedPlaylist,
  Playlist,
  SpotifyApi,
  MaxInt,
  TrackItem,
  AudioFeatures,
  Track,
  PlaylistedTrack,
  RecommendationsRequest,
  RecommendationsResponse,
};

export interface AppSettings {
  allow_explicit: boolean;
  max_tracks: number;
  min_time: number;
}

export interface Mark {
  value: number;
  label?: React.ReactNode;
}
