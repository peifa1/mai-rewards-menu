import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Mic, Move } from "lucide-react";

import artYokan from "@/assets/art-yokan.jpg.asset.json";
import artSensu from "@/assets/art-sensu.jpg.asset.json";
import artTomo from "@/assets/art-tomo.jpg.asset.json";
import artOkami from "@/assets/art-okami.jpg.asset.json";
import artDanna from "@/assets/art-danna.jpg.asset.json";
import chibi from "@/assets/chibi.png.asset.json";
import petal from "@/assets/petal.png.asset.json";
import thankYou from "@/assets/thankyou.png.asset.json";


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
  perks: string[];
};

const TIERS: Tier[] = [
  { key: "yokan", name: "Yokan", kanji: "羊羹", perks: ["ART", "WALL"] },
  { key: "sensu", name: "Sensu", kanji: "扇子", perks: ["18+", "BONUS"] },
  { key: "tomo",  name: "Tomo",  kanji: "友",   perks: ["PHOTO", "ASMR", "AUDIO", "VOICE"] },
  { key: "okami", name: "Okami", kanji: "女将", premium: true, perks: ["18+", "ASMR", "AUDIO", "VOTE"] },
  { key: "danna", name: "Danna", kanji: "旦那", premium: true, perks: ["18+", "ASMR", "AUDIO", "EXCL"] },
];

type ImgSlot = { src: string; nsfw: boolean; zoom: number; posX: number; posY: number };
type SlotsMap = Record<string, ImgSlot[]>;

const mk = (src: string, nsfw = false): ImgSlot => ({ src, nsfw, zoom: 1, posX: 50, posY: 30 });

const DEFAULT_SLOTS: SlotsMap = {
  yokan: [mk(artYokan.url), mk(artTomo.url)],
  sensu: [mk(artSensu.url, true), mk(artYokan.url)],
  tomo: [mk(artTomo.url), mk(artOkami.url)],
  okami: [mk(artOkami.url), mk(artDanna.url)],
  danna: [mk(artDanna.url), mk(artSensu.url, true)],
};


function Index() {
  const [slots, setSlots] = useState<SlotsMap>(DEFAULT_SLOTS);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const updateSlot = (tierKey: string, idx: number, next: Partial<ImgSlot>) => {
    setSlots((prev) => ({
      ...prev,
      [tierKey]: prev[tierKey].map((s, i) => (i === idx ? { ...s, ...next } : s)),
    }));
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1080,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportIgnore === "true"),
      });
      const link = document.createElement("a");
      link.download = "iomaya-mai-monthly-rewards.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-6 py-8 px-4" style={{ background: "#2a0a14" }}>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-6 py-2.5 rounded-full text-sm font-semibold tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #c8132a, #8a0a1c)",
          color: "#fff0f4",
          border: "1px solid rgba(255,200,215,0.4)",
          boxShadow: "0 6px 24px rgba(200,19,42,0.45), 0 0 0 1px rgba(255,180,200,0.15) inset",
        }}
      >
        {exporting ? "Exporting…" : "Export as Image"}
      </button>
      <CanvasScaler innerRef={canvasRef}>
        <Canvas slots={slots} onUpdateSlot={updateSlot} />
      </CanvasScaler>
      <Editor slots={slots} onChange={setSlots} />
    </div>
  );
}

function CanvasScaler({ children, innerRef }: { children: React.ReactNode; innerRef?: React.Ref<HTMLDivElement> }) {
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
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: 1080,
          height: 1080,
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,180,200,0.08), inset 0 0 120px rgba(0,0,0,0.35)",
          borderRadius: 8,
          overflow: "hidden",
        }}
        className="absolute top-0 left-0"
      >
        {children}
      </div>
    </div>
  );
}

type SlotUpdater = (tierKey: string, idx: number, next: Partial<ImgSlot>) => void;

function Canvas({ slots, onUpdateSlot }: { slots: SlotsMap; onUpdateSlot: SlotUpdater }) {
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


      {/* Header petals — crisp, brighter */}
      {[
        { x: 60, y: 60, r: -18, s: 0.65, o: 0.6 },
        { x: 180, y: 150, r: 30, s: 0.55, o: 0.5 },
        { x: 320, y: 70, r: -45, s: 0.5, o: 0.45 },
        { x: 90, y: 175, r: 55, s: 0.45, o: 0.4 },
      ].map((p, i) => (
        <img
          key={`h${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: p.x, top: p.y, width: 90 * p.s, height: "auto",
            transform: `rotate(${p.r}deg)`, opacity: p.o,
            filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
            zIndex: 1,
          }}
        />
      ))}

      {/* Footer petals — crisp */}
      {[
        { x: 120, y: 960, r: 20, s: 0.7, o: 0.55 },
        { x: 260, y: 1010, r: -35, s: 0.55, o: 0.45 },
        { x: 820, y: 980, r: 48, s: 0.6, o: 0.5 },
        { x: 940, y: 1020, r: -12, s: 0.5, o: 0.45 },
        { x: 60, y: 1030, r: 65, s: 0.45, o: 0.4 },
      ].map((p, i) => (
        <img
          key={`f${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: p.x, top: p.y, width: 90 * p.s, height: "auto",
            transform: `rotate(${p.r}deg)`, opacity: p.o,
            filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
            zIndex: 1,
          }}
        />
      ))}

      {/* Behind-rows petals — blurred & faint, kept to far-left margin so they never sit over tier text */}
      {[
        { x: 18, y: 320, r: -22, s: 0.55, o: 0.18 },
        { x: 8, y: 470, r: 40, s: 0.45, o: 0.15 },
        { x: 30, y: 610, r: -50, s: 0.5, o: 0.16 },
        { x: 10, y: 780, r: 25, s: 0.4, o: 0.14 },
        { x: 36, y: 880, r: 60, s: 0.5, o: 0.16 },
      ].map((p, i) => (
        <img
          key={`b${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: p.x, top: p.y, width: 90 * p.s, height: "auto",
            transform: `rotate(${p.r}deg)`, opacity: p.o,
            filter: "blur(3px)",
            zIndex: 0,
          }}
        />
      ))}

      {/* Chibi + thank you in top right (compact) */}
      <img
        src={chibi.url}
        alt=""
        className="absolute pointer-events-none select-none"
        style={{ top: 24, right: 56, width: 140, filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))", zIndex: 3 }}
      />
      <img
        src={thankYou.url}
        alt="thank you"
        className="absolute pointer-events-none select-none"
        style={{ top: 40, right: 186, width: 92, transform: "rotate(-10deg)", filter: "drop-shadow(0 2px 10px rgba(255,140,170,0.45))", zIndex: 3 }}
      />

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
            <TierRow tier={t} images={slots[t.key]} onUpdateSlot={onUpdateSlot} />
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

function AdjustOverlay({
  im,
  clipPath,
  left,
  width,
  onChange,
}: {
  im: ImgSlot;
  clipPath: string;
  left: number;
  width: number;
  onChange: (next: Partial<ImgSlot>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep latest im in a ref so wheel/drag handlers always read current values
  const imRef = useRef(im);
  imRef.current = im;

  // Attach a non-passive wheel listener so we can preventDefault (page won't scroll)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = imRef.current;
      const delta = -e.deltaY * 0.0015;
      const next = Math.max(1, Math.min(6, cur.zoom + delta));
      onChange({ zoom: parseFloat(next.toFixed(3)) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onChange]);

  const handleDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = imRef.current.posX;
    const startPosY = imRef.current.posY;
    // Sensitivity: dampen overall, and reduce more as zoom grows
    const sens = 0.35;
    const onMove = (ev: MouseEvent) => {
      const z = Math.max(1, imRef.current.zoom);
      const dx = ((ev.clientX - startX) / rect.width) * 100 * (sens / z);
      const dy = ((ev.clientY - startY) / rect.height) * 100 * (sens / z);
      onChange({
        posX: Math.max(0, Math.min(100, startPosX - dx)),
        posY: Math.max(0, Math.min(100, startPosY - dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={ref}
      className="absolute top-0 h-full cursor-move group"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        WebkitClipPath: clipPath,
        clipPath,
      }}
      onMouseDown={handleDown}
      onDoubleClick={() => onChange({ zoom: 1, posX: 50, posY: 30 })}
      title="Drag to pan · Scroll to zoom · Double-click to reset"
    >
      <div
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold pointer-events-none"
        style={{
          top: 8,
          right: 10,
          background: "rgba(0,0,0,0.6)",
          color: "#ffd6e0",
          border: "1px solid rgba(255,200,215,0.35)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Move size={11} />
        <span>{im.zoom.toFixed(2)}×</span>
      </div>
    </div>
  );
}

function TierRow({ tier, images, onUpdateSlot }: { tier: Tier; images: ImgSlot[]; onUpdateSlot: SlotUpdater }) {
  const isTop = tier.key === "danna";
  const isMid = tier.key === "okami";
  const rowHeight = isTop ? 156 : tier.premium ? 142 : 128;
  const nameColor = tier.premium ? "#fff8fa" : "#f7dde4";
  const kanjiColor = tier.premium ? "#ffd6e0" : "#e8a8b8";

  // 2-image panoramic strip with diagonal cut.
  // Each image gets its OWN bounding box (its own slice of the strip),
  // so pan/zoom act within that slice instead of the whole strip.
  const groupWidthPct = 64;
  const mid = 50;
  const skew = 6;
  const s0Width = mid + skew;       // 56
  const s1Left = mid - skew;        // 44
  const s1Width = 100 - s1Left;     // 56
  const slices = [
    { left: 0, width: s0Width },
    { left: s1Left, width: s1Width },
  ];
  const polys = [
    `polygon(0 0, 100% 0, ${((mid - skew) / s0Width) * 100}% 100%, 0 100%)`,
    `polygon(${((mid + skew - s1Left) / s1Width) * 100}% 0, 100% 0, 100% 100%, 0 100%)`,
  ];

  // Prestige treatment — Danna (top) > Okami (mid) > rest
  const prestigeBg: React.CSSProperties | undefined = isTop
    ? {
        background:
          "linear-gradient(90deg, rgba(255,180,200,0.16) 0%, rgba(255,150,175,0.09) 35%, transparent 72%)",
        boxShadow: "inset 0 0 55px rgba(255,150,180,0.16)",
      }
    : isMid
    ? {
        background:
          "linear-gradient(90deg, rgba(255,170,190,0.07) 0%, rgba(255,140,165,0.04) 35%, transparent 70%)",
        boxShadow: "inset 0 0 28px rgba(255,140,170,0.07)",
      }
    : undefined;

  const borderColor = isTop ? "#ffd28a" : isMid ? "#ffb3c4" : "transparent";
  const borderWidth = isTop ? 4 : tier.premium ? 3 : 3;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: rowHeight,
        borderLeft: `${borderWidth}px solid ${borderColor}`,
        paddingLeft: 18,
        ...prestigeBg,
      }}
    >
      {/* Premium prestige left glow accent */}
      {tier.premium && (
        <div
          className="absolute left-0 top-0 h-full pointer-events-none"
          style={{
            width: isTop ? 110 : 80,
            background: isTop
              ? "linear-gradient(90deg, rgba(255,200,160,0.30) 0%, rgba(255,180,200,0.18) 40%, transparent 100%)"
              : "linear-gradient(90deg, rgba(255,180,200,0.16) 0%, transparent 100%)",
          }}
        />
      )}

      {/* Image panoramic strip with mask */}
      <div
        className="absolute top-0 right-0 h-full pointer-events-none"
        style={{
          width: `${groupWidthPct}%`,
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 55%, #000 100%)",
          maskImage:
            "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 55%, #000 100%)",
        }}
      >
        {images.slice(0, 2).map((im, idx) => (
          <div
            key={idx}
            className="absolute top-0 h-full overflow-hidden"
            style={{
              left: `${slices[idx].left}%`,
              width: `${slices[idx].width}%`,
              WebkitClipPath: polys[idx],
              clipPath: polys[idx],
            }}
          >
            <img
              src={im.src}
              alt=""
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: "cover",
                objectPosition: `${im.posX}% ${im.posY}%`,
                transform: `scale(${im.zoom}) ${im.nsfw ? "scale(1.1)" : ""}`.trim(),
                transformOrigin: `${im.posX}% ${im.posY}%`,
                filter: im.nsfw ? "blur(16px) saturate(1.1)" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Crimson tint overlay on the image area */}
      <div
        className="absolute top-0 right-0 h-full pointer-events-none"
        style={{
          width: `${groupWidthPct}%`,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(74,12,34,0.28) 55%, rgba(74,12,34,0.42) 100%)",
          mixBlendMode: "multiply",
        }}
      />


      {/* Interactive adjust overlay (excluded from export) */}
      <div
        data-export-ignore="true"
        className="absolute top-0 right-0 h-full z-30"
        style={{ width: `${groupWidthPct}%` }}
      >
        {images.slice(0, 2).map((im, idx) => (
          <AdjustOverlay
            key={idx}
            im={im}
            clipPath={polys[idx]}
            left={slices[idx].left}
            width={slices[idx].width}
            onChange={(next) => onUpdateSlot(tier.key, idx, next)}
          />
        ))}
      </div>

      {/* Tier name */}
      <div className="relative h-full flex items-center z-10">
        <div className="flex items-baseline gap-4">
          {tier.premium && (
            <div
              className="font-tambyon"
              style={{
                fontSize: isTop ? 26 : 20,
                color: isTop ? "#ffd28a" : "#ffc7a0",
                letterSpacing: "-0.15em",
                marginRight: 4,
                textShadow: isTop ? "0 0 12px rgba(255,200,140,0.6)" : "none",
              }}
            >
              {isTop ? "✦✦" : "✦"}
            </div>
          )}
          <div
            className="font-tambyon"
            style={{
              fontSize: isTop ? 66 : tier.premium ? 56 : 50,
              color: nameColor,
              lineHeight: 1,
              letterSpacing: "0.04em",
              textShadow: isTop
                ? "0 2px 22px rgba(255,180,140,0.65), 0 0 1px rgba(255,235,210,0.7)"
                : isMid
                ? "0 2px 12px rgba(255,150,180,0.40)"
                : "0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            {tier.name}
          </div>
          <div
            className="font-tambyon"
            style={{
              fontSize: isTop ? 34 : tier.premium ? 30 : 26,
              color: kanjiColor,
              opacity: 0.95,
            }}
          >
            ({tier.kanji})
          </div>
        </div>
      </div>

      {/* Perk pills */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5 z-20">
        {tier.perks.map((p) => {
          const isAudio = p === "AUDIO";
          const isAsmr = p === "ASMR";
          const hasMic = isAudio || isAsmr;
          const accent = isTop ? "#ffd28a" : isMid ? "#ffc7a0" : "#ffb8c8";
          const audioMinutes = isAudio ? (tier.key === "okami" ? 10 : tier.key === "danna" ? 20 : 0) : 0;
          // Static "audio visualizer" bar heights (deterministic per pill type)
          const bars = isAudio
            ? [3, 6, 9, 5, 8, 4, 7, 10, 6, 3]
            : [4, 7, 5, 9, 6, 8, 4, 7, 5, 3];
          return (
            <div
              key={p}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest inline-flex items-center gap-1.5"
              style={{
                background: hasMic
                  ? isTop
                    ? `linear-gradient(90deg, ${accent}35 0%, rgba(50,15,22,0.88) 40%, rgba(40,10,20,0.92) 100%)`
                    : `linear-gradient(90deg, ${accent}22 0%, rgba(40,10,20,0.85) 45%, rgba(40,10,20,0.9) 100%)`
                  : tier.premium ? "rgba(30,8,16,0.7)" : "rgba(20,5,12,0.6)",
                color: p === "18+" ? "#ff8aa0" : hasMic ? "#fff4e0" : tier.premium ? "#ffe8ee" : "#fbe0e7",
                border: hasMic
                  ? isTop
                    ? `1.5px solid ${accent}`
                    : `1px solid ${accent}`
                  : isTop
                  ? "1px solid rgba(255,215,170,0.55)"
                  : tier.premium
                  ? "1px solid rgba(255,200,215,0.38)"
                  : "1px solid rgba(255,180,200,0.30)",
                backdropFilter: "blur(4px)",
                boxShadow: hasMic
                  ? isTop
                    ? `0 0 20px ${accent}88, inset 0 0 12px ${accent}44`
                    : `0 0 14px ${accent}66, inset 0 0 8px ${accent}33`
                  : isTop
                  ? "0 0 14px rgba(255,180,140,0.28)"
                  : isMid
                  ? "0 0 8px rgba(255,150,180,0.12)"
                  : "none",
                textShadow: hasMic
                  ? isTop
                    ? `0 0 10px ${accent}cc, 0 0 4px ${accent}88`
                    : `0 0 6px ${accent}aa`
                  : undefined,
              }}
            >
              {hasMic && (
                <Mic
                  size={10}
                  strokeWidth={2.5}
                  style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent}aa)` }}
                />
              )}
              {hasMic && (
                <span className="inline-flex items-end gap-[1.5px] h-[11px]">
                  {bars.map((h, i) => (
                    <span
                      key={i}
                      style={{
                        width: 1.5,
                        height: h,
                        background: `linear-gradient(180deg, ${accent}, ${accent}66)`,
                        borderRadius: 1,
                        boxShadow: `0 0 3px ${accent}88`,
                      }}
                    />
                  ))}
                </span>
              )}
              <span>{p}</span>
              {isAudio && audioMinutes > 0 && (
                <span
                  className="ml-0.5 px-1.5 rounded-full text-[8px] leading-none py-[2px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                    color: "#2a0a14",
                    letterSpacing: "0.05em",
                    boxShadow: `0 0 6px ${accent}88`,
                  }}
                >
                  +{audioMinutes} MIN
                </span>
              )}
              {isAudio && (
                <span
                  className="ml-0.5 px-1 rounded-sm text-[8px] leading-none py-[1px]"
                  style={{
                    background: "rgba(255,138,160,0.18)",
                    color: "#ff8aa0",
                    border: "1px solid rgba(255,138,160,0.5)",
                    letterSpacing: "0.05em",
                  }}
                >
                  18+
                </span>
              )}
            </div>
          );
        })}
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
                      updateSlot(t.key, idx, { src: URL.createObjectURL(file), zoom: 1, posX: 50, posY: 30 });
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
