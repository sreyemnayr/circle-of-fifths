"use client";

import { SearchResults, 
  PartialSearchResult,
  Page,
  Market,
  ItemTypes,
  SimplifiedPlaylist, Playlist, SpotifyApi, MaxInt, TrackItem, AudioFeatures, AudioAnalysis, PlaylistedTrack, RecommendationsRequest, RecommendationsResponse } from "@spotify/web-api-ts-sdk"; // use "@spotify/web-api-ts-sdk" in your own project
import sdk from "@/lib/spotify-sdk/ClientInstance";
import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { OptionsSliders, IExampleTrack } from "@/components/OptionsSliders";
import { keyString, upOneFifth, relativeKey } from "@/util/keys"

import { RateLimit } from 'async-sema';

import { useDebounce } from 'use-debounce';

import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import Button from '@mui/joy/Button';

import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';

import {msToTime} from '@/util/time'

import {TimeSignatureIcon} from '@/components/icons/TimeSignature'
import { DanceIcon } from "@/components/icons/Dance";
import { EnergyIcon } from "@/components/icons/Energy";
import { GuitarIcon } from "@/components/icons/Guitar"


type TrackItemWithAudioFeatures = TrackItem & {
  features?: AudioFeatures;
};

const allow_explicit = true;

const rate_limiter = RateLimit(20, {timeUnit: 10000});

/**
 * Wraps a function with a rate limiter
 * @param func The function to wrap
 * @param args The arguments to pass to the function
 * @returns The result of the function
 */
const doWithRateLimiter = async (func: (...args: any[]) => Promise<any>, args: any[]) => {
  await rate_limiter();
  return func(...args);
}

const makePlaylist = async (user_id: string , tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[], name: string = "Circle of Fifths") => {
  
  const playlist: Playlist<TrackItem> = await doWithRateLimiter((user_id: string, request: CreatePlaylistRequest) => sdk.playlists.createPlaylist(user_id, request), [user_id, {name}])
  
  const results = []
  for (let i = 0; i < tracks.length; i += 100) {
    const chunk = tracks.slice(i, i + 100)
    results.push(await doWithRateLimiter((playlist_id: string, uris?: string[] | undefined, position?: number | undefined) => sdk.playlists.addItemsToPlaylist(playlist_id, uris, position), [playlist.id, chunk.map((track) => track.track.uri)]))
  }
  
  // const results = await Promise.allSettled(promises)
  return results 
}

const getTrackData = async (track: PlaylistedTrack<TrackItemWithAudioFeatures>) => {
  let trackInfo: AudioFeatures = await doWithRateLimiter((params: string) => sdk.tracks.audioFeatures(params), [track.track.id])
  track.track.features = trackInfo
}

const getTracksData = async (tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[]) => {
  const track_ids = tracks.map((track)=>track.track.id)
  // Slice track_ids into 100-item chunks
  const promises = []
  for (let i = 0; i < track_ids.length; i += 100) {
    const chunk = track_ids.slice(i, i + 100)
    promises.push(doWithRateLimiter((params: string[]) => sdk.tracks.audioFeatures(params), [chunk]))
  }
  
  const results = await Promise.allSettled(promises)
  console.log(results)
  for(let result of results) {
    if(result.status == "fulfilled"){
      for (let trackFeatures of result.value) {
        const track = tracks.find((track) => track.track.id == trackFeatures.id)
        if(track) {
          track.track.features = trackFeatures
        }
      }
    } 
  }
  return tracks
}

const nextKeys = (track: PlaylistedTrack<TrackItemWithAudioFeatures>) => {
  const key = track.track.features?.key || 0
  const mode = track.track.features?.mode || 0
  return upOneFifth(key, mode)
}

const getPopularExamples = async() => {
  console.log("Getting popular examples")
  const all_results = Promise.all([0, 20, 40, 50, 60, 70, 80, 90].map(async(popularity)=> {
    const results = await doWithRateLimiter((params: RecommendationsRequest) => sdk.recommendations.get(params), [{limit: 10, seed_genres: ["pop"], target_popularity: popularity}])
    return {
      value: results.tracks[0].popularity,
      name: results.tracks[0].name,
      artist: results.tracks[0].album.artists[0].name,
      img: results.tracks[0].album.images[0].url
    } as IExampleTrack
  }))
  return all_results
}

const getNextTracks = async (seeds: PlaylistedTrack<TrackItemWithAudioFeatures>[], filters: RecommendationsRequest = {}) => {
  const seed_ids = seeds.map((s)=>s.track.id)
  const seed_artists = seeds.slice(-5).map((s)=>'album' in s.track ? s.track.album.artists[0].name : '')
  console.log("Seed artists", seed_artists)
  const last_track = seeds[seeds.length-1]
  const last_artist = 'album' in last_track.track ? last_track.track.album.artists[0].name : 'N/A'
  let next_key = nextKeys(seeds[seeds.length - 1])
  // const next_tracks_minor = await sdk.recommendations.get({seed_tracks: seeds.slice(-5).map((seed) => seed.track.id), target_key: next_key[0], target_mode: 0})
  // const next_tracks_major = await sdk.recommendations.get({seed_tracks: seeds.slice(-5).map((seed) => seed.track.id), target_key: next_key[1], target_mode: 1})
  const next_tracks_batch: RecommendationsResponse = await doWithRateLimiter((params: RecommendationsRequest) => sdk.recommendations.get(params), [{seed_tracks: seeds.slice(-5).map((seed) => seed.track.id), limit: 100, ...filters}])
  // const next_tracks = [...next_tracks_minor.tracks, ...next_tracks_major.tracks].filter((t)=>!seed_ids.includes(t.id) && t.album.artists[0].name != last_artist)
  const next_tracks = next_tracks_batch.tracks.filter((t)=>!seed_ids.includes(t.id) && !seed_artists.includes(t.album.artists[0].name) && (allow_explicit || !t.explicit)).map((t) => ({
    track: t,
    added_at: "", // Placeholder or actual value
    added_by:  { 
      id: "", // Placeholder or actual value
      external_urls: {spotify: ""}, // Placeholder or actual value
      href: "", // Placeholder or actual value
      type: "", // Placeholder or actual value
      uri: "" // Placeholder or actual value
    },
    is_local: false, // Default or actual value
    primary_color: "" // Default or actual value
  }))
  const next_tracks_data = await getTracksData(next_tracks)
  const add_to_playlist: PlaylistedTrack<TrackItemWithAudioFeatures>[] = []
  let keep_going = true
  while(keep_going) {
    const tracks_in_key = next_tracks_data.filter((track) => !seed_ids.includes(track.track.id) && ('album' in track.track && !seed_artists.includes(track.track.album.artists[0].name)) && ((track.track.features?.key == next_key[0] && track.track.features?.mode == 0) || (track.track.features?.key == next_key[1] && track.track.features?.mode == 1)))
    if(tracks_in_key.length == 0) {
      keep_going = false
    } else {
      const next_track = tracks_in_key[Math.floor(Math.random()*tracks_in_key.length)]
      seed_ids.push(next_track.track.id)
      seed_artists.push('album' in next_track.track ? next_track.track.album.artists[0].name : '')
      console.log("Seed artists", seed_artists)
      add_to_playlist.push(next_track)
      console.log("Target key", keyString(next_key[0], 0), keyString(next_key[1], 1))
      console.log("Next track", next_track.track.name, keyString(next_track.track.features?.key || 0, next_track.track.features?.mode || 0), keyString(relativeKey(next_track.track.features?.key || 0, next_track.track.features?.mode || 0), next_track.track.features?.mode == 1 ? 0 : 1))
      next_key = nextKeys(next_track)
    }
  }
  return add_to_playlist
  // console.log(next_tracks.map((track)=>track.name))
  // const next_track = next_tracks[Math.floor(Math.random()*next_tracks.length)] as TrackItemWithAudioFeatures
  // const next_playlist_track: PlaylistedTrack<TrackItemWithAudioFeatures> = {
  //   track: next_track,
  //   added_at: "", // Placeholder or actual value
  //   added_by:  { 
  //     id: "", // Placeholder or actual value
  //     external_urls: {spotify: ""}, // Placeholder or actual value
  //     href: "", // Placeholder or actual value
  //     type: "", // Placeholder or actual value
  //     uri: "" // Placeholder or actual value
  //   },
  //   is_local: false, // Default or actual value
  //   primary_color: "" // Default or actual value
  // };
  // await getTrackData(next_playlist_track)
  // return next_playlist_track
  
}

const chooseStartingFive = (tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[], firstTrack: PlaylistedTrack<TrackItemWithAudioFeatures>) => {
  
  const starting_key = firstTrack.track.features?.key || 0
  const starting_mode = firstTrack.track.features?.mode || 0

  const seeds = [firstTrack]

  for (let i = 0; i < 4; i++) {
    let next_key = nextKeys(seeds[i])
    let next_track = tracks.find((track) => (track.track.features?.key == next_key[0] && track.track.features?.mode == 0) || (track.track.features?.key == next_key[1] && track.track.features?.mode == 1))
    if (next_track) {
      seeds.push(next_track)
    } else {
      break
    }
  }

  return seeds
}



export default function Home() {
  const session = useSession();
  const [displayOptions, setDisplayOptions] = useState<boolean>(false)

  return (
    <>
    <Modal open={displayOptions} onClose={() => setDisplayOptions(false)}>
      <ModalDialog>
        <ModalClose />
        <img src="/circle.jpg" style={{maxHeight: "80vw", maxWidth: "80vh", aspectRatio: "1"}} />
      </ModalDialog>
      </Modal>

      <h1 style={{fontSize: "2.5rem", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>Circle of Fifths <span style={{paddingLeft: "14px", display: "inline-flex", flexDirection:"column", fontSize: "0.5rem", justifyContent: "center", alignItems: "center"}}><span>Powered by</span><img src="/spotify.png" style={{height: "70px"}} /></span>
      </h1>
      <div style={{padding: "0 5vw"}}>Given a seed track and optional vibes settings, this app will generate a long (~200 tracks) playlist with <em>no repeated tracks</em> that starts in the key of the seed track and follows the <div style={{display: "inline-block", fontWeight: "bold", textDecoration: "underline", cursor: "pointer"}} onClick={() => setDisplayOptions(true)}>circle of fifths</div>. You can find your seed track by either loading existing playlists or searching. </div>
      
    {!session || session.status != "authenticated" ? <>
    <Button color="success" onClick={() => signIn("spotify")}>Authenticate with Spotify</Button>
    </> : <>
    <SpotifySearch sdk={sdk} />
      <p> <Button color="danger" onClick={() => signOut()}>Logged into Spotify as {session.data.user?.name}. Click to sign out.</Button></p>
      
    </>}
    <div style={{padding: "0 5vw"}}>Made with ❤️ by <a href="https://twitter.com/sreyemnayr">Ryan Meyers</a></div>
    <div style={{fontSize: "0.7rem", padding: "0 5vw"}}>Special thanks to Tim Williamson of The Nieux Society for inspiring this app with his deep and unrelenting love of Yacht Rock.</div>
    
    </>
  )

}


interface CreatePlaylistRequest {
  name: string;
  public?: boolean;
  collaborative?: boolean;
  description?: string;
}


function SpotifySearch({ sdk }: { sdk: SpotifyApi }) {
  const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
  const [query, setQuery] = useState<string>("");
  const [queryDebounced] = useDebounce(query, 1000)
  const [selected, setSelected] = useState<SimplifiedPlaylist | null>(null)
  const [tracks, setTracks] = useState<PlaylistedTrack<TrackItemWithAudioFeatures>[]>([])
  const [selectedTrack, setSelectedTrack] = useState<PlaylistedTrack<TrackItemWithAudioFeatures> | null>(null)
  const [loading, setLoading] = useState<string>("")
  const [filters, setFilters] = useState<RecommendationsRequest>({limit: 100} as RecommendationsRequest)

  const [startingFive, setStartingFive] = useState<PlaylistedTrack<TrackItemWithAudioFeatures>[]>([])

  
  const [popularTracks, setPopularTracks] = useState<IExampleTrack[]>([])

  const [filterEmoji, setFilterEmoji] = useState<string>("")

  const [requeryPlaylists, setRequeryPlaylists] = useState<number>(1)

  useEffect(()=>{
    (async () => {
      if(selected) {
      console.log(selected.name)
          setLoading("Loading playlist data")
          let item = await doWithRateLimiter((params: string) => sdk.playlists.getPlaylist(params), [selected.id])
          setLoading("")
          console.log(item)
          let total = item.tracks.total
          let limit: MaxInt<50> = item.tracks.limit as MaxInt<50>
          let offset: number = item.tracks.offset + limit
          let playlistTracks: PlaylistedTrack<TrackItemWithAudioFeatures>[] = item.tracks.items
          setLoading("Loading playlist tracks")
          while(total > offset) {
            
            const results = await doWithRateLimiter((playlist_id: string, market?: Market, fields?: string, limit?: MaxInt<50>, offset?: number) => sdk.playlists.getPlaylistItems(playlist_id, market, fields, limit, offset), [selected.id, undefined, "items(added_by.id,track(name,href,album(name,href,artists(name))))", limit, offset])
            playlistTracks.push(...results.items)
            offset += limit
          }
          setLoading("")
          setTracks(playlistTracks)

          const tracks_with_data = await getTracksData(playlistTracks)
          setTracks(tracks_with_data.slice(0))
          setLoading("")
          
          console.log(tracks)
        }
    })()

  }, [selected])

  useEffect(() => {
    (async () => {
      if(selectedTrack) {
        console.log(selectedTrack)
        let trackInfo = await doWithRateLimiter((params: string) => sdk.tracks.audioFeatures(params), [selectedTrack.track.id])
        console.log(trackInfo)
        setStartingFive(chooseStartingFive(tracks, selectedTrack))
      }
    })()
  }, [selectedTrack])

  useEffect(() => {
    (async () => {
      if(startingFive.length > 0 && startingFive.length < 200) {
        const next_tracks = await getNextTracks(startingFive, filters)
        setStartingFive((cur) => [...cur, ...next_tracks])
      }
    })()

  }, [startingFive, filters])

  useEffect(() => {

    if(queryDebounced){
      (async () => {
        const results: Required<Pick<PartialSearchResult, "tracks">> = await doWithRateLimiter((q: string, types: ItemTypes[]) => sdk.search(q, types), [queryDebounced, ["track"]]);
        const playlistTracks = results.tracks.items.map((track) => {
          return {
            track: track
          } as PlaylistedTrack<TrackItemWithAudioFeatures>
        })
        const tracks_with_data = await getTracksData(playlistTracks)
        setTracks(tracks_with_data)
      }
      )()
    }

  }, [queryDebounced])

  useEffect(() => {
    if(sdk && sdk.currentUser && requeryPlaylists){
      (async () => {
      
        // const results = await sdk.search(query, ["artist"]);
        let limit: MaxInt<50> = 50
        let offset = 0
        const items: SimplifiedPlaylist[] = []
        let total: number = 1
        while(total > offset) {
          const results: Page<SimplifiedPlaylist> = await doWithRateLimiter((limit: MaxInt<50>, offset: number) => sdk.currentUser.playlists.playlists(limit, offset), [limit, offset]);
          items.push(...results.items)
          total = results.total
          offset += limit
        }
        console.log(items)

        setPlaylists(() => items);
      
    })();

    }
    
  }, [sdk, requeryPlaylists]);

  useEffect(()=>{
    console.log("Triggering check for popular tracks");
    console.log(popularTracks);
    if (sdk && !popularTracks.length && !loading) {
      setLoading("Getting popular tracks")
      console.log("Getting popular tracks");
      
      (async () => {
        
        const results = await getPopularExamples()
        setPopularTracks(results)
        setLoading("");
        console.log("getPopularExamples", results)
      })()

    }
    
  }, [sdk, popularTracks, loading])

  const [index, setIndex] = useState(1);


  return (
    <>
      <Tabs aria-label="Basic tabs" 
        value={index}
        onChange={(event, value) => setIndex(value as number)}
      >
      <TabList>
        <Tab>Vibes  { filterEmoji == "" ? (
          <div style={{width: "2em", height: "2em"}}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
            </svg>
          </div>
        ) : (
          <span style={{display: "flex", justifyContent: "space-between"}}>{filterEmoji}</span>
        )} </Tab>
        
        <Tab>Playlist Seed</Tab>
        <Tab>Track Seed</Tab>
        <Tab>Generate Playlist</Tab>
      </TabList>
      <TabPanel value={0}>
        <div >
          {/* <textarea readOnly cols={30} rows={10} value={JSON.stringify(filters, null, 2)} /> */}
          <OptionsSliders ignore={["key", "mode"]} setFilters={setFilters} setFilterEmoji={setFilterEmoji}
          popular_tracks={popularTracks} />
        </div>
      </TabPanel>

      <TabPanel value={1}>
        <div style={{color: "#fff"}}>{loading}</div>
        
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Tracks</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>{playlists.map((playlist: SimplifiedPlaylist) => (
            <tr key={playlist.id} onClick={() => {setSelected(playlist); setIndex(2)}}>
              <td>{selected?.id == playlist.id ? '✅' : ''}</td>
              <td>{playlist.name}</td>
              <td>{playlist?.tracks?.total}</td>
              <td><a href={playlist.external_urls.spotify} target="_blank"><img src="/spotify_icon.png" style={{height: "20px"}} /></a></td>
            </tr>
          ))}
          </tbody>
        </table>
      </TabPanel>
      <TabPanel value={2}>
        {selected?.id ? (
          <div>
            <h2>{selected.name} <span onClick={() => {setSelected(null); setTracks([])}}>X</span></h2> 
            <h3>{selected.tracks?.total} Tracks</h3>
          </div>
        ) : (
          <>
          <h2>Search</h2>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
          </>
        )}
        
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Artist</th>
              <th>Key</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>{tracks.sort((a, b) => (a.track.features?.mode == 1 ? (a.track.features?.key || 0) : relativeKey(a.track.features?.key || 0, 0)) - (b.track.features?.mode == 1 ? (b.track.features?.key || 0) : relativeKey(b.track.features?.key || 0, 0))).map((track: PlaylistedTrack<TrackItemWithAudioFeatures>) => (
            <tr key={`${track.track.id}-${track.track.features?.key}-${track.track.features?.mode}`} onClick={() => {setSelectedTrack(track); setIndex(3)}}>
              <td>{selectedTrack?.track.id == track.track.id ? '✅' : ''}</td>
              <td>{track.track.name}</td>
              <td>{'album' in track.track ? track.track.album.artists[0].name : 'N/A'}</td>
              <td>{'features' in track.track ? keyString(track.track.features?.key || 0, track.track.features?.mode || 0) : 'N/A'}</td>
              <td><a href={track.track.external_urls.spotify} target="_blank">Open in Spotify</a></td>
            </tr>
          ))}
          </tbody>
        </table>
      </TabPanel>
      <TabPanel value={3}>
      <h2>{startingFive.length} Tracks | {msToTime(startingFive.map((track) => track.track.duration_ms).reduce((a, b) => a + b, 0))}</h2>
      <Button
        loading={loading != ""}
        onClick={async ()=> { 
        const user = await doWithRateLimiter(() => sdk.currentUser.profile(), [])
        setLoading("Saving playlist");
        await makePlaylist(user.id || "", startingFive, `C5 #${playlists.filter((p)=>p.name.includes("C5")).length + 1} - ${startingFive[0].track.name} - ${filterEmoji}`);
        setLoading("");
        setStartingFive([])
        setRequeryPlaylists((cur) => cur + 1)
         }} >{loading ? loading : "Save Playlist"}</Button>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Artist</th>
            <th>Key</th>
            <th>Selected</th>
          </tr>
        </thead>
        <tbody>{startingFive.map((track: PlaylistedTrack<TrackItemWithAudioFeatures>) => (
          <tr key={`${track.track.id}-${track.track.features?.key}-${track.track.features?.mode}`} onClick={() => setSelectedTrack(track)}>
            <td>{track.track.name}</td>
            <td>{'album' in track.track ? track.track.album.artists[0].name : 'N/A'}</td>
            <td>{'features' in track.track ? keyString(track.track.features?.key || 0, track.track.features?.mode || 0) : 'N/A'}</td>
            <td>{selectedTrack?.track.id == track.track.id ? '✅' : ''}</td>
          </tr>
        ))}
        </tbody>
      </table>
      </TabPanel>
    </Tabs>

      
      
      
      
    </>
  );
}
