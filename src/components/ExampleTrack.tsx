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

export const ExampleTrack = ({ artist, name, img, value }: IExampleTrack) => {
  return (
    <div className="flex flex-row items-center">
      <div className="text-xs mr-2.5">{value}</div>
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
    <div className="flex flex-col items-center relative">
      <div className="absolute top-0 right-0 opacity-20 z-10 hover:opacity-100 transition-opacity duration-300">
        <a href={track?.track?.external_urls?.spotify} target="_blank">
          <img
            src="/spotify_icon.png"
            style={{ height: "14px" }}
            alt="Spotify"
          />
        </a>
      </div>
      <div className="flex flex-row items-center mt-2 ml-2 mr-2">
        <img
          src={track.track.album?.images[0]?.url}
          className="h-[30px] mr-2.5"
          alt=""
        />
        <div className="flex flex-col items-start">
          <div className="text-sm">{track.track.album?.artists[0]?.name}</div>
          <div className="text-xs italic overflow-hidden nowrap text-ellipsis max-w-[10vw]">
            {track.track.name}
          </div>
        </div>
      </div>
      <div className="text-xs m-0 bg-gray-100 p-1 w-full flex flex-row items-center justify-between">
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
