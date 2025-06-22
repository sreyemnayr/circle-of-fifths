import {
  IExampleTrack,
  KnownKey,
  OptionSettings,
  PlaylistedTrack,
  TrackItemWithAudioFeatures,
} from "@/types";

import { displayOption } from "@/util/options";
import { option_settings } from "@/data/data";
import { isTrack } from "@/util/spotify";
import { keyString } from "@/util/keys";
import { Dispatch, SetStateAction } from "react";
import { Button } from "@mui/material";

export const ExampleTrack = ({
  artist,
  name,
  img,
  value,
  highlight = false,
}: IExampleTrack) => {
  return (
    <div
      className={`flex flex-row items-center  pr-20 ${
        highlight ? "bg-amber-100 z-50" : "bg-neutral-50 z-10"
      }`}
    >
      <div className={`text-xs mr-2.5`}>{value}</div>
      <img src={img} className="h-[30px] mr-2.5" alt="" />
      <div className="flex flex-col items-start">
        <div>{name}</div>
        <div className="text-sm italic">{artist}</div>
      </div>
    </div>
  );
};

export const TrackChoice = ({
  track,
}: {
  track: PlaylistedTrack<TrackItemWithAudioFeatures>;
}) => {
  return isTrack(track.track) ? (
    <div className="flex flex-col items-between relative h-full w-full min-h-[90px]">
      <div className="absolute top-1 right-1 opacity-90 z-10 hover:scale-125 hover:opacity-100 transition-all duration-300">
        <a href={track?.track?.external_urls?.spotify} target="_blank">
          <img
            src="/spotify_icon.png"
            style={{ height: "14px" }}
            alt="Spotify"
          />
        </a>
      </div>
      <div className="flex flex-row items-center mt-2 ml-2 mr-2 absolute top-0 left-0 right-0 ">
        <div className="">
          {track?.track?.features?.key !== null ? (
            <div className="text-xl font-bold text-green-200 w-10">
              {keyString(
                track?.track?.features?.key || 0,
                track?.track?.features?.mode || 0
              )}
            </div>
          ) : (
            <></>
          )}
        </div>
        {track.track.album?.images?.length > 0 && (
          <img
            src={
              track.track.album?.images?.[track.track.album?.images?.length - 1]
                ?.url
            }
            className="h-[30px] mr-2.5"
            alt=""
          />
        )}
        <div className="flex flex-col items-start">
          <div className="text-sm">{track.track.album?.artists[0]?.name}</div>
          <div className="text-xs italic overflow-hidden nowrap text-ellipsis ">
            {track.track.name}
          </div>
        </div>
      </div>
      <div className="text-xs m-0 bg-gray-100 p-1 w-full flex flex-row items-center justify-between absolute bottom-0 left-0 right-0">
        {Object.keys(track.track.features || {})
          .filter((feature) => {
            const option = option_settings.find((o) => o.key === feature);
            return (
              option?.qualitative &&
              option.key !== "loudness" &&
              option.key !== "tempo"
            );
          })
          .map((feature) => (
            <div key={`${track.track.id}-${feature}`}>
              {displayOption(
                option_settings.find(
                  (o) => o.key === feature
                ) as OptionSettings,
                track.track.features?.[feature as KnownKey] || 0
              )}
            </div>
          ))}
      </div>
    </div>
  ) : (
    <></>
  );
};

export const TrackInfo = ({
  track,
  options,
  setActiveOption,
  setOptions,
}: {
  track: PlaylistedTrack<TrackItemWithAudioFeatures>;
  options: OptionSettings[];
  setActiveOption: Dispatch<SetStateAction<OptionSettings | null>>;
  setOptions: Dispatch<SetStateAction<OptionSettings[]>>;
}) => {
  return isTrack(track.track) ? (
    <div className="flex flex-col items-between relative h-full w-3/4 min-h-[160px]">
      <div className="absolute top-1 right-1 opacity-90 z-10 hover:scale-125 hover:opacity-100 transition-all duration-300">
        <a href={track?.track?.external_urls?.spotify} target="_blank">
          <img
            src="/spotify_icon.png"
            style={{ height: "14px" }}
            alt="Spotify"
          />
        </a>
      </div>
      <div className="flex flex-row items-center mt-2 ml-2 mr-2 absolute top-0 left-0 right-0 ">
        {track.track.album?.images?.length > 0 && (
          <img
            src={
              track.track.album?.images?.[track.track.album?.images?.length - 1]
                ?.url
            }
            className="h-[100px] mr-2.5"
            alt=""
          />
        )}
        <div className="flex flex-col items-start">
          <div className="text-sm">{track.track.album?.artists[0]?.name}</div>
          <div className="text-xs italic overflow-hidden nowrap text-ellipsis ">
            {track.track.name}
          </div>
        </div>
      </div>
      <div className="text-xs m-0 bg-gray-100 p-1 w-full flex flex-row items-center justify-between absolute bottom-0 left-0 right-0">
        Chosen Track Vibes:
        {Object.keys(track.track.features || {})
          .filter((feature) => {
            const option = options.find((o) => o.key === feature);
            return option && option.key !== "mode" && option.key !== "key";
          })
          .map((feature) => (
            <Button
              variant="outlined"
              size="small"
              key={`${track.track.id}-${feature}`}
              onClick={() => {
                setOptions((cur) => {
                  const updateOption = cur.find((c) => c.key === feature);

                  if (updateOption) {
                    updateOption.enabled = true;
                    updateOption.target = true;
                    updateOption.exact = false;
                    updateOption.value = [
                      track.track.features?.[feature as KnownKey] || 0,
                      track.track.features?.[feature as KnownKey] || 0,
                    ];

                    setActiveOption(updateOption);
                  }
                  return [...cur];
                });
              }}
            >
              {displayOption(
                options.find((o) => o.key === feature) as OptionSettings,
                track.track.features?.[feature as KnownKey] || 0
              )}
            </Button>
          ))}
      </div>
    </div>
  ) : (
    <></>
  );
};
