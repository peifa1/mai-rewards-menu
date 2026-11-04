import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toPng } from "html-to-image";

const W = 1080;
// Output formats. Story is 9:16; Discord previews portrait images in a ~550×350 box,
// so a shorter 4:5 card shows ~40% larger there. Each format has its own vertical layout.
const FORMATS = {
  discord: { label: "Discord 4:5", h: 1350, titleTop: 64, noteTop: 476, chibiH: 340, sigBottom: 64, file: "discord" },
  story: { label: "Story 9:16", h: 1920, titleTop: 100, noteTop: 860, chibiH: 400, sigBottom: 90, file: "story" },
} as const;
type FormatId = keyof typeof FORMATS;
const KEY = "schedule-cfg";

type Row = { id: string; day: string; time: string; content?: string };
// Chunky, bubbly title faces (Cherry Bomb direction) for the label strips.
const TITLE_FONTS = [
  { id: "cherry", name: "Cherry Bomb", family: "'Cherry Bomb One', cursive", weight: 400, size: 84 },
  { id: "bagel", name: "Bagel Fat One", family: "'Bagel Fat One', cursive", weight: 400, size: 80 },
  { id: "mochiy", name: "Mochiy Pop", family: "'Mochiy Pop One', sans-serif", weight: 400, size: 72 },
  { id: "sniglet", name: "Sniglet", family: "'Sniglet', cursive", weight: 800, size: 86 },
  { id: "chewy", name: "Chewy", family: "'Chewy', cursive", weight: 400, size: 92 },
  { id: "coiny", name: "Coiny", family: "'Coiny', cursive", weight: 400, size: 80 },
] as const;
type TitleFontId = (typeof TITLE_FONTS)[number]["id"];

type Cfg = {
  title: string;
  month: string;
  days: string;
  rows: Row[];
  signature: string;
  bg: string;
  bgPosX: number;
  bgPosY: number;
  format: FormatId;
  darken: number;
  dimColor: string;
  showChibi: boolean;
  chibi: string;
  color: string; // shared accent: title strip, tape, content text, margin stars
  accent: string; // highlighter behind content
  titleFont: TitleFontId;
};

// Palette pulled from the OC art + chibi: sky blue → blush gradient, pink hair,
// crimson eyes/horns, inky tentacles.
const C = {
  sky: "#8ec8ef",
  skyDeep: "#5a9bd4",
  blush: "#ffe4ee",
  pink: "#ffb6cb",
  rose: "#f0628f",
  crimson: "#c81e4a",
  ink: "#33121f",
};

// Dim overlay presets. Warm tones counter cool/blue art; black just darkens.
const DIM_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "Wine", hex: "#3a0f24" },
  { name: "Rose", hex: "#6b1f3d" },
  { name: "Plum", hex: "#2b1638" },
  { name: "Cocoa", hex: "#2e1a14" },
];

const DEFAULT_CHIBI = "/images/Chibi%20art%20thank%20you.png";
// Default chibi art is 335×435 and is cropped at the legs/tail, so it is always pinned flush
// to the bottom-right corner where those cut edges sit on the card edges.
const CHIBI_RATIO = 335 / 435;
const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT: Cfg = {
  title: "Streaming time\nthis week!",
  month: "11",
  days: "2–8",
  rows: [
    { id: uid(), day: "Monday", time: "5 – 7 PM", content: "Just Chatting" },
    { id: uid(), day: "Wednesday", time: "6 – 9 PM", content: "Gaming" },
    { id: uid(), day: "Friday", time: "8 – 11 PM", content: "ASMR" },
    { id: uid(), day: "Sunday", time: "3 – 6 PM", content: "Art Stream" },
  ],
  signature: "See you then!",
  bg: "",
  bgPosX: 50,
  bgPosY: 0,
  format: "discord",
  darken: 0.55,
  dimColor: "#000000",
  showChibi: true,
  chibi: "",
  color: "#f0628f",
  accent: "#ffb6cb",
  titleFont: "cherry",
};

function readFile(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

const FONT_HAND = "'Caveat', cursive";

export default function ScheduleBuilder() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0.4);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const saved = { ...DEFAULT, ...JSON.parse(s) } as Cfg & { design?: string };
        delete saved.design;
        if (!(saved.format in FORMATS)) saved.format = DEFAULT.format;
        if (!TITLE_FONTS.some((f) => f.id === saved.titleFont)) saved.titleFont = DEFAULT.titleFont;
        setCfg(saved);
      }
    } catch {}
    setLoaded(true);
    const upd = () => setScale(Math.min(0.42, (window.innerWidth - 48) / W));
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch {
      try { localStorage.setItem(KEY, JSON.stringify({ ...cfg, bg: "", chibi: "" })); } catch {}
    }
  }, [cfg, loaded]);

  const set = (p: Partial<Cfg>) => setCfg((c) => ({ ...c, ...p }));
  const setRow = (id: string, p: Partial<Row>) => set({ rows: cfg.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const moveRow = (i: number, d: number) => {
    const rows = [...cfg.rows];
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    set({ rows });
  };

  const H = FORMATS[cfg.format].h;

  const exportImg = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const opts = { cacheBust: true, pixelRatio: 2, width: W, height: H, style: { transform: "none" } };
      await toPng(ref.current, opts);
      const url = await toPng(ref.current, opts);
      const a = document.createElement("a");
      a.download = `iomaya-stream-schedule-${FORMATS[cfg.format].file}.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const inputCls = "w-full rounded-md px-3 py-2 text-sm bg-black/40 border border-pink-200/20 text-pink-50 outline-none focus:border-pink-300/60";

  return (
    <div className="w-full flex flex-col items-center gap-6 py-8 px-4">
      <div className="flex gap-1 rounded-full p-1" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,180,200,0.2)" }}>
        {(Object.keys(FORMATS) as FormatId[]).map((id) => (
          <button
            key={id}
            onClick={() => set({ format: id })}
            className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase transition-colors"
            style={{ background: cfg.format === id ? "rgba(255,182,203,0.22)" : "transparent", color: cfg.format === id ? "#fff0f4" : "rgba(255,210,222,0.6)" }}
          >
            {FORMATS[id].label}
          </button>
        ))}
      </div>

      <button
        onClick={exportImg}
        disabled={exporting}
        className="px-6 py-2.5 rounded-full text-sm font-semibold tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#c8132a,#8a0a1c)", color: "#fff0f4", border: "1px solid rgba(255,200,215,0.4)" }}
      >
        {exporting ? "Exporting…" : "Export as Image"}
      </button>

      <div className="flex flex-wrap gap-8 justify-center items-start w-full">
        {/* Preview */}
        <div style={{ width: W * scale, height: H * scale }} className="relative shrink-0">
          <div
            ref={ref}
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", background: C.blush, borderRadius: 8 }}
          >
            <ZineCard cfg={cfg} />
          </div>
        </div>

        {/* Editor */}
        <div className="w-full max-w-md flex flex-col gap-5 rounded-2xl p-6" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,180,200,0.2)", color: "#ffe4ec" }}>
            <Field label="Title font">
              <div className="grid grid-cols-3 gap-2">
                {TITLE_FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => set({ titleFont: f.id })}
                    className="rounded-lg px-2 py-2 border text-center transition-colors"
                    style={{
                      background: cfg.titleFont === f.id ? "rgba(255,182,203,0.18)" : "rgba(0,0,0,0.25)",
                      borderColor: cfg.titleFont === f.id ? "rgba(255,182,203,0.7)" : "rgba(255,182,203,0.15)",
                    }}
                  >
                    <div className="text-base text-pink-50 whitespace-nowrap" style={{ fontFamily: f.family, fontWeight: f.weight }}>this week!</div>
                    <div className="text-[11px] text-pink-200/70 leading-tight">{f.name}</div>
                  </button>
                ))}
              </div>
            </Field>

          <Field label="Title (new line = Enter)">
            <textarea rows={2} className={inputCls} value={cfg.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Week date (days / month)">
            <div className="flex gap-2 items-center">
              <input className={inputCls} placeholder="2–8" value={cfg.days} onChange={(e) => set({ days: e.target.value })} />
              <span className="text-pink-200">/</span>
              <input className={inputCls} style={{ maxWidth: 80 }} placeholder="11" value={cfg.month} onChange={(e) => set({ month: e.target.value })} />
            </div>
          </Field>

          <Field label="Schedule rows">
            <div className="flex flex-col gap-2">
              {cfg.rows.map((r, i) => (
                <div key={r.id} className="flex flex-col gap-1.5 rounded-lg p-2 bg-black/20 border border-pink-200/10">
                  <div className="flex gap-2 items-center">
                    <input className={inputCls} placeholder="Day" value={r.day} onChange={(e) => setRow(r.id, { day: e.target.value })} />
                    <input className={inputCls} placeholder="Time" value={r.time} onChange={(e) => setRow(r.id, { time: e.target.value })} />
                    <button className="px-2 text-pink-200" onClick={() => moveRow(i, -1)} title="Move up">↑</button>
                    <button className="px-2 text-pink-200" onClick={() => moveRow(i, 1)} title="Move down">↓</button>
                    <button className="px-2 text-red-300" onClick={() => set({ rows: cfg.rows.filter((x) => x.id !== r.id) })} title="Remove">✕</button>
                  </div>
                  <input className={inputCls} placeholder="Content (ASMR, Gaming…) · empty = hidden" value={r.content ?? ""} onChange={(e) => setRow(r.id, { content: e.target.value })} />
                </div>
              ))}
              <button
                className="mt-1 rounded-md py-2 text-xs uppercase tracking-widest border border-dashed border-pink-200/40 hover:bg-pink-200/10"
                onClick={() => set({ rows: [...cfg.rows, { id: uid(), day: "Day", time: "0 – 0 PM", content: "" }] })}
              >
                + Add row
              </button>
            </div>
          </Field>

          <Field label="Signature (bottom right)">
            <input className={inputCls} value={cfg.signature} onChange={(e) => set({ signature: e.target.value })} />
          </Field>

          <Field label="Background image">
            <div className="flex gap-2">
              <label className="flex-1 text-center cursor-pointer rounded-md py-2 text-xs uppercase tracking-widest bg-pink-200/10 hover:bg-pink-200/20">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ bg: await readFile(f) }); }} />
              </label>
              {cfg.bg && <button className="px-3 text-xs text-red-300" onClick={() => set({ bg: "" })}>Remove</button>}
            </div>
          </Field>

          {cfg.bg && (
            <Field label="Background focus (left ↔ right · top ↕ bottom)">
              <input type="range" min={0} max={100} step={1} value={cfg.bgPosX} onChange={(e) => set({ bgPosX: +e.target.value })} className="w-full" />
              <input type="range" min={0} max={100} step={1} value={cfg.bgPosY} onChange={(e) => set({ bgPosY: +e.target.value })} className="w-full" />
            </Field>
          )}

          <Field label={`Background dim · ${Math.round(cfg.darken * 100)}%`}>
            <input type="range" min={0} max={0.9} step={0.05} value={cfg.darken} onChange={(e) => set({ darken: +e.target.value })} className="w-full" />
          </Field>

          <Field label="Dim color">
            <div className="flex flex-wrap gap-2 items-center">
              {DIM_COLORS.map((d) => (
                <button
                  key={d.hex}
                  onClick={() => set({ dimColor: d.hex })}
                  className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 border text-xs text-pink-50 transition-colors"
                  style={{
                    background: cfg.dimColor === d.hex ? "rgba(255,182,203,0.18)" : "rgba(0,0,0,0.25)",
                    borderColor: cfg.dimColor === d.hex ? "rgba(255,182,203,0.7)" : "rgba(255,182,203,0.15)",
                  }}
                >
                  <span className="w-5 h-5 rounded-full border border-pink-100/30" style={{ background: d.hex }} />
                  {d.name}
                </button>
              ))}
              <label className="flex items-center gap-1.5 text-xs text-pink-200/80 cursor-pointer" title="Custom dim color">
                <input type="color" value={cfg.dimColor} onChange={(e) => set({ dimColor: e.target.value })} className="h-7 w-9 rounded bg-transparent" />
                Custom
              </label>
            </div>
          </Field>

          <Field label="Accent color (title strip, tape, content, stars)">
            <input type="color" value={cfg.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-16 rounded bg-transparent" />
          </Field>

          <Field label="Highlighter color">
            <input type="color" value={cfg.accent} onChange={(e) => set({ accent: e.target.value })} className="h-9 w-16 rounded bg-transparent" />
          </Field>

          <Field label="Chibi (bottom right)">
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cfg.showChibi} onChange={(e) => set({ showChibi: e.target.checked })} /> Show
              </label>
              <label className="flex-1 text-center cursor-pointer rounded-md py-2 text-xs uppercase tracking-widest bg-pink-200/10 hover:bg-pink-200/20">
                Replace image
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ chibi: await readFile(f) }); }} />
              </label>
              {cfg.chibi && <button className="px-2 text-xs text-red-300" onClick={() => set({ chibi: "" })}>Reset</button>}
            </div>
          </Field>

          <button className="text-xs text-pink-200/60 underline self-start" onClick={() => setCfg({ ...DEFAULT, rows: DEFAULT.rows.map((r) => ({ ...r })) })}>
            Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Card ───────────────────────── */

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });

/** Full-bleed art (or a sky→blush gradient fallback matching the OC art). */
function ArtBg({ cfg }: { cfg: Cfg }) {
  return (
    <div style={abs({ left: 0, top: 0, width: W, height: "100%", overflow: "hidden", background: `linear-gradient(180deg, ${C.sky} 0%, #c9dcf2 45%, ${C.blush} 100%)` })}>
      {cfg.bg && (
        <img src={cfg.bg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${cfg.bgPosX}% ${cfg.bgPosY}%`, display: "block" }} />
      )}
    </div>
  );
}

/** Chibi flush in the bottom-right corner + script signature tucked to its left. */
function Corner({ cfg, chibiH, sigColor, sigShadow, sigBottom = 110, font = FONT_HAND, sigSize = 100 }: { cfg: Cfg; chibiH: number; sigColor: string; sigShadow: string; sigBottom?: number; font?: string; sigSize?: number }) {
  const chibiW = Math.round(chibiH * CHIBI_RATIO);
  return (
    <>
      {cfg.showChibi && (
        <img
          src={cfg.chibi || DEFAULT_CHIBI}
          alt=""
          style={abs({ right: 0, bottom: 0, height: chibiH, width: "auto", display: "block", filter: "drop-shadow(-6px -4px 16px rgba(60,10,30,0.35))" })}
        />
      )}
      {cfg.signature && (
        <div
          style={abs({
            right: cfg.showChibi ? chibiW - 20 : 90,
            bottom: sigBottom,
            fontFamily: font,
            fontSize: sigSize,
            lineHeight: 1,
            color: sigColor,
            transform: "rotate(-5deg)",
            whiteSpace: "nowrap",
            textShadow: sigShadow,
          })}
        >
          {cfg.signature}
        </div>
      )}
    </>
  );
}

/* ── Torn notebook page (SVG) ──────────────────────────────────────────────
   Built from seeded, layered 1-D noise so the tear looks organic but is identical
   on every render/export. The page sits on a slightly lower white "fiber" layer,
   the way real paper shows a white fringe where its layers separate. */

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise(r: () => number, length: number, every: number) {
  const knots = Array.from({ length: Math.ceil(length / every) + 2 }, () => r() * 2 - 1);
  return (x: number) => {
    const f = Math.max(0, x) / every;
    const i = Math.floor(f);
    const s = (1 - Math.cos((f - i) * Math.PI)) / 2;
    return knots[i] * (1 - s) + knots[i + 1] * s;
  };
}

function tornPage(w: number, h: number, seed = 11) {
  const r = seeded(seed);
  const big = smoothNoise(r, w, 150);
  const mid = smoothNoise(r, w, 42);
  const fine = smoothNoise(r, w, 11);
  const fringe = smoothNoise(r, w, 28);
  const f = (n: number) => n.toFixed(1);

  // Top + right edges: cut paper, only a hair of wobble.
  const top: string[] = [];
  for (let x = 0; x <= w; x += 30) top.push(`${f(x)} ${f((r() - 0.5) * 1.4)}`);
  const right: string[] = [];
  const tearStart = h - 56;
  for (let y = 30; y < tearStart; y += 40) right.push(`${f(w + (r() - 0.5) * 1.6)} ${f(y)}`);

  // Bottom tear, right → left.
  const page: string[] = [];
  const fiber: string[] = [];
  const hairs: string[] = [];
  let bite = 0;
  for (let x = w; x >= 0; x -= 3) {
    if (bite <= 0 && r() < 0.03) bite = 6 + Math.floor(r() * 10); // occasional chunk torn out
    const chunk = bite > 0 ? Math.sin((bite / 16) * Math.PI) * (5 + r() * 4) : 0;
    bite--;
    // tilt: tear runs from higher on the right to lower on the left
    const tilt = (0.5 - x / w) * 30;
    const y = h - 34 + tilt + big(x) * 15 + mid(x) * 7 + fine(x) * 2.4 + (r() - 0.5) * 2 - chunk;
    const fy = y + 2 + Math.max(0, fringe(x) + 0.35) * 9 + r() * 1.6;
    page.push(`${f(x)} ${f(y)}`);
    fiber.push(`${f(x)} ${f(fy)}`);
    if (r() < 0.18) {
      const len = 2 + r() * 5;
      const a = Math.PI / 2 + (r() - 0.5) * 1.6;
      hairs.push(`M${f(x)} ${f(fy - 0.5)} l${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}`);
    }
  }

  // Left edge, bottom → top: ragged spiral-binding holes where it was ripped out.
  const left: string[] = [];
  const holes: number[] = [];
  for (let cy = 34; cy < h - 40; cy += 48) holes.push(cy + (r() - 0.5) * 4);
  for (let y = h - 40; y >= 0; y -= 3) {
    let x = (r() - 0.5) * 1.2;
    for (const cy of holes) {
      const d = Math.abs(y - cy);
      if (d < 12) x = Math.max(x, Math.sqrt(144 - d * d) * 0.8 + (r() - 0.3) * 2.2);
    }
    left.push(`${f(x)} ${f(y)}`);
  }

  const outline = (bottom: string[]) => `M${top.join(" L")} L${right.join(" L")} L${bottom.join(" L")} L${left.join(" L")} Z`;
  return { page: outline(page), fiber: outline(fiber), hairs: hairs.join(" ") };
}

function NotebookPaper({ w, h, line, rows, top }: { w: number; h: number; line: number; rows: number; top: number }) {
  const { page, fiber, hairs } = tornPage(w, h);
  const ruled = Array.from({ length: rows + 1 }, (_, k) => top + (k + 1) * line - 1);
  return (
    <svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`} style={abs({ left: 0, top: 0, overflow: "visible" })}>
      <defs>
        <clipPath id="zine-page-clip"><path d={page} /></clipPath>
        <filter id="zine-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="g" />
          <feColorMatrix in="g" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.25  0 0 0 0.16 0" />
        </filter>
        <filter id="zine-blotch" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="9" result="b" />
          <feColorMatrix in="b" values="0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.38  0 0 0 0.12 0" />
        </filter>
        <filter id="zine-fuzz"><feGaussianBlur stdDeviation="0.6" /></filter>
      </defs>

      {/* white fiber fringe + loose hairs */}
      <path d={fiber} fill="#ffffff" filter="url(#zine-fuzz)" />
      <path d={hairs} stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.9" />

      <g clipPath="url(#zine-page-clip)">
        <rect width={w} height={h + 24} fill="#fdf8f0" />
        <rect width={w} height={h + 24} filter="url(#zine-blotch)" />
        {ruled.map((y) => (
          <line key={y} x1={0} x2={w} y1={y} y2={y} stroke="rgba(90,155,212,0.42)" strokeWidth="2" />
        ))}
        <line x1={105} x2={105} y1={0} y2={h + 24} stroke="rgba(200,30,74,0.5)" strokeWidth="3" />
        {/* a soft fold crease */}
        <line x1={w * 0.64} y1={-10} x2={w * 0.5} y2={h + 30} stroke="rgba(60,30,30,0.06)" strokeWidth="5" />
        <line x1={w * 0.64 + 4} y1={-10} x2={w * 0.5 + 4} y2={h + 30} stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
        <rect width={w} height={h + 24} filter="url(#zine-grain)" />
        {/* slight darkening toward the torn edge, like handled paper */}
        <rect y={h - 70} width={w} height={94} fill="rgba(150,110,90,0.05)" />
      </g>
    </svg>
  );
}

// Hand-torn tape ends (zigzag) so the strip never looks sliced off.
const TAPE_CLIP = (() => {
  const l = [0, 4, 1, 5, 0, 3, 1], r = [100, 96, 99, 95, 100, 97, 99];
  const pts = l.map((x, i) => `${x}% ${(i * 100) / (l.length - 1)}%`).reverse();
  return `polygon(${[...r.map((x, i) => `${x}% ${(i * 100) / (r.length - 1)}%`), ...pts].join(", ")})`;
})();

const Tape = ({ style, stripe }: { style: CSSProperties; stripe: string }) => (
  <div
    style={abs({
      clipPath: TAPE_CLIP,
      width: 240,
      height: 58,
      background: `repeating-linear-gradient(-45deg, ${stripe} 0 14px, rgba(255,255,255,0.75) 14px 28px)`,
      opacity: 0.88,
      boxShadow: "0 2px 4px rgba(51,18,31,0.15)",
      ...style,
    })}
  />
);

const Sparkle = ({ size, color, style }: { size: number; color: string; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M50 8 C 53 38, 60 46, 92 50 C 61 54, 53 62, 50 93 C 47 62, 39 55, 8 51 C 39 46, 47 38, 50 8" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" />
  </svg>
);

const DatePart = ({ value, label }: { value: string; label: string }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <span style={{ fontSize: 66, lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, letterSpacing: "0.06em", opacity: 0.9, marginTop: 2, textShadow: "0 2px 6px rgba(40,10,30,0.6)" }}>{label}</span>
  </div>
);

/* Zine: cut-out label title, handwritten schedule on a torn notebook page taped over the art. */
function ZineCard({ cfg }: { cfg: Cfg }) {
  const lines = cfg.title.split("\n").filter(Boolean);
  const LINE = 96;
  const PAD_TOP = 30;
  const PW = W - 66 - 84;
  const PH = PAD_TOP + cfg.rows.length * LINE + 92;
  const tf = TITLE_FONTS.find((f) => f.id === cfg.titleFont) ?? TITLE_FONTS[0];
  const L = FORMATS[cfg.format];
  return (
    <>
      <ArtBg cfg={cfg} />
      <div style={abs({ inset: 0, background: cfg.dimColor, opacity: cfg.darken })} />

      {/* Title as label strips */}
      <div style={abs({ left: 56, top: L.titleTop, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 })}>
        {lines.map((l, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              background: i % 2 ? cfg.color : "#fffaf3",
              color: i % 2 ? "#fffaf3" : C.ink,
              fontFamily: tf.family,
              fontWeight: tf.weight,
              fontSize: tf.size,
              lineHeight: 1.15,
              padding: "8px 30px 12px",
              marginLeft: i * 34,
              borderRadius: 6,
              transform: `rotate(${i % 2 ? 1.6 : -2.4}deg)`,
              boxShadow: "5px 6px 0 rgba(51,18,31,0.22)",
              whiteSpace: "nowrap",
            }}
          >
            {l}
          </span>
        ))}
        {(cfg.month || cfg.days) && (
          <div style={{ marginTop: 8, marginLeft: 22, transform: "rotate(-3deg)", fontFamily: FONT_HAND, fontWeight: 700, color: "#fff", textShadow: `0 3px 0 ${cfg.color}, 0 6px 16px rgba(40,10,30,0.45)` }}>
            {/* Month / day labels so the date reads right regardless of the viewer's date order. */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <DatePart value={cfg.days} label="Day" />
              <span style={{ fontSize: 66, lineHeight: 1 }}>/</span>
              <DatePart value={cfg.month} label="Month" />
            </div>
          </div>
        )}
      </div>

      {/* Notebook page */}
      <div style={abs({ left: 66, top: L.noteTop, width: PW, height: PH, transform: "rotate(-1.6deg)", filter: "drop-shadow(0 18px 24px rgba(40,10,30,0.42))" })}>
        <NotebookPaper w={PW} h={PH} line={LINE} rows={cfg.rows.length} top={PAD_TOP} />
        <div style={{ position: "relative", padding: `${PAD_TOP}px 40px 0 128px` }}>
          {cfg.rows.map((r, i) => (
            <div key={r.id} style={{ position: "relative", height: LINE, display: "flex", alignItems: "flex-end", paddingBottom: 8, gap: 12, fontFamily: FONT_HAND, color: C.ink }}>
              <Sparkle size={36} color={cfg.color} style={abs({ left: -84, bottom: 16, transform: `rotate(${i % 2 ? -10 : 8}deg)` })} />
              <span style={{ width: 236, flexShrink: 0, fontSize: 58, fontWeight: 700, lineHeight: 1 }}>{r.day}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 50, fontWeight: 700, lineHeight: 1, color: cfg.color, whiteSpace: "nowrap" }}>
                {r.content && (
                  <span style={{ padding: "0 8px", background: `linear-gradient(176deg, transparent 0 48%, ${cfg.accent}cc 48% 88%, transparent 88%)` }}>{r.content}</span>
                )}
              </span>
              <span style={{ fontSize: 46, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap", marginLeft: "auto" }}>{r.time}</span>
            </div>
          ))}
        </div>
        <Tape stripe={`${cfg.color}bf`} style={{ left: PW - 148, top: -1, transform: "rotate(45deg)" }} />
      </div>

      <Corner cfg={cfg} chibiH={L.chibiH} sigColor="#fff" sigShadow={`0 3px 0 ${C.crimson}, 0 6px 18px rgba(40,10,30,0.5)`} sigBottom={L.sigBottom} font={FONT_HAND} sigSize={92} />
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-widest text-pink-200/70">{label}</span>
      {children}
    </div>
  );
}
