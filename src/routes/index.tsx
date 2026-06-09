import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toPng } from "html-to-image";
import { Mic, Move, ArrowUp, ArrowDown, Plus, Trash2, AudioLines } from "lucide-react";

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

type Perk = {
  id: string;
  label: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  showMic?: boolean;
  showVisualizer?: boolean;
  badge?: string;
  badgeBg?: string;
  badgeTextColor?: string;
};

type Tier = {
  key: string;
  name: string;
  kanji: string;
  premium?: boolean;
  perks: Perk[];
};

let _uid = 0;
const uid = () => `p${++_uid}`;
const p = (label: string, extra: Partial<Perk> = {}): Perk => ({ id: uid(), label, ...extra });

const ACCENT_STD = "#ffb8c8";
const ACCENT_MID = "#ffc7a0";
const ACCENT_TOP = "#ffd28a";

const PILL_MIC_BG = "linear-gradient(90deg, rgba(255,184,200,0.18) 0%, rgba(40,10,20,0.85) 45%, rgba(40,10,20,0.9) 100%)";
const PILL_DEFAULT_BG = "rgba(20,5,12,0.6)";
const PILL_DEFAULT_BORDER = "rgba(255,180,200,0.30)";
const PILL_DEFAULT_TEXT = "#fbe0e7";

const INITIAL_TIERS: Tier[] = [
  {
    key: "yokan", name: "Yokan", kanji: "羊羹",
    perks: [p("ART"), p("WALL")],
  },
  {
    key: "sensu", name: "Sensu", kanji: "扇子",
    perks: [
      p("18+", { textColor: "#ff8aa0", bgColor: "rgba(255,138,160,0.18)", borderColor: "rgba(255,138,160,0.55)" }),
      p("BONUS"),
    ],
  },
  {
    key: "tomo", name: "Tomo", kanji: "友",
    perks: [
      p("PHOTO"),
      p("ASMR", { showMic: true, showVisualizer: true, borderColor: ACCENT_STD }),
      p("AUDIO", { showMic: true, showVisualizer: true, borderColor: ACCENT_STD }),
      p("VOICE"),
    ],
  },
  {
    key: "okami", name: "Okami", kanji: "女将", premium: true,
    perks: [
      p("18+", { textColor: "#ff8aa0", bgColor: "rgba(255,138,160,0.18)", borderColor: "rgba(255,138,160,0.55)" }),
      p("ASMR", { showMic: true, showVisualizer: true, borderColor: ACCENT_MID }),
      p("AUDIO", { showMic: true, showVisualizer: true, borderColor: ACCENT_MID, badge: "+10 MIN", badgeBg: ACCENT_MID, badgeTextColor: "#2a0a14" }),
      p("VOTE"),
    ],
  },
  {
    key: "danna", name: "Danna", kanji: "旦那", premium: true,
    perks: [
      p("18+", { textColor: "#ff8aa0", bgColor: "rgba(255,138,160,0.18)", borderColor: "rgba(255,138,160,0.55)" }),
      p("ASMR", { showMic: true, showVisualizer: true, borderColor: ACCENT_TOP }),
      p("AUDIO", { showMic: true, showVisualizer: true, borderColor: ACCENT_TOP, badge: "+20 MIN", badgeBg: ACCENT_TOP, badgeTextColor: "#2a0a14" }),
      p("EXCL"),
    ],
  },
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
  const [tiers, setTiers] = useState<Tier[]>(INITIAL_TIERS);
  const [dateText, setDateText] = useState("MAY 2025");
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
        <Canvas tiers={tiers} slots={slots} onUpdateSlot={updateSlot} dateText={dateText} />
      </CanvasScaler>
      <Editor
        tiers={tiers}
        onTiersChange={setTiers}
        slots={slots}
        onChange={setSlots}
        dateText={dateText}
        onDateChange={setDateText}
      />
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

function Canvas({ tiers, slots, onUpdateSlot, dateText }: { tiers: Tier[]; slots: SlotsMap; onUpdateSlot: SlotUpdater; dateText: string }) {
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


      {[
        { x: 60, y: 60, r: -18, s: 0.65, o: 0.6 },
        { x: 180, y: 150, r: 30, s: 0.55, o: 0.5 },
        { x: 320, y: 70, r: -45, s: 0.5, o: 0.45 },
        { x: 90, y: 175, r: 55, s: 0.45, o: 0.4 },
      ].map((pt, i) => (
        <img
          key={`h${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: pt.x, top: pt.y, width: 90 * pt.s, height: "auto",
            transform: `rotate(${pt.r}deg)`, opacity: pt.o,
            filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
            zIndex: 1,
          }}
        />
      ))}

      {[
        { x: 120, y: 960, r: 20, s: 0.7, o: 0.55 },
        { x: 260, y: 1010, r: -35, s: 0.55, o: 0.45 },
        { x: 820, y: 980, r: 48, s: 0.6, o: 0.5 },
        { x: 940, y: 1020, r: -12, s: 0.5, o: 0.45 },
        { x: 60, y: 1030, r: 65, s: 0.45, o: 0.4 },
      ].map((pt, i) => (
        <img
          key={`f${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: pt.x, top: pt.y, width: 90 * pt.s, height: "auto",
            transform: `rotate(${pt.r}deg)`, opacity: pt.o,
            filter: "drop-shadow(0 2px 6px rgba(255,140,170,0.3))",
            zIndex: 1,
          }}
        />
      ))}

      {[
        { x: 18, y: 320, r: -22, s: 0.55, o: 0.18 },
        { x: 8, y: 470, r: 40, s: 0.45, o: 0.15 },
        { x: 30, y: 610, r: -50, s: 0.5, o: 0.16 },
        { x: 10, y: 780, r: 25, s: 0.4, o: 0.14 },
        { x: 36, y: 880, r: 60, s: 0.5, o: 0.16 },
      ].map((pt, i) => (
        <img
          key={`b${i}`}
          src={petal.url}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: pt.x, top: pt.y, width: 90 * pt.s, height: "auto",
            transform: `rotate(${pt.r}deg)`, opacity: pt.o,
            filter: "blur(3px)",
            zIndex: 0,
          }}
        />
      ))}

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
        {tiers.map((t, i) => (
          <div key={t.key}>
            <TierRow tier={t} images={slots[t.key]} onUpdateSlot={onUpdateSlot} index={i} total={tiers.length} />
            {i < tiers.length - 1 && (
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
          {dateText}
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
  const imRef = useRef(im);
  imRef.current = im;

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
        }}
      >
        <Move size={11} />
        <span>{im.zoom.toFixed(2)}×</span>
      </div>
    </div>
  );
}

function TierRow({ tier, images, onUpdateSlot, index, total }: { tier: Tier; images: ImgSlot[]; onUpdateSlot: SlotUpdater; index: number; total: number }) {
  const isTop = index === total - 1;
  const isMid = index === total - 2 && tier.premium;
  const rowHeight = isTop ? 156 : tier.premium ? 142 : 128;
  const nameColor = tier.premium ? "#fff8fa" : "#f7dde4";
  const kanjiColor = tier.premium ? "#ffd6e0" : "#e8a8b8";

  const groupWidthPct = 64;
  const mid = 50;
  const skew = 6;
  const s0Width = mid + skew;
  const s1Left = mid - skew;
  const s1Width = 100 - s1Left;
  const slices = [
    { left: 0, width: s0Width },
    { left: s1Left, width: s1Width },
  ];
  const polys = [
    `polygon(0 0, 100% 0, ${((mid - skew) / s0Width) * 100}% 100%, 0 100%)`,
    `polygon(${((mid + skew - s1Left) / s1Width) * 100}% 0, 100% 0, 100% 100%, 0 100%)`,
  ];

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

  const tierBorderColor = isTop ? ACCENT_TOP : isMid ? ACCENT_MID : "transparent";
  const borderWidth = isTop ? 4 : tier.premium ? 3 : 3;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: rowHeight,
        borderLeft: `${borderWidth}px solid ${tierBorderColor}`,
        paddingLeft: 18,
        ...prestigeBg,
      }}
    >
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

      <div
        className="absolute top-0 right-0 h-full pointer-events-none"
        style={{
          width: `${groupWidthPct}%`,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(74,12,34,0.28) 55%, rgba(74,12,34,0.42) 100%)",
          mixBlendMode: "multiply",
        }}
      />

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

      <div className="relative h-full flex items-center z-10">
        <div className="flex items-baseline gap-4">
          {tier.premium && (
            <div
              className="font-tambyon"
              style={{
                fontSize: isTop ? 26 : 20,
                color: isTop ? ACCENT_TOP : ACCENT_MID,
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

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5 z-20">
        {tier.perks.map((perk) => (
          <PerkPill key={perk.id} perk={perk} />
        ))}
      </div>
    </div>
  );
}

function PerkPill({ perk }: { perk: Perk }) {
  const bars = [3, 6, 9, 5, 8, 4, 7, 10, 6, 3];
  const accent = perk.borderColor || ACCENT_STD;
  const bg = perk.bgColor || (perk.showMic || perk.showVisualizer ? PILL_MIC_BG : PILL_DEFAULT_BG);
  const border = perk.borderColor || PILL_DEFAULT_BORDER;
  const color = perk.textColor || PILL_DEFAULT_TEXT;
  return (
    <div
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest inline-flex items-center gap-1.5"
      style={{
        background: bg,
        color,
        border: `1px solid ${border}`,
        boxShadow: perk.borderColor ? `0 0 10px ${accent}55` : "none",
      }}
    >
      {perk.showMic && (
        <Mic size={10} strokeWidth={2.5} style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent}aa)` }} />
      )}
      {perk.showVisualizer && (
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
      <span>{perk.label}</span>
      {perk.badge && (
        <span
          className="ml-0.5 px-1.5 rounded-full text-[8px] leading-none py-[2px] font-bold"
          style={{
            background: perk.badgeBg
              ? `linear-gradient(135deg, ${perk.badgeBg}, ${perk.badgeBg}aa)`
              : "rgba(255,255,255,0.15)",
            color: perk.badgeTextColor || "#2a0a14",
            letterSpacing: "0.05em",
            boxShadow: perk.badgeBg ? `0 0 6px ${perk.badgeBg}88` : "none",
          }}
        >
          {perk.badge}
        </span>
      )}
    </div>
  );
}


function Editor({
  tiers,
  onTiersChange,
  slots,
  onChange,
  dateText,
  onDateChange,
}: {
  tiers: Tier[];
  onTiersChange: (t: Tier[]) => void;
  slots: SlotsMap;
  onChange: (s: SlotsMap) => void;
  dateText: string;
  onDateChange: (s: string) => void;
}) {
  const updateSlot = (tierKey: string, idx: number, next: Partial<ImgSlot>) => {
    const arr = slots[tierKey].map((s, i) => (i === idx ? { ...s, ...next } : s));
    onChange({ ...slots, [tierKey]: arr });
  };

  const moveTier = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[i], next[j]] = [next[j], next[i]];
    onTiersChange(next);
  };

  const updateTier = (i: number, next: Partial<Tier>) => {
    onTiersChange(tiers.map((t, idx) => (idx === i ? { ...t, ...next } : t)));
  };

  const updatePerk = (ti: number, pi: number, next: Partial<Perk>) => {
    const newPerks = tiers[ti].perks.map((p2, j) => (j === pi ? { ...p2, ...next } : p2));
    updateTier(ti, { perks: newPerks });
  };

  const movePerk = (ti: number, pi: number, dir: -1 | 1) => {
    const arr = [...tiers[ti].perks];
    const j = pi + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[pi], arr[j]] = [arr[j], arr[pi]];
    updateTier(ti, { perks: arr });
  };

  const addPerk = (ti: number) => {
    updateTier(ti, { perks: [...tiers[ti].perks, p("NEW")] });
  };

  const removePerk = (ti: number, pi: number) => {
    updateTier(ti, { perks: tiers[ti].perks.filter((_, j) => j !== pi) });
  };

  return (
    <div
      className="w-full max-w-[1080px] rounded-lg p-6 flex flex-col gap-5"
      style={{ background: "rgba(255,240,244,0.06)", border: "1px solid rgba(255,180,200,0.18)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm tracking-[0.3em] uppercase" style={{ color: "#f0a8b8" }}>Editor</h2>
        <label className="flex items-center gap-2 text-[12px]" style={{ color: "#fbe0e7" }}>
          <span className="tracking-[0.2em] uppercase" style={{ color: "#f0a8b8" }}>Date</span>
          <input
            type="text"
            value={dateText}
            onChange={(e) => onDateChange(e.target.value)}
            placeholder="MAY 2025"
            className="px-3 py-1.5 rounded text-[12px] tracking-[0.2em] uppercase outline-none focus:ring-2"
            style={{
              background: "rgba(20,5,12,0.7)",
              border: "1px solid rgba(255,180,200,0.3)",
              color: "#fff0f4",
              minWidth: 160,
            }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {tiers.map((t, ti) => (
          <div
            key={t.key}
            className="flex flex-col gap-3 p-3 rounded"
            style={{ background: "rgba(20,5,12,0.5)", border: "1px solid rgba(255,180,200,0.18)" }}
          >
            {/* Tier header with reorder */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveTier(ti, -1)}
                  disabled={ti === 0}
                  className="p-1 rounded disabled:opacity-30 hover:bg-white/10"
                  title="Move up"
                  style={{ color: "#f0a8b8" }}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveTier(ti, 1)}
                  disabled={ti === tiers.length - 1}
                  className="p-1 rounded disabled:opacity-30 hover:bg-white/10"
                  title="Move down"
                  style={{ color: "#f0a8b8" }}
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <div className="flex items-baseline gap-2 flex-1">
                <span className="font-semibold text-base" style={{ color: "#fff0f4" }}>
                  {t.premium ? "✦ " : ""}{t.name}
                </span>
                <span className="text-sm" style={{ color: "#f0a8b8" }}>{t.kanji}</span>
                <span className="text-[10px] tracking-widest uppercase opacity-60" style={{ color: "#f0a8b8" }}>
                  {t.premium ? "Premium" : "Standard"} · #{ti + 1}
                </span>
              </div>
            </div>

            {/* Left / Right images */}
            <div className="grid grid-cols-2 gap-3">
              {slots[t.key].map((s, idx) => {
                const side = idx === 0 ? "LEFT" : "RIGHT";
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-1.5 p-2 rounded"
                    style={{
                      background: "rgba(255,240,244,0.04)",
                      border: "1px dashed rgba(255,180,200,0.25)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-bold tracking-[0.2em] px-2 py-0.5 rounded"
                        style={{
                          background: idx === 0 ? "rgba(200,19,42,0.85)" : "rgba(255,180,140,0.85)",
                          color: "#2a0a14",
                        }}
                      >
                        {side}
                      </span>
                      <span className="text-[10px] opacity-60" style={{ color: "#fbe0e7" }}>
                        Image #{idx + 1}
                      </span>
                    </div>
                    <div className="relative w-full aspect-video overflow-hidden rounded">
                      <img
                        src={s.src}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          filter: s.nsfw ? "blur(8px)" : "none",
                          transform: s.nsfw ? "scale(1.1)" : "none",
                        }}
                      />
                    </div>
                    <label
                      className="text-[11px] cursor-pointer text-center py-1 rounded"
                      style={{ background: "#c8132a", color: "#fff" }}
                    >
                      Swap {side}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateSlot(t.key, idx, {
                              src: String(reader.result),
                              zoom: 1,
                              posX: 50,
                              posY: 30,
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <label
                      className="flex items-center justify-between text-[11px]"
                      style={{ color: "#fbe0e7" }}
                    >
                      <span>NSFW blur</span>
                      <input
                        type="checkbox"
                        checked={s.nsfw}
                        onChange={(e) => updateSlot(t.key, idx, { nsfw: e.target.checked })}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Descriptions / perks editor */}
            <div
              className="p-2 rounded flex flex-col gap-2"
              style={{ background: "rgba(255,240,244,0.04)", border: "1px dashed rgba(255,180,200,0.25)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#f0a8b8" }}>
                  Descriptions
                </span>
                <button
                  onClick={() => addPerk(ti)}
                  className="text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded"
                  style={{ background: "#c8132a", color: "#fff" }}
                >
                  <Plus size={11} /> Add
                </button>
              </div>

              {/* Live preview */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded" style={{ background: "rgba(20,5,12,0.6)" }}>
                {t.perks.length === 0 && (
                  <span className="text-[10px] opacity-50" style={{ color: "#fbe0e7" }}>No descriptions</span>
                )}
                {t.perks.map((perk) => <PerkPill key={perk.id} perk={perk} />)}
              </div>

              <div className="flex flex-col gap-2">
                {t.perks.map((perk, pi) => (
                  <PerkEditor
                    key={perk.id}
                    perk={perk}
                    canUp={pi > 0}
                    canDown={pi < t.perks.length - 1}
                    onMove={(dir) => movePerk(ti, pi, dir)}
                    onChange={(next) => updatePerk(ti, pi, next)}
                    onRemove={() => removePerk(ti, pi)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerkEditor({
  perk,
  canUp,
  canDown,
  onMove,
  onChange,
  onRemove,
}: {
  perk: Perk;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onChange: (next: Partial<Perk>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2 rounded"
      style={{ background: "rgba(20,5,12,0.5)", border: "1px solid rgba(255,180,200,0.15)" }}
    >
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(-1)} disabled={!canUp} className="p-0.5 disabled:opacity-30" style={{ color: "#f0a8b8" }} title="Move up">
          <ArrowUp size={11} />
        </button>
        <button onClick={() => onMove(1)} disabled={!canDown} className="p-0.5 disabled:opacity-30" style={{ color: "#f0a8b8" }} title="Move down">
          <ArrowDown size={11} />
        </button>
      </div>

      <input
        type="text"
        value={perk.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label"
        className="px-2 py-1 rounded text-[12px] outline-none w-24"
        style={{ background: "rgba(20,5,12,0.7)", border: "1px solid rgba(255,180,200,0.25)", color: "#fff0f4" }}
      />

      <ColorField label="Text" value={perk.textColor} onChange={(v) => onChange({ textColor: v })} />
      <ColorField label="BG" value={perk.bgColor} onChange={(v) => onChange({ bgColor: v })} allowGradient />
      <ColorField label="Border" value={perk.borderColor} onChange={(v) => onChange({ borderColor: v })} />

      <label className="flex items-center gap-1 text-[10px]" style={{ color: "#fbe0e7" }} title="Microphone icon">
        <input type="checkbox" checked={!!perk.showMic} onChange={(e) => onChange({ showMic: e.target.checked })} />
        <Mic size={11} />
      </label>
      <label className="flex items-center gap-1 text-[10px]" style={{ color: "#fbe0e7" }} title="Audio visualizer">
        <input type="checkbox" checked={!!perk.showVisualizer} onChange={(e) => onChange({ showVisualizer: e.target.checked })} />
        <AudioLines size={11} />
      </label>

      <input
        type="text"
        value={perk.badge || ""}
        onChange={(e) => onChange({ badge: e.target.value || undefined })}
        placeholder="Badge (e.g. +20 MIN)"
        className="px-2 py-1 rounded text-[11px] outline-none w-32"
        style={{ background: "rgba(20,5,12,0.7)", border: "1px solid rgba(255,180,200,0.25)", color: "#fff0f4" }}
      />
      <ColorField label="Badge BG" value={perk.badgeBg} onChange={(v) => onChange({ badgeBg: v })} />

      <button
        onClick={onRemove}
        className="ml-auto p-1.5 rounded hover:bg-white/10"
        style={{ color: "#ff8aa0" }}
        title="Remove"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowGradient,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  allowGradient?: boolean;
}) {
  // Extract a hex from value if present, else default
  const hexMatch = value?.match(/#([0-9a-fA-F]{6})/);
  const hex = hexMatch ? `#${hexMatch[1]}` : "#ffb8c8";
  return (
    <div className="flex items-center gap-1 text-[10px]" style={{ color: "#fbe0e7" }} title={label}>
      <span className="opacity-70 uppercase tracking-wider">{label}</span>
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
      />
      {allowGradient && value && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="rgba/css"
          className="px-1 py-0.5 rounded text-[10px] outline-none w-20"
          style={{ background: "rgba(20,5,12,0.7)", border: "1px solid rgba(255,180,200,0.2)", color: "#fff0f4" }}
        />
      )}
      {value && (
        <button
          onClick={() => onChange(undefined)}
          className="opacity-60 hover:opacity-100"
          title="Clear"
          style={{ color: "#f0a8b8" }}
        >
          ×
        </button>
      )}
    </div>
  );
}
