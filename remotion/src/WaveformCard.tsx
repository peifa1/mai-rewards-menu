import React, { useEffect, useMemo, useState } from "react";
import { Audio, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { getAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";
import { SharedCard } from "./SharedCard";
import type { RenderProps } from "./types";

const N_BARS = 18;

export function WaveformCard({ config, audioUrl, imageUrl }: RenderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [handle] = useState(() => delayRender("Loading audio"));

  useEffect(() => {
    getAudioData(audioUrl)
      .then((d) => { setAudioData(d); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [audioUrl, handle]);

  const bars = useMemo(() => {
    if (!audioData) return new Array(N_BARS).fill(0.15);
    const full = visualizeAudio({ fps, frame, audioData, numberOfSamples: 32, smoothing: true });
    // Use the mid-low bands (indices 2..19) for the 18 waveform bars
    return Array.from({ length: N_BARS }, (_, i) => full[i + 2] ?? 0);
  }, [audioData, frame, fps]);

  const imgSrc = imageUrl || undefined;

  return (
    <SharedCard config={config} imageUrl={imageUrl}>
      <Audio src={audioUrl} />

      {/* Centred audio card */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 95,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "relative",
          width: 238, height: 333,
          borderRadius: 10, overflow: "hidden",
          boxShadow: "0 24px 60px -10px rgba(0,0,0,.7), 0 0 0 1.5px rgba(200,132,122,.5)",
        }}>
          {/* Cover image */}
          {imgSrc && (
            <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}
          {!imgSrc && (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#2a0a18,#0e0308)" }} />
          )}

          {/* Gradient veil */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg,rgba(8,3,6,.05) 40%,rgba(8,3,6,.78))",
          }} />

          {/* Waveform bars */}
          <div style={{
            position: "absolute", bottom: 60, left: 0, right: 0,
            height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3,
          }}>
            {bars.map((v, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: Math.max(3, v * 36),
                  background: "#f8b8cc",
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Card label */}
          <div style={{
            position: "absolute", bottom: 28, left: 0, right: 0,
            textAlign: "center", fontFamily: "ui-sans-serif,sans-serif",
            color: "#fff", fontSize: 10, letterSpacing: "0.34em",
          }}>
            {config.cardLabel}
          </div>

          {/* Card sub-label */}
          <div style={{
            position: "absolute", bottom: 13, left: 0, right: 0,
            textAlign: "center", fontFamily: "ui-sans-serif,sans-serif",
            color: "#f8b8cc", fontSize: 9, letterSpacing: "0.28em",
          }}>
            — {config.asmrLabel} —
          </div>
        </div>
      </div>
    </SharedCard>
  );
}
