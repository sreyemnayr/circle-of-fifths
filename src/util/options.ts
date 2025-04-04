import { OptionSettings } from "@/types";
import { msToTime } from "./time";
import { keyString } from "./keys";

export const displayOption = (option: OptionSettings, value: number) => {
  if (!option) {
    return "";
  }
  if (option?.emoji_scale) {
    // if (option.key == "popularity") {
    //   value = value / 100;
    // }

    // Use quartile-based smoothing if quartiles are available
    if (option.quartiles && option.quartiles.length === 3) {
      const [q1, q2, q3] = option.quartiles;
      const min = option.range[0];
      const max = option.range[1];

      // Handle edge cases
      if (value <= min) return option.emoji_scale[0];
      if (value >= max)
        return option.emoji_scale[option.emoji_scale.length - 1];

      // Map value to normalized range based on quartiles
      let normalizedValue;
      if (value <= q1) {
        normalizedValue = ((value - min) / (q1 - min)) * 0.25;
      } else if (value <= q2) {
        normalizedValue = 0.25 + ((value - q1) / (q2 - q1)) * 0.25;
      } else if (value <= q3) {
        normalizedValue = 0.5 + ((value - q2) / (q3 - q2)) * 0.25;
      } else {
        normalizedValue = 0.75 + ((value - q3) / (max - q3)) * 0.25;
      }

      return option.emoji_scale[
        Math.min(
          Math.round(normalizedValue * option.emoji_scale.length),
          option.emoji_scale.length - 1
        )
      ];
    }

    // Fallback to linear mapping if quartiles aren't available
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
