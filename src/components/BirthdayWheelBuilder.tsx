import { useCallback, useEffect, useRef, useState } from "react";
import { htmlToBlobUrl } from "@/lib/buildOverlay";
import {
  BIRTHDAY_WHEEL_THEMES,
  COMPACT_MAX,
  buildBirthdayWheelHtml,
  DEFAULT_BIRTHDAY_WHEEL_CONFIG,
  newWheelOptionId,
  normalizeBirthdayWheelConfig,
  DELTA_MAX_MINUTES,
  TIMER_MAX_SECONDS,
  WHEEL_LABEL_MAX,
  type BirthdayWheelConfig,
  type WheelOption,
} from "@/lib/buildBirthdayWheel";
import { loadBirthdayWheelTemplate } from "@/lib/birthdayWheelTemplate";
import {
  buildStreamTimerHtml,
  DEFAULT_STREAM_TIMER_CONFIG,
  loadStreamTimerTemplate,
  normalizeStreamTimerConfig,
  STREAM_TIMER_FONTS,
  STREAM_TIMER_MAX_SECONDS,
  STREAM_TIMER_SIZE,
  type StreamTimerConfig,
} from "@/lib/buildStreamTimer";

// Palette — shared with the rest of the site (crimson + mincho kanji accents).
const INK = "#fbe0e7";
const INK_SOFT = "#f0a8b8";
const KANJI = "#ffb8c8";
const BRIGHT = "#fff0f4";
const LINE = "rgba(255,180,200,0.16)";
const LINE_STRONG = "rgba(255,180,200,0.30)";
const PANEL = "rgba(20,5,12,0.5)";
const CARD = "rgba(255,240,244,0.035)";
const FIELD = "rgba(20,5,12,0.7)";
const SEAL = "linear-gradient(135deg,#c8132a,#8a0a1c)";
// Same colours as the slices on the wheel.
const ONCE_BG = "#ffc6d5";
const REPEAT_BG = "#b2e2f2";
const WHEEL_TEXT = "#5d5c61";

const STORAGE_KEY = "birthday-wheel-cfg";
const TIMER_STORAGE_KEY = "stream-timer-cfg";

function downloadHtml(html: string, filename: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BirthdayWheelBuilder() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<BirthdayWheelConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_BIRTHDAY_WHEEL_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeBirthdayWheelConfig(JSON.parse(raw));
    } catch { /* storage unavailable: keep defaults */ }
    return DEFAULT_BIRTHDAY_WHEEL_CONFIG;
  });
  const blobUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [compactPreview, setCompactPreview] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const sendMode = useCallback(() => frameRef.current?.contentWindow?.postMessage({ bdayCompact: compactPreview }, "*"), [compactPreview]);
  useEffect(sendMode, [sendMode]);

  useEffect(() => {
    loadBirthdayWheelTemplate()
      .then(setTemplate)
      .catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch { /* storage unavailable: keep defaults */ }
  }, [cfg]);

  useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const url = htmlToBlobUrl(buildBirthdayWheelHtml(template, cfg));
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  const setField = useCallback(
    <K extends keyof BirthdayWheelConfig>(key: K, value: BirthdayWheelConfig[K]) => setCfg((c) => ({ ...c, [key]: value })),
    [],
  );
  const setItem = (id: string, patch: Partial<WheelOption>) =>
    setCfg((c) => ({ ...c, items: c.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const moveItem = (i: number, d: number) =>
    setCfg((c) => {
      const items = [...c.items];
      const j = i + d;
      if (j < 0 || j >= items.length) return c;
      [items[i], items[j]] = [items[j], items[i]];
      return { ...c, items };
    });
  const removeItem = (id: string) => setCfg((c) => ({ ...c, items: c.items.filter((it) => it.id !== id) }));
  const addItem = () =>
    setCfg((c) => ({ ...c, items: [...c.items, { id: newWheelOptionId(), label: "", full: "", type: "repeat" }] }));

  const handleDownload = () => {
    if (template) downloadHtml(buildBirthdayWheelHtml(template, cfg), "birthday_wheel.html");
  };

  const onWheel = cfg.items.filter((it) => it.label.trim());
  const onceCount = onWheel.filter((it) => it.type === "once").length;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6">
      {/* PREVIEW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="font-hakkou text-xl leading-none" style={{ color: KANJI }}>実演</span>
            <h2 className="font-menu italic text-xl tracking-wide" style={{ color: BRIGHT }}>Live Preview</h2>
            <span className="text-[11px] opacity-60" style={{ color: INK_SOFT }}>you can spin it here</span>
          </div>
          <div className="flex rounded-full border p-0.5 text-[10px] uppercase tracking-[0.2em] ml-auto" style={{ borderColor: LINE_STRONG }}>
            {([false, true] as const).map((c) => (
              <button
                key={String(c)}
                onClick={() => setCompactPreview(c)}
                className="px-3 py-1.5 rounded-full transition"
                style={{ background: compactPreview === c ? "rgba(200,19,42,0.35)" : "transparent", color: compactPreview === c ? BRIGHT : INK_SOFT }}
              >
                {c ? "Compact" : "Full"}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownload}
            disabled={!template || onWheel.length < 2}
            className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50"
            style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)", boxShadow: "0 6px 24px rgba(200,19,42,0.4)" }}
          >
            Download HTML
          </button>
        </div>
        <div
          className="relative w-full rounded-2xl overflow-hidden border"
          style={{
            aspectRatio: "16 / 9",
            background: "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px",
            borderColor: LINE,
            boxShadow: "0 0 0 1px rgba(255,200,215,0.05) inset, 0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center">
              Failed to load the wheel template: {loadError}
            </div>
          )}
          {!template && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70" style={{ color: "#ffd0dc" }}>
              Loading template…
            </div>
          )}
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Birthday wheel preview"
              className="absolute top-0 left-0"
              onLoad={sendMode}
              style={{ width: 1920, height: 1080, transform: "scale(var(--scale))", transformOrigin: "top left", border: 0, background: "transparent" }}
              ref={(el) => {
                frameRef.current = el;
                if (!el) return;
                const update = () => el.style.setProperty("--scale", String((el.parentElement?.clientWidth ?? 1280) / 1920));
                update();
                const ro = new ResizeObserver(update);
                if (el.parentElement) ro.observe(el.parentElement);
              }}
            />
          )}
        </div>
        <p className="text-[11px] opacity-60 px-1" style={{ color: INK_SOFT }}>
          {cfg.layout === "side"
            ? "Everything checkered is see-through — only the wheel and the panel show. Put your VTube Studio model underneath, on the left."
            : "The checkered circle in the middle is see-through — your VTube Studio model goes underneath it in OBS."}
        </p>

        <StreamTimerPanel />

        <BirthdayObsGuide />
      </div>

      {/* EDITOR */}
      <div className="rounded-2xl p-5 flex flex-col gap-6 border" style={{ background: PANEL, borderColor: LINE, color: INK }}>
        <div>
          <SectionTitle kanji="型">Layout</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "side", name: "Model on the left", note: "Just the wheel + panel, no background; Choppy fills the circle" },
              { id: "center", name: "Model in the circle", note: "Your model shows through the middle of the wheel" },
            ] as const).map((l) => (
              <button
                key={l.id}
                onClick={() => setField("layout", l.id)}
                className="text-left rounded-xl px-3 py-2.5 border transition"
                style={{
                  background: cfg.layout === l.id ? "rgba(200,19,42,0.22)" : CARD,
                  borderColor: cfg.layout === l.id ? "rgba(255,200,215,0.6)" : LINE,
                }}
              >
                <div className="text-sm font-semibold" style={{ color: BRIGHT }}>{l.name}</div>
                <div className="text-[11px] leading-snug opacity-70" style={{ color: INK_SOFT }}>{l.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle kanji="場">Scenes</SectionTitle>
          <div className="text-xs">
            <TextField label="Full size in OBS scene" value={cfg.fullScene} onChange={(v) => setField("fullScene", v)} />
          </div>
          <p className="text-[10px] opacity-60 leading-snug mt-2" style={{ color: INK_SOFT }}>
            Exact scene name: every other scene with the wheel source shows the compact card.
            Leave it empty to switch only with the corner button (hover the panel in Interact). It remembers the size.
          </p>
          <div className="mt-3 text-xs">
            <div className="uppercase tracking-[0.2em] mb-1.5" style={{ color: INK_SOFT }}>Compact card position</div>
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { name: "↖", x: 30, y: 30, title: "Top left" },
                { name: "↗", x: COMPACT_MAX.x - 30, y: 30, title: "Top right" },
                { name: "↙", x: 30, y: COMPACT_MAX.y - 40, title: "Bottom left" },
                { name: "↘", x: COMPACT_MAX.x - 30, y: COMPACT_MAX.y - 40, title: "Bottom right" },
              ] as const).map((c) => {
                const on = cfg.compactX === c.x && cfg.compactY === c.y;
                return (
                  <button
                    key={c.title}
                    title={c.title}
                    onClick={() => { setCfg((v) => ({ ...v, compactX: c.x, compactY: c.y })); setCompactPreview(true); }}
                    className="w-8 h-8 rounded-lg border text-sm transition"
                    style={{ background: on ? "rgba(200,19,42,0.22)" : CARD, borderColor: on ? "rgba(255,200,215,0.6)" : LINE, color: BRIGHT }}
                  >
                    {c.name}
                  </button>
                );
              })}
              <PosInput label="X" value={cfg.compactX} max={COMPACT_MAX.x} onChange={(v) => { setField("compactX", v); setCompactPreview(true); }} />
              <PosInput label="Y" value={cfg.compactY} max={COMPACT_MAX.y} onChange={(v) => { setField("compactY", v); setCompactPreview(true); }} />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle kanji="色">Colors</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {BIRTHDAY_WHEEL_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setField("theme", t.id)}
                className="text-left rounded-xl px-2.5 py-2.5 border transition"
                style={{
                  background: cfg.theme === t.id ? "rgba(200,19,42,0.22)" : CARD,
                  borderColor: cfg.theme === t.id ? "rgba(255,200,215,0.6)" : LINE,
                }}
              >
                <div className="flex gap-1 mb-1.5">
                  {t.swatches.map((c) => (
                    <i key={c} className="w-4 h-4 rounded-full inline-block border" style={{ background: c, borderColor: "rgba(255,255,255,0.25)" }} />
                  ))}
                </div>
                <div className="text-[13px] font-semibold leading-tight" style={{ color: BRIGHT }}>{t.name}</div>
                <div className="text-[10px] leading-snug opacity-70" style={{ color: INK_SOFT }}>{t.note}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle kanji="名">Text</SectionTitle>
          <div className="flex flex-col gap-3 text-xs">
            <TextField label="Title" value={cfg.title} onChange={(v) => setField("title", v)} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="One-time legend" value={cfg.onceLabel} onChange={(v) => setField("onceLabel", v)} swatch={ONCE_BG} />
              <TextField label="Repeat legend" value={cfg.repeatLabel} onChange={(v) => setField("repeatLabel", v)} swatch={REPEAT_BG} />
            </div>
          </div>
        </div>

        <div>
          <SectionTitle kanji="時">Timer</SectionTitle>
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: INK }}>
              <input type="checkbox" checked={cfg.showTimer} onChange={(e) => setField("showTimer", e.target.checked)} />
              Show timer in the panel
            </label>
            <div className={`flex items-center gap-1.5 transition ${cfg.showTimer ? "" : "opacity-40 pointer-events-none"}`}>
              <span className="uppercase tracking-[0.2em] mr-1" style={{ color: INK_SOFT }}>Starts at</span>
              <TimeInput value={Math.floor(cfg.timerSeconds / 60)} max={99} label="Minutes"
                onChange={(m) => setField("timerSeconds", Math.min(TIMER_MAX_SECONDS, m * 60 + (cfg.timerSeconds % 60)))} />
              <span className="text-sm font-bold" style={{ color: INK_SOFT }}>:</span>
              <TimeInput value={cfg.timerSeconds % 60} max={59} label="Seconds"
                onChange={(s) => setField("timerSeconds", Math.floor(cfg.timerSeconds / 60) * 60 + s)} />
            </div>
          </div>
          <p className="text-[10px] opacity-60 leading-snug mt-2" style={{ color: INK_SOFT }}>
            Change it live in OBS Interact: hover it for arrows, scroll on the numbers, or click one and type.
          </p>
        </div>

        <div>
          <SectionTitle kanji="輪">Options</SectionTitle>
          <div className="flex items-center gap-2 mb-3 text-[11px]" style={{ color: INK_SOFT }}>
            <span>{onWheel.length} on the wheel</span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: ONCE_BG }} />{onceCount} one-time</span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: REPEAT_BG }} />{onWheel.length - onceCount} repeat</span>
          </div>
          {onWheel.length < 2 && (
            <p className="text-[11px] mb-3 text-red-200">Add at least 2 options to spin (and download).</p>
          )}
          <div className="flex flex-col gap-2">
            {cfg.items.map((it, i) => (
              <div key={it.id} className="rounded-xl border p-2.5 flex flex-col gap-2" style={{ borderColor: LINE, background: CARD }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setItem(it.id, { type: it.type === "once" ? "repeat" : "once" })}
                    className="flex-shrink-0 w-[86px] py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] transition hover:brightness-105"
                    style={{ background: it.type === "once" ? ONCE_BG : REPEAT_BG, color: WHEEL_TEXT }}
                    title="Click to switch between one-time and repeat"
                  >
                    {it.type === "once" ? "One-time" : "Repeat"}
                  </button>
                  <input
                    value={it.label}
                    maxLength={WHEEL_LABEL_MAX}
                    placeholder="On the wheel"
                    onChange={(e) => setItem(it.id, { label: e.target.value })}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg outline-none text-sm"
                    style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
                  />
                  <IconBtn onClick={() => moveItem(i, -1)} title="Move up">↑</IconBtn>
                  <IconBtn onClick={() => moveItem(i, 1)} title="Move down">↓</IconBtn>
                  <IconBtn onClick={() => removeItem(it.id)} title="Remove" danger>✕</IconBtn>
                </div>
                <input
                  value={it.full}
                  placeholder="Full text when it lands (optional)"
                  onChange={(e) => setItem(it.id, { full: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg outline-none text-xs"
                  style={{ background: FIELD, border: `1px solid ${LINE}`, color: INK }}
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer select-none" style={{ color: INK_SOFT }}>
                    <input type="checkbox" checked={!!it.double} onChange={(e) => setItem(it.id, { double: e.target.checked })} />
                    Double trouble (spin twice, combine both)
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: INK_SOFT }} title="Minutes added to (+) or taken off (−) the Stream Timer when this lands">
                    Stream time
                    <input
                      type="number"
                      min={-DELTA_MAX_MINUTES}
                      max={DELTA_MAX_MINUTES}
                      value={it.delta ?? 0}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setItem(it.id, { delta: Number.isNaN(v) ? 0 : Math.max(-DELTA_MAX_MINUTES, Math.min(DELTA_MAX_MINUTES, v)) });
                      }}
                      className="w-14 px-1.5 py-1 rounded-lg outline-none text-xs text-center tabular-nums"
                      style={{ background: FIELD, border: `1px solid ${it.delta ? "rgba(255,200,215,0.6)" : LINE}`, color: "#fff" }}
                    />
                    min
                  </label>
                </div>
              </div>
            ))}
            <button
              onClick={addItem}
              className="mt-1 rounded-xl py-2.5 text-[11px] uppercase tracking-[0.25em] border border-dashed transition hover:bg-white/5"
              style={{ borderColor: LINE_STRONG, color: INK }}
            >
              + Add option
            </button>
          </div>
          <p className="text-[10px] opacity-60 leading-snug mt-3" style={{ color: INK_SOFT }}>
            Keep wheel text short (max {WHEEL_LABEL_MAX} characters) — the full text is what shows when it lands.
            Spin progress lives in OBS; after editing, download again and replace your file.
          </p>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_BIRTHDAY_WHEEL_CONFIG)}
          className="text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition"
          style={{ color: INK_SOFT }}
        >
          Reset to default options
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ kanji, children }: { kanji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="font-hakkou text-base leading-none" style={{ color: KANJI }}>{kanji}</span>
      <span className="text-xs uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: INK_SOFT }}>{children}</span>
      <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,180,200,0.22), transparent)" }} />
    </div>
  );
}

function TextField({ label, value, onChange, swatch }: { label: string; value: string; onChange: (v: string) => void; swatch?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="uppercase tracking-[0.2em] inline-flex items-center gap-1.5" style={{ color: INK_SOFT }}>
        {swatch && <i className="w-2 h-2 rounded-full inline-block" style={{ background: swatch }} />}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg outline-none text-sm"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
    </label>
  );
}

function PosInput({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1" style={{ color: INK_SOFT }}>
      {label}
      <input
        type="number"
        min={0}
        max={max}
        step={10}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          onChange(Number.isNaN(v) ? 0 : Math.max(0, Math.min(max, v)));
        }}
        className="w-16 px-1.5 py-1.5 rounded-lg outline-none text-sm text-center tabular-nums"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
    </label>
  );
}

function TimeInput({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={String(value).padStart(2, "0")}
      aria-label={label}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        onChange(Number.isNaN(v) ? 0 : Math.max(0, Math.min(max, v)));
      }}
      className="w-12 px-1.5 py-1.5 rounded-lg outline-none text-sm text-center tabular-nums"
      style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
    />
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex-shrink-0 w-7 h-7 rounded-lg text-xs transition hover:bg-white/10"
      style={{ color: danger ? "#ff9fb0" : INK }}
    >
      {children}
    </button>
  );
}

// The Stream Timer: its own OBS source, its own settings + download.
function StreamTimerPanel() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<StreamTimerConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_STREAM_TIMER_CONFIG;
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) return normalizeStreamTimerConfig(JSON.parse(raw));
    } catch { /* storage unavailable: keep defaults */ }
    return DEFAULT_STREAM_TIMER_CONFIG;
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const blobUrlRef = useRef<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    loadStreamTimerTemplate().then(setTemplate).catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);
  // Load every font once so the picker shows each in its own face.
  useEffect(() => {
    const id = "stream-timer-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${STREAM_TIMER_FONTS.map((f) => `family=${f.query}`).join("&")}&display=swap`;
    document.head.appendChild(link);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);
  useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const url = htmlToBlobUrl(buildStreamTimerHtml(template, cfg));
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STREAM_TIMER_SIZE.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof StreamTimerConfig>(k: K, v: StreamTimerConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const h = Math.floor(cfg.startSeconds / 3600), m = Math.floor(cfg.startSeconds / 60) % 60;
  const setStart = (hh: number, mm: number) => set("startSeconds", Math.min(STREAM_TIMER_MAX_SECONDS, hh * 3600 + mm * 60));

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-4" style={{ borderColor: LINE_STRONG, background: PANEL, color: INK }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-hakkou text-xl leading-none" style={{ color: KANJI }}>配信</span>
          <h2 className="font-menu italic text-xl tracking-wide" style={{ color: BRIGHT }}>Stream Timer</h2>
          <span className="text-[11px] opacity-60" style={{ color: INK_SOFT }}>separate source · {STREAM_TIMER_SIZE.width}×{STREAM_TIMER_SIZE.height}</span>
        </div>
        <button
          onClick={() => template && downloadHtml(buildStreamTimerHtml(template, cfg), "stream_timer.html")}
          disabled={!template}
          className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50"
          style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)", boxShadow: "0 6px 24px rgba(200,19,42,0.4)" }}
        >
          Download HTML
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
        <div
          ref={boxRef}
          className="relative w-full rounded-xl overflow-hidden border"
          style={{ aspectRatio: `${STREAM_TIMER_SIZE.width} / ${STREAM_TIMER_SIZE.height}`, background: "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px", borderColor: LINE }}
        >
          {loadError && <div className="absolute inset-0 flex items-center justify-center text-xs text-red-200 p-2 text-center">{loadError}</div>}
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Stream timer preview"
              className="absolute top-0 left-0"
              style={{ width: STREAM_TIMER_SIZE.width, height: STREAM_TIMER_SIZE.height, transform: `scale(${scale})`, transformOrigin: "top left", border: 0, background: "transparent" }}
            />
          )}
        </div>
        <div className="flex flex-col gap-3 text-xs">
          <TextField label="Text above (empty = just the time)" value={cfg.label} onChange={(v) => set("label", v)} />
          <div className="flex items-center gap-1.5">
            <span className="uppercase tracking-[0.2em] mr-1" style={{ color: INK_SOFT }}>Starts at</span>
            <TimeInput value={h} max={99} label="Hours" onChange={(v) => setStart(v, m)} />
            <span className="text-sm font-bold" style={{ color: INK_SOFT }}>:</span>
            <TimeInput value={m} max={59} label="Minutes" onChange={(v) => setStart(h, v)} />
          </div>
          <div className="flex gap-1.5">
            {BIRTHDAY_WHEEL_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => set("theme", t.id)}
                title={t.name}
                className="flex-1 rounded-lg px-2 py-1.5 border flex items-center justify-center gap-1 transition"
                style={{ background: cfg.theme === t.id ? "rgba(200,19,42,0.22)" : CARD, borderColor: cfg.theme === t.id ? "rgba(255,200,215,0.6)" : LINE }}
              >
                {t.swatches.map((c) => <i key={c} className="w-3 h-3 rounded-full inline-block border" style={{ background: c, borderColor: "rgba(255,255,255,0.25)" }} />)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: INK_SOFT }}>Font</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STREAM_TIMER_FONTS.map((f) => (
            <button
              key={f.id}
              onClick={() => set("font", f.id)}
              className="text-left rounded-xl px-3 py-2 border transition"
              style={{ background: cfg.font === f.id ? "rgba(200,19,42,0.22)" : CARD, borderColor: cfg.font === f.id ? "rgba(255,200,215,0.6)" : LINE }}
            >
              <div className="text-2xl leading-tight tabular-nums" style={{ fontFamily: `"${f.family}", sans-serif`, fontWeight: f.weight, color: BRIGHT }}>1:59:30</div>
              <div className="text-[10px] leading-snug opacity-70" style={{ color: INK_SOFT }}>{f.name} · {f.note}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const OBS_STEPS: { title: string; detail?: string }[] = [
  { title: "Press “DOWNLOAD HTML”", detail: "Save birthday_wheel.html (and stream_timer.html) in the same folder you'll keep." },
  { title: "Add a Browser source", detail: "In OBS: Sources → + → Browser. Tick “Local File” and pick the file. Width 1920 · Height 1080 · custom frame rate 60." },
  { title: "Page permissions", detail: "Same window: set “Page permissions” to “Read access to user information”, so it knows the scene. Leave “Shutdown source when not visible” and “Refresh browser when scene becomes active” off." },
  { title: "Put your model underneath", detail: "Drag VTube Studio BELOW the wheel source, then place it in the circle (or the left strip, for “Model on the left”)." },
  { title: "Full size ↔ compact", detail: "One scene: hover the panel in Interact and press the corner button (it remembers). Or by scene: type the full-size scene name above, then Copy the source and Paste (Reference) it into your other scenes." },
  { title: "Stream Timer", detail: "Another Browser source, Local File → stream_timer.html, 720 × 220. Interact → ▶ when the stream starts." },
  { title: "Spin", detail: "Right-click the wheel source → Interact → Spin. Press Done once it's done." },
  { title: "Edited the options?", detail: "Download again and overwrite the same file, then right-click the source → Refresh." },
];

function BirthdayObsGuide() {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: LINE_STRONG, background: "linear-gradient(160deg, rgba(52,11,24,0.72), rgba(18,4,9,0.6))", color: INK, boxShadow: "0 12px 34px rgba(0,0,0,0.32)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ borderBottom: open ? `1px solid ${LINE}` : "none", background: "linear-gradient(90deg, rgba(200,19,42,0.16), transparent)" }}
      >
        <span className="flex items-center gap-3.5">
          <span aria-hidden className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: "rgba(200,19,42,0.18)", border: `1px solid ${LINE_STRONG}`, color: KANJI }}>⛩</span>
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-[0.22em] uppercase" style={{ color: BRIGHT }}>OBS Setup Guide</span>
              <span className="font-hakkou text-sm opacity-75" style={{ color: KANJI }}>案内</span>
            </span>
            <span className="text-[11px] tracking-wide opacity-65" style={{ color: INK_SOFT }}>Get the wheel scene into your stream</span>
          </span>
        </span>
        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-base opacity-80" style={{ border: `1px solid ${LINE}` }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-5 py-5">
          <ol className="relative flex flex-col">
            {OBS_STEPS.map((step, i) => {
              const last = i === OBS_STEPS.length - 1;
              return (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {!last && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px" style={{ background: "linear-gradient(180deg, rgba(255,180,200,0.35), rgba(255,180,200,0.08))" }} />}
                  <span className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.45)", boxShadow: "0 2px 10px rgba(200,19,42,0.4)" }}>
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5 pt-0.5">
                    <span className="text-sm font-medium" style={{ color: BRIGHT }}>{step.title}</span>
                    {step.detail && <span className="text-xs leading-snug opacity-70" style={{ color: INK }}>{step.detail}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
