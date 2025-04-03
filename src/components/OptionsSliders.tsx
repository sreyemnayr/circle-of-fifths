"use client";
import * as React from "react";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import FormControl from "@mui/material/FormControl";

import FormHelperText from "@mui/material/FormHelperText";
import { Mark } from "@mui/base/useSlider";

import {
  OptionSettings,
  KnownKey,
  IExampleTrack,
  RecommendationsRequestPreset,
  TargetKey,
  MinKey,
  MaxKey,
  PopularityKey,
} from "@/types";

import { option_settings, recommendationPresets } from "@/data/data";

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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
// import Option from "@mui/material/Option";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

import { msToTime, msToMinutes } from "@/util/time";
import { ExampleTrack } from "./ExampleTrack";

import { findRepresentativeTracks } from "@/util/spotify";
import Paper from "@mui/material/Paper";
import Card from "@mui/material/Card";

export const RangeSlider = ({
  option,
  value = [0.0, 1.0],
  onChange,
  marks = [],
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
  //   const normalizedMarks = useMemo(() => {
  //     if (!marks) return undefined;
  //     return
  //   }, [marks, mapToNormalizedRange, option.key]);

  //   useEffect(() => {
  //     console.log("normalizedMarks", normalizedMarks);
  //   }, [normalizedMarks]);

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
    <Card
      sx={{
        width: "50%",
        minHeight: "400px",
        padding: "19px",
        paddingLeft: "61px",
      }}
    >
      <Slider
        key={`slider-${option?.key}-${marks.length}`}
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
        marks={marks.map((mark) => ({
          ...mark,
          key: `${option.key}-${mark.value}`,
          value:
            typeof mark.value === "number"
              ? mapToNormalizedRange(mark.value)
              : 0,
        }))}
        track={option.target ? false : "normal"}
        sx={{
          height: "100%",
        }}
      />
    </Card>
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

export const OptionsSliders = ({
  ignore = [],
  setFilters,
  setFilterEmoji,
}: {
  ignore?: (KnownKey | PopularityKey)[];
  setFilters: Dispatch<SetStateAction<RecommendationsRequest>>;
  setFilterEmoji: Dispatch<SetStateAction<string>>;
}) => {
  // const [filters, setFilters] = useState<RecommendationsRequest>({limit: 100} as RecommendationsRequest)
  const [options, setOptions] = useState<OptionSettings[]>(option_settings);
  const [sampleTracks, setSampleTracks] = useState<IExampleTrack[]>([]);
  const [sampleTracksLoading, setSampleTracksLoading] =
    useState<boolean>(false);

  const [activeOption, setActiveOption] = useState<OptionSettings | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activePreset, setActivePreset] =
    useState<RecommendationsRequestPreset | null>(null);
  useEffect(() => {
    console.log(
      "Triggered: options, activePreset, activeOption, setFilters, setFilterEmoji",
      options,
      activePreset,
      activeOption
    );
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
  }, [options, activePreset, activeOption, setFilters, setFilterEmoji]);

  useEffect(() => {
    console.log("Triggered: activeOption 1", activeOption);
    if (activeOption) {
      setSampleTracks([]);
      setSampleTracksLoading(true);
    }
  }, [activeOption]);

  useEffect(() => {
    console.log(
      "Triggered: sampleTracksLoading | activeOption",
      sampleTracksLoading,
      activeOption
    );
    if (sampleTracksLoading && activeOption) {
      (async () => {
        const tracks = await findRepresentativeTracks(activeOption);
        console.log("representative tracks", tracks);
        setSampleTracks(tracks);
        setSampleTracksLoading(false);
      })();
    }
  }, [sampleTracksLoading, activeOption]);

  useEffect(() => {
    console.log(
      "Triggered: sampleTracks | activeOption",
      sampleTracks,
      activeOption
    );
    console.log("activeOption", activeOption);
    if (activeOption) {
      if (sampleTracks.length > 0) {
        setMarks(
          sampleTracks.map(
            (example) =>
              ({
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
              } as Mark)
          )
        );
      } else if (activeOption.key === "key") {
        setMarks(
          Array.from({ length: 12 }, (_, i) => ({
            key: `${activeOption.key}-${i}`,
            value: i,
            label: keyString(i, 1),
          }))
        );
      } else if (activeOption.key === "time_signature") {
        setMarks(
          Array.from({ length: 5 }, (_, i) => ({
            key: `${activeOption.key}-${i + 3}`,
            value: i + 3,
            label: `${i + 3}/4`,
          }))
        );
      } else if (activeOption.key === "duration_ms") {
        setMarks(
          [1, 2, 3, 5, 10, 15, 30].map((m) => ({
            key: `${activeOption.key}-${m}`,
            value: m * 60_000,
            label: `${msToMinutes(m * 60_000)}m`,
          }))
        );
      }
    }
  }, [activeOption, sampleTracks]);

  useEffect(() => {
    console.log("Triggered: marks", marks);
  }, [marks]);

  return (
    <Paper
      sx={{
        marginLeft: "auto",
        marginRight: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Card sx={{ width: "100%", padding: "19px", paddingLeft: "61px" }}>
        <div>Choose a preset</div>
        <FormControl sx={{ width: "100%" }}>
          <Select
            value={activePreset?.name || ""}
            label={"Preset"}
            onChange={(event) => {
              console.log("v", event.target.value);
              const v = recommendationPresets.find(
                (p) => p.name === event.target.value
              );

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
                      option.value = [
                        preset[min_key] || 0,
                        preset[max_key] || 0,
                      ];
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
              <MenuItem key={preset.name} value={preset.name}>
                {preset.emoji} {preset.name} <em>{preset.description}</em>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Card>
      <Card sx={{ width: "80%", marginTop: "20px" }}>
        {activeOption && (
          <FormControl
            sx={{
              width: "100%",
              justifyContent: "space-around",
              marginBottom: "40px",
              display: "flex",
              flexDirection: "row",
              height: "100%",
            }}
            key={`${activeOption.key}_${activeOption.value?.[0]}_${activeOption.value?.[1]}`}
          >
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                maxWidth: "50%",
              }}
            >
              <Select
                onChange={(event) =>
                  setActiveOption(
                    options.find(
                      (o) => o.key === event.target.value
                    ) as OptionSettings
                  )
                }
                label={"Audio Feature"}
                value={activeOption.key}
              >
                {options
                  .filter((option) => !ignore.includes(option.key))
                  .toSorted(
                    (a, b) =>
                      Number(
                        b.range[0] !== b.value?.[0] ||
                          b.range[1] !== b.value?.[1]
                      ) -
                      Number(
                        a.range[0] !== a.value?.[0] ||
                          a.range[1] !== a.value?.[1]
                      )
                  )
                  .map((option) => {
                    return (
                      <MenuItem
                        key={option.key}
                        value={option.key}
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
                      </MenuItem>
                    );
                  })}
              </Select>

              <FormHelperText sx={{ mt: 0 }}>
                {activeOption.description}
              </FormHelperText>
              {(activeOption.range[0] !== activeOption.value?.[0] ||
                activeOption.range[1] !== activeOption.value?.[1]) && (
                <Button
                  variant="contained"
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
                            (updateOption.value?.[1] ||
                              updateOption.range[1])) /
                            2,
                          ((updateOption.value?.[0] || updateOption.range[0]) +
                            (updateOption.value?.[1] ||
                              updateOption.range[1])) /
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
                            align="inherit"
                            sx={{ ml: "15px", height: "40px" }}
                          >
                            Target
                          </Typography>
                        ) : (
                          <Typography
                            component="span"
                            align="inherit"
                            sx={{ ml: "40px", height: "40px" }}
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
                  "--Switch-trackHeight": "51px",
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
                            align="inherit"
                            sx={{ ml: "15px" }}
                          >
                            Exact
                          </Typography>
                        ) : (
                          <Typography
                            component="span"
                            align="inherit"
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
            </Card>
            <RangeSlider
              key={`range-slider-${activeOption.key}`}
              option={{ ...activeOption }}
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
              marks={[...marks]}
            />
          </FormControl>
        )}
      </Card>
    </Paper>
  );
};
