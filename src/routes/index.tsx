import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Iomaya Mai — Monthly Rewards" },
      { name: "description", content: "Iomaya Mai's monthly Patreon reward menu — a Japanese-style omakase card of tiers." },
      { property: "og:title", content: "Iomaya Mai — Monthly Rewards" },
      { property: "og:description", content: "A Japanese-style monthly reward menu for Iomaya Mai's Patreon." },
    ],
  }),
  component: Index,
});

type Tier = {
  key: string;
  name: string;
  kanji: string;
  desc: string;
  premium?: "silver" | "crimson";
};

const TIERS: Tier[] = [
  { key: "yokan",  name: "Yokan",  kanji: "羊羹", desc: "SFW & NSFW art · sketches · wallpapers" },
  { key: "sensu",  name: "Sensu",  kanji: "扇子", desc: "Extra monthly art + bonus NSFW pieces" },
  { key: "tomo",   name: "Tomo",   kanji: "友",   desc: "Full photo sets · cosplay · ASMR & voice notes" },
  { key: "okami",  name: "Okami",  kanji: "女将", desc: "+10min NSFW audio · priority voting", premium: "silver" },
  { key: "danna",  name: "Danna",  kanji: "旦那", desc: "+20min audio · personalised RP · exclusives", premium: "crimson" },
];

const DEFAULT_IMAGES: Record<string, { src: string; nsfw: boolean }> = {
  yokan: { src: "/images/ahri.jpg", nsfw: false },
  sensu: { src: "/images/ahri-nsfw.jpg", nsfw: true },
  tomo:  { src: "/images/cosplay.jpg", nsfw: false },
  okami: { src: "/images/cosplay-nsfw.jpg", nsfw: true },
  danna: { src: "/images/ahri-nsfw.jpg", nsfw: true },
};

function Index() {
  const [slots, setSlots] = useState(DEFAULT_IMAGES);

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-10 py-10 px-4" style={{ background: "#f3dde2" }}>
      <CanvasScaler>
        <Canvas slots={slots} />
      </CanvasScaler>

      <Editor slots={slots} onChange={setSlots} />
    </div>
  );
}

function CanvasScaler({ children }: { children: React.ReactNode }) {
  // Scale the fixed 1080 canvas to fit viewport width on small screens, never above 1.
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
    <div className="washi relative font-tambyon" style={{ width: 1080, height: 1080, overflow: "hidden" }}>
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-6 relative">
        <div className="text-[13px] tracking-[0.5em] text-[#a36b76] uppercase">Iomaya Mai · Patreon</div>
        <div className="font-tambyon text-[64px] leading-none mt-3 text-[#3a1f26]">月間リワード</div>
        <div className="font-tambyon text-[22px] mt-2 text-[#7a4855] italic">— Monthly Reward Menu —</div>
      </div>

      {/* Sakura corner sprinkles */}
      <Sakura className="absolute top-6 left-8 text-3xl rotate-[-12deg]" />
      <Sakura className="absolute top-10 right-10 text-2xl rotate-[18deg]" />
      <div className="absolute top-20 right-24 text-2xl">🐙</div>
      <div className="absolute bottom-28 left-10 text-3xl">🍡</div>
      <div className="absolute bottom-20 right-16 text-3xl">🐟</div>
      <Sakura className="absolute bottom-10 left-1/2 text-2xl rotate-[8deg]" />

      {/* Menu rows */}
      <div className="px-16 mt-2 flex flex-col">
        {TIERS.map((t, i) => (
          <div key={t.key}>
            <TierRow tier={t} slot={slots[t.key]} />
            {i < TIERS.length - 1 && <div className="divider-dots my-2" />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center">
        <div className="font-tambyon text-[20px] tracking-[0.4em] text-[#7a4855]">MAY 2025</div>
        <div className="font-tambyon text-[14px] tracking-[0.6em] text-[#a36b76] mt-1">月間リワード</div>
      </div>
    </div>
  );
}

function TierRow({ tier, slot }: { tier: Tier; slot: { src: string; nsfw: boolean } }) {
  const isPremium = Boolean(tier.premium);
  const rowHeight = isPremium ? 150 : 118;

  const bgStyle: React.CSSProperties =
    tier.premium === "silver"
      ? { background: "linear-gradient(90deg, rgba(220,220,230,0.5), rgba(245,245,250,0.25) 60%, rgba(200,205,215,0.35))" }
      : tier.premium === "crimson"
      ? { background: "linear-gradient(90deg, rgba(140,30,40,0.18), rgba(180,50,60,0.08) 60%, rgba(120,20,30,0.18))" }
      : {};

  const nameColor = tier.premium === "crimson" ? "#6b1620" : tier.premium === "silver" ? "#3a3f4a" : "#3a1f26";

  return (
    <div
      className="flex items-center gap-6 px-5 rounded-md relative"
      style={{ height: rowHeight, ...bgStyle, border: isPremium ? "1px solid rgba(0,0,0,0.06)" : "none" }}
    >
      {/* Left: name + kanji */}
      <div className="flex-1 flex items-baseline gap-5">
        <div className="font-tambyon" style={{ fontSize: isPremium ? 56 : 44, color: nameColor, lineHeight: 1 }}>
          {tier.name}
        </div>
        <div style={{ fontSize: isPremium ? 36 : 28, color: nameColor, opacity: 0.65 }}>{tier.kanji}</div>
      </div>

      {/* Description */}
      <div className="hidden" />
      <div className="max-w-[360px] text-right">
        <div className="font-tambyon italic" style={{ fontSize: isPremium ? 19 : 17, color: "#5a2d38" }}>
          {tier.desc}
        </div>
      </div>

      {/* Image preview */}
      <div
        className="relative shrink-0 overflow-hidden rounded-sm"
        style={{
          width: isPremium ? 130 : 96,
          height: isPremium ? 130 : 96,
          boxShadow: "0 4px 14px rgba(90,30,50,0.15)",
          border: tier.premium === "crimson" ? "2px solid #6b1620" : tier.premium === "silver" ? "2px solid #b8bcc8" : "2px solid #fff",
        }}
      >
        <img
          src={slot.src}
          alt={tier.name}
          className="w-full h-full object-cover"
          style={{ filter: slot.nsfw ? "blur(14px) saturate(1.1)" : "none", transform: slot.nsfw ? "scale(1.15)" : "none" }}
        />
        {slot.nsfw && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-2 py-0.5 text-[11px] font-bold tracking-wider rounded-sm" style={{ background: "#c8132a", color: "#fff" }}>
              🔞 NSFW
            </div>
          </div>
        )}
      </div>

      {/* Hanko stamp for premium */}
      {isPremium && (
        <div
          className="absolute -top-2 -left-2 w-14 h-14 rounded-sm flex items-center justify-center font-tambyon text-white text-[11px] leading-tight text-center rotate-[-14deg]"
          style={{ background: "#c8132a", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", border: "2px solid #fff" }}
        >
          認<br/>定
        </div>
      )}
    </div>
  );
}

function Sakura({ className = "" }: { className?: string }) {
  return <span className={className} aria-hidden>🌸</span>;
}

function Editor({
  slots,
  onChange,
}: {
  slots: typeof DEFAULT_IMAGES;
  onChange: (s: typeof DEFAULT_IMAGES) => void;
}) {
  return (
    <div className="w-full max-w-[1080px] bg-white/70 backdrop-blur rounded-lg p-6 shadow-sm">
      <h2 className="text-sm tracking-[0.3em] uppercase text-[#7a4855] mb-4">Editor</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {TIERS.map((t) => {
          const slot = slots[t.key];
          return (
            <div key={t.key} className="flex flex-col items-stretch gap-2 p-3 rounded border border-[#e7c8d0] bg-[#fff7f9]">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-[#3a1f26]">{t.name}</span>
                <span className="text-[#a36b76]">{t.kanji}</span>
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
              <label className="text-xs cursor-pointer text-center bg-[#f5b8c4] hover:bg-[#f0a3b2] text-[#3a1f26] py-1.5 rounded">
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
              <label className="flex items-center justify-between text-xs text-[#3a1f26]">
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
