import { useCallback, useEffect, useRef, useState } from "react";
import { htmlToBlobUrl } from "@/lib/buildOverlay";
import {
  buildGamersuppsHtml,
  DEFAULT_GAMERSUPPS_CONFIG,
  normalizeGamersuppsConfig,
  type GamersuppsConfig,
} from "@/lib/buildGamersupps";
import { loadGamersuppsTemplate } from "@/lib/gamersuppsTemplate";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

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
const SEAL_WASH = "linear-gradient(135deg, rgba(200,19,42,0.32), rgba(138,10,28,0.20))";

export function GamersuppsBuilder() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<GamersuppsConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_GAMERSUPPS_CONFIG;
    try {
      const raw = localStorage.getItem("gamersupps-cfg");
      if (raw) return normalizeGamersuppsConfig({ ...DEFAULT_GAMERSUPPS_CONFIG, ...JSON.parse(raw) });
    } catch {}
    return DEFAULT_GAMERSUPPS_CONFIG;
  });
  const [replayKey, setReplayKey] = useState(0);
  const [previewBg, setPreviewBg] = useState<"default" | "image">("default");
  const [previewBgImage, setPreviewBgImage] = useState<string>("");
  const bgInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    loadGamersuppsTemplate()
      .then(setTemplate)
      .catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("gamersupps-cfg", JSON.stringify(cfg));
    } catch {}
  }, [cfg]);

  useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const html = buildGamersuppsHtml(template, cfg);
      const url = htmlToBlobUrl(html);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [template, cfg]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const updateCfg = useCallback(
    <K extends keyof GamersuppsConfig>(key: K, value: GamersuppsConfig[K]) =>
      setCfg((c) => ({ ...c, [key]: value })),
    [],
  );

  const handleDownload = () => {
    if (!template) return;
    const html = buildGamersuppsHtml(template, cfg);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gamersupps_card.html";
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
              onClick={() => setReplayKey((k) => k + 1)}
              disabled={!previewUrl}
              className="px-4 py-2.5 rounded-full text-xs tracking-[0.25em] uppercase transition hover:bg-white/5 disabled:opacity-50"
              style={{ background: "transparent", color: INK, border: `1px solid ${LINE_STRONG}` }}
              title="Restart the preview animation"
            >
              ↻ Replay
            </button>
            <button
              onClick={handleDownload}
              disabled={!template}
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
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center">
              Failed to load Gamersupps template: {loadError}
            </div>
          )}
          {!template && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70" style={{ color: "#ffd0dc" }}>
              Loading template…
            </div>
          )}
          {previewUrl && (
            <iframe
              key={previewUrl + ":" + replayKey}
              src={previewUrl}
              title="Gamersupps preview"
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

        {/* Preview background (preview-only, not baked into download) */}
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
            <>
              <button
                onClick={() => bgInputRef.current?.click()}
                className="px-2 py-1 rounded-full opacity-80 hover:opacity-100 transition hover:bg-white/5"
                style={{ background: "transparent", border: `1px solid ${LINE}`, color: BRIGHT }}
              >
                Change
              </button>
              <button
                onClick={() => { setPreviewBgImage(""); setPreviewBg("default"); }}
                className="px-2 py-1 rounded-full opacity-70 hover:opacity-100"
                style={{ color: "#ffd0dc" }}
              >
                Clear
              </button>
            </>
          )}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                const url = await readFileAsDataUrl(f);
                setPreviewBgImage(url);
                setPreviewBg("image");
              }
              e.currentTarget.value = "";
            }}
          />
        </div>

        <GamersuppsObsGuide />
      </div>

      {/* EDITOR — intentionally minimal: just timing + image */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-6 border"
        style={{ background: PANEL, borderColor: LINE, color: INK }}
      >
        <div>
          <SectionTitle kanji="時">Timing</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField
              label="On-screen time (sec)"
              hint="How long the card stays before it animates out"
              value={+(cfg.holdMs / 1000).toFixed(1)}
              step={0.5}
              min={0.2}
              onChange={(v) => updateCfg("holdMs", Math.max(200, Math.round(v * 1000)))}
            />
            <NumberField
              label="End break (sec)"
              hint="Transparent pause after it exits, before it loops back in"
              value={+(cfg.breakMs / 1000).toFixed(1)}
              step={0.5}
              min={0}
              onChange={(v) => updateCfg("breakMs", Math.max(0, Math.round(v * 1000)))}
            />
          </div>
        </div>

        <div>
          <SectionTitle kanji="絵">Card image</SectionTitle>
          <div className="rounded-xl border p-3.5 flex flex-col gap-3" style={{ borderColor: LINE, background: CARD }}>
            <div
              className="relative rounded-lg overflow-hidden border flex items-center justify-center cursor-pointer"
              style={{
                borderColor: LINE_STRONG,
                background: cfg.image
                  ? `url(${cfg.image}) center/contain no-repeat, repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 22px 22px`
                  : "rgba(255,255,255,0.04)",
                minHeight: 180,
              }}
              onClick={() => imgInputRef.current?.click()}
            >
              {!cfg.image && (
                <span className="text-xs opacity-70 uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>
                  Click to upload image
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => imgInputRef.current?.click()}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-[0.2em] transition hover:scale-[1.02]"
                style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)" }}
              >
                {cfg.image ? "Replace image" : "Upload image"}
              </button>
              {cfg.image && (
                <button
                  onClick={() => updateCfg("image", "")}
                  className="px-3 py-2 rounded-lg text-xs uppercase tracking-[0.2em] transition hover:bg-white/5"
                  style={{ background: "transparent", color: "#ffd0dc", border: `1px solid ${LINE_STRONG}` }}
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-[10px] opacity-60 leading-snug" style={{ color: INK_SOFT }}>
              This single image is what floats and animates. PNG with transparency works best.
              The spinning sakura petals stay as-is.
            </p>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = await readFileAsDataUrl(f);
                  updateCfg("image", url);
                }
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_GAMERSUPPS_CONFIG)}
          className="text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition"
          style={{ color: INK_SOFT }}
        >
          Reset to template defaults
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

function NumberField({
  label,
  hint,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="px-2 py-1.5 rounded-lg outline-none text-sm"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
      />
      {hint && <span className="text-[10px] opacity-60 leading-snug">{hint}</span>}
    </label>
  );
}

const GS_OBS_STEPS: { title: string; detail?: string }[] = [
  { title: "Press “DOWNLOAD HTML”", detail: "The button up top, by the preview." },
  { title: "Save the file", detail: "A .html file lands on your computer." },
  { title: "Open OBS" },
  { title: "Add a Browser source", detail: "In your scene’s Sources panel, click + → Browser." },
  { title: "Tick “Local File”", detail: "Then browse to the .html file you saved." },
  { title: "Set the size", detail: "Width 1920 · Height 1080." },
  { title: "Position it", detail: "Drag & scale it in your scene however you like ♡" },
];

function GamersuppsObsGuide() {
  const [open, setOpen] = useState(true);
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
              Get your overlay into a stream in 7 quick steps
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
            {GS_OBS_STEPS.map((step, i) => {
              const last = i === GS_OBS_STEPS.length - 1;
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
                    {step.detail && (
                      <span className="text-xs leading-snug opacity-70" style={{ color: INK }}>{step.detail}</span>
                    )}
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
