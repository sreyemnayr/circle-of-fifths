import React from "react";
import { PlaylistedTrack } from "@/types";
import { TrackItemWithAudioFeatures } from "@/types";
import { P5CanvasInstance, SketchProps, type Sketch } from "@p5-wrapper/react";
import { NextReactP5Wrapper } from "./NextReactP5Wrapper";
import { Image } from "p5";
import { keyString, minorKeyIntToMajor, relativeKey } from "@/util/keys";

export type PlaylistArtProps = SketchProps & {
  tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[];
  setRef: (ref: P5CanvasInstance<PlaylistArtProps>) => void;
};

const sketch: Sketch<PlaylistArtProps> = (p5) => {
  p5.setup = () => {
    const container = document.getElementById("playlist-art-container");
    const rect = container?.getBoundingClientRect();

    p5.createCanvas(rect?.width ?? 640, rect?.height ?? 640, p5.P2D);
    p5.noStroke();

    p5.colorMode(p5.HSB, 360, 100, 100, 100);
    p5.angleMode(p5.DEGREES);
    p5.textAlign(p5.CENTER, p5.CENTER);
  };

  let track_images: Image[] = [];
  let tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[] = [];

  p5.updateWithProps = (props: PlaylistArtProps) => {
    props.setRef(p5);
    if (props.tracks) {
      track_images = props.tracks
        .map((track) =>
          p5.loadImage(
            "album" in track.track
              ? track?.track?.album?.images?.[
                  track?.track?.album?.images?.length - 1
                ]?.url ?? ""
              : "",
            () => {
              p5.redraw();
            }
          )
        )
        .filter((img) => img !== null);
      tracks = props.tracks;
    }
  };

  p5.draw = () => {
    const B = 90;
    const S = 85;
    const layers = Math.floor(track_images.length / 12);
    const layer_size = Math.floor(640 / 2 / layers);
    const CIRCLE_SIZE = Math.floor(layer_size * 0.85);
    p5.background("black");

    // p5.background("white");
    // p5.push();
    // p5.fill("black");
    // p5.translate(p5.width / 2, p5.height / 2);
    // p5.circle(0, 0, layer_size * layers * 3.9);
    // p5.fill("white");
    // p5.circle(0, 0, CIRCLE_SIZE * 0.9);
    // p5.pop();

    const num_tracks = track_images.length;

    let hist: [number, number] = [0, 0];

    function get_current_coords(): [number, number] {
      let matrix = p5.drawingContext.getTransform();
      let x_0 = matrix["e"];
      let y_0 = matrix["f"];
      let x_1 = matrix["a"] + matrix["e"];
      let y_1 = matrix["b"] + matrix["f"];
      let media_per_unit = p5.dist(x_0, y_0, x_1, y_1);
      let p5_current_x = x_0 / media_per_unit;
      let p5_current_y = y_0 / media_per_unit;
      return [p5_current_x, p5_current_y];
    }

    function gradientLine(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      hue1: number,
      hue2: number
    ) {
      // linear gradient from start to end of line
      const grad = p5.drawingContext.createLinearGradient(x1, y1, x2, y2);
      const l = ((2 - S / 100) * B) / 2;
      grad.addColorStop(0, `hsl(${hue1} ${S}% ${l}%)`);
      grad.addColorStop(1, `hsl(${hue2} ${S}% ${l}%)`);
      //  grad.addColorStop(0, "green");
      // grad.addColorStop(1, "blue");
      p5.drawingContext.strokeStyle = grad;
      p5.line(x1, y1, x2, y2);
    }

    for (
      let track_number = 0;
      track_number < num_tracks * 1.2;
      track_number++
    ) {
      let angle = track_number * 30;
      let layer = Math.floor(track_number / 12);

      // Save current transformation
      p5.push();

      // Move origin to center of canvas
      p5.translate(p5.width / 2, p5.height / 2);

      // Rotate using current angle
      p5.rotate(angle);

      // Move 150 pixels out from center
      p5.translate(
        CIRCLE_SIZE * 2 + ((CIRCLE_SIZE + 4) / 12) * (angle / 30),
        0
      );
      p5.fill(angle % 360, 45, 90, 10);
      p5.circle(0, 0, CIRCLE_SIZE * (layer + 2));

      p5.translate(0, Math.round(CIRCLE_SIZE / 2) * -1 - 1);
      let backside: [number, number] = get_current_coords();
      p5.translate(0, Math.round(CIRCLE_SIZE / 2) + 1);
      let frontside: [number, number] = get_current_coords();

      p5.pop();
      // Label the current angle

      if (
        tracks.length > track_number &&
        track_number < 12 &&
        tracks[track_number]
      ) {
        p5.push();
        p5.translate(p5.width / 2, p5.height / 2);
        let center = get_current_coords();

        const key =
          tracks[track_number]?.track?.features?.mode == 1
            ? tracks[track_number]?.track?.features?.key || 0
            : minorKeyIntToMajor(
                tracks[track_number]?.track?.features?.key || 0
              );
        const key_string = keyString(key, 1) || "";
        const key_string_0 = key_string.charAt(0);
        const key_string_1 = key_string.charAt(1);

        const relative_key = relativeKey(key, 1);
        const relative_key_string = keyString(relative_key, 0) || "";
        const relative_key_string_0 = relative_key_string.charAt(0);
        const relative_key_string_1 = relative_key_string.charAt(1);
        const relative_key_string_2 = relative_key_string.charAt(2);

        p5.rotate(angle);
        p5.translate(
          CIRCLE_SIZE +
            (CIRCLE_SIZE / 12) * ((angle + 30) / 30) -
            CIRCLE_SIZE * 0.3,
          0
        );
        let position = get_current_coords();

        // p5.translate(0, -CIRCLE_SIZE * 0.2);
        p5.textSize(CIRCLE_SIZE * 0.3);
        p5.fill(angle % 360, S, B, 70);

        // Major keys

        p5.translate(CIRCLE_SIZE * 0.2, 0);
        // Reverse rotation to keep text upright
        p5.rotate(-angle);
        const text_size_0 = p5.textWidth(key_string_0);
        p5.text(key_string_0, 0, 0);
        p5.textSize(CIRCLE_SIZE * 0.2);
        p5.text(key_string_1, text_size_0 * 0.9, -CIRCLE_SIZE * 0.1);

        // Minor keys
        p5.rotate(angle);
        p5.translate(CIRCLE_SIZE * 0.45, 0);
        p5.fill(angle % 360, S, B, 40);
        p5.rotate(-angle);

        if (relative_key_string_2) {
          p5.textSize(CIRCLE_SIZE * 0.18);
          const relative_text_size_0 = p5.textWidth(relative_key_string_0);
          p5.text(relative_key_string_0, 0, 0);

          p5.textSize(CIRCLE_SIZE * 0.14);
          p5.text(
            relative_key_string_1,
            relative_text_size_0 * 0.9,
            -CIRCLE_SIZE * 0.02
          );
          const relative_text_size_1 = p5.textWidth(relative_key_string_1);
          p5.textSize(CIRCLE_SIZE * 0.18);
          p5.text(
            relative_key_string_2,
            relative_text_size_0 * 0.9 + relative_text_size_1 * 0.9,
            0
          );
        } else {
          p5.textSize(CIRCLE_SIZE * 0.18);
          p5.text(relative_key_string, 0, 0);
        }

        p5.pop();
        p5.push();
        p5.stroke(angle % 360, S, B, 70);
        p5.line(center[0], center[1], position[0], position[1]);
        p5.pop();
      }
      // Restore canvas transformation

      if (angle > 0 && track_number < num_tracks) {
        p5.push();
        p5.strokeWeight(2);
        p5.stroke("black");
        gradientLine(
          hist[0],
          hist[1],
          backside[0],
          backside[1],
          (angle - 30) % 360,
          angle % 360
        );
        p5.strokeWeight(0);
        p5.pop();
      }
      hist = [frontside[0], frontside[1]];
    }

    p5.push();
    p5.translate(p5.width / 2, p5.height / 2);
    p5.fill(0, 100, 0, 0.9);
    p5.textSize(CIRCLE_SIZE * 10);
    p5.text("c5", 0, 0);
    p5.pop();

    for (let track_number = 0; track_number < num_tracks; track_number++) {
      let angle = track_number * 30;
      // Save current transformation
      p5.push();

      // Move origin to center of canvas
      p5.translate(p5.width / 2, p5.height / 2);

      // Rotate using current angle
      p5.rotate(angle);

      // Move 150 pixels out from center
      p5.translate(
        CIRCLE_SIZE * 2 + ((CIRCLE_SIZE + 4) / 12) * (angle / 30),
        0
      );

      // Set fill using current angle as hue
      p5.fill(angle % 360, 45, 90);
      // stroke(angle%360, 85, 90);

      // Draw a circle at current origin (150 pixels from center)

      p5.circle(0, 0, CIRCLE_SIZE);

      let shape = p5.createGraphics(CIRCLE_SIZE, CIRCLE_SIZE);
      shape.circle(
        Math.round(CIRCLE_SIZE / 2),
        Math.round(CIRCLE_SIZE / 2),
        CIRCLE_SIZE - 2
      );

      // const track = tracks[track_number];

      // const img_url = track["images"][2]["url"];
      const img = track_images?.[track_number];
      if (img) {
        // rotate((angle%360) < 180 ? 180 : 0);
        p5.rotate(-angle);
        // img.resize(CIRCLE_SIZE, CIRCLE_SIZE);
        try {
          img.mask(shape as unknown as Image);
        } catch (e) {
          console.log(e);
        }

        const ratio = 0.9;

        p5.image(
          img,
          Math.round((CIRCLE_SIZE * ratio) / 2) * -1,
          Math.round((CIRCLE_SIZE * ratio) / 2) * -1,
          CIRCLE_SIZE * ratio,
          CIRCLE_SIZE * ratio
        );
        // p5.tint(angle % 360, 45, 90, 60);
        // p5.image(
        //   img,
        //   Math.round((CIRCLE_SIZE * ratio) / 2) * -1,
        //   Math.round((CIRCLE_SIZE * ratio) / 2) * -1,
        //   CIRCLE_SIZE * ratio,
        //   CIRCLE_SIZE * ratio
        // );
      }

      p5.pop();
    }

    p5.push();
    p5.textAlign(p5.RIGHT, p5.BOTTOM);
    p5.fill(0, 0, 100, 100);
    p5.textSize(14);
    p5.text("FIFTHS.XYZ", p5.width - 2, p5.height - 2);
    p5.pop();
  };
  p5.noLoop();
};

export default function PlaylistArt({
  tracks,
  setRef,
}: {
  tracks: PlaylistedTrack<TrackItemWithAudioFeatures>[];
  setRef: (ref: P5CanvasInstance<PlaylistArtProps>) => void;
}) {
  return (
    <div
      id="playlist-art-container"
      style={{
        width: "80%",
        height: "80%",
        maxWidth: "80vw",
        maxHeight: "80vw",
      }}
    >
      <NextReactP5Wrapper
        sketch={sketch}
        tracks={tracks.slice(0, 60)}
        setRef={setRef}
      />
    </div>
  );
}
