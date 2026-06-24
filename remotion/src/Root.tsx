import React from "react";
import { Composition, getInputProps } from "remotion";
import { WaveformCard } from "./WaveformCard";
import { NowPlayingCard } from "./NowPlayingCard";
import { SoundOrbCard } from "./SoundOrbCard";
import type { RenderProps } from "./types";

const FPS = 24;
const WIDTH = 1080;
const HEIGHT = 1350;

export function RemotionRoot() {
  const props = getInputProps() as Partial<RenderProps>;
  const durationSeconds = props.durationSeconds ?? 60;
  const durationInFrames = Math.max(1, Math.ceil(durationSeconds * FPS));

  const defaultProps: RenderProps = {
    style: "waveform",
    config: {
      title: "Whisper & Rain",
      eyebrow: "New Drop",
      genre: "ASMR Roleplay",
      badge: "Exclusive",
      minutes: "24",
      asmrLabel: "ASMR",
      cardLabel: "RP AUDIO",
      timeStart: "",
    },
    audioUrl: props.audioUrl ?? "",
    imageUrl: props.imageUrl ?? "",
    durationSeconds,
  };

  return (
    <>
      <Composition
        id="Waveform"
        component={WaveformCard}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
      />
      <Composition
        id="NowPlaying"
        component={NowPlayingCard}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
      />
      <Composition
        id="SoundOrb"
        component={SoundOrbCard}
        durationInFrames={durationInFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={defaultProps}
      />
    </>
  );
}
