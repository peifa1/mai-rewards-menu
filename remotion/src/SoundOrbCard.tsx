import React, { useEffect, useMemo, useState } from "react";
import { Audio, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { getAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";
import { SharedCard } from "./SharedCard";
import type { RenderProps } from "./types";

export function SoundOrbCard({ config, audioUrl, imageUrl }: RenderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [handle] = useState(() => delayRender("Loading audio"));

  useEffect(() => {
    getAudioData(audioUrl)
      .then((d) => { setAudioData(d); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [audioUrl, handle]);

  const amp = useMemo(() => {
    if (!audioData) return 0;
    const full = visualizeAudio({ fps, frame, audioData, numberOfSamples: 32, smoothing: true });
    const mean = full.reduce((a: number, b: number) => a + b, 0) / full.length;
    return Math.min(1, mean * 1.7);
  }, [audioData, frame, fps]);

  const imgSrc = imageUrl || undefined;

  // Pulse rings: 3 rings with staggered animation at 3.2s cycle / 30fps = 96 frames
  const CYCLE = 3.2 * fps;
  const pulseRings = [0, CYCLE / 3, (CYCLE * 2) / 3].map((offset, i) => {
    const t = ((frame + offset) % CYCLE) / CYCLE; // 0..1
    const size = 150 + t * 180; // 150px → 330px
    const opacity = Math.max(0, 0.55 * (1 - t));
    return { size, opacity, key: i };
  });

  // Orb scale driven by amplitude
  const orbScale = 1 + amp * 0.12;

  return (
    <SharedCard
      config={config}
      imageUrl={imageUrl}
      bgBlur="blur(10px) saturate(1.3) brightness(0.45)"
      bgInset={-14}
    >
      <Audio src={audioUrl} />

      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 95,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Orb container */}
        <div style={{ position: "relative", width: 210, height: 294, display: "grid", placeItems: "center" }}>
          {/* Pulse rings */}
          {pulseRings.map(({ size, opacity, key }) => (
            <div
              key={key}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: size, height: size,
                borderRadius: "50%",
                border: "1px solid #f8b8cc",
                transform: "translate(-50%,-50%)",
                opacity,
              }}
            />
          ))}

          {/* Orb portrait */}
          <div style={{
            position: "relative",
            width: 150, height: 150,
            borderRadius: "50%", overflow: "hidden",
            boxShadow: "0 0 36px rgba(248,184,204,.4)",
            zIndex: 2,
            transform: `scale(${orbScale})`,
          }}>
            {imgSrc ? (
              <img src={imgSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "radial-gradient(circle,#4a1030,#1a0510)" }} />
            )}
          </div>

          {/* ASMR caption below orb */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            textAlign: "center", fontFamily: "ui-sans-serif,sans-serif",
            fontSize: 10, letterSpacing: "0.34em", color: "#f8b8cc",
          }}>
            — {config.asmrLabel} —
          </div>
        </div>
      </div>
    </SharedCard>
  );
}
