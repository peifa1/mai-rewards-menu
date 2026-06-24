import React, { useEffect, useMemo, useState } from "react";
import { Audio, useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { getAudioData, visualizeAudio, type AudioData } from "@remotion/media-utils";
import { SharedCard } from "./SharedCard";
import type { RenderProps } from "./types";

const N_MINI = 9;

// Parse "m:ss" time string to seconds
function parseTime(t: string): number {
  const [m, s] = t.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

// Sakura SVG (5-petal flower, matches template aesthetic)
function Sakura({ spinning, deg }: { spinning: boolean; deg: number }) {
  return (
    <svg
      width={50}
      height={50}
      viewBox="0 0 50 50"
      style={{
        transform: `rotate(${deg}deg)`,
        filter: "drop-shadow(0 0 5px rgba(248,184,204,.7))",
      }}
    >
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <ellipse
          key={i}
          cx={25}
          cy={25}
          rx={8}
          ry={14}
          fill="#f8b8cc"
          opacity={0.88}
          transform={`rotate(${angle} 25 25) translate(0 -11)`}
        />
      ))}
      <circle cx={25} cy={25} r={5} fill="#ffd0e0" />
    </svg>
  );
}

export function NowPlayingCard({ config, audioUrl, imageUrl, durationSeconds }: RenderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [handle] = useState(() => delayRender("Loading audio"));

  useEffect(() => {
    getAudioData(audioUrl)
      .then((d) => { setAudioData(d); continueRender(handle); })
      .catch((e) => cancelRender(e));
  }, [audioUrl, handle]);

  const miniBarHeights = useMemo(() => {
    if (!audioData) return new Array(N_MINI).fill(3);
    const full = visualizeAudio({ fps, frame, audioData, numberOfSamples: 32, smoothing: true });
    return Array.from({ length: N_MINI }, (_, i) => Math.max(3, full[i * 3 + 1] * 16));
  }, [audioData, frame, fps]);

  const timeSeconds = frame / fps;
  const startOffset = parseTime(config.timeStart);
  const displayTime = startOffset + timeSeconds;
  const seekPct = durationSeconds > 0 ? Math.min(1, timeSeconds / durationSeconds) : 0;
  const sakuraDeg = (frame / fps) * (360 / 5); // one revolution per 5 seconds

  const imgSrc = imageUrl || undefined;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <SharedCard config={config} imageUrl={imageUrl}>
      <Audio src={audioUrl} />

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

          {/* Scrim */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg,rgba(8,3,6,.55),rgba(8,3,6,.05) 35%,rgba(8,3,6,.88))",
          }} />

          {/* Spinning sakura */}
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <Sakura spinning deg={sakuraDeg} />
          </div>

          {/* "Now Playing" label */}
          <div style={{
            position: "absolute", top: 18, left: 16,
            fontFamily: "ui-sans-serif,sans-serif",
            fontSize: 9, letterSpacing: "0.3em", color: "#f8b8cc",
          }}>
            NOW PLAYING
          </div>

          {/* Title block */}
          <div style={{ position: "absolute", bottom: 50, left: 16, right: 16 }}>
            {/* Genre label */}
            <div style={{
              fontFamily: "ui-sans-serif,sans-serif",
              fontSize: 8, letterSpacing: "0.26em", color: "#a98a92",
              marginBottom: 6, textTransform: "uppercase",
            }}>
              {config.asmrLabel}
            </div>
            {/* Title row + mini bars */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <div style={{
                fontSize: 15, color: "#fff", lineHeight: 1.25,
                fontFamily: '"Hiragino Mincho ProN","Yu Mincho",Georgia,serif',
                flex: 1,
              }}>
                {config.title}
              </div>
              {/* Mini frequency bars */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16, flexShrink: 0 }}>
                {miniBarHeights.map((h, i) => (
                  <div key={i} style={{ width: 2, height: h, background: "#f8b8cc", borderRadius: 1 }} />
                ))}
              </div>
            </div>
            {/* Seek bar */}
            <div style={{ position: "relative", height: 2, background: "rgba(248,184,204,.22)", borderRadius: 1, marginBottom: 6 }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${seekPct * 100}%`,
                background: "#f8b8cc", borderRadius: 1,
              }} />
              {/* Thumb */}
              <div style={{
                position: "absolute", top: "50%", left: `${seekPct * 100}%`,
                transform: "translate(-50%,-50%)",
                width: 7, height: 7, borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 4px rgba(248,184,204,.8)",
              }} />
            </div>
            {/* Time */}
            <div style={{
              fontFamily: "ui-sans-serif,sans-serif",
              fontSize: 8, color: "#a98a92", letterSpacing: "0.06em",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>{fmt(displayTime)}</span>
              <span>{fmt(displayTime + (durationSeconds - timeSeconds))}</span>
            </div>
          </div>
        </div>
      </div>
    </SharedCard>
  );
}
