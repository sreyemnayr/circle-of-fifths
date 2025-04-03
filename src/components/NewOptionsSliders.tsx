"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { RecommendationsRequest } from "@spotify/web-api-ts-sdk";
import { keyString } from "@/util/keys";
import { msToTime, msToMinutes } from "@/util/time";
import { findRepresentativeTracks } from "@/util/spotify";
import { ExampleTrack } from "./ExampleTrack";
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

import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  option: OptionSettings;
  value?: [number, number];
  onChange: (value: number[]) => void;
  marks?: { value: number; label: React.ReactNode }[];
}

const RangeSlider = ({
  option,
  value = [0.0, 1.0],
  onChange,
  marks = [],
}: RangeSliderProps) => {
  const [displayValue, setDisplayValue] = useState<[number, number]>(value);

  const mapToNormalizedRange = useCallback(
    (val: number): number => {
      const min = option.range[0] ?? 0;
      const max = option.range[1] ?? 1;
      const [q1, q2, q3] = option.quartiles || [
        min + (max - min) * 0.25,
        min + (max - min) * 0.5,
        min + (max - min) * 0.75,
      ];

      if (val <= min) return 0;
      if (val >= max) return 1;

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

  const mapFromNormalizedRange = useCallback(
    (normalized: number): number => {
      const min = option.range[0] ?? 0;
      const max = option.range[1] ?? 1;
      const [q1, q2, q3] = option.quartiles || [
        min + (max - min) * 0.25,
        min + (max - min) * 0.5,
        min + (max - min) * 0.75,
      ];

      if (normalized <= 0) return min;
      if (normalized >= 1) return max;

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

  const handleChange = (newValue: number[]) => {
    const transformedValue = [
      mapFromNormalizedRange(newValue[0] ?? 0),
      mapFromNormalizedRange(newValue[1] ?? 1),
    ] as [number, number];
    setDisplayValue(transformedValue);
    onChange(transformedValue);
  };

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

  const display = (value: number) => {
    const actualValue = mapFromNormalizedRange(value);
    return displayOption(option, actualValue) || "";
  };

  return (
    <div className="w-full h-[500px] p-2.5">
      <Slider
        key={`slider-${option?.key}-${marks.length}`}
        orientation="vertical"
        value={
          Array.isArray(normalizedDisplayValue)
            ? normalizedDisplayValue
            : [normalizedDisplayValue]
        }
        onValueChange={handleChange}
        min={0}
        max={1}
        step={0.001}
        className="h-full"
      />
      {marks.map((mark) => (
        <div
          key={`${option.key}-${mark.value}`}
          className="absolute"
          style={{
            bottom: `${mapToNormalizedRange(mark.value) * 100}%`,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {mark.label}
        </div>
      ))}
    </div>
  );
};

const displayOption = (option: OptionSettings, value: number) => {
  if (option?.emoji_scale) {
    if (option.key === "popularity") {
      value = value / 100;
    }
    return option.emoji_scale[
      Math.min(
        Math.round(value * option.emoji_scale.length),
        option.emoji_scale.length - 1
      )
    ];
  }
  if (option.key === "loudness") {
    if (value === option.range[0]) {
      return "🔇" + value.toFixed(0) + "db";
    } else if (value > -20) {
      return "🔊" + value.toFixed(0) + "db";
    } else if (value > -40) {
      return "🔉" + value.toFixed(0) + "db";
    } else {
      return "🔈" + value.toFixed(0) + "db";
    }
  }
  if (option.key === "mode") {
    return ["minor", "major"][parseInt(value.toString())];
  }
  if (option.key === "tempo") {
    if (value === option.range[0]) {
      return "🚶" + value.toFixed(0) + "bpm";
    } else if (value === option.range[1]) {
      return "🏃" + value.toFixed(0) + "bpm";
    } else {
      return value.toFixed(0) + "bpm";
    }
  }
  if (option.key === "time_signature") {
    if (value === option.range[0]) {
      return "🎼" + value.toFixed(0) + "/4";
    } else if (value === option.range[1]) {
      return " " + value.toFixed(0) + "/4";
    } else {
      return value.toFixed(0) + "/4";
    }
  }
  if (option.key === "key") {
    return keyString(parseInt(value.toString()), 1);
  }
  if (option.key === "duration_ms") {
    if (value === option.range[0]) {
      return "⌛" + msToTime(value);
    } else if (value === option.range[1]) {
      return "⏳" + msToTime(value);
    } else {
      return msToTime(value);
    }
  }
  return value.toString() || "";
};

interface NewOptionsSlidersProps {
  ignore?: (KnownKey | PopularityKey)[];
  setFilters: React.Dispatch<React.SetStateAction<RecommendationsRequest>>;
  setFilterEmoji: React.Dispatch<React.SetStateAction<string>>;
}

export const NewOptionsSliders = ({
  ignore = [],
  setFilters,
  setFilterEmoji,
}: NewOptionsSlidersProps) => {
  const [options, setOptions] = useState<OptionSettings[]>(option_settings);
  const [sampleTracks, setSampleTracks] = useState<IExampleTrack[]>([]);
  const [sampleTracksLoading, setSampleTracksLoading] =
    useState<boolean>(false);
  const [activeOption, setActiveOption] = useState<OptionSettings | null>(null);
  const [marks, setMarks] = useState<
    { value: number; label: React.ReactNode }[]
  >([]);
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
          if (option.value?.[0] === option.value?.[1] && !option.exact) {
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
            if (option.value?.[0] === option.value?.[1]) {
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
    if (activeOption) {
      setSampleTracks([]);
      setSampleTracksLoading(true);
    }
  }, [activeOption]);

  useEffect(() => {
    if (sampleTracksLoading && activeOption) {
      (async () => {
        const tracks = await findRepresentativeTracks(activeOption);
        setSampleTracks(tracks);
        setSampleTracksLoading(false);
      })();
    }
  }, [sampleTracksLoading, activeOption]);

  useEffect(() => {
    if (activeOption) {
      if (sampleTracks.length > 0) {
        setMarks(
          sampleTracks.map((example) => ({
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
          }))
        );
      } else if (activeOption.key === "key") {
        setMarks(
          Array.from({ length: 12 }, (_, i) => ({
            value: i,
            label: keyString(i, 1),
          }))
        );
      } else if (activeOption.key === "time_signature") {
        setMarks(
          Array.from({ length: 5 }, (_, i) => ({
            value: i + 3,
            label: `${i + 3}/4`,
          }))
        );
      } else if (activeOption.key === "duration_ms") {
        setMarks(
          [1, 2, 3, 5, 10, 15, 30].map((m) => ({
            value: m * 60_000,
            label: `${msToMinutes(m * 60_000)}m`,
          }))
        );
      }
    }
  }, [activeOption, sampleTracks]);

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">Choose a preset</div>
      <Select
        value={activePreset?.name}
        onValueChange={(value) => {
          const preset = recommendationPresets.find((p) => p.name === value);
          setActivePreset(preset || null);
          setOptions((cur) => {
            const presetFilters = preset?.filters as RecommendationsRequest;

            for (const option of cur) {
              const target_key = `target_${option.key}` as TargetKey;
              const min_key = `min_${option.key}` as MinKey;
              const max_key = `max_${option.key}` as MaxKey;

              if (
                presetFilters?.[target_key] ||
                presetFilters?.[min_key] ||
                presetFilters?.[max_key]
              ) {
                if (presetFilters?.[target_key]) {
                  option.target = true;
                  option.value = [
                    presetFilters[target_key] || 0,
                    presetFilters[target_key] || 0,
                  ];
                } else {
                  option.target = false;
                }

                if (presetFilters?.[min_key] && presetFilters?.[max_key]) {
                  option.value = [
                    presetFilters[min_key] || 0,
                    presetFilters[max_key] || 0,
                  ];
                } else if (presetFilters?.[min_key]) {
                  option.value = [presetFilters[min_key] || 0, option.range[1]];
                } else if (presetFilters?.[max_key]) {
                  option.value = [option.range[0], presetFilters[max_key] || 0];
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
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a preset" />
        </SelectTrigger>
        <SelectContent>
          {recommendationPresets.map((preset) => (
            <SelectItem key={preset.name} value={preset.name}>
              {preset.emoji} {preset.name} <em>{preset.description}</em>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeOption && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <Select
              value={activeOption.key}
              onValueChange={(value) => {
                const option = options.find((o) => o.key === value);
                if (option) setActiveOption(option);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {options
                  .filter((option) => !ignore.includes(option.key))
                  .sort(
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
                  .map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      <span
                        className={cn(
                          "font-medium",
                          option.range[0] !== option.value?.[0] ||
                            option.range[1] !== option.value?.[1]
                            ? "font-bold"
                            : "font-normal"
                        )}
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
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {(activeOption.range[0] !== activeOption.value?.[0] ||
              activeOption.range[1] !== activeOption.value?.[1]) && (
              <Button
                variant="outline"
                onClick={() =>
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
          </div>

          <div className="text-sm text-muted-foreground">
            {activeOption.description}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={activeOption.target}
                onCheckedChange={(checked) =>
                  setOptions((cur) => {
                    const updateOption = cur.find(
                      (c) => c.key === activeOption.key
                    );
                    if (updateOption) {
                      updateOption.target = checked;
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
              />
              <span className="text-sm font-medium">
                {activeOption.target ? "Target" : "Min/Max"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                disabled={!activeOption.target}
                checked={!activeOption.target || activeOption.exact}
                onCheckedChange={(checked) =>
                  setOptions((cur) => {
                    const updateOption = cur.find(
                      (c) => c.key === activeOption.key
                    );
                    if (updateOption) {
                      updateOption.exact = checked;
                    }
                    return [...cur];
                  })
                }
              />
              <span className="text-sm font-medium">
                {!activeOption.target || activeOption.exact
                  ? "Exact"
                  : "Approx"}
              </span>
            </div>
          </div>

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
            marks={marks}
          />
        </div>
      )}
    </div>
  );
};
