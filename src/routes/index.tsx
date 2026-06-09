import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type Tier = {
  key: string;
  name: string;
  kanji: string;
  premium?: boolean;
};

const TIERS: Tier[] = [
  { key: "yokan", name: "Yokan", kanji: "羊羹" },
  { key: "sensu", name: "Sensu", kanji: "扇子" },
  { key: "tomo",  name: "Tomo",  kanji: "友" },
  { key: "okami", name: "Okami", kanji: "女将", premium: true },
  { key: "danna", name: "Danna", kanji: "旦那", premium: true },
];

type ImgSlot = { src: string; nsfw: boolean };
type SlotsMap = Record<string, ImgSlot[]>;

const DEFAULT_SLOTS: SlotsMap = {
  yokan: [
    { src: artYokan.url, nsfw: false },
    { src: artTomo.url,  nsfw: false },
    { src: artOkami.url, nsfw: false },
  ],
  sensu: [
    { src: artSensu.url, nsfw: true },
    { src: artYokan.url, nsfw: false },
    { src: artDanna.url, nsfw: false },
  ],
  tomo: [
    { src: artTomo.url,  nsfw: false },
    { src: artOkami.url, nsfw: false },
    { src: artYokan.url, nsfw: false },
  ],
  okami: [
    { src: artOkami.url, nsfw: false },
    { src: artDanna.url, nsfw: false },
    { src: artSensu.url, nsfw: true },
  ],
  danna: [
    { src: artDanna.url, nsfw: false },
    { src: artSensu.url, nsfw: true },
    { src: artYokan.url, nsfw: false },
  ],
};

function Index() {
  const [slots, setSlots] = useState<SlotsMap>(DEFAULT_SLOTS);

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

function Canvas({ slots }: { slots: SlotsMap }) {
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
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='9'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.7  0 0 0 0 0.78  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 24,
          border: "1px solid rgba(255,180,200,0.22)",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.45)",
        }}
      />

      <img src={deco07.url} alt="" className="absolute top-8 left-8 w-20 h-20 opacity-80 -rotate-12 pointer-events-none" />
      <img src={deco02.url} alt="" className="absolute top-10 right-10 w-16 h-16 opacity-80 rotate-12 pointer-events-none" />
      <img src={deco03.url} alt="" className="absolute bottom-24 right-10 w-20 h-20 opacity-80 rotate-3 pointer-events-none" />

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

      <div className="relative mt-2 flex flex-col" style={{ padding: "0 56px" }}>
        {TIERS.map((t, i) => (
          <div key={t.key}>
            <TierRow tier={t} images={slots[t.key]} />
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

function TierRow({ tier, images }: { tier: Tier; images: ImgSlot[] }) {
  const rowHeight = tier.premium ? 144 : 128;
  const nameColor = tier.premium ? "#fff4f7" : "#f7dde4";
  const kanjiColor = tier.premium ? "#ffc8d4" : "#e8a8b8";

  // 3-image spread occupies right ~62% of row, fading L→R.
  const groupWidthPct = 62;
  const imgW = 180;
  const imgH = rowHeight - 16;
  const gap = 10;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: rowHeight,
        borderLeft: tier.premium ? "3px solid #ff6a86" : "3px solid transparent",
        paddingLeft: 18,
      }}
    >
      {/* Image spread group with mask */}
      <div
        className="absolute top-0 right-0 h-full pointer-events-none"
        style={{
          width: `${groupWidthPct}%`,
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.75) 55%, #000 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.75) 55%, #000 100%)",
        }}
      >
        <div
          className="absolute top-1/2 right-2 -translate-y-1/2 flex"
          style={{ gap }}
        >
          {images.slice(0, 3).map((im, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-[3px]"
              style={{
                width: imgW,
                height: imgH,
                boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,200,212,0.18)",
              }}
            >
              <img
                src={im.src}
                alt=""
                className="w-full h-full object-cover"
                style={{
                  filter: im.nsfw ? "blur(16px) saturate(1.1)" : "none",
                  transform: im.nsfw ? "scale(1.15)" : "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Crimson tint overlay on the image area */}
      <div
        className="absolute top-0 right-0 h-full pointer-events-none"
        style={{
          width: `${groupWidthPct}%`,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(74,12,34,0.30) 55%, rgba(74,12,34,0.45) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Tier name */}
      <div className="relative h-full flex items-center z-10">
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
    </div>
  );
}

function Editor({
  slots,
  onChange,
}: {
  slots: SlotsMap;
  onChange: (s: SlotsMap) => void;
}) {
  const updateSlot = (tierKey: string, idx: number, next: Partial<ImgSlot>) => {
    const arr = slots[tierKey].map((s, i) => (i === idx ? { ...s, ...next } : s));
    onChange({ ...slots, [tierKey]: arr });
  };

  return (
    <div className="w-full max-w-[1080px] rounded-lg p-6" style={{ background: "rgba(255,240,244,0.06)", border: "1px solid rgba(255,180,200,0.18)" }}>
      <h2 className="text-sm tracking-[0.3em] uppercase mb-4" style={{ color: "#f0a8b8" }}>Editor</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {TIERS.map((t) => (
          <div key={t.key} className="flex flex-col gap-2 p-3 rounded" style={{ background: "rgba(20,5,12,0.5)", border: "1px solid rgba(255,180,200,0.18)" }}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold" style={{ color: "#fff0f4" }}>{t.name}</span>
              <span style={{ color: "#f0a8b8" }}>{t.kanji}</span>
            </div>
            {slots[t.key].map((s, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="relative w-full aspect-square overflow-hidden rounded">
                  <img
                    src={s.src}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: s.nsfw ? "blur(8px)" : "none", transform: s.nsfw ? "scale(1.1)" : "none" }}
                  />
                </div>
                <label className="text-[11px] cursor-pointer text-center py-1 rounded" style={{ background: "#c8132a", color: "#fff" }}>
                  Swap #{idx + 1}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      updateSlot(t.key, idx, { src: URL.createObjectURL(file) });
                    }}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px]" style={{ color: "#fbe0e7" }}>
                  <span>NSFW blur</span>
                  <input
                    type="checkbox"
                    checked={s.nsfw}
                    onChange={(e) => updateSlot(t.key, idx, { nsfw: e.target.checked })}
                  />
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
