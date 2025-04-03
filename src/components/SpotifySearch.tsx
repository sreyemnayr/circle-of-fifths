"use client";

import {
  SimplifiedPlaylist,
  SpotifyApi,
  PlaylistedTrack,
  RecommendationsRequest,
  TrackItemWithAudioFeatures,
} from "@/types";

import {
  doWithRateLimiter,
  makePlaylist,
  getPlaylist,
  getPlaylistTracks,
  searchTracks,
  userPlaylists,
  getRecommendedTracks,
  isTrack,
} from "@/util/spotify";

import { useEffect, useState } from "react";
import { OptionsSliders } from "@/components/OptionsSliders";
// import { NewOptionsSliders } from "@/components/NewOptionsSliders";
import { keyString, relativeKey } from "@/util/keys";

import { RateLimit } from "async-sema";

import { useDebounce } from "use-debounce";
import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import Button from "@mui/material/Button";

import { msToTime } from "@/util/time";
import { getNextTracks, chooseStartingFive } from "@/util/playlister";
import { app_settings } from "@/data/data";

const rate_limiter = RateLimit(20, { timeUnit: 10000 });

export function SpotifySearch({ sdk }: { sdk: SpotifyApi }) {
  const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
  const [query, setQuery] = useState<string>("");
  const [queryDebounced] = useDebounce(query, 1000);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SimplifiedPlaylist | null>(null);
  const [selectedPlaylistTracks, setSelectedPlaylistTracks] = useState<
    PlaylistedTrack<TrackItemWithAudioFeatures>[]
  >([]);
  const [filterTracks, setFilterTracks] = useState<
    PlaylistedTrack<TrackItemWithAudioFeatures>[]
  >([]);
  const [selectedTrack, setSelectedTrack] =
    useState<PlaylistedTrack<TrackItemWithAudioFeatures> | null>(null);
  const [loading, setLoading] = useState<string>("");
  const [filters, setFilters] = useState<RecommendationsRequest>({
    limit: 100,
  } as RecommendationsRequest);
  const [warning, _setWarning] = useState<string>("");

  const [newPlaylistTracks, setNewPlaylistTracks] = useState<
    PlaylistedTrack<TrackItemWithAudioFeatures>[]
  >([]);

  const [filterEmoji, setFilterEmoji] = useState<string>("");

  const [requeryPlaylists, setRequeryPlaylists] = useState<number>(1);

  useEffect(() => {
    (async () => {
      try {
        if (selectedPlaylist) {
          console.log(selectedPlaylist.name);
          setLoading("Loading playlist data");
          const item = await getPlaylist(selectedPlaylist.id, rate_limiter);
          const playlistTracks = await getPlaylistTracks(item, rate_limiter);
          setSelectedPlaylistTracks(playlistTracks);
          setLoading("");
        }
      } catch (e: any) {
        _setWarning(e.message);
      }
    })();
  }, [selectedPlaylist]);

  useEffect(() => {
    (async () => {
      try {
        if (selectedTrack) {
          setNewPlaylistTracks(
            chooseStartingFive(
              selectedPlaylist ? selectedPlaylistTracks : [selectedTrack],
              selectedTrack
            )
          );
        }
      } catch (e: any) {
        _setWarning(e.message);
      }
    })();
  }, [selectedTrack, selectedPlaylist, selectedPlaylistTracks]);

  useEffect(() => {
    if (Object.keys(filters).length > 1) {
      console.log("filters", filters);
      (async () => {
        try {
          const new_filters = {
            ...filters,
            limit: 25,
            seed_genres: ["pop", "rock", "country", "acoustic", "r-n-b"],
          };
          const results = await getRecommendedTracks(new_filters, rate_limiter);
          setFilterTracks(results);
        } catch (e: any) {
          _setWarning(e.message);
        }
      })();
    }
  }, [filters]);

  useEffect(() => {
    (async () => {
      try {
        if (
          newPlaylistTracks.length > 0 &&
          newPlaylistTracks.length < app_settings.max_tracks &&
          newPlaylistTracks.reduce((a, b) => a + b.track.duration_ms, 0) <
            app_settings.min_time
        ) {
          const remaining_tracks =
            app_settings.max_tracks - newPlaylistTracks.length;
          const remaining_time =
            app_settings.min_time -
            newPlaylistTracks.reduce((a, b) => a + b.track.duration_ms, 0);

          const next_tracks = await getNextTracks(
            newPlaylistTracks,
            filters,
            remaining_tracks,
            remaining_time,
            rate_limiter
          );
          setNewPlaylistTracks((cur) => [...cur, ...next_tracks]);
        }
      } catch (e: any) {
        _setWarning(e.message);
      }
    })();
  }, [newPlaylistTracks, filters]);

  useEffect(() => {
    try {
      if (queryDebounced) {
        (async () => {
          const tracks_with_data = await searchTracks(
            queryDebounced,
            rate_limiter
          );
          setSelectedPlaylistTracks(tracks_with_data);
        })();
      }
    } catch (e: any) {
      _setWarning(e.message);
    }
  }, [queryDebounced]);

  useEffect(() => {
    if (sdk && sdk.currentUser && requeryPlaylists) {
      (async () => {
        const playlists = await userPlaylists(rate_limiter);
        setPlaylists(playlists);
      })();
    }
  }, [sdk, requeryPlaylists]);

  const [index, setIndex] = useState(1);

  return (
    <Container
      maxWidth="lg"
      sx={{
        marginLeft: "auto",
        marginRight: "auto",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {warning !== "" && (
        <Alert variant="outlined" color="warning">
          {warning}
          {/* {warning == "The app has exceeded its rate limits." && (
              <Button
                style={{ color: "red" }}
                onClick={() => {
                  if (!burned) {
                    setBurned(true);
                    fetch("/api/burn").then(() => {
                      signOut();
                      window.location.reload();
                    });
                  }
                }}
              >
                Burn token and re-authenticate
              </Button>
            )} */}
        </Alert>
      )}
      <TabContext value={index}>
        <TabList
          aria-label="Basic tabs"
          onChange={(_event, value) => setIndex(value as number)}
          style={{ alignItems: "center" }}
        >
          <Tab
            label={
              <>
                Vibes{" "}
                {filterEmoji == "" ? (
                  <div style={{ width: "2em", height: "2em" }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5"
                      />
                    </svg>
                  </div>
                ) : (
                  <span
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    {filterEmoji}
                  </span>
                )}
              </>
            }
          />

          <Tab label="My Playlists" />
          <Tab label="Seed Selection" />
          <Tab label="Generate Playlist" />
        </TabList>
        <TabPanel value={0} style={{ width: "100%", height: "100%" }}>
          <Paper>
            {/* <textarea readOnly cols={30} rows={10} value={JSON.stringify(filters, null, 2)} /> */}
            <OptionsSliders
              ignore={["key", "mode"]}
              setFilters={setFilters}
              setFilterEmoji={setFilterEmoji}
            />
            {/* <OptionsMultidimensional
                ignore={[
                  "key",
                  "mode",
                  "time_signature",
                  "tempo",
                  "duration_ms",
                  "loudness",
                ]}
                setFilters={setFilters}
              /> */}
          </Paper>
        </TabPanel>

        <TabPanel value={1}>
          <Paper>
            <div style={{ color: "#fff", width: "100%", height: "100%" }}>
              {loading}
            </div>

            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Tracks</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {playlists.map((playlist: SimplifiedPlaylist) => (
                  <tr
                    key={playlist.id}
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      setIndex(2);
                    }}
                  >
                    <td>{selectedPlaylist?.id == playlist.id ? "✅" : ""}</td>
                    <td>{playlist.name}</td>
                    <td>{playlist?.tracks?.total}</td>
                    <td>
                      <a
                        href={playlist?.external_urls?.spotify}
                        target="_blank"
                      >
                        <img
                          src="/spotify_icon.png"
                          style={{ height: "20px" }}
                          alt="Spotify"
                        />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </TabPanel>
        <TabPanel value={2}>
          <Paper>
            <div style={{ width: "100%", height: "100%" }}>
              The track you choose here will function as the &quot;seed&quot;
              for the playlist that gets generated. Essentially, the first trip
              around the circle of fifths will start with this track as
              inspiration along with any vibes you&apos;ve selected.
            </div>
            {selectedPlaylist?.id ? (
              <div style={{ width: "100%", height: "100%" }}>
                <h2>
                  {selectedPlaylist.name}{" "}
                  <span
                    onClick={() => {
                      setSelectedPlaylist(null);
                      setSelectedPlaylistTracks([]);
                    }}
                  >
                    X
                  </span>
                </h2>
                <h3>{selectedPlaylist.tracks?.total} Tracks</h3>
              </div>
            ) : (
              <>
                <h2>Search</h2>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </>
            )}

            <table>
              <thead>
                <tr>
                  <th>✅</th>
                  <th>Name</th>
                  <th>Artist</th>
                  <th>Key</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPlaylistTracks && selectedPlaylistTracks.length > 0
                  ? selectedPlaylistTracks
                  : filterTracks || []
                )
                  .sort(
                    (a, b) =>
                      (a.track.features?.mode == 1
                        ? a.track.features?.key || 0
                        : relativeKey(a.track.features?.key || 0, 0)) -
                      (b.track.features?.mode == 1
                        ? b.track.features?.key || 0
                        : relativeKey(b.track.features?.key || 0, 0))
                  )
                  .map((track: PlaylistedTrack<TrackItemWithAudioFeatures>) => (
                    <tr
                      key={`${track.track.id}-${track.track.features?.key}-${track.track.features?.mode}`}
                      onClick={() => {
                        setSelectedTrack(track);
                        setIndex(3);
                      }}
                    >
                      <td>
                        {selectedTrack?.track.id == track.track.id ? "✅" : ""}
                      </td>
                      <td>{track.track.name}</td>
                      <td>
                        {isTrack(track?.track)
                          ? track?.track?.album?.artists[0]?.name
                          : "N/A"}
                      </td>
                      <td>
                        {"features" in track.track
                          ? keyString(
                              track.track.features?.key || 0,
                              track.track.features?.mode || 0
                            )
                          : "N/A"}
                      </td>
                      <td style={{ cursor: "pointer" }}>
                        <a
                          href={track?.track?.external_urls?.spotify}
                          target="_blank"
                        >
                          <img
                            src="/spotify_icon.png"
                            style={{ height: "20px" }}
                            alt="Spotify"
                          />
                        </a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Paper>
        </TabPanel>
        <TabPanel value={3}>
          <Paper>
            <h2>
              {newPlaylistTracks.length} Tracks |{" "}
              {msToTime(
                newPlaylistTracks
                  .map((track) => track.track.duration_ms)
                  .reduce((a, b) => a + b, 0)
              )}
            </h2>
            <Button
              variant="contained"
              loading={loading == "Saving playlist"}
              onClick={async () => {
                const user = await doWithRateLimiter(
                  rate_limiter,
                  () => sdk.currentUser.profile(),
                  []
                );
                setLoading("Saving playlist");
                await makePlaylist(
                  user.id || "",
                  newPlaylistTracks,
                  `C5 #${
                    playlists.filter((p) => p.name.includes("C5")).length + 1
                  } - ${newPlaylistTracks?.[0]?.track?.name} - ${filterEmoji}`
                );
                setNewPlaylistTracks([]);

                setLoading(
                  `Saved C5 #${
                    playlists.filter((p) => p.name.includes("C5")).length + 1
                  } - ${newPlaylistTracks?.[0]?.track?.name} - ${filterEmoji}`
                );
                setRequeryPlaylists((cur) => cur + 1);
              }}
            >
              {loading ? loading : "Save Playlist"}
            </Button>
            <table>
              <thead>
                <tr>
                  <th>✅</th>
                  <th>Name</th>
                  <th>Artist</th>
                  <th>Key</th>
                </tr>
              </thead>
              <tbody>
                {newPlaylistTracks.map(
                  (track: PlaylistedTrack<TrackItemWithAudioFeatures>) => (
                    <tr
                      key={`${track.track.id}-${track.track.features?.key}-${track.track.features?.mode}`}
                      onClick={() => setSelectedTrack(track)}
                    >
                      <td>
                        {selectedTrack?.track.id == track.track.id ? "✅" : ""}
                      </td>
                      <td>{track.track.name}</td>
                      <td>
                        {isTrack(track?.track)
                          ? track?.track?.album?.artists[0]?.name
                          : "N/A"}
                      </td>
                      <td>
                        {"features" in track.track
                          ? keyString(
                              track.track.features?.key || 0,
                              track.track.features?.mode || 0
                            )
                          : "N/A"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Paper>
        </TabPanel>
      </TabContext>
    </Container>
  );
}
