"use client";

import { SearchResults, SimplifiedPlaylist, Playlist, SpotifyApi, MaxInt, TrackItem, AudioFeatures, AudioAnalysis, PlaylistedTrack, RecommendationsRequest } from "@spotify/web-api-ts-sdk"; // use "@spotify/web-api-ts-sdk" in your own project
import sdk from "@/lib/spotify-sdk/ClientInstance";
import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { OptionsSliders, IExampleTrack } from "@/components/OptionsSliders";
import { keyString, upOneFifth, relativeKey } from "@/util/keys"

import {msToTime} from '@/util/time'

import {TimeSignatureIcon} from '@/components/icons/TimeSignature'
import { DanceIcon } from "@/components/icons/Dance";
import { EnergyIcon } from "@/components/icons/Energy";
import { GuitarIcon } from "@/components/icons/Guitar"


type TrackItemWithAudioFeatures = TrackItem & {
  features?: AudioFeatures;
};

const allow_explicit = true;



const makePlaylist = async (user_id: string , tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[], name: string = "Circle of Fifths") => {
  const playlist = await sdk.playlists.createPlaylist(user_id, {name})
  
  const promises = []
  for (let i = 0; i < tracks.length; i += 100) {
    const chunk = tracks.slice(i, i + 100)
    promises.push(sdk.playlists.addItemsToPlaylist(playlist.id, chunk.map((track) => track.track.uri)))
  }
  
  const results = await Promise.allSettled(promises)
  return results 
}

const getTrackData = async (track: PlaylistedTrack<TrackItemWithAudioFeatures>) => {
  let trackInfo = await sdk.tracks.audioFeatures(track.track.id)
  track.track.features = trackInfo
}

const getTracksData = async (tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[]) => {
  const track_ids = tracks.map((track)=>track.track.id)
  // Slice track_ids into 100-item chunks
  const promises = []
  for (let i = 0; i < track_ids.length; i += 100) {
    const chunk = track_ids.slice(i, i + 100)
    promises.push(sdk.tracks.audioFeatures(chunk))
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
    const results = await sdk.recommendations.get({limit: 10, seed_genres: ["pop"], target_popularity: popularity})
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
  const next_tracks_batch = await sdk.recommendations.get({...filters, seed_tracks: seeds.slice(-5).map((seed) => seed.track.id), limit: 100})
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

  if (!session || session.status !== "authenticated") {
    return (
      <div>
        <h1>Spotify Web API Typescript SDK in Next.js</h1>
        <button onClick={() => signIn("spotify")}>Sign in with Spotify</button>
        
      </div>
    );
  }

  return (
    <div>
      <p>Logged in as {session.data.user?.name}</p>
      <button onClick={() => signOut()}>Sign out</button>
      <SpotifySearch sdk={sdk} />
    </div>
  );
}
function SpotifySearch({ sdk }: { sdk: SpotifyApi }) {
  const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
  const [query, setQuery] = useState<string>("");
  const [selected, setSelected] = useState<SimplifiedPlaylist | null>(null)
  const [tracks, setTracks] = useState<PlaylistedTrack<TrackItemWithAudioFeatures>[]>([])
  const [selectedTrack, setSelectedTrack] = useState<PlaylistedTrack<TrackItemWithAudioFeatures> | null>(null)
  const [loading, setLoading] = useState<string>("")
  const [filters, setFilters] = useState<RecommendationsRequest>({limit: 100} as RecommendationsRequest)

  const [startingFive, setStartingFive] = useState<PlaylistedTrack<TrackItemWithAudioFeatures>[]>([])

  const [displayOptions, setDisplayOptions] = useState<boolean>(false)
  const [popularTracks, setPopularTracks] = useState<IExampleTrack[]>([])

  const [filterEmoji, setFilterEmoji] = useState<string>("")

  useEffect(()=>{
    (async () => {
      if(selected) {
      console.log(selected.name)
          setLoading("Loading playlist data")
          let item = await sdk.playlists.getPlaylist(selected.id)
          setLoading("")
          console.log(item)
          let total = item.tracks.total
          let limit: MaxInt<50> = item.tracks.limit as MaxInt<50>
          let offset: number = item.tracks.offset + limit
          let playlistTracks: PlaylistedTrack<TrackItemWithAudioFeatures>[] = item.tracks.items
          setLoading("Loading playlist tracks")
          while(total > offset) {
            
            const results = await sdk.playlists.getPlaylistItems(selected.id, undefined, "items(added_by.id,track(name,href,album(name,href,artists(name))))", limit, offset)
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
        let trackInfo = await sdk.tracks.audioFeatures(selectedTrack.track.id)
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
    (async () => {
      
        // const results = await sdk.search(query, ["artist"]);
        let limit: MaxInt<50> = 50
        let offset = 0
        const items: SimplifiedPlaylist[] = []
        let total: number = 1
        while(total > offset) {
          const results = await sdk.currentUser.playlists.playlists(limit, offset);
          // for(const item of results.items) {
          //   items.push(await sdk.playlists.getPlaylist(item.id))
          // }
          items.push(...results.items)
          total = results.total
          offset += limit
        }
        console.log(items)

        // for(const item of items) {
        //   console.log(item.name)
        //   let limit: MaxInt<50> = 50
        //   let offset = 50
        //   let total = item.tracks.total
        //   let tracks: PlaylistedTrack<TrackItem>[] = item.tracks.items
        //   while(total > limit * offset) {
        //     const results = await sdk.playlists.getPlaylistItems(item.id, undefined, undefined, limit, offset)
        //     tracks.push(...results.items)
        //     offset += limit
        //   }
        //   console.log(tracks)
        // }

        setPlaylists(() => items);
      
    })();
  }, [sdk, query]);

  useEffect(()=>{
    if (popularTracks.length > 0) return
    (async () => {
      const results = await getPopularExamples()
      console.log("getPopularExamples", results)
      setPopularTracks(results)
    })()
  }, [sdk])


  return (
    <>
      <h1>Circle of Fifths</h1>
      <div style={{width: "3em", height: "3em"}} onClick={()=>setDisplayOptions(c=>!c)}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 0 1 0 3m0-3a1.5 1.5 0 0 0 0 3m0 9.75V10.5" />
      </svg>
      </div>
      <div >
        {filterEmoji}
      </div>
      {displayOptions && (
        <div >
        {/* <textarea readOnly cols={30} rows={10} value={JSON.stringify(filters, null, 2)} /> */}
        <OptionsSliders ignore={["key", "mode"]} setFilters={setFilters} setFilterEmoji={setFilterEmoji}
        popular_tracks={popularTracks} />
      </div>
      
      )}
      
      <div style={{color: "#fff"}}>{loading}</div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} />
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Tracks</th>
            <th>Selected</th>
          </tr>
        </thead>
        <tbody>{playlists.map((playlist: SimplifiedPlaylist) => (
          <tr key={playlist.id} onClick={() => setSelected(playlist)}>
            <td>{playlist.name}</td>
            <td>{playlist?.tracks?.total}</td>
            <td>{selected?.id == playlist.id ? '✅' : ''}</td>
          </tr>
        ))}
        </tbody>
      </table>
      <img src="/circle.jpg" style={{height: "400px", position: "sticky"}} />
      <h2>Starting {startingFive.length} {msToTime(startingFive.map((track) => track.track.duration_ms).reduce((a, b) => a + b, 0))}</h2>
      <div onClick={async ()=> { 
        const user = await sdk.currentUser.profile()
        
        await makePlaylist(user.id || "", startingFive, `C5 #${playlists.filter((p)=>p.name.includes("C5")).length + 1} - ${startingFive[0].track.name} - ${filterEmoji}`); setQuery('Created')}} >Create Playlist</div>
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
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Artist</th>
            <th>Key</th>
            <th>Selected</th>
          </tr>
        </thead>
        <tbody>{tracks.sort((a, b) => (a.track.features?.mode == 1 ? (a.track.features?.key || 0) : relativeKey(a.track.features?.key || 0, 0)) - (b.track.features?.mode == 1 ? (b.track.features?.key || 0) : relativeKey(b.track.features?.key || 0, 0))).map((track: PlaylistedTrack<TrackItemWithAudioFeatures>) => (
          <tr key={`${track.track.id}-${track.track.features?.key}-${track.track.features?.mode}`} onClick={() => setSelectedTrack(track)}>
            <td>{track.track.name}</td>
            <td>{'album' in track.track ? track.track.album.artists[0].name : 'N/A'}</td>
            <td>{'features' in track.track ? keyString(track.track.features?.key || 0, track.track.features?.mode || 0) : 'N/A'}</td>
            <td>{selectedTrack?.track.id == track.track.id ? '✅' : ''}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </>
  );
}
