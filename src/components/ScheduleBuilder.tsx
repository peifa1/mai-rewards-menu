import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

const W = 1080;
const H = 1920;
const KEY = "schedule-cfg";

type Row = { id: string; day: string; time: string };
type Cfg = {
  title: string;
  subtitle: string;
  rows: Row[];
  signature: string;
  bg: string;
  darken: number;
  showChibi: boolean;
  chibi: string;
  accent: string;
};

const DEFAULT_CHIBI = "/images/Chibi%20art%20thank%20you.png";
const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT: Cfg = {
  title: "Streaming time\nthis week!",
  subtitle: "all times in CET ♡",
  rows: [
    { id: uid(), day: "Monday", time: "5 – 7 PM CET" },
    { id: uid(), day: "Wednesday", time: "6 – 9 PM CET" },
    { id: uid(), day: "Friday", time: "8 – 11 PM CET" },
    { id: uid(), day: "Sunday", time: "3 – 6 PM CET" },
  ],
  signature: "See you then!",
  bg: "",
  darken: 0.55,
  showChibi: true,
  chibi: "",
  accent: "#ffb6cb",
};

function readFile(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export default function ScheduleBuilder() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0.4);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setCfg({ ...DEFAULT, ...JSON.parse(s) });
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

  const exportImg = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const opts = { cacheBust: true, pixelRatio: 2, width: W, height: H, style: { transform: "none" } };
      await toPng(ref.current, opts);
      const url = await toPng(ref.current, opts);
      const a = document.createElement("a");
      a.download = "iomaya-stream-schedule.png";
      a.href = url;
      a.click();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const chibiSrc = cfg.chibi || DEFAULT_CHIBI;
  const inputCls = "w-full rounded-md px-3 py-2 text-sm bg-black/40 border border-pink-200/20 text-pink-50 outline-none focus:border-pink-300/60";

  return (
    <div className="w-full flex flex-col items-center gap-6 py-8 px-4">
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
            style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left", background: "#1a0610", fontFamily: "'Cormorant Garamond', serif", borderRadius: 8 }}
          >
            {cfg.bg && <img src={cfg.bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, rgba(10,2,6,${cfg.darken}) 0%, rgba(10,2,6,${Math.min(1, cfg.darken + 0.25)}) 100%)` }} />

            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 110px", color: "#fff5f8" }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 104, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, whiteSpace: "pre-line", textAlign: "center", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
                {cfg.title}
              </h1>
              {cfg.subtitle && (
                <div style={{ marginTop: 14, textAlign: "center", fontSize: 34, fontStyle: "italic", color: cfg.accent }}>{cfg.subtitle}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", marginTop: 70, width: "100%", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {cfg.rows.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "baseline", gap: 24, padding: "30px 0" }}>
                    <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.01em", flexShrink: 0 }}>{r.day}</span>
                    <span style={{ flex: 1, borderBottom: "3px dotted rgba(255,240,245,0.3)", transform: "translateY(-10px)" }} />
                    <span style={{ fontSize: 44, fontWeight: 500, color: cfg.accent, flexShrink: 0 }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {(cfg.signature || cfg.showChibi) && (
              <div style={{ position: "absolute", right: 70, bottom: 80, display: "flex", alignItems: "flex-end", gap: 10 }}>
                {cfg.signature && (
                  <div style={{ fontFamily: "'Great Vibes', cursive", fontSize: 100, lineHeight: 1, color: cfg.accent, transform: "rotate(-5deg)", marginBottom: 40, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>
                    {cfg.signature}
                  </div>
                )}
                {cfg.showChibi && (
                  <img src={chibiSrc} alt="" style={{ width: 230, height: 230, objectFit: "contain", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="w-full max-w-md flex flex-col gap-5 rounded-2xl p-6" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,180,200,0.2)", color: "#ffe4ec" }}>
          <Field label="Title (new line = Enter)">
            <textarea rows={2} className={inputCls} value={cfg.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Subtitle">
            <input className={inputCls} value={cfg.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </Field>

          <Field label="Schedule rows">
            <div className="flex flex-col gap-2">
              {cfg.rows.map((r, i) => (
                <div key={r.id} className="flex gap-2 items-center">
                  <input className={inputCls} placeholder="Day" value={r.day} onChange={(e) => setRow(r.id, { day: e.target.value })} />
                  <input className={inputCls} placeholder="Time" value={r.time} onChange={(e) => setRow(r.id, { time: e.target.value })} />
                  <button className="px-2 text-pink-200" onClick={() => moveRow(i, -1)} title="Move up">↑</button>
                  <button className="px-2 text-pink-200" onClick={() => moveRow(i, 1)} title="Move down">↓</button>
                  <button className="px-2 text-red-300" onClick={() => set({ rows: cfg.rows.filter((x) => x.id !== r.id) })} title="Remove">✕</button>
                </div>
              ))}
              <button
                className="mt-1 rounded-md py-2 text-xs uppercase tracking-widest border border-dashed border-pink-200/40 hover:bg-pink-200/10"
                onClick={() => set({ rows: [...cfg.rows, { id: uid(), day: "Day", time: "0 – 0 PM CET" }] })}
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

          <Field label={`Background darken · ${Math.round(cfg.darken * 100)}%`}>
            <input type="range" min={0} max={0.9} step={0.05} value={cfg.darken} onChange={(e) => set({ darken: +e.target.value })} className="w-full" />
          </Field>

          <Field label="Accent color">
            <input type="color" value={cfg.accent} onChange={(e) => set({ accent: e.target.value })} className="h-9 w-16 rounded bg-transparent" />
          </Field>

          <Field label="Chibi (top right)">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-widest text-pink-200/70">{label}</span>
      {children}
    </div>
  );
}
