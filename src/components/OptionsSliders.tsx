"use client"

import Box from '@mui/joy/Box';
import Slider from '@mui/joy/Slider';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import { Mark } from '@mui/base/useSlider/useSlider.types'

import {useState, useEffect, Dispatch, SetStateAction, Fragment} from 'react';
import { RecommendationsRequest } from '@spotify/web-api-ts-sdk';
import { keyString } from '@/util/keys';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option'
import Button from '@mui/joy/Button';
import Switch from '@mui/joy/Switch';
import Typography from '@mui/joy/Typography';

import {msToTime, msToMinutes} from '@/util/time'

function valueText(value: number) {
  return `${value}`;
}

export const RangeSlider = ({option, value=[0.0,1.0], onChange, marks }: {option: OptionSettings, value?: [number, number], onChange: (value: number[]) => void, marks?: Mark[]}) => {
  // const [value, setValue] = React.useState<number[]>([20, 37]);
  // const [value, setValue] = React.useState<number[]>([20, 37]);
  // const [enabled, setEnabled] = React.useState<boolean>(true)

  const [displayValue, setDisplayValue] = useState<[number, number]>(value)
  

  const handleChange = (event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setDisplayValue((option.target || option.exact) ? [newValue, newValue] as [number, number] : newValue as [number, number])
    onChange((option.target || option.exact) ? [newValue, newValue] as [number, number] : newValue as [number, number]);
  };

  useEffect(() => {
    setDisplayValue(value as [number, number])
  }, [option.target, option.exact, value])

  const display = (value: number | string) => {
    return displayOption(option, parseFloat(value.toString()))
  }

  return (
    <Box sx={{ width: "100%", height: "500px", padding: "10px" }}>
      <Slider
        getAriaLabel={() => option.label}
        orientation={"vertical"}
        value={option.target ? displayValue[0] : displayValue }
        onChange={(e, newValue)=> setDisplayValue((option.target || option.exact) ? [newValue, newValue] as [number, number] : newValue as [number, number])}
        onChangeCommitted={handleChange}
        valueLabelDisplay="on"
        getAriaValueText={display}
        valueLabelFormat={display}
        // disabled={!enabled}
        step={option.step}
        min={option.range[0]}
        max={option.range[1]}
        marks={marks}
        track={option.target ? false : "normal"}
      />
    </Box>
  );
}

const displayOption = (option: OptionSettings, value: number) => {
    if (option?.emoji_scale) {
        if (option.key == "popularity") {
            value = value / 100
        }
        return option.emoji_scale[Math.min(Math.round(value * option.emoji_scale.length), option.emoji_scale.length - 1)]
    }
    if (option.key == "loudness"){
        if (value == option.range[0]) {
            return "🔇" + value.toFixed(0) + "db"
        } else if (value > -20) {
            return "🔊" + value.toFixed(0) + "db"
        } else if (value > -40) {
            return "🔉" + value.toFixed(0) + "db"
        } else {
            return "🔈" + value.toFixed(0) + "db"
        }
    }
    if (option.key == "mode"){
        return ["minor","major"][parseInt(value.toString())]
    }
    if (option.key == "tempo"){
        if (value == option.range[0]) {
            return "🚶" + value.toFixed(0) + "bpm"
        } else if (value == option.range[1]) {
            return "🏃" + value.toFixed(0) + "bpm"
        } else {
            return value.toFixed(0) + "bpm"
        }
    }
    if (option.key == "time_signature"){
        if (value == option.range[0]) {
            return "🎼" + value.toFixed(0) + "/4"
        } else if (value == option.range[1]) {
            return " " + value.toFixed(0) + "/4"
        } else {
            return value.toFixed(0) + "/4"
        }
    }
    if (option.key == "key"){
        return keyString(parseInt(value.toString()), 1)
    }
    if (option.key == "duration_ms"){
        if (value == option.range[0]) {
            return "⌛" + msToTime(value)
        } else if (value == option.range[1]) {
            return "⏳" + msToTime(value)
        } else {
            return msToTime(value)
        }
    }

    return value.toString()
    
    
}

type KnownKey = "acousticness" | "danceability" | "energy" | "instrumentalness" | "liveness" | "loudness" | "speechiness" | "valence" | "duration_ms" | "key" | "mode" | "tempo" | "time_signature" | "popularity"

type TargetKey = `target_${KnownKey}`
type MinKey = `min_${KnownKey}`
type MaxKey = `max_${KnownKey}`

interface OptionSettings {
    label: string,
    range: [number, number],
    step: number,
    description: string,
    key: KnownKey,
    target?: boolean,
    exact?: boolean,
    value?: [number, number],
    enabled?: boolean,
    emoji_scale?: string[],
}

export interface IExampleTrack {
    artist: string,
    name: string,
    img: string,
    value: number,
}

export const ExampleTrack = ({artist, name, img, value}: IExampleTrack) => {
    return (
        <div style={{display: "flex", flexDirection: "row", alignItems: "center"}}>
            <div style={{fontSize: "0.6em", marginRight: "10px"}}>{value}</div>
            <img src={img} style={{height:"30px", marginRight: "10px"}} alt="" />
            
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
                <div>{name}</div>
                <div style={{fontSize: "0.8em", textEmphasis: "italic"}}>{artist}</div>
                </div>

            
        </div>
    )
}

type ExampleTracks ={
    [K in KnownKey]: IExampleTrack[]
}

const option_examples: ExampleTracks = {
    acousticness: [
        {
            value: 0.000152,
            artist: "The Killers",
            name: "When You Were Young",
            img: "https://i.scdn.co/image/ab67616d000048514f87f14089217e3f70a5f39e"
        },
        {
            value: 0.193,
            artist: "Foreigner",
            name: "I Want to Know What Love Is",
            img: "https://i.scdn.co/image/ab67616d000048513e030a7e606959674643d274"
        },
        {
            value: 0.313,
            artist: "Tracy Chapman",
            name: "Fast Car",
            img: "https://i.scdn.co/image/ab67616d0000485190b8a540137ee2a718a369f9"
        },
        // {
        //     value: 0.352,
        //     artist: "The Mamas & The Papas",
        //     name: "California Dreamin'",
        //     img: "https://i.scdn.co/image/ab67616d0000485108181b9f840a06e7a071cf72"
        // },
        {
            value: 0.432,
            artist: "Elton John",
            name: "Rocketman",
            img: "https://i.scdn.co/image/ab67616d000048513009007708ab5134936a58b3"
        },
        {
            value: 0.599,
            artist: "Coldplay",
            name: "Clocks",
            img: "https://i.scdn.co/image/ab67616d00004851de09e02aa7febf30b7c02d82"
        },
        {
            value: 0.713,
            artist: "Queen",
            name: "Crazy Little Thing Called Love",
            img: "https://i.scdn.co/image/ab67616d00004851056e90910cbaf5c5b892aeba"
        },
        {
            value: 0.771,
            artist: "Louis Armstrong",
            name: "What a Wonderful World",
            img: "https://i.scdn.co/image/ab67616d000048510371f583fcf418ee6ff11184"
        },
        {
            value: 0.922,
            artist: "John Legend",
            name: "All of Me",
            img: "https://i.scdn.co/image/ab67616d0000485194c9217a398f5174757c0c78"
        }
    ],
    danceability: [
        {
            value: 0.168,
            artist: "Etta James",
            name: "At Last",
            img: "https://i.scdn.co/image/ab67616d00004851d97bf715a906411fe4709fff",
        },
        {
            value: 0.315,
            artist: "Goo Goo Dolls",
            name: "Iris",
            img: "https://i.scdn.co/image/ab67616d00004851eda9478c39a21e1cdc6609ca",
        },
        {
            value: 0.422,
            artist: "John Legend",
            name: "All of Me",
            img: "https://i.scdn.co/image/ab67616d0000485194c9217a398f5174757c0c78"
        },
        {
            value: 0.557,
            artist: "Coldplay",
            name: "The Scientist",
            img: "https://i.scdn.co/image/ab67616d00004851de09e02aa7febf30b7c02d82"
        },
        {
            value: 0.674,
            artist: "Blur",
            name: "Song 2",
            img: "https://i.scdn.co/image/ab67616d00004851de114203356c1f7b136960b6"
        },
        {
            value: 0.785,
            artist: "Cupid",
            name: "Cupid Shuffle",
            img: "https://i.scdn.co/image/ab67616d00004851d785fa246cca092598fe3c3b"
        },
        {
            value: 0.874,
            artist: "Bruno Mars",
            name: "Treasure",
            img: "https://i.scdn.co/image/ab67616d00004851926f43e7cce571e62720fd46"
        },
        {
            value: 0.933,
            artist: "Queen",
            name: "Another One Bites the Dust",
            img: "https://i.scdn.co/image/ab67616d00004851056e90910cbaf5c5b892aeba"
        }

    ],
    energy: [
        {
            value: 0.0549,
            artist: "Ed Sheeren",
            name: "I See Fire",
            img: "https://i.scdn.co/image/ab67616d0000485181ef6477bfe32dc55845ef27"
        },
        {
            value: 0.172,
            artist: "Adele",
            name: "To Make You Feel My Love",
            img: "https://i.scdn.co/image/ab67616d000048510a5d334a63fd4455ce83b38b"
        },
        {
            value: 0.292,
            artist: "Tracy Chapman",
            name: "Fast Car",
            img: "https://i.scdn.co/image/ab67616d0000485190b8a540137ee2a718a369f9"
        },
        {
            value: 0.381,
            artist: "Roberta Flack",
            name: "Killing Me Softly With His Song",
            img: "https://i.scdn.co/image/ab67616d000048517ff730d1580c27bc461d0ccf"
        },
        {
            value: 0.511,
            artist: "Corinne Bailey Rae",
            name: "Put Your Records On",
            img: "https://i.scdn.co/image/ab67616d000048511ec9b096319afbcc2dca6879"
        },
        {
            value: 0.61,
            artist: "Ray Charles",
            name: "I've Got a Woman",
            img: "https://i.scdn.co/image/ab67616d00004851f0e951707ca49b533fdbf64e"
        },
        {
            value: 0.705,
            artist: "OneRepublic",
            name: "Counting Stars",
            img: "https://i.scdn.co/image/ab67616d000048519e2f95ae77cf436017ada9cb"
        },
        {
            value: 0.787,
            artist: "One Direction",
            name: "What Makes You Beautiful",
            img: "https://i.scdn.co/image/ab67616d000048514a5584795dc73860653a9a3e"
        },
        {
            value: 0.868,
            artist: "Queen",
            name: "Don't Stop Me Now",
            img: "https://i.scdn.co/image/ab67616d000048517c39dd133836c2c1c87e34d6"
        },
        {
            value: 0.952,
            artist: "Bruce Springsteen",
            name: "Born in the U.S.A.",
            img: "https://i.scdn.co/image/ab67616d00004851a7865e686c36a4adda6c9978"
        },
        {
            value: 0.988,
            artist: "Green Day",
            name: "American Idiot",
            img: "https://i.scdn.co/image/ab67616d0000485108a1b1e0674086d3f1995e1b"
        }
    ],
    instrumentalness: [
        {
            value: 0.000194,
            artist: "Kendrick Lamar",
            name: "All the Stars",
            img: "https://i.scdn.co/image/ab67616d00004851c027ad28821777b00dcaa888"
        },
        {
            value: 0.086,
            artist: "Red Hot Chili Peppers",
            name: "Give it Away",
            img: "https://i.scdn.co/image/ab67616d00004851153d79816d853f2694b2cc70"
        },
        {
            value: 0.218,
            artist: "The Animals",
            name: "House of the Rising Sun",
            img: "https://i.scdn.co/image/ab67616d000048513c534611bd3658006378a2d7"
        },
        {
            value: 0.35,
            artist: "White Stripes",
            name: "Seven Nation Army",
            img: "https://i.scdn.co/image/ab67616d00004851f5ae4810a9529d7614e28e76"
        },
        {
            value: 0.537,
            artist: "Steppenwolf",
            name: "Born to Be Wild",
            img: "https://i.scdn.co/image/ab67616d00004851ec7e2c5c7ecd29301f1c4b93"
        },
        {
            value: 0.732,
            artist: "The Meters",
            name: "Cissy Strut",
            img: "https://i.scdn.co/image/ab67616d000048518d268dd59763553a5f89b67c"
        },
        {
            value: 0.801,
            artist: "Dire Straits",
            name: "Brothers in Arms",
            img: "https://i.scdn.co/image/ab67616d00004851995239a0e35a898037ec4b29"
        },
        {
            value: 0.949,
            artist: "Booker T. & the M.G.'s",
            name: "Green Onions",
            img: "https://i.scdn.co/image/ab67616d0000485146007ceff2f1c33c9b9ec19c"
        },
        // {
        //     value: 0.959,
        //     artist: "Eric Weissberg & Steve Mandell",
        //     name: "Dueling Banjos",
        //     img: "https://i.scdn.co/image/ab67616d00004851f0370c00d5a5336e181da900"
        // },
        // {
        //     value: 0.99,
        //     artist: "Bach",
        //     name: "The Well-Tempered Clavier",
        //     img: "https://i.scdn.co/image/ab67616d0000485186ff461ea3289dc3a537ac87"
        // }
    ],
    liveness: [
        {
            value: 0.099,
            artist: "Nickelback",
            name: "How You Remind Me",
            img: "https://i.scdn.co/image/ab67616d00004851699a422d25adc550dc5aa11c"
        },
        {
            value: 0.37,
            artist: "Miley Cyrus",
            name: "We Can't Stop",
            img: "https://i.scdn.co/image/ab67616d000048516b18d0490878750cd69abf2c"
        },
        {
            value: 0.776,
            artist: "Queen",
            name: "Don't Stop Me Now",
            img: "https://i.scdn.co/image/ab67616d000048517c39dd133836c2c1c87e34d6"
        },
        {
            value: 0.906,
            artist: "Dave Matthews & Tim Reynolds",
            name: "Satellite - Live at Luther College",
            img: "https://i.scdn.co/image/ab67616d000048510f6c06258a8af6ae2d759293"
        }
    ],
    loudness: [],
    speechiness: [
        {
            value: 0.0272,
            artist: "Percy Sledge",
            name: "When a Man Loves a Woman",
            img: "https://i.scdn.co/image/ab67616d000048510c8a01bf197adb9859044775"
        },
        // {
        //     value: 0.0737,
        //     artist: "One Direction",
        //     name: "What Makes You Beautiful",
        //     img: "https://i.scdn.co/image/ab67616d000048514a5584795dc73860653a9a3e"
        // },
        {
            value: 0.106,
            artist: "Alicia Keys",
            name: "If I Ain't Got You",
            img: "https://i.scdn.co/image/ab67616d0000485156ff19308ebeb48e2ba6094b"
        },
        {
            value: 0.269,
            artist: "Outkast",
            name: "Ms. Jackson",
            img: "https://i.scdn.co/image/ab67616d000048512350e31bc346a6c20e9de166"
        },
        {
            value: 0.342,
            artist: "Kanye West",
            name: "Gold Digger",
            img: "https://i.scdn.co/image/ab67616d000048514c7dd2b7fc516356e037bf68"
        },
        // {
        //     value: 0.463,
        //     artist: "5 Seconds of Summer",
        //     name: "Youngblood",
        //     img: "https://i.scdn.co/image/ab67616d0000485141aa6776dc15fbd71a2b4557"
        // },
        {
            value: 0.504,
            artist: "Lauryn Hill",
            name: "To Zion",
            img: "https://i.scdn.co/image/ab67616d000048519196fafd1d6160480d3df68a"
        }
    ],
    valence: [
        {
            value: 0.095,
            artist: "Adele",
            name: "To Make You Feel My Love",
            img: "https://i.scdn.co/image/ab67616d000048510a5d334a63fd4455ce83b38b"
        },
        {
            value: 0.191,
            artist: "Future",
            name: "Where Ya At",
            img: "https://i.scdn.co/image/ab67616d00004851b2592bea12d840fd096ef965"
        },
        {
            value: 0.338,
            artist: "Lynard Skynard",
            name: "Freebird",
            img: "https://i.scdn.co/image/ab67616d00004851128450651c9f0442780d8eb8"
        },
        {
            value: 0.433,
            artist: "Blink 182",
            name: "What's My Age Again?",
            img: "https://i.scdn.co/image/ab67616d0000485115a7914ef11f09b4c537f078"
        },
        {
            value: 0.532,
            artist: "Jimi Hendrix",
            name: "Hey Joe",
            img: "https://i.scdn.co/image/ab67616d00004851c9adfbd773852e286faed040"
        },
        {
            value: 0.675,
            artist: "Commodores",
            name: "Brick House",
            img: "https://i.scdn.co/image/ab67616d000048515aaa76dab105a79e14abb0ee"
        },
        {
            value: 0.814,
            artist: "Edgar Winter",
            name: "Free Ride",
            img: "https://i.scdn.co/image/ab67616d0000485109a01850dfed5fdc478151b3"
        },
        {
            value: 0.891,
            artist: "Spice Girls",
            name: "Wannabe",
            img: "https://i.scdn.co/image/ab67616d0000485163facc42e4a35eb3aa182b59"
        },
        // {
        //     value: 0.968,
        //     artist: "Jean Knight",
        //     name: "Mr. Bigstuff",
        //     img: "https://i.scdn.co/image/ab67616d00004851f8fa7de2c9d2502d77988cd2"
        // },
        {
            value: 0.98,
            artist: "Earth, Wind & Fire",
            name: "September",
            img: "https://i.scdn.co/image/ab67616d00004851af0d466d16c97b6385219d90"
        }


    ],
    duration_ms: [],
    key: [],
    mode: [],
    tempo: [],
    time_signature: [],
    popularity: [],
    
}



const option_settings: OptionSettings[] = [
    {range: [0.0, 1.0], step: 0.001, label: "Acousticness", description: "A confidence measure from 0.0 to 1.0 of whether the track is acoustic. 1.0 represents high confidence the track is acoustic.", key: "acousticness", value: [0.0, 1.0], target: true, emoji_scale: ["🎛️🎛️", "🎛️🎸", "🎸🎸", "🎸🎻", "🎻🎻"]},
    {range: [0.0, 1.0], step: 0.001, label: "Danceability", description: "Danceability describes how suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity. A value of 0.0 is least danceable and 1.0 is most danceable.", key: "danceability", value: [0.0, 1.0], target: true, emoji_scale: ["🧘‍♂️🧘‍♂️", "🧘‍♂️🚶‍♂️", "🚶‍♂️🚶‍♂️", "🚶‍♂️💃", "💃💃"]},
    {range: [0.0, 1.0], step: 0.001, label: "Energy", description: "Energy is a measure from 0.0 to 1.0 and represents a perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy.", key: "energy", value: [0.0, 1.0], target: true, emoji_scale: ["❄️❄️", "❄️❄️", "❄️🌿", "🌿🌿", "🌿🔥", "🔥🔥", "🔥🔥"]},
    {range: [0.0, 1.0], step: 0.001, label: "Instrumentalness", description: `Predicts whether a track contains no vocals. "Ooh" and "aah" sounds are treated as instrumental in this context. Rap or spoken word tracks are clearly "vocal". The closer the instrumentalness value is to 1.0, the greater likelihood the track contains no vocal content. Values above 0.5 are intended to represent instrumental tracks, but confidence is higher as the value approaches 1.0.`, key: "instrumentalness", value: [0.0, 1.0], target: true, emoji_scale: ["🎤🎤", "🎤🎹", "🎤🎹", "🎤🎹", "🎤🎹", "🎹🎹"]}, 
    {range: [0.0, 1.0], step: 0.001, label: "Liveness", description: `Detects the presence of an audience in the recording. Higher liveness values represent an increased probability that the track was performed live. A value above 0.8 provides strong likelihood that the track is live.`, key: "liveness", value: [0.0, 1.0], target: true, emoji_scale: ["🎧🎧", "🎧🎪", "🎧🎪", "🎪🎪"]},
    {range: [-60.0, 0.0], step: 0.001, label: "Loudness", description: `The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track and are useful for comparing relative loudness of tracks. Loudness is the quality of a sound that is the primary psychological correlate of physical strength (amplitude). Values typically range between -60 and 0 db.`, key: "loudness", value: [-60.0, 0.0], target: true},
    {range: [0.0, 1.0], step: 0.001, label: "Speechiness", description: `Speechiness detects the presence of spoken words in a track. The more exclusively speech-like the recording (e.g. talk show, audio book, poetry), the closer to 1.0 the attribute value. Values above 0.66 describe tracks that are probably made entirely of spoken words. Values between 0.33 and 0.66 describe tracks that may contain both music and speech, either in sections or layered, including such cases as rap music. Values below 0.33 most likely represent music and other non-speech-like tracks.`, key: "speechiness", value: [0.0, 1.0], target: true, emoji_scale: ["🎶🎶", "🎶🎶", "🎶🗣️", "🎶🗣️", "🗣️🗣️", "🗣️🗣️", "🗣️🗣️", "🗣️🗣️"]},
    {range: [0.0, 1.0], step: 0.001, label: "Valence", description: `A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry).`, key: "valence", value: [0.0, 1.0], target: true, emoji_scale: ['😩', '😟', '😐', '😊', '😄']},
    {range: [0.0, 100.0], step: 1, label: "Popularity", description: `The popularity of the track. The value will be between 0 and 100, with 100 being the most popular. The popularity of a track is a value between 0 and 100, with 100 being the most popular. The popularity is calculated by algorithm and is based, in the most part, on the total number of plays the track has had and how recent those plays are. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past. Duplicate tracks (e.g. the same track from a single and an album) are rated independently. Artist and album popularity is derived mathematically from track popularity. Note: the popularity value may lag actual popularity by a few days: the value is not updated in real time.`, key: "popularity", value: [0.0, 100.0], target: true, emoji_scale: ["🤷‍♂️🤷‍♂️", "🤷‍♂️🤷‍♂️", "🤷‍♂️🤷‍♂️", "🤷‍♂️⭐️", "⭐️⭐️", "⭐️🌟", "🌟🌟", "🌟🌟", "🌟🌟"]},

    {range: [0, 1800000], step: 1000, label: "Duration", description: `The duration of the track in milliseconds.`, key: "duration_ms", value: [0, 1800000], target: true},
    {range: [-1, 11], step: 1, label: "Key", description: `The key the track is in. Integers map to pitches using standard Pitch Class notation.`, key: "key", value: [-1, 11], target: true},
    {range: [0, 1], step: 1, label: "Mode", description: `Mode indicates the modality (major or minor) of a track, the type of scale from which its melodic content is derived. Major is represented by 1 and minor is 0.`, key: "mode", value: [0, 1],  target: true},
    {range: [50, 220], step: 0.001, label: "Tempo", description: `The overall estimated tempo of a track in beats per minute (BPM). In musical terminology, tempo is the speed or pace of a given piece and derives directly from the average beat duration.`, key: "tempo", value: [50, 220], target: true},
    {range: [3, 7], step: 1, label: "Time Signature", description: `The key the track is in. Integers map to pitches using standard Pitch Class notation.`, key: "time_signature", value: [3, 7], target: true},
]



export const OptionsSliders = ({ignore = [], setFilters, popular_tracks, setFilterEmoji}: {ignore?: KnownKey[], setFilters: Dispatch<SetStateAction<RecommendationsRequest>>, setFilterEmoji: Dispatch<SetStateAction<string>>, popular_tracks: IExampleTrack[]}) => {
    // const [filters, setFilters] = useState<RecommendationsRequest>({limit: 100} as RecommendationsRequest)
    const [options, setOptions] = useState<OptionSettings[]>(option_settings)
    const [activeOption, setActiveOption] = useState<OptionSettings | null>(null)
    const [marks, setMarks] = useState<Mark[]>([])

    useEffect(()=>{

        if(!activeOption){
            setActiveOption(options[0])
        }

        setFilters((cur) => {
            const emoji_list = []
            for (const option of options) {
                const target_key = `target_${option.key}` as TargetKey
                const min_key = `min_${option.key}` as MinKey
                const max_key = `max_${option.key}` as MaxKey

                cur[target_key] = undefined
                cur[min_key] = undefined
                cur[max_key] = undefined

                if (option.range[0] !== option.value?.[0] || option.range[1] !== option.value?.[1]) {

                    if (option.value?.[0] == option.value?.[1] && !option.exact) {
                        
                        cur[target_key] = option.value?.[0]
                        emoji_list.push(displayOption(option, option.value?.[0] as number))
                    } else {
                        cur[min_key] = option.value?.[0]
                        cur[max_key] = option.value?.[1]
                        if(option.value?.[0] == option.value?.[1]) {
                            emoji_list.push(displayOption(option, option.value?.[0] as number))
                        } else {
                            emoji_list.push(displayOption(option, option.value?.[0] as number) + "↔️" + displayOption(option, option.value?.[1] as number))
                        }
                    }
                }
            }

            setFilterEmoji(emoji_list.join(" + "))
            return {...cur}
        })

    }, [options])

    useEffect(() => {
        let marks: Mark[] = []
        if(activeOption){
            if(option_examples[activeOption.key].length > 0) {
                    marks = option_examples[activeOption.key].map((example) => ({value: example.value, label: <ExampleTrack artist={example.artist} name={example.name} img={example.img} value={example.value} />}))
                } else if (activeOption.key == "key") {
                    marks = Array.from({length: 12}, (_, i) => ({value: i, label: keyString(i, 1)}))
                } else if (activeOption.key == "time_signature") {
                    marks = Array.from({length: 5}, (_, i) => ({value: i+3, label: `${i+3}/4`}))
                } else if (activeOption.key == "duration_ms") {
                    marks = [1, 2, 3, 5, 10, 15, 30].map((m) => ({value: m * 60_000, label: `${msToMinutes(m * 60_000)}m`}))
                }

        }
        setMarks(marks)
                
    }, [activeOption, option_examples.popularity])

    useEffect(()=> {
        console.log("popular_tracks", popular_tracks)
        if(popular_tracks.length > 0) {
            option_examples["popularity"] = popular_tracks
        }
    }, [popular_tracks])



    return (
        <div>
            
            {activeOption && (
                    <FormControl
                    orientation="horizontal"
                    sx={{ width: "100%", justifyContent: 'space-between', marginBottom: "40px" }}
                    key={`${activeOption.key}_${activeOption.value?.[0]}_${activeOption.value?.[1]}`}
                  >
                    <div style={{width: 200, display: "flex", flexDirection: "column"}}>
                    <Select onChange={(e, v) => setActiveOption(v as OptionSettings)} value={activeOption}>
                    {options.filter((option) => !ignore.includes(option.key)).map((option) => {
                        return <Option
                        key={option.key}
                        value={option}
                        >
                            {[...displayOption(option, option?.range?.[0] || 0)].slice(0,1)}{[...displayOption(option, option?.range?.[1] || 1)].slice(0,1)} {option.label}
                        </Option>
                    })}
                    </Select>
                      <FormHelperText sx={{ mt: 0 }}>{activeOption.description}</FormHelperText>
                      <Switch
                      
                        checked={activeOption.target}
                        onChange={(e) => setOptions((cur)=>{
                            const updateOption = cur.find((c) => c.key === activeOption.key)
                            
                            if (updateOption) {
                                updateOption.target = e.target.checked
                                    if(!updateOption.target) {
                                        const low_distance = updateOption.value?.[0] || updateOption.range[0] - updateOption.range[0]
                                        const high_distance = updateOption.range[1] - (updateOption.value?.[1] || updateOption.range[1])
                                        const min_distance = Math.min(low_distance, high_distance)
                                        updateOption.value = [Math.max((updateOption.value?.[0] || updateOption.range[0]) - min_distance, updateOption.range[0]),  Math.min((updateOption.value?.[1] || updateOption.range[1]) + min_distance, updateOption.range[1])]
                                    } else {
                                        updateOption.value = [((updateOption.value?.[0] || updateOption.range[0]) + (updateOption.value?.[1] || updateOption.range[1])) / 2, ((updateOption.value?.[0] || updateOption.range[0]) + (updateOption.value?.[1] || updateOption.range[1])) / 2]
                                    }
                                
                            }
                            return [...cur]
                        })}
                        color="primary"
                        slotProps={{
                            track: {
                              children: (
                                <Fragment>{activeOption.target ? (
                                    <Typography component="span" level="inherit" sx={{ ml: '15px' }}>
                                    Target
                                  </Typography>
                                ) : (
                                     <Typography component="span" level="inherit" sx={{ ml: '40px' }}>
                                    Min/Max
                                  </Typography>
                                ) }
                                  
                                 
                                </Fragment>
                              ),
                            },
                          }}
                          sx={{
                            width: "100%",
                            '--Switch-thumbSize': '27px',
                            '--Switch-trackWidth': '110px',
                            '--Switch-trackHeight': '31px',
                          }}
                        />
                        
                        <Switch
                      disabled={!activeOption.target}
                      checked={!activeOption.target || activeOption.exact}
                      onChange={(e) => setOptions((cur)=>{
                          const updateOption = cur.find((c) => c.key === activeOption.key)
                          
                          if (updateOption) {
                              updateOption.exact = e.target.checked
                          }
                          return [...cur]
                      })}
                      
                      slotProps={{
                          track: {
                            children: (
                              <Fragment>{(!activeOption.target || activeOption.exact) ? (
                                  <Typography component="span" level="inherit" sx={{ ml: '15px' }}>
                                  Exact
                                </Typography>
                              ) : (
                                   <Typography component="span" level="inherit" sx={{ ml: '40px' }}>
                                  Approx
                                </Typography>
                              ) }
                                
                               
                              </Fragment>
                            ),
                          },
                        }}
                        sx={{
                          width: "100%",
                          '--Switch-thumbSize': '27px',
                          '--Switch-trackWidth': '110px',
                          '--Switch-trackHeight': '31px',
                        }}
                      />
                    
                      <Button onClick={(e) => setOptions((cur)=>{
                        const updateOption = cur.find((c) => c.key === activeOption.key)
                        
                        if (updateOption) {
                            updateOption.value = updateOption.range
                        }
                        return [...cur]
                    })}>Reset</Button>
                    </div>
                    <RangeSlider option={activeOption} value={activeOption.value} onChange={(e) => setOptions((cur)=>{
                        const updateOption = cur.find((c) => c.key === activeOption.key)
                        
                        if (updateOption) {
                            updateOption.value = e as [number, number]
                        }
                        return [...cur]
                    })} marks={marks}  />
                  </FormControl>
            )}
               
        </div>
    )
}

