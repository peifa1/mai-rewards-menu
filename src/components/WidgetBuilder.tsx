import { useCallback, useEffect, useRef, useState } from "react";
import { htmlToBlobUrl } from "@/lib/buildOverlay";
import { SAKURA_DATA_URL } from "@/lib/sakuraDataUrl";
import {
  buildWidgetHtml,
  DEFAULT_WIDGET_CONFIG,
  normalizeWidgetConfig,
  WIDGET_ASSET_FILES,
  WIDGET_SLIDE_LABELS,
  type WidgetAssetKey,
  type WidgetConfig,
  type WidgetSlideId,
} from "@/lib/buildWidget";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return readFileAsDataUrl(new File([blob], "a"));
}

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
const SEAL_WASH = "linear-gradient(135deg, rgba(200,19,42,0.32), rgba(138,10,28,0.20))";

const STORAGE_KEY = "panel-widget-cfg";

const SLIDE_KANJI: Record<WidgetSlideId, string> = {
  patreon: "支",
  socials: "縁",
  throne: "願",
  comms: "絵",
  gsupps: "飲",
};

export function WidgetBuilder() {
  const [cfg, setCfg] = useState<WidgetConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGET_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeWidgetConfig(JSON.parse(raw));
    } catch {}
    return DEFAULT_WIDGET_CONFIG;
  });
  const [assets, setAssets] = useState<Record<WidgetAssetKey, string> | null>(null);
  const [previewFast, setPreviewFast] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [previewBg, setPreviewBg] = useState<"default" | "image">("default");
  const [previewBgImage, setPreviewBgImage] = useState<string>("");
  const [openSlide, setOpenSlide] = useState<WidgetSlideId | null>("patreon");
  const bgInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Bundled artwork -> data URLs so the downloaded HTML is fully self-contained.
  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        Object.entries(WIDGET_ASSET_FILES).map(async ([k, path]) => {
          try {
            return [k, await urlToDataUrl(path)] as const;
          } catch {
            return [k, path] as const;
          }
        }),
      );
      if (!alive) return;
      const map = Object.fromEntries(entries) as Record<WidgetAssetKey, string>;
      map.sakura = SAKURA_DATA_URL;
      setAssets(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {}
  }, [cfg]);

  useEffect(() => {
    if (!assets) return;
    const handle = window.setTimeout(() => {
      const html = buildWidgetHtml(cfg, {
        assets,
        previewBg: previewBg === "image" && previewBgImage ? previewBgImage : undefined,
        fastPreview: previewFast,
      });
      const url = htmlToBlobUrl(html);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [cfg, assets, previewFast, previewBg, previewBgImage]);

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    [],
  );

  const set = useCallback(
    <K extends keyof WidgetConfig>(key: K, value: WidgetConfig[K]) => setCfg((c) => ({ ...c, [key]: value })),
    [],
  );

  const setSlideText = useCallback(
    (slide: "patreon" | "socials" | "throne" | "comms" | "gsupps", key: string, value: string) =>
      setCfg((c) => ({ ...c, [slide]: { ...(c[slide] as Record<string, string>), [key]: value } }) as WidgetConfig),
    [],
  );

  const setImage = useCallback(
    (key: WidgetAssetKey, value: string) =>
      setCfg((c) => {
        const images = { ...c.images };
        if (value) images[key] = value;
        else delete images[key];
        return { ...c, images };
      }),
    [],
  );

  const move = (slide: WidgetSlideId, dir: -1 | 1) =>
    setCfg((c) => {
      const order = [...c.order];
      const i = order.indexOf(slide);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return c;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...c, order };
    });

  const handleDownload = () => {
    if (!assets) return;
    const html = buildWidgetHtml(cfg, { assets });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "panel_rotator.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* PREVIEW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="font-hakkou text-xl leading-none" style={{ color: KANJI }}>実演</span>
            <h2 className="font-menu italic text-xl tracking-wide" style={{ color: BRIGHT }}>
              Live Preview
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewFast((v) => !v)}
              className="px-4 py-2.5 rounded-full text-xs tracking-[0.25em] uppercase transition hover:bg-white/5"
              style={{
                background: previewFast ? SEAL_WASH : "transparent",
                color: INK,
                border: `1px solid ${previewFast ? LINE_STRONG : LINE}`,
              }}
              title="Preview-only: rotates faster so you can see every panel"
            >
              Fast cycle
            </button>
            <button
              onClick={() => setReplayKey((k) => k + 1)}
              className="px-4 py-2.5 rounded-full text-xs tracking-[0.25em] uppercase transition hover:bg-white/5"
              style={{ background: "transparent", color: INK, border: `1px solid ${LINE_STRONG}` }}
            >
              ↻ Restart
            </button>
            <button
              onClick={handleDownload}
              disabled={!assets}
              className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105 disabled:opacity-50"
              style={{
                background: SEAL,
                color: BRIGHT,
                border: "1px solid rgba(255,200,215,0.4)",
                boxShadow: "0 6px 24px rgba(200,19,42,0.4)",
              }}
            >
              Download HTML
            </button>
          </div>
        </div>

        <div
          className="relative w-full rounded-2xl overflow-hidden border"
          style={{
            aspectRatio: "16 / 9",
            background:
              previewBg === "image" && previewBgImage
                ? `url(${previewBgImage}) center/cover no-repeat`
                : "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px",
            borderColor: LINE,
            boxShadow: "0 0 0 1px rgba(255,200,215,0.05) inset, 0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          {previewUrl && (
            <iframe
              key={previewUrl + ":" + replayKey}
              src={previewUrl}
              title="Panel widget preview"
              className="absolute top-0 left-0"
              style={{
                width: 1920,
                height: 1080,
                transform: "scale(var(--scale))",
                transformOrigin: "top left",
                border: 0,
                background: "transparent",
              }}
              ref={(el) => {
                if (!el) return;
                const update = () => {
                  const w = el.parentElement?.clientWidth ?? 1280;
                  el.style.setProperty("--scale", String(w / 1920));
                };
                update();
                const ro = new ResizeObserver(update);
                if (el.parentElement) ro.observe(el.parentElement);
              }}
            />
          )}
        </div>

        {/* Preview background */}
        <div
          className="flex items-center gap-3 flex-wrap text-xs rounded-xl px-4 py-2.5 border"
          style={{ borderColor: LINE, background: PANEL, color: INK }}
        >
          <span className="font-hakkou text-sm" style={{ color: KANJI }}>背景</span>
          <span className="uppercase tracking-[0.25em]" style={{ color: INK_SOFT }}>Preview BG</span>
          <span className="flex-1" />
          <button
            onClick={() => setPreviewBg("default")}
            className="px-3 py-1 rounded-full transition hover:bg-white/5"
            style={{
              background: previewBg === "default" ? SEAL_WASH : "transparent",
              border: `1px solid ${previewBg === "default" ? LINE_STRONG : LINE}`,
              color: BRIGHT,
            }}
          >
            Default
          </button>
          <button
            onClick={() => {
              if (previewBgImage) setPreviewBg("image");
              else bgInputRef.current?.click();
            }}
            className="px-3 py-1 rounded-full transition hover:bg-white/5"
            style={{
              background: previewBg === "image" ? SEAL_WASH : "transparent",
              border: `1px solid ${previewBg === "image" ? LINE_STRONG : LINE}`,
              color: BRIGHT,
            }}
          >
            {previewBgImage ? "Custom image" : "Upload image…"}
          </button>
          {previewBgImage && (
            <button
              onClick={() => {
                setPreviewBgImage("");
                setPreviewBg("default");
              }}
              className="px-2 py-1 rounded-full opacity-70 hover:opacity-100"
              style={{ color: "#ffd0dc" }}
            >
              Clear
            </button>
          )}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPreviewBgImage(await readFileAsDataUrl(f));
                setPreviewBg("image");
              }
              e.currentTarget.value = "";
            }}
          />
        </div>

        <p className="text-[11px] leading-snug opacity-70 px-1" style={{ color: INK_SOFT }}>
          Tip: the panel rotates through every switched-on slide. In OBS set the browser source to{" "}
          {cfg.width}×{cfg.height} for a pixel-perfect panel.
        </p>

        <WidgetObsGuide width={cfg.width} height={cfg.height} />
      </div>

      {/* EDITOR */}
      <div className="rounded-2xl p-5 flex flex-col gap-6 border" style={{ background: PANEL, borderColor: LINE, color: INK }}>
        {/* Slides */}
        <div>
          <SectionTitle kanji="札">Panels</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {cfg.order.map((id, idx) => (
              <div key={id} className="rounded-xl border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => setOpenSlide(openSlide === id ? null : id)}
                    className="flex-1 flex items-center gap-2.5 text-left"
                  >
                    <span className="font-hakkou text-base" style={{ color: KANJI }}>{SLIDE_KANJI[id]}</span>
                    <span className="text-xs uppercase tracking-[0.2em]" style={{ color: BRIGHT }}>
                      {WIDGET_SLIDE_LABELS[id]}
                    </span>
                    <span className="text-[10px] opacity-60">{openSlide === id ? "▲" : "▼"}</span>
                  </button>
                  <button
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    className="px-2 py-1 rounded-md text-[11px] disabled:opacity-30"
                    style={{ border: `1px solid ${LINE}`, color: INK }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(id, 1)}
                    disabled={idx === cfg.order.length - 1}
                    className="px-2 py-1 rounded-md text-[11px] disabled:opacity-30"
                    style={{ border: `1px solid ${LINE}`, color: INK }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <Toggle
                    on={cfg.enabled[id]}
                    onClick={() => set("enabled", { ...cfg.enabled, [id]: !cfg.enabled[id] })}
                    label={cfg.enabled[id] ? "On" : "Off"}
                  />
                </div>
                {openSlide === id && (
                  <div className="px-3 pb-3.5 flex flex-col gap-3 border-t pt-3" style={{ borderColor: LINE }}>
                    {id === "patreon" && (
                      <>
                        <TextField label="Small text" value={cfg.patreon.eyebrow} onChange={(v) => setSlideText("patreon", "eyebrow", v)} />
                        <TextField label="Title" value={cfg.patreon.name} onChange={(v) => setSlideText("patreon", "name", v)} />
                        <TextField label="Link" value={cfg.patreon.url} onChange={(v) => setSlideText("patreon", "url", v)} />
                        <TextAreaField label="Handwritten note" value={cfg.patreon.note} onChange={(v) => setSlideText("patreon", "note", v)} />
                        <ImageSlot label="Background" k="banner" cfg={cfg} assets={assets} onPick={setImage} />
                        <ImageSlot label="Patreon logo" k="patreon" cfg={cfg} assets={assets} onPick={setImage} />
                      </>
                    )}
                    {id === "socials" && (
                      <>
                        <TextField label="X handle" value={cfg.socials.xHandle} onChange={(v) => setSlideText("socials", "xHandle", v)} />
                        <TextField label="YouTube handle" value={cfg.socials.ytHandle} onChange={(v) => setSlideText("socials", "ytHandle", v)} />
                        <TextField label="TikTok handle" value={cfg.socials.ttHandle} onChange={(v) => setSlideText("socials", "ttHandle", v)} />
                        <div className="grid grid-cols-1 gap-2.5">
                          <ImageSlot label="X icon" k="x" cfg={cfg} assets={assets} onPick={setImage} />
                          <ImageSlot label="YouTube icon" k="yt" cfg={cfg} assets={assets} onPick={setImage} />
                          <ImageSlot label="TikTok icon" k="tt" cfg={cfg} assets={assets} onPick={setImage} />
                        </div>
                      </>
                    )}
                    {id === "throne" && (
                      <>
                        <TextField label="Small text" value={cfg.throne.eyebrow} onChange={(v) => setSlideText("throne", "eyebrow", v)} />
                        <TextField label="Link" value={cfg.throne.url} onChange={(v) => setSlideText("throne", "url", v)} />
                        <ImageSlot label="Throne logo" k="throne" cfg={cfg} assets={assets} onPick={setImage} />
                      </>
                    )}
                    {id === "comms" && (
                      <>
                        <TextField label="Title" value={cfg.comms.title} onChange={(v) => setSlideText("comms", "title", v)} />
                        <TextField label="Link" value={cfg.comms.url} onChange={(v) => setSlideText("comms", "url", v)} />
                        <TextAreaField label="Handwritten note" value={cfg.comms.note} onChange={(v) => setSlideText("comms", "note", v)} />
                        <ImageSlot label="Mascot" k="squid" cfg={cfg} assets={assets} onPick={setImage} />
                      </>
                    )}
                    {id === "gsupps" && (
                      <>
                        <TextField label="Brand" value={cfg.gsupps.brand} onChange={(v) => setSlideText("gsupps", "brand", v)} />
                        <TextField label="Headline" value={cfg.gsupps.save} onChange={(v) => setSlideText("gsupps", "save", v)} />
                        <TextField label="Code label" value={cfg.gsupps.codeLabel} onChange={(v) => setSlideText("gsupps", "codeLabel", v)} />
                        <TextField label="Discount code" value={cfg.gsupps.code} onChange={(v) => setSlideText("gsupps", "code", v)} />
                        <ImageSlot label="Left artwork" k="gs_poster" cfg={cfg} assets={assets} onPick={setImage} />
                        <ImageSlot label="Right artwork" k="gs_bottle" cfg={cfg} assets={assets} onPick={setImage} />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <SectionTitle kanji="巡">Rotation</SectionTitle>
          <div className="flex flex-col gap-3">
            <NumberField
              label="Each panel stays (ms)"
              value={cfg.intervalMs}
              min={800}
              max={120000}
              step={200}
              onChange={(v) => set("intervalMs", v)}
            />
            <label className="flex flex-col gap-1 text-xs">
              <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>Transition</span>
              <select
                value={cfg.transition}
                onChange={(e) => set("transition", e.target.value as WidgetConfig["transition"])}
                className="px-2 py-1.5 rounded-lg outline-none text-sm"
                style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
              >
                <option value="wipe">Wipe (curtain)</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="scale">Scale fade</option>
                <option value="flip">Flip</option>
              </select>
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>Text glow</span>
              <Toggle on={cfg.glow} onClick={() => set("glow", !cfg.glow)} label={cfg.glow ? "On" : "Off"} />
            </div>
          </div>
        </div>

        {/* Sakura */}
        <div>
          <SectionTitle kanji="桜">Sakura</SectionTitle>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>Show sakura</span>
              <Toggle
                on={cfg.sakura.show}
                onClick={() => set("sakura", { ...cfg.sakura, show: !cfg.sakura.show })}
                label={cfg.sakura.show ? "On" : "Off"}
              />
            </div>
            <NumberField label="Size (px)" value={cfg.sakura.size} min={10} max={300} step={2} onChange={(v) => set("sakura", { ...cfg.sakura, size: v })} />
            <NumberField label="Spin (seconds/turn)" value={cfg.sakura.spinSec} min={1} max={120} step={1} onChange={(v) => set("sakura", { ...cfg.sakura, spinSec: v })} />
            <SliderField label="Opacity" value={cfg.sakura.opacity} min={0} max={1} step={0.05} onChange={(v) => set("sakura", { ...cfg.sakura, opacity: v })} />
            <ImageSlot label="Sakura image" k="sakura" cfg={cfg} assets={assets} onPick={setImage} />
          </div>
        </div>

        {/* Size */}
        <div>
          <SectionTitle kanji="寸">Panel size</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <NumberField label="Width" value={cfg.width} min={120} max={1920} step={10} onChange={(v) => set("width", v)} />
            <NumberField label="Height" value={cfg.height} min={60} max={1080} step={5} onChange={(v) => set("height", v)} />
          </div>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_WIDGET_CONFIG)}
          className="self-start px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.2em]"
          style={{ border: `1px solid ${LINE}`, color: INK_SOFT }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

const OBS_STEPS: { title: string; detail?: string }[] = [
  { title: "Download the HTML", detail: "Press “Download HTML” — everything (images included) is baked into the one file." },
  { title: "Save it somewhere safe", detail: "A folder you won’t move, e.g. Documents/Stream/panel_rotator.html." },
  { title: "Open OBS Studio", detail: "Pick the scene where the panel should appear." },
  { title: "Add a Browser source", detail: "Sources → + → Browser → give it a name like “Panel Rotator”." },
  { title: "Tick “Local file”", detail: "Then browse to the HTML file you just saved." },
  { title: "Set the size", detail: "Use the same width and height shown below the preview." },
  { title: "Position it", detail: "Drag it where you want — the background stays transparent." },
];

function WidgetObsGuide({ width, height }: { width: number; height: number }) {
  const [open, setOpen] = useState(true);
  const steps = OBS_STEPS.map((s, i) => (i === 5 ? { ...s, detail: `Width ${width} · Height ${height}.` } : s));
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: LINE_STRONG,
        background: "linear-gradient(160deg, rgba(52,11,24,0.72), rgba(18,4,9,0.6))",
        color: INK,
        boxShadow: "0 12px 34px rgba(0,0,0,0.32)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{
          borderBottom: open ? `1px solid ${LINE}` : "none",
          background: "linear-gradient(90deg, rgba(200,19,42,0.16), transparent)",
        }}
      >
        <span className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: "rgba(200,19,42,0.18)", border: `1px solid ${LINE_STRONG}`, color: KANJI }}
          >
            ⛩
          </span>
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-[0.22em] uppercase" style={{ color: BRIGHT }}>
                OBS Setup Guide
              </span>
              <span className="font-hakkou text-sm opacity-75" style={{ color: KANJI }}>案内</span>
            </span>
            <span className="text-[11px] tracking-wide opacity-65" style={{ color: INK_SOFT }}>
              Get your panel into a stream in 7 quick steps
            </span>
          </span>
        </span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-base opacity-80"
          style={{ border: `1px solid ${LINE}` }}
        >
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="px-5 py-5">
          <ol className="relative flex flex-col">
            {steps.map((step, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute top-7 bottom-0 left-[13px] w-px"
                      style={{ background: "linear-gradient(180deg, rgba(255,180,200,0.35), rgba(255,180,200,0.08))" }}
                    />
                  )}
                  <span
                    className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold"
                    style={{
                      background: SEAL,
                      color: BRIGHT,
                      border: "1px solid rgba(255,200,215,0.45)",
                      boxShadow: "0 2px 10px rgba(200,19,42,0.4)",
                    }}
                  >
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

function SectionTitle({ kanji, children }: { kanji: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="font-hakkou text-base leading-none" style={{ color: KANJI }}>{kanji}</span>
      <span className="text-xs uppercase tracking-[0.25em] whitespace-nowrap" style={{ color: INK_SOFT }}>{children}</span>
      <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,180,200,0.22), transparent)" }} />
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] transition"
      style={{
        background: on ? SEAL_WASH : "transparent",
        border: `1px solid ${on ? LINE_STRONG : LINE}`,
        color: on ? BRIGHT : INK_SOFT,
      }}
    >
      {label}
    </button>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg outline-none text-sm"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
      <textarea
        value={value}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-lg outline-none text-sm resize-y"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
      <span className="text-[10px] opacity-55">Press Enter for a new line</span>
    </label>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex justify-between">
        <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
        <span style={{ color: INK }}>{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1.5 rounded-lg outline-none text-sm"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
    </label>
  );
}

function ImageSlot({
  label,
  k,
  cfg,
  assets,
  onPick,
}: {
  label: string;
  k: WidgetAssetKey;
  cfg: WidgetConfig;
  assets: Record<WidgetAssetKey, string> | null;
  onPick: (k: WidgetAssetKey, value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const custom = cfg.images[k];
  const src = custom || assets?.[k] || "";
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-11 h-11 rounded-lg flex-shrink-0 border"
        style={{
          borderColor: LINE,
          background: src ? `url(${src}) center/contain no-repeat, rgba(0,0,0,0.3)` : "rgba(0,0,0,0.3)",
        }}
      />
      <span className="flex-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>{label}</span>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em]"
        style={{ border: `1px solid ${LINE_STRONG}`, color: INK }}
      >
        Upload
      </button>
      {custom && (
        <button
          onClick={() => onPick(k, "")}
          className="px-2 py-1 text-[10px] opacity-70 hover:opacity-100"
          style={{ color: "#ffd0dc" }}
        >
          Reset
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPick(k, await readFileAsDataUrl(f));
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
