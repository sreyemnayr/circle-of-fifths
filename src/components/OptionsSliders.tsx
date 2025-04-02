"use client";
import * as React from "react";
import Box from "@mui/joy/Box";
import Slider from "@mui/joy/Slider";
import FormControl from "@mui/joy/FormControl";

import FormHelperText from "@mui/joy/FormHelperText";
import { Mark } from "@mui/base/useSlider";

import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  Fragment,
  useCallback,
  useMemo,
} from "react";
import { RecommendationsRequest } from "@spotify/web-api-ts-sdk";
import { keyString } from "@/util/keys";
import Select from "@mui/joy/Select";
import Option from "@mui/joy/Option";
import Button from "@mui/joy/Button";
import Switch from "@mui/joy/Switch";
import Typography from "@mui/joy/Typography";

import { msToTime, msToMinutes } from "@/util/time";

export const RangeSlider = ({
  option,
  value = [0.0, 1.0],
  onChange,
  marks,
}: {
  option: OptionSettings;
  value?: [number, number];
  onChange: (value: number[]) => void;
  marks?: Mark[];
}) => {
  const [displayValue, setDisplayValue] = useState<[number, number]>(value);

  // Map a value from the actual range to the normalized [0,1] range considering quartiles
  const mapToNormalizedRange = useCallback(
    (val: number): number => {
      const min = option.range[0] ?? 0;
      const max = option.range[1] ?? 1;
      const [q1, q2, q3] = option.quartiles || [
        min + (max - min) * 0.25,
        min + (max - min) * 0.5,
        min + (max - min) * 0.75,
      ];

      // Handle edge cases
      if (val <= min) return 0;
      if (val >= max) return 1;

      // Determine which segment the value falls into
      if (val <= q1) {
        return ((val - min) / (q1 - min)) * 0.25;
      } else if (val <= q2) {
        return 0.25 + ((val - q1) / (q2 - q1)) * 0.25;
      } else if (val <= q3) {
        return 0.5 + ((val - q2) / (q3 - q2)) * 0.25;
      } else {
        return 0.75 + ((val - q3) / (max - q3)) * 0.25;
      }
    },
    [option.range, option.quartiles]
  );

  // Map a value from the normalized [0,1] range back to the actual range considering quartiles
  const mapFromNormalizedRange = useCallback(
    (normalized: number): number => {
      const min = option.range[0] ?? 0;
      const max = option.range[1] ?? 1;
      const [q1, q2, q3] = option.quartiles || [
        min + (max - min) * 0.25,
        min + (max - min) * 0.5,
        min + (max - min) * 0.75,
      ];

      // Handle edge cases
      if (normalized <= 0) return min;
      if (normalized >= 1) return max;

      // Determine which segment the normalized value falls into
      if (normalized <= 0.25) {
        return min + (normalized / 0.25) * (q1 - min);
      } else if (normalized <= 0.5) {
        return q1 + ((normalized - 0.25) / 0.25) * (q2 - q1);
      } else if (normalized <= 0.75) {
        return q2 + ((normalized - 0.5) / 0.25) * (q3 - q2);
      } else {
        return q3 + ((normalized - 0.75) / 0.25) * (max - q3);
      }
    },
    [option.range, option.quartiles]
  );

  // Transform marks to use normalized values
  const normalizedMarks = useMemo(() => {
    if (!marks) return undefined;
    return marks.map((mark) => ({
      ...mark,
      key: `${option.key}-${mark.value}`,
      value:
        typeof mark.value === "number" ? mapToNormalizedRange(mark.value) : 0,
    }));
  }, [marks, mapToNormalizedRange, option.key]);

  const handleChange = (
    _event: React.SyntheticEvent | Event,
    newValue: number | number[]
  ) => {
    // Transform the normalized slider values back to actual values
    const transformedValue = Array.isArray(newValue)
      ? ([
          mapFromNormalizedRange(newValue[0] ?? 0),
          mapFromNormalizedRange(newValue[1] ?? 1),
        ] as [number, number])
      : ([
          mapFromNormalizedRange(newValue),
          mapFromNormalizedRange(newValue),
        ] as [number, number]);

    setDisplayValue(transformedValue);
    onChange(transformedValue);
  };

  // Transform display values to normalized range for the slider
  const normalizedDisplayValue = useMemo(() => {
    const val0 =
      typeof displayValue[0] === "number"
        ? displayValue[0]
        : option.range[0] ?? 0;
    const val1 =
      typeof displayValue[1] === "number"
        ? displayValue[1]
        : option.range[1] ?? 1;

    return option.target
      ? mapToNormalizedRange(val0)
      : ([mapToNormalizedRange(val0), mapToNormalizedRange(val1)] as [
          number,
          number
        ]);
  }, [displayValue, option.target, mapToNormalizedRange, option.range]);

  useEffect(() => {
    setDisplayValue(value as [number, number]);
  }, [option.target, option.exact, value]);

  const display = (value: number, _index: number) => {
    // Map the normalized value back to actual range for display
    const actualValue = mapFromNormalizedRange(value);
    return displayOption(option, actualValue) || "";
  };

  return (
    <Box sx={{ width: "100%", height: "500px", padding: "10px" }}>
      <Slider
        key={`slider-${option?.key}`}
        getAriaLabel={() => option.label}
        orientation={"vertical"}
        value={normalizedDisplayValue}
        onChange={(_e, newValue) => {
          const transformedValue = Array.isArray(newValue)
            ? ([
                mapFromNormalizedRange(newValue[0] ?? 0),
                mapFromNormalizedRange(newValue[1] ?? 1),
              ] as [number, number])
            : ([
                mapFromNormalizedRange(newValue),
                mapFromNormalizedRange(newValue),
              ] as [number, number]);
          setDisplayValue(
            option.target || option.exact
              ? [transformedValue[0], transformedValue[0]]
              : transformedValue
          );
        }}
        onChangeCommitted={handleChange}
        valueLabelDisplay="on"
        getAriaValueText={display}
        valueLabelFormat={display}
        step={0.001}
        min={0}
        max={1}
        marks={normalizedMarks}
        track={option.target ? false : "normal"}
      />
    </Box>
  );
};

const displayOption = (option: OptionSettings, value: number) => {
  if (option?.emoji_scale) {
    if (option.key == "popularity") {
      value = value / 100;
    }
    return option.emoji_scale[
      Math.min(
        Math.round(value * option.emoji_scale.length),
        option.emoji_scale.length - 1
      )
    ];
  }
  if (option.key == "loudness") {
    if (value == option.range[0]) {
      return "🔇" + value.toFixed(0) + "db";
    } else if (value > -20) {
      return "🔊" + value.toFixed(0) + "db";
    } else if (value > -40) {
      return "🔉" + value.toFixed(0) + "db";
    } else {
      return "🔈" + value.toFixed(0) + "db";
    }
  }
  if (option.key == "mode") {
    return ["minor", "major"][parseInt(value.toString())];
  }
  if (option.key == "tempo") {
    if (value == option.range[0]) {
      return "🚶" + value.toFixed(0) + "bpm";
    } else if (value == option.range[1]) {
      return "🏃" + value.toFixed(0) + "bpm";
    } else {
      return value.toFixed(0) + "bpm";
    }
  }
  if (option.key == "time_signature") {
    if (value == option.range[0]) {
      return "🎼" + value.toFixed(0) + "/4";
    } else if (value == option.range[1]) {
      return " " + value.toFixed(0) + "/4";
    } else {
      return value.toFixed(0) + "/4";
    }
  }
  if (option.key == "key") {
    return keyString(parseInt(value.toString()), 1);
  }
  if (option.key == "duration_ms") {
    if (value == option.range[0]) {
      return "⌛" + msToTime(value);
    } else if (value == option.range[1]) {
      return "⏳" + msToTime(value);
    } else {
      return msToTime(value);
    }
  }

  return value.toString() || "";
};

type KnownKey =
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
  | "time_signature"
  | "popularity";

type TargetKey = `target_${KnownKey}`;
type MinKey = `min_${KnownKey}`;
type MaxKey = `max_${KnownKey}`;

export interface OptionSettings {
  label: string;
  range: [number, number];
  quartiles?: [number, number, number] | null;
  qualitative: boolean;
  integer: boolean;
  step: number;
  description: string;
  key: KnownKey;
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
  value: number;
}

export const ExampleTrack = ({ artist, name, img, value }: IExampleTrack) => {
  return (
    <div
      style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
    >
      <div style={{ fontSize: "0.6em", marginRight: "10px" }}>{value}</div>
      <img src={img} style={{ height: "30px", marginRight: "10px" }} alt="" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div>{name}</div>
        <div style={{ fontSize: "0.8em", textEmphasis: "italic" }}>
          {artist}
        </div>
      </div>
    </div>
  );
};

type ExampleTracks = {
  [K in KnownKey]: IExampleTrack[];
};

export const option_examples: ExampleTracks = {
  acousticness: [
    {
      value: 0.000152,
      artist: "The Killers",
      name: "When You Were Young",
      img: "https://i.scdn.co/image/ab67616d000048514f87f14089217e3f70a5f39e",
    },
    {
      value: 0.193,
      artist: "Foreigner",
      name: "I Want to Know What Love Is",
      img: "https://i.scdn.co/image/ab67616d000048513e030a7e606959674643d274",
    },
    {
      value: 0.313,
      artist: "Tracy Chapman",
      name: "Fast Car",
      img: "https://i.scdn.co/image/ab67616d0000485190b8a540137ee2a718a369f9",
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
      img: "https://i.scdn.co/image/ab67616d000048513009007708ab5134936a58b3",
    },
    {
      value: 0.599,
      artist: "Coldplay",
      name: "Clocks",
      img: "https://i.scdn.co/image/ab67616d00004851de09e02aa7febf30b7c02d82",
    },
    {
      value: 0.713,
      artist: "Queen",
      name: "Crazy Little Thing Called Love",
      img: "https://i.scdn.co/image/ab67616d00004851056e90910cbaf5c5b892aeba",
    },
    {
      value: 0.771,
      artist: "Louis Armstrong",
      name: "What a Wonderful World",
      img: "https://i.scdn.co/image/ab67616d000048510371f583fcf418ee6ff11184",
    },
    {
      value: 0.922,
      artist: "John Legend",
      name: "All of Me",
      img: "https://i.scdn.co/image/ab67616d0000485194c9217a398f5174757c0c78",
    },
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
      img: "https://i.scdn.co/image/ab67616d0000485194c9217a398f5174757c0c78",
    },
    {
      value: 0.557,
      artist: "Coldplay",
      name: "The Scientist",
      img: "https://i.scdn.co/image/ab67616d00004851de09e02aa7febf30b7c02d82",
    },
    {
      value: 0.674,
      artist: "Blur",
      name: "Song 2",
      img: "https://i.scdn.co/image/ab67616d00004851de114203356c1f7b136960b6",
    },
    {
      value: 0.785,
      artist: "Cupid",
      name: "Cupid Shuffle",
      img: "https://i.scdn.co/image/ab67616d00004851d785fa246cca092598fe3c3b",
    },
    {
      value: 0.874,
      artist: "Bruno Mars",
      name: "Treasure",
      img: "https://i.scdn.co/image/ab67616d00004851926f43e7cce571e62720fd46",
    },
    {
      value: 0.933,
      artist: "Queen",
      name: "Another One Bites the Dust",
      img: "https://i.scdn.co/image/ab67616d00004851056e90910cbaf5c5b892aeba",
    },
  ],
  energy: [
    {
      value: 0.0549,
      artist: "Ed Sheeren",
      name: "I See Fire",
      img: "https://i.scdn.co/image/ab67616d0000485181ef6477bfe32dc55845ef27",
    },
    {
      value: 0.172,
      artist: "Adele",
      name: "To Make You Feel My Love",
      img: "https://i.scdn.co/image/ab67616d000048510a5d334a63fd4455ce83b38b",
    },
    {
      value: 0.292,
      artist: "Tracy Chapman",
      name: "Fast Car",
      img: "https://i.scdn.co/image/ab67616d0000485190b8a540137ee2a718a369f9",
    },
    {
      value: 0.381,
      artist: "Roberta Flack",
      name: "Killing Me Softly With His Song",
      img: "https://i.scdn.co/image/ab67616d000048517ff730d1580c27bc461d0ccf",
    },
    {
      value: 0.511,
      artist: "Corinne Bailey Rae",
      name: "Put Your Records On",
      img: "https://i.scdn.co/image/ab67616d000048511ec9b096319afbcc2dca6879",
    },
    {
      value: 0.61,
      artist: "Ray Charles",
      name: "I've Got a Woman",
      img: "https://i.scdn.co/image/ab67616d00004851f0e951707ca49b533fdbf64e",
    },
    {
      value: 0.705,
      artist: "OneRepublic",
      name: "Counting Stars",
      img: "https://i.scdn.co/image/ab67616d000048519e2f95ae77cf436017ada9cb",
    },
    {
      value: 0.787,
      artist: "One Direction",
      name: "What Makes You Beautiful",
      img: "https://i.scdn.co/image/ab67616d000048514a5584795dc73860653a9a3e",
    },
    {
      value: 0.868,
      artist: "Queen",
      name: "Don't Stop Me Now",
      img: "https://i.scdn.co/image/ab67616d000048517c39dd133836c2c1c87e34d6",
    },
    {
      value: 0.952,
      artist: "Bruce Springsteen",
      name: "Born in the U.S.A.",
      img: "https://i.scdn.co/image/ab67616d00004851a7865e686c36a4adda6c9978",
    },
    {
      value: 0.988,
      artist: "Green Day",
      name: "American Idiot",
      img: "https://i.scdn.co/image/ab67616d0000485108a1b1e0674086d3f1995e1b",
    },
  ],
  instrumentalness: [
    {
      value: 0.000194,
      artist: "Kendrick Lamar",
      name: "All the Stars",
      img: "https://i.scdn.co/image/ab67616d00004851c027ad28821777b00dcaa888",
    },
    {
      value: 0.086,
      artist: "Red Hot Chili Peppers",
      name: "Give it Away",
      img: "https://i.scdn.co/image/ab67616d00004851153d79816d853f2694b2cc70",
    },
    {
      value: 0.218,
      artist: "The Animals",
      name: "House of the Rising Sun",
      img: "https://i.scdn.co/image/ab67616d000048513c534611bd3658006378a2d7",
    },
    {
      value: 0.35,
      artist: "White Stripes",
      name: "Seven Nation Army",
      img: "https://i.scdn.co/image/ab67616d00004851f5ae4810a9529d7614e28e76",
    },
    {
      value: 0.537,
      artist: "Steppenwolf",
      name: "Born to Be Wild",
      img: "https://i.scdn.co/image/ab67616d00004851ec7e2c5c7ecd29301f1c4b93",
    },
    {
      value: 0.732,
      artist: "The Meters",
      name: "Cissy Strut",
      img: "https://i.scdn.co/image/ab67616d000048518d268dd59763553a5f89b67c",
    },
    {
      value: 0.801,
      artist: "Dire Straits",
      name: "Brothers in Arms",
      img: "https://i.scdn.co/image/ab67616d00004851995239a0e35a898037ec4b29",
    },
    {
      value: 0.949,
      artist: "Booker T. & the M.G.'s",
      name: "Green Onions",
      img: "https://i.scdn.co/image/ab67616d0000485146007ceff2f1c33c9b9ec19c",
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
      img: "https://i.scdn.co/image/ab67616d00004851699a422d25adc550dc5aa11c",
    },
    {
      value: 0.37,
      artist: "Miley Cyrus",
      name: "We Can't Stop",
      img: "https://i.scdn.co/image/ab67616d000048516b18d0490878750cd69abf2c",
    },
    {
      value: 0.776,
      artist: "Queen",
      name: "Don't Stop Me Now",
      img: "https://i.scdn.co/image/ab67616d000048517c39dd133836c2c1c87e34d6",
    },
    {
      value: 0.906,
      artist: "Dave Matthews & Tim Reynolds",
      name: "Satellite - Live at Luther College",
      img: "https://i.scdn.co/image/ab67616d000048510f6c06258a8af6ae2d759293",
    },
  ],
  loudness: [],
  speechiness: [
    {
      value: 0.0272,
      artist: "Percy Sledge",
      name: "When a Man Loves a Woman",
      img: "https://i.scdn.co/image/ab67616d000048510c8a01bf197adb9859044775",
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
      img: "https://i.scdn.co/image/ab67616d0000485156ff19308ebeb48e2ba6094b",
    },
    {
      value: 0.269,
      artist: "Outkast",
      name: "Ms. Jackson",
      img: "https://i.scdn.co/image/ab67616d000048512350e31bc346a6c20e9de166",
    },
    {
      value: 0.342,
      artist: "Kanye West",
      name: "Gold Digger",
      img: "https://i.scdn.co/image/ab67616d000048514c7dd2b7fc516356e037bf68",
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
      img: "https://i.scdn.co/image/ab67616d000048519196fafd1d6160480d3df68a",
    },
  ],
  valence: [
    {
      value: 0.095,
      artist: "Adele",
      name: "To Make You Feel My Love",
      img: "https://i.scdn.co/image/ab67616d000048510a5d334a63fd4455ce83b38b",
    },
    {
      value: 0.191,
      artist: "Future",
      name: "Where Ya At",
      img: "https://i.scdn.co/image/ab67616d00004851b2592bea12d840fd096ef965",
    },
    {
      value: 0.338,
      artist: "Lynard Skynard",
      name: "Freebird",
      img: "https://i.scdn.co/image/ab67616d00004851128450651c9f0442780d8eb8",
    },
    {
      value: 0.433,
      artist: "Blink 182",
      name: "What's My Age Again?",
      img: "https://i.scdn.co/image/ab67616d0000485115a7914ef11f09b4c537f078",
    },
    {
      value: 0.532,
      artist: "Jimi Hendrix",
      name: "Hey Joe",
      img: "https://i.scdn.co/image/ab67616d00004851c9adfbd773852e286faed040",
    },
    {
      value: 0.675,
      artist: "Commodores",
      name: "Brick House",
      img: "https://i.scdn.co/image/ab67616d000048515aaa76dab105a79e14abb0ee",
    },
    {
      value: 0.814,
      artist: "Edgar Winter",
      name: "Free Ride",
      img: "https://i.scdn.co/image/ab67616d0000485109a01850dfed5fdc478151b3",
    },
    {
      value: 0.891,
      artist: "Spice Girls",
      name: "Wannabe",
      img: "https://i.scdn.co/image/ab67616d0000485163facc42e4a35eb3aa182b59",
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
      img: "https://i.scdn.co/image/ab67616d00004851af0d466d16c97b6385219d90",
    },
  ],
  duration_ms: [],
  key: [],
  mode: [],
  tempo: [],
  time_signature: [],
  popularity: [],
};

/*
The dataset has 114000 rows and 21 columns
          Unnamed: 0     popularity   duration_ms   danceability  \
count  114000.000000  114000.000000  1.140000e+05  114000.000000   
mean    56999.500000      33.238535  2.280292e+05       0.566800   
std     32909.109681      22.305078  1.072977e+05       0.173542   
min         0.000000       0.000000  0.000000e+00       0.000000   
25%     28499.750000      17.000000  174066.000000       0.456000   
50%     56999.500000      35.000000  212906.000000       0.580000   
75%     85499.250000      50.000000  261506.000000       0.695000   
max    113999.000000     100.000000  5237295.000000       0.985000   

              energy            key       loudness           mode  \
count  114000.000000  114000.000000  114000.000000  114000.000000   
mean        0.641383       5.309140      -8.258960       0.637553   
std         0.251529       3.559987       5.029337       0.480709   
min         0.000000       0.000000     -49.531000       0.000000   
25%         0.472000       2.000000     -10.013000       0.000000   
50%         0.685000       5.000000      -7.004000       1.000000   
75%         0.854000       8.000000      -5.003000       1.000000   
max         1.000000      11.000000       4.532000       1.000000   

         speechiness   acousticness  instrumentalness       liveness  \
count  114000.000000  114000.000000     114000.000000  114000.000000   
mean        0.084652       0.314910          0.156050       0.213553   
std         0.105732       0.332523          0.309555       0.190378   
min         0.000000       0.000000          0.000000       0.000000   
25%         0.035900       0.016900          0.000000       0.098000   
50%         0.048900       0.169000          0.000042       0.132000   
75%         0.084500       0.598000          0.049000       0.273000   
max         0.965000       0.996000          1.000000       1.000000   

             valence          tempo  time_signature  
count  114000.000000  114000.000000   114000.000000  
mean        0.474068     122.147837        3.904035  
std         0.259261      29.978197        0.432621  
min         0.000000       0.000000        0.000000  
25%         0.260000      99.218750        4.000000  
50%         0.464000     122.017000        4.000000  
75%         0.683000     140.071000        4.000000  
max         0.995000     243.372000        5.000000  
*/

export const option_settings: OptionSettings[] = [
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Acousticness",
    integer: false,
    // quartiles: [0.0169, 0.169, 0.598],
    qualitative: false,
    description:
      "A confidence measure from 0.0 to 1.0 of whether the track is acoustic. 1.0 represents high confidence the track is acoustic. Acousticness seems to be largely a function of the date of release (mostly above 0.8 prior to 1950, then a steady decline until 1980, after which the average is below 0.3) and inversely correlated to loudness.",
    key: "acousticness",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["🎛️🎛️", "🎛️🎸", "🎸🎸", "🎸🎻", "🎻🎻"],
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Danceability",
    integer: false,
    quartiles: [0.456, 0.58, 0.695],
    qualitative: true,
    description:
      "Danceability describes how suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity. A value of 0.0 is least danceable and 1.0 is most danceable.",
    key: "danceability",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["🧘‍♂️🧘‍♂️", "🧘‍♂️🚶‍♂️", "🚶‍♂️🚶‍♂️", "🚶‍♂️💃", "💃💃"],
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Energy",
    integer: false,
    quartiles: [0.472, 0.685, 0.854],
    qualitative: true,
    description:
      "Energy is a measure from 0.0 to 1.0 and represents a perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy.",
    key: "energy",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["❄️❄️", "❄️❄️", "❄️🌿", "🌿🌿", "🌿🔥", "🔥🔥", "🔥🔥"],
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Instrumentalness",
    integer: false,
    // quartiles: [0.0, 0.000042, 0.049],
    qualitative: false,
    description: `Predicts whether a track contains no vocals (not a measure of how instrumental a song is). "Ooh" and "aah" sounds are treated as instrumental in this context. Rap or spoken word tracks are clearly "vocal". The closer the instrumentalness value is to 1.0, the greater likelihood the track contains no vocal content. Values above 0.5 are intended to represent instrumental tracks, but confidence is higher as the value approaches 1.0.`,
    key: "instrumentalness",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["🎤🎤", "🎤🎹", "🎤🎹", "🎤🎹", "🎤🎹", "🎹🎹"],
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Liveness",
    integer: false,
    // quartiles: [0.098, 0.132, 0.273],
    qualitative: false,
    description: `Detects the presence of an audience in the recording. Higher liveness values represent an increased probability that the track was performed live. A value above 0.8 provides strong likelihood that the track is live.`,
    key: "liveness",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["🎧🎧", "🎧🎪", "🎧🎪", "🎪🎪"],
  },
  {
    range: [-60.0, 0.0],
    step: 0.001,
    label: "Loudness",
    integer: false,
    quartiles: [-10.013, -7.004, -5.003],
    qualitative: true,
    description: `The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track and are useful for comparing relative loudness of tracks. Loudness is the quality of a sound that is the primary psychological correlate of physical strength (amplitude). Values typically range between -60 and 0 db.`,
    key: "loudness",
    value: [-60.0, 0.0],
    target: true,
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Speechiness",
    integer: false,
    quartiles: [0.0359, 0.0489, 0.0845],
    qualitative: true,
    description: `Speechiness detects the presence of spoken words in a track. The more exclusively speech-like the recording (e.g. talk show, audio book, poetry), the closer to 1.0 the attribute value. Values above 0.66 describe tracks that are probably made entirely of spoken words. Values between 0.33 and 0.66 describe tracks that may contain both music and speech, either in sections or layered, including such cases as rap music. Values below 0.33 most likely represent music and other non-speech-like tracks.`,
    key: "speechiness",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: [
      "🎶🎶",
      "🎶🎶",
      "🎶🗣️",
      "🎶🗣️",
      "🗣️🗣️",
      "🗣️🗣️",
      "🗣️🗣️",
      "🗣️🗣️",
    ],
  },
  {
    range: [0.0, 1.0],
    step: 0.001,
    label: "Valence",
    integer: false,
    quartiles: [0.26, 0.464, 0.683],
    qualitative: true,
    description: `A measure from 0.0 to 1.0 describing the musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry).`,
    key: "valence",
    value: [0.0, 1.0],
    target: true,
    emoji_scale: ["😩", "😟", "😐", "😊", "😄"],
  },
  {
    range: [0.0, 100.0],
    step: 1,
    label: "Popularity",
    integer: true,
    quartiles: [17.0, 35.0, 50.0],
    qualitative: true,
    description: `The popularity of the track. The value will be between 0 and 100, with 100 being the most popular. The popularity of a track is a value between 0 and 100, with 100 being the most popular. The popularity is calculated by algorithm and is based, in the most part, on the total number of plays the track has had and how recent those plays are. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past. Duplicate tracks (e.g. the same track from a single and an album) are rated independently. Artist and album popularity is derived mathematically from track popularity. Note: the popularity value may lag actual popularity by a few days: the value is not updated in real time.`,
    key: "popularity",
    value: [0.0, 100.0],
    target: true,
    emoji_scale: [
      "🤷‍♂️🤷‍♂️",
      "🤷‍♂️🤷‍♂️",
      "🤷‍♂️🤷‍♂️",
      "🤷‍♂️⭐️",
      "⭐️⭐️",
      "⭐️🌟",
      "🌟🌟",
      "🌟🌟",
      "🌟🌟",
    ],
  },

  {
    range: [0, 1800000],
    step: 1000,
    label: "Duration",
    integer: true,
    quartiles: [174066.0, 212906.0, 261506.0],
    qualitative: false,
    description: `The duration of the track in milliseconds.`,
    key: "duration_ms",
    value: [0, 1800000],
    target: true,
  },
  {
    range: [-1, 11],
    step: 1,
    label: "Key",
    integer: true,
    // quartiles: [2.0, 5.0, 8.0],
    qualitative: false,
    description: `The key the track is in. Integers map to pitches using standard Pitch Class notation.`,
    key: "key",
    value: [-1, 11],
    target: true,
  },
  {
    range: [0, 1],
    step: 1,
    label: "Mode",
    integer: true,
    // quartiles: [0.000001, 0.499999, 0.999999],
    qualitative: false,
    description: `Mode indicates the modality (major or minor) of a track, the type of scale from which its melodic content is derived. Major is represented by 1 and minor is 0.`,
    key: "mode",
    value: [0, 1],
    target: true,
  },
  {
    range: [50, 220],
    step: 0.001,
    label: "Tempo",
    integer: false,
    quartiles: [99.21875, 122.017, 140.071],
    qualitative: true,
    description: `The overall estimated tempo of a track in beats per minute (BPM). In musical terminology, tempo is the speed or pace of a given piece and derives directly from the average beat duration.`,
    key: "tempo",
    value: [50, 220],
    target: true,
  },
  {
    range: [3, 7],
    step: 1,
    label: "Time Signature",
    integer: true,
    quartiles: [4.0, 5.0, 6.0],
    qualitative: false,
    description: `The number of beats in each measure of quarter notes.`,
    key: "time_signature",
    value: [3, 7],
    target: true,
  },
];

interface RecommendationsRequestPreset {
  name: string;
  emoji: string;
  description: string;
  filters: RecommendationsRequest;
}

const recommendationPresets: RecommendationsRequestPreset[] = [
  {
    name: "Sunny Stroll",
    emoji: "🌞🚶",
    description: "Light, upbeat tunes for a carefree walk in sunshine.",
    filters: {
      min_danceability: 0.4,
      max_danceability: 0.7,
      min_valence: 0.4,
      max_valence: 0.8,
    },
  },
  {
    name: "Rainy Day Mellow",
    emoji: "🌧️☕",
    description:
      "Low-key and introspective tracks for a cozy, rainy afternoon.",
    filters: {
      max_energy: 0.5,
      max_danceability: 0.5,
      max_valence: 0.5,
      min_loudness: -15.0, // not too quiet, not too loud
    },
  },
  {
    name: "Morning Boost",
    emoji: "🌅☕",
    description: "Feel-good energy to start your day off right.",
    filters: {
      min_energy: 0.6,
      min_valence: 0.5,
      min_tempo: 100,
      max_tempo: 140,
    },
  },
  {
    name: "Dance Floor Ready",
    emoji: "💃🕺",
    description: "High energy, high danceability for a party atmosphere.",
    filters: {
      min_danceability: 0.7,
      min_energy: 0.7,
      min_tempo: 110,
    },
  },
  {
    name: "Chill Beats",
    emoji: "❄️🎧",
    description: "Laid-back vibes for relaxing or focusing.",
    filters: {
      max_energy: 0.5,
      max_valence: 0.55,
      max_tempo: 110,
    },
  },
  {
    name: "Feel-Good Classics",
    emoji: "🌈✨",
    description: "Popular, positive tracks to keep the mood bright.",
    filters: {
      min_valence: 0.6,
      min_popularity: 50,
      max_loudness: -5.0, // not overly loud
    },
  },
  {
    name: "Late-Night Lounge",
    emoji: "🌙🍸",
    description: "Smooth, low-tempo tunes for winding down your evening.",
    filters: {
      max_energy: 0.4,
      max_tempo: 90,
      max_valence: 0.6,
    },
  },
  {
    name: "Workout Fuel",
    emoji: "🏋️🔥",
    description: "High-energy tracks to power you through that workout.",
    filters: {
      min_energy: 0.75,
      min_tempo: 120,
      min_valence: 0.4,
    },
  },
  {
    name: "Heartbreak Haven",
    emoji: "💔🕯️",
    description:
      "Moody, softer tunes for when you need that emotional release.",
    filters: {
      max_valence: 0.4,
      max_energy: 0.5,
      max_danceability: 0.5,
    },
  },
  {
    name: "Feel the Flow (Hip-Hop)",
    emoji: "🎤🗣️",
    description:
      "Speech-heavy tracks that ride the line between rap vocals and a solid musical groove.",
    filters: {
      min_speechiness: 0.3,
      max_speechiness: 0.66, // typical range for a blend of rap & music
      min_energy: 0.4,
    },
  },
  {
    name: "Sing-Along Hits",
    emoji: "🎶🎉",
    description: "Popular, energetic tracks to belt out loud with friends.",
    filters: {
      min_popularity: 60,
      min_valence: 0.5,
      min_energy: 0.6,
    },
  },
  {
    name: "Coffee Shop Acoustic",
    emoji: "☕🎸",
    description: "Gentle, moderately popular tunes with softer energy.",
    filters: {
      max_energy: 0.5,
      max_loudness: -5.0,
      min_popularity: 30,
      max_valence: 0.7,
    },
  },
  {
    name: "Festival Frenzy",
    emoji: "🎪🌟",
    description: "High-tempo crowd-pleasers with positive vibes.",
    filters: {
      min_tempo: 130,
      max_loudness: -3.0, // fairly loud
      min_valence: 0.6,
      min_danceability: 0.6,
    },
  },
  {
    name: "Sweet and Low",
    emoji: "🍯🕯️",
    description: "Quiet, gentle picks: minimal loudness and low tempo.",
    filters: {
      max_loudness: -10.0,
      max_tempo: 80,
      max_energy: 0.4,
    },
  },
  {
    name: "Road Trip Rock",
    emoji: "🚗🎸",
    description: "Feel-good energy at moderate tempo for the open road.",
    filters: {
      min_energy: 0.5,
      min_valence: 0.4,
      min_tempo: 100,
      max_tempo: 130,
    },
  },
  {
    name: "Hype Party",
    emoji: "🔥🎉",
    description: "Crank up the party with high popularity and loudness!",
    filters: {
      min_popularity: 70,
      min_loudness: -7.0, // not super quiet
      min_energy: 0.7,
    },
  },
  {
    name: "Sunday Soothe",
    emoji: "🌻😌",
    description: "Gentle, relaxing day-off vibes with a touch of positivity.",
    filters: {
      max_energy: 0.55,
      max_loudness: -8.0,
      min_valence: 0.4,
    },
  },
  {
    name: "Pump Up Jam",
    emoji: "⚡🔊",
    description: "When you need that maximum adrenaline rush.",
    filters: {
      min_energy: 0.8,
      min_loudness: -5.0,
      min_tempo: 130,
    },
  },
  {
    name: "Easy Breezy",
    emoji: "🌬️🛋️",
    description: "Lighter danceability, mid-range tempo, medium positivity.",
    filters: {
      max_danceability: 0.6,
      min_valence: 0.3,
      max_tempo: 120,
    },
  },
  {
    name: "Nightclub Nostalgia",
    emoji: "🌃💫",
    description:
      "Throwback party vibes with high danceability & decent loudness.",
    filters: {
      min_danceability: 0.65,
      min_popularity: 30,
      min_loudness: -10.0, // at least somewhat loud
    },
  },
];

export const OptionsSliders = ({
  ignore = [],
  setFilters,
  popular_tracks,
  loudness_tracks,
  tempo_tracks,
  setFilterEmoji,
}: {
  ignore?: KnownKey[];
  setFilters: Dispatch<SetStateAction<RecommendationsRequest>>;
  setFilterEmoji: Dispatch<SetStateAction<string>>;
  popular_tracks: IExampleTrack[];
  loudness_tracks: IExampleTrack[];
  tempo_tracks: IExampleTrack[];
}) => {
  // const [filters, setFilters] = useState<RecommendationsRequest>({limit: 100} as RecommendationsRequest)
  const [options, setOptions] = useState<OptionSettings[]>(option_settings);
  const [optionExamples, setOptionExamples] =
    useState<ExampleTracks>(option_examples);
  const [activeOption, setActiveOption] = useState<OptionSettings | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activePreset, setActivePreset] =
    useState<RecommendationsRequestPreset | null>(null);
  useEffect(() => {
    if (!activeOption) {
      setActiveOption(options[0] || null);
    }

    setFilters((cur) => {
      const emoji_list = [];
      for (const option of options) {
        const target_key = `target_${option.key}` as TargetKey;
        const min_key = `min_${option.key}` as MinKey;
        const max_key = `max_${option.key}` as MaxKey;

        cur[target_key] = undefined;
        cur[min_key] = undefined;
        cur[max_key] = undefined;

        if (
          option.range[0] !== option.value?.[0] ||
          option.range[1] !== option.value?.[1]
        ) {
          if (option.value?.[0] == option.value?.[1] && !option.exact) {
            cur[target_key] = option.integer
              ? Math.round(option.value?.[0] as number)
              : option.value?.[0];
            emoji_list.push(displayOption(option, option.value?.[0] as number));
          } else {
            cur[min_key] = option.integer
              ? Math.round(option.value?.[0] as number)
              : option.value?.[0];
            cur[max_key] = option.integer
              ? Math.round(option.value?.[1] as number)
              : option.value?.[1];
            if (option.value?.[0] == option.value?.[1]) {
              emoji_list.push(
                displayOption(option, option.value?.[0] as number)
              );
            } else {
              emoji_list.push(
                displayOption(option, option.value?.[0] as number) +
                  "↔️" +
                  displayOption(option, option.value?.[1] as number)
              );
            }
          }
        }
      }

      if (activePreset) {
        setFilterEmoji(activePreset.emoji);
      } else {
        setFilterEmoji(emoji_list.join(" + "));
      }
      return { ...cur };
    });
  }, [JSON.stringify(options)]);

  useEffect(() => {
    // Use setTimeout to ensure the clear happens before setting new marks

    let newMarks: Mark[] = [];
    if (activeOption) {
      if (optionExamples[activeOption.key].length > 0) {
        newMarks = optionExamples[activeOption.key].map((example) => ({
          key: `${activeOption.key}-${example.name}`,
          value: example.value,
          label: (
            <ExampleTrack
              key={`${activeOption.key}-${example.name}`}
              artist={example.artist}
              name={example.name}
              img={example.img}
              value={example.value}
            />
          ),
        }));
      } else if (activeOption.key === "key") {
        newMarks = Array.from({ length: 12 }, (_, i) => ({
          key: `${activeOption.key}-${i}`,
          value: i,
          label: keyString(i, 1),
        }));
      } else if (activeOption.key === "time_signature") {
        newMarks = Array.from({ length: 5 }, (_, i) => ({
          key: `${activeOption.key}-${i + 3}`,
          value: i + 3,
          label: `${i + 3}/4`,
        }));
      } else if (activeOption.key === "duration_ms") {
        newMarks = [1, 2, 3, 5, 10, 15, 30].map((m) => ({
          key: `${activeOption.key}-${m}`,
          value: m * 60_000,
          label: `${msToMinutes(m * 60_000)}m`,
        }));
      }
      setMarks(newMarks);
    }
  }, [activeOption, JSON.stringify(optionExamples)]);

  useEffect(() => {
    console.log("marks", marks);
  }, [marks]);

  useEffect(() => {
    if (popular_tracks.length > 0) {
      setOptionExamples((cur) => ({
        ...cur,
        popularity: popular_tracks,
      }));
    }
  }, [popular_tracks]);

  useEffect(() => {
    if (loudness_tracks.length > 0) {
      setOptionExamples((cur) => ({
        ...cur,
        loudness: loudness_tracks,
      }));
    }
  }, [loudness_tracks]);

  useEffect(() => {
    if (tempo_tracks.length > 0) {
      setOptionExamples((cur) => ({
        ...cur,
        tempo: tempo_tracks,
      }));
    }
  }, [tempo_tracks]);

  return (
    <div>
      <div>Choose a preset</div>
      <FormControl>
        <Select
          value={activePreset}
          onChange={(_e, v) => {
            console.log("v", v);
            setActivePreset(v as RecommendationsRequestPreset);
            setOptions((cur) => {
              const preset = v?.filters as RecommendationsRequest;

              for (const option of cur) {
                const target_key = `target_${option.key}` as TargetKey;
                const min_key = `min_${option.key}` as MinKey;
                const max_key = `max_${option.key}` as MaxKey;

                if (
                  preset?.[target_key] ||
                  preset?.[min_key] ||
                  preset?.[max_key]
                ) {
                  if (preset?.[target_key]) {
                    option.target = true;
                    option.value = [
                      preset[target_key] || 0,
                      preset[target_key] || 0,
                    ];
                  } else {
                    option.target = false;
                  }

                  if (preset?.[min_key] && preset?.[max_key]) {
                    console.log(
                      option.key,
                      "BOTH",
                      preset[min_key],
                      preset[max_key]
                    );
                    option.value = [preset[min_key] || 0, preset[max_key] || 0];
                  } else if (preset?.[min_key]) {
                    console.log(
                      option.key,
                      "MIN",
                      preset[min_key],
                      option.range[1]
                    );
                    option.value = [preset[min_key] || 0, option.range[1]];
                  } else if (preset?.[max_key]) {
                    console.log(
                      option.key,
                      "MAX",
                      option.range[0],
                      preset[max_key]
                    );
                    option.value = [option.range[0], preset[max_key] || 0];
                  }
                } else {
                  option.target = true;
                  option.value = [option.range[0], option.range[1]];
                }
              }
              return cur;
            });
          }}
        >
          {recommendationPresets.map((preset) => (
            <Option key={preset.name} value={preset}>
              {preset.emoji} {preset.name} <em>{preset.description}</em>
            </Option>
          ))}
        </Select>
      </FormControl>

      {activeOption && (
        <FormControl
          orientation="horizontal"
          sx={{
            width: "100%",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
          key={`${activeOption.key}_${activeOption.value?.[0]}_${activeOption.value?.[1]}`}
        >
          <div style={{ width: 200, display: "flex", flexDirection: "column" }}>
            <Select
              onChange={(_e, v) => setActiveOption(v as OptionSettings)}
              value={activeOption}
            >
              {options
                .filter((option) => !ignore.includes(option.key))
                .toSorted(
                  (a, b) =>
                    Number(
                      b.range[0] !== b.value?.[0] || b.range[1] !== b.value?.[1]
                    ) -
                    Number(
                      a.range[0] !== a.value?.[0] || a.range[1] !== a.value?.[1]
                    )
                )
                .map((option) => {
                  return (
                    <Option
                      key={option.key}
                      value={option}
                      style={{
                        fontWeight:
                          option.range[0] !== option.value?.[0] ||
                          option.range[1] !== option.value?.[1]
                            ? 700
                            : 400,
                      }}
                    >
                      {[
                        ...(displayOption(option, option?.range?.[0] || 0) ||
                          ""),
                      ].slice(0, 1)}
                      {[
                        ...(displayOption(option, option?.range?.[1] || 1) ||
                          ""),
                      ].slice(0, 1)}{" "}
                      {option.label}
                    </Option>
                  );
                })}
            </Select>
            {(activeOption.range[0] !== activeOption.value?.[0] ||
              activeOption.range[1] !== activeOption.value?.[1]) && (
              <Button
                onClick={(_e) =>
                  setOptions((cur) => {
                    const updateOption = cur.find(
                      (c) => c.key === activeOption.key
                    );

                    if (updateOption) {
                      updateOption.value = updateOption.range;
                    }
                    return [...cur];
                  })
                }
              >
                Reset
              </Button>
            )}
            <FormHelperText sx={{ mt: 0 }}>
              {activeOption.description}
            </FormHelperText>
            <Switch
              checked={activeOption.target}
              onChange={(e) =>
                setOptions((cur) => {
                  const updateOption = cur.find(
                    (c) => c.key === activeOption.key
                  );

                  if (updateOption) {
                    updateOption.target = e.target.checked;
                    if (!updateOption.target) {
                      const low_distance =
                        updateOption.value?.[0] ||
                        updateOption.range[0] - updateOption.range[0];
                      const high_distance =
                        updateOption.range[1] -
                        (updateOption.value?.[1] || updateOption.range[1]);
                      const min_distance = Math.min(
                        low_distance,
                        high_distance
                      );
                      updateOption.value = [
                        Math.max(
                          (updateOption.value?.[0] || updateOption.range[0]) -
                            min_distance,
                          updateOption.range[0]
                        ),
                        Math.min(
                          (updateOption.value?.[1] || updateOption.range[1]) +
                            min_distance,
                          updateOption.range[1]
                        ),
                      ];
                    } else {
                      updateOption.value = [
                        ((updateOption.value?.[0] || updateOption.range[0]) +
                          (updateOption.value?.[1] || updateOption.range[1])) /
                          2,
                        ((updateOption.value?.[0] || updateOption.range[0]) +
                          (updateOption.value?.[1] || updateOption.range[1])) /
                          2,
                      ];
                    }
                  }
                  return [...cur];
                })
              }
              color="primary"
              slotProps={{
                track: {
                  children: (
                    <Fragment>
                      {activeOption.target ? (
                        <Typography
                          component="span"
                          level="inherit"
                          sx={{ ml: "15px" }}
                        >
                          Target
                        </Typography>
                      ) : (
                        <Typography
                          component="span"
                          level="inherit"
                          sx={{ ml: "40px" }}
                        >
                          Min/Max
                        </Typography>
                      )}
                    </Fragment>
                  ),
                },
              }}
              sx={{
                width: "100%",
                "--Switch-thumbSize": "27px",
                "--Switch-trackWidth": "110px",
                "--Switch-trackHeight": "31px",
              }}
            />

            <Switch
              disabled={!activeOption.target}
              checked={!activeOption.target || activeOption.exact}
              onChange={(e) =>
                setOptions((cur) => {
                  const updateOption = cur.find(
                    (c) => c.key === activeOption.key
                  );

                  if (updateOption) {
                    updateOption.exact = e.target.checked;
                  }
                  return [...cur];
                })
              }
              slotProps={{
                track: {
                  children: (
                    <Fragment>
                      {!activeOption.target || activeOption.exact ? (
                        <Typography
                          component="span"
                          level="inherit"
                          sx={{ ml: "15px" }}
                        >
                          Exact
                        </Typography>
                      ) : (
                        <Typography
                          component="span"
                          level="inherit"
                          sx={{ ml: "40px" }}
                        >
                          Approx
                        </Typography>
                      )}
                    </Fragment>
                  ),
                },
              }}
              sx={{
                width: "100%",
                "--Switch-thumbSize": "27px",
                "--Switch-trackWidth": "110px",
                "--Switch-trackHeight": "31px",
              }}
            />
          </div>
          <RangeSlider
            option={activeOption}
            value={activeOption.value}
            onChange={(e) =>
              setOptions((cur) => {
                const updateOption = cur.find(
                  (c) => c.key === activeOption.key
                );

                if (updateOption) {
                  updateOption.value = e as [number, number];
                }
                return [...cur];
              })
            }
            marks={marks}
          />
        </FormControl>
      )}
    </div>
  );
};
