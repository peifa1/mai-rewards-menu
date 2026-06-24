import React from "react";
import type { RenderProps } from "./types";

// The templates render at 390×488. We scale this 2.769× to reach 1080×1350.
// Using CSS transform: scale on a 390×488 container means all template pixel
// values can be used verbatim — blur, font-size, border-radius all scale correctly.
export const TEMPLATE_W = 390;
export const TEMPLATE_H = 488;
export const OUTPUT_W = 1080;
export const OUTPUT_H = 1350;
export const S = OUTPUT_W / TEMPLATE_W; // ~2.769

type SharedProps = Pick<RenderProps, "config" | "imageUrl"> & {
  bgBlur?: string;
  bgInset?: number;
  children: React.ReactNode;
};

export function SharedCard({ config, imageUrl, bgBlur = "blur(28px) saturate(1.3) brightness(0.45)", bgInset = -40, children }: SharedProps) {
  const meta = `${config.minutes} min · ${config.genre} · ${config.badge}`;
  const imgSrc = imageUrl || undefined;

  return (
    // Outer container at full output resolution
    <div style={{ width: OUTPUT_W, height: OUTPUT_H, background: "#0c0608", overflow: "hidden" }}>
      {/* Inner container at template scale, then CSS-scaled up */}
      <div
        style={{
          width: TEMPLATE_W,
          height: TEMPLATE_H,
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,.8)",
          transform: `scale(${S})`,
          transformOrigin: "top left",
        }}
      >
        {/* Blurred zoomed background */}
        <div
          style={{
            position: "absolute",
            inset: bgInset,
            backgroundImage: imgSrc ? `url(${imgSrc})` : "linear-gradient(135deg,#3a0a1c,#1a0510)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: bgBlur,
            transform: "scale(1.05)",
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(6,2,4,.55)),
              linear-gradient(180deg,rgba(6,2,4,.3) 0%,transparent 25%,transparent 75%,rgba(6,2,4,.3) 100%)
            `,
          }}
        />

        {/* Card-specific content */}
        {children}

        {/* Bottom strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            padding: "32px 28px 28px",
            background: "linear-gradient(0deg, rgba(6,2,4,.92) 55%, transparent)",
            color: "#fff",
            fontFamily: '"Hiragino Mincho ProN","Yu Mincho",Georgia,serif',
          }}
        >
          <div style={{
            fontFamily: "ui-sans-serif,sans-serif",
            fontSize: 9, letterSpacing: "0.55em", textTransform: "uppercase",
            color: "#f8b8cc", opacity: 0.95, marginBottom: 10,
          }}>
            {config.eyebrow}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15, marginBottom: 7 }}>
            {config.title}
          </div>
          <div style={{
            fontFamily: "ui-sans-serif,sans-serif",
            fontSize: 11, color: "#a98a92", letterSpacing: "0.1em",
          }}>
            {meta}
          </div>
        </div>
      </div>
    </div>
  );
}
