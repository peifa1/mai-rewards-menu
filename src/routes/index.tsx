import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import deco02 from "@/assets/deco-02.webp.asset.json";
import deco03 from "@/assets/deco-03.webp.asset.json";
import deco07 from "@/assets/deco-07.webp.asset.json";
import artYokan from "@/assets/art-yokan.jpg.asset.json";
import artSensu from "@/assets/art-sensu.jpg.asset.json";
import artTomo from "@/assets/art-tomo.jpg.asset.json";
import artOkami from "@/assets/art-okami.jpg.asset.json";
import artDanna from "@/assets/art-danna.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Iomaya Mai — Monthly Rewards" },
      { name: "description", content: "Iomaya Mai's monthly Patreon reward menu — a Japanese-style omakase card of tiers." },
    ],
  }),
  component: Index,
});

type Perk = string;
type Tier = {
  key: string;
  name: string;
  kanji: string;
  premium?: boolean;
  perks: Perk[];
  variant?: "image" | "visualizer";
};

const TIERS: Tier[] = [
  { key: "yokan", name: "Yokan", kanji: "羊羹", perks: ["ART", "WALL"] },
  { key: "sensu", name: "Sensu", kanji: "扇子", perks: ["18+", "ART", "BONUS"] },
  { key: "tomo",  name: "Tomo",  kanji: "友",   perks: ["PHOTO", "ASMR", "VOICE"] },
  { key: "okami", name: "Okami", kanji: "女将", premium: true, variant: "visualizer", perks: ["18+", "+10 MIN", "VOTE"] },
  { key: "danna", name: "Danna", kanji: "旦那", premium: true, variant: "visualizer", perks: ["18+", "+20 MIN", "RP", "EXCL"] },
];

const DEFAULT_IMAGES: Record<string, { src: string; nsfw: boolean }> = {
  yokan: { src: artYokan.url, nsfw: false },
  sensu: { src: artSensu.url, nsfw: true },
  tomo:  { src: artTomo.url,  nsfw: false },
  okami: { src: artOkami.url, nsfw: false },
  danna: { src: artDanna.url, nsfw: false },
};

function Index() {
  const [slots, setSlots] = useState(DEFAULT_IMAGES);

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-10 py-10 px-4" style={{ background: "#2a0a14" }}>
      <CanvasScaler>
        <Canvas slots={slots} />
      </CanvasScaler>
      <Editor slots={slots} onChange={setSlots} />
    </div>
  );
}

function CanvasScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const max = Math.min(window.innerWidth - 32, 1080);
      setScale(Math.min(1, max / 1080));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <div style={{ width: 1080 * scale, height: 1080 * scale }} className="relative">
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1080, height: 1080 }}
        className="absolute top-0 left-0 shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

function Canvas({ slots }: { slots: typeof DEFAULT_IMAGES }) {
  return (
    <div
      className="relative font-tambyon"
      style={{
        width: 1080,
        height: 1080,
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 30% 20%, #6b1230 0%, #4a0c22 35%, #2a0712 70%, #1a040c 100%)",
        color: "#f7e2e8",
      }}
    >
      {/* Washi grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='9'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.7  0 0 0 0 0.78  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Inner border frame */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 24,
          border: "1px solid rgba(255,180,200,0.22)",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.45)",
        }}
      />

      {/* Sakura sprinkles */}
      <img src={deco07.url} alt="" className="absolute top-8 left-8 w-20 h-20 opacity-80 -rotate-12 pointer-events-none" />
      <img src={deco02.url} alt="" className="absolute top-10 right-10 w-16 h-16 opacity-80 rotate-12 pointer-events-none" />
      <img src={deco03.url} alt="" className="absolute bottom-24 right-10 w-20 h-20 opacity-80 rotate-3 pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col items-center pt-14 pb-4">
        <div className="text-[12px] tracking-[0.6em] uppercase" style={{ color: "#f0a8b8" }}>
          Patreon.com / Iomaya Mai
        </div>
        <div className="font-tambyon text-[68px] leading-none mt-3" style={{ color: "#fff0f4", textShadow: "0 2px 18px rgba(255,120,150,0.35)" }}>
          月間リワード
        </div>
        <div className="font-tambyon italic text-[22px] mt-2" style={{ color: "#f0a8b8" }}>
          — Monthly Reward Menu —
        </div>
      </div>

      {/* Tier rows */}
      <div className="relative mt-2 flex flex-col" style={{ padding: "0 56px" }}>
        {TIERS.map((t, i) => (
          <div key={t.key}>
            <TierRow tier={t} slot={slots[t.key]} />
            {i < TIERS.length - 1 && (
              <div
                className="my-1"
                style={{
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,180,200,0.18) 30%, rgba(255,180,200,0.28) 50%, rgba(255,180,200,0.18) 70%, transparent 100%)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-7 left-0 right-0 flex flex-col items-center">
        <div className="font-tambyon text-[22px] tracking-[0.45em]" style={{ color: "#fff0f4" }}>
          MAY 2025
        </div>
        <div className="font-tambyon text-[14px] tracking-[0.6em] mt-1" style={{ color: "#d98aa0" }}>
          月間リワード
        </div>
      </div>
    </div>
  );
}

function TierRow({ tier, slot }: { tier: Tier; slot: { src: string; nsfw: boolean } }) {
  const rowHeight = tier.premium ? 144 : 124;
  const nameColor = tier.premium ? "#fff4f7" : "#f7dde4";
  const kanjiColor = tier.premium ? "#ffc8d4" : "#e8a8b8";

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: rowHeight,
        borderLeft: tier.premium ? "3px solid #ff6a86" : "3px solid transparent",
        paddingLeft: 18,
      }}
    >
      {/* Image fading from right to left */}
      <div className="absolute inset-0 pointer-events-none">
        {tier.variant === "visualizer" ? (
          <AudioVisualizer src={slot.src} premium />
        ) : (
          <div
            className="absolute right-0 top-0 h-full"
            style={{
              width: "62%",
              backgroundImage: `url(${slot.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center 30%",
              filter: slot.nsfw ? "blur(18px) saturate(1.1)" : "none",
              transform: slot.nsfw ? "scale(1.1)" : "none",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.75) 60%, #000 100%)",
              maskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.25) 25%, rgba(0,0,0,0.75) 60%, #000 100%)",
            }}
          />
        )}
        {/* Crimson tint on top of image */}
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: "62%",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(74,12,34,0.35) 60%, rgba(74,12,34,0.55) 100%)",
            mixBlendMode: "multiply",
          }}
        />
      </div>

      {/* NSFW label */}
      {slot.nsfw && tier.variant !== "visualizer" && (
        <div className="absolute top-1/2 -translate-y-1/2" style={{ right: 140 }}>
          <div
            className="px-2.5 py-1 text-[12px] font-bold tracking-widest rounded-sm"
            style={{ background: "#c8132a", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}
          >
            🔞 NSFW
          </div>
        </div>
      )}

      {/* Left: tier name */}
      <div className="relative h-full flex items-center">
        <div className="flex items-baseline gap-4">
          <div
            className="font-tambyon"
            style={{
              fontSize: tier.premium ? 60 : 50,
              color: nameColor,
              lineHeight: 1,
              letterSpacing: "0.04em",
              textShadow: tier.premium ? "0 2px 14px rgba(255,120,150,0.35)" : "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            {tier.name}
          </div>
          <div
            className="font-tambyon"
            style={{
              fontSize: tier.premium ? 32 : 26,
              color: kanjiColor,
              opacity: 0.95,
            }}
          >
            ({tier.kanji})
          </div>
        </div>
      </div>

      {/* Right: perk pills */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5 z-10">
        {tier.perks.map((p) => (
          <div
            key={p}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest"
            style={{
              background: "rgba(20,5,12,0.55)",
              color: p === "18+" ? "#ff8aa0" : "#fbe0e7",
              border: "1px solid rgba(255,180,200,0.30)",
              backdropFilter: "blur(4px)",
            }}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

function AudioVisualizer({ src, premium }: { src: string; premium?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const size = c.width;
    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.32;
    ctx.clearRect(0, 0, size, size);

    // outer glow ring
    const glow = ctx.createRadialGradient(cx, cy, baseR * 0.9, cx, cy, baseR * 1.6);
    glow.addColorStop(0, "rgba(255,120,150,0.0)");
    glow.addColorStop(0.5, "rgba(255,120,150,0.25)");
    glow.addColorStop(1, "rgba(255,120,150,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    // bars
    const bars = 96;
    let seed = premium ? 7 : 3;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < bars; i++) {
      const a = (i / bars) * Math.PI * 2;
      const t = i / bars;
      // gentle wave
      const w = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 6 + (premium ? 0.6 : 0)));
      const len = (premium ? 26 : 20) + w * (premium ? 34 : 26) + rand() * 6;
      const r1 = baseR + 6;
      const r2 = r1 + len;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, premium ? "rgba(255,200,212,0.95)" : "rgba(255,160,180,0.9)");
      grad.addColorStop(1, "rgba(255,90,120,0.05)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = premium ? 2.2 : 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // inner ring
    ctx.strokeStyle = "rgba(255,180,200,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR + 3, 0, Math.PI * 2);
    ctx.stroke();
  }, [premium]);

  const ringSize = 200;
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2" style={{ width: ringSize, height: ringSize }}>
      {/* avatar in center */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          left: ringSize * 0.18,
          top: ringSize * 0.18,
          width: ringSize * 0.64,
          height: ringSize * 0.64,
          border: "2px solid rgba(255,200,212,0.7)",
          boxShadow: "0 0 28px rgba(255,120,150,0.45), inset 0 0 14px rgba(0,0,0,0.35)",
        }}
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </div>
      <canvas ref={canvasRef} width={ringSize} height={ringSize} className="absolute inset-0" />
    </div>
  );
}

function Editor({
  slots,
  onChange,
}: {
  slots: typeof DEFAULT_IMAGES;
  onChange: (s: typeof DEFAULT_IMAGES) => void;
}) {
  return (
    <div className="w-full max-w-[1080px] bg-white/8 backdrop-blur rounded-lg p-6" style={{ background: "rgba(255,240,244,0.06)", border: "1px solid rgba(255,180,200,0.18)" }}>
      <h2 className="text-sm tracking-[0.3em] uppercase mb-4" style={{ color: "#f0a8b8" }}>Editor</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {TIERS.map((t) => {
          const slot = slots[t.key];
          return (
            <div key={t.key} className="flex flex-col items-stretch gap-2 p-3 rounded" style={{ background: "rgba(20,5,12,0.5)", border: "1px solid rgba(255,180,200,0.18)" }}>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold" style={{ color: "#fff0f4" }}>{t.name}</span>
                <span style={{ color: "#f0a8b8" }}>{t.kanji}</span>
              </div>
              <div className="relative w-full aspect-square overflow-hidden rounded">
                <img
                  src={slot.src}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: slot.nsfw ? "blur(10px)" : "none", transform: slot.nsfw ? "scale(1.1)" : "none" }}
                />
                {slot.nsfw && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-[#c8132a] text-white text-[10px] px-1.5 py-0.5 rounded">🔞</span>
                  </div>
                )}
              </div>
              <label className="text-xs cursor-pointer text-center py-1.5 rounded" style={{ background: "#c8132a", color: "#fff" }}>
                Swap image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    onChange({ ...slots, [t.key]: { ...slot, src: url } });
                  }}
                />
              </label>
              <label className="flex items-center justify-between text-xs" style={{ color: "#fbe0e7" }}>
                <span>NSFW blur</span>
                <input
                  type="checkbox"
                  checked={slot.nsfw}
                  onChange={(e) => onChange({ ...slots, [t.key]: { ...slot, nsfw: e.target.checked } })}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
