import { useCallback, useEffect, useRef, useState } from "react";
import { htmlToBlobUrl } from "@/lib/buildOverlay";
import {
  buildSocialWidgetHtml,
  DEFAULT_SOCIAL_CONFIG,
  normalizeSocialConfig,
  type SocialItem,
  type SocialWidgetConfig,
} from "@/lib/buildSocialWidget";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
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

const STORAGE_KEY = "social-widget-cfg";

export function SocialWidgetBuilder() {
  const [cfg, setCfg] = useState<SocialWidgetConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_SOCIAL_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeSocialConfig(JSON.parse(raw));
    } catch {}
    return DEFAULT_SOCIAL_CONFIG;
  });
  const [previewFast, setPreviewFast] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [previewBg, setPreviewBg] = useState<"default" | "image">("default");
  const [previewBgImage, setPreviewBgImage] = useState<string>("");
  const [openItem, setOpenItem] = useState(0);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const sakuraInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {}
  }, [cfg]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const html = buildSocialWidgetHtml(
        previewFast ? { ...cfg, rotateMs: 4000, fadeMs: Math.min(cfg.fadeMs, 700) } : cfg,
      );
      const url = htmlToBlobUrl(html);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      setPreviewUrl(url);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [cfg, previewFast]);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  const set = useCallback(
    <K extends keyof SocialWidgetConfig>(key: K, value: SocialWidgetConfig[K]) =>
      setCfg((c) => ({ ...c, [key]: value })),
    [],
  );

  const setItem = useCallback(
    <K extends keyof SocialItem>(index: number, key: K, value: SocialItem[K]) =>
      setCfg((c) => ({
        ...c,
        items: c.items.map((it, i) => (i === index ? { ...it, [key]: value } : it)),
      })),
    [],
  );

  const handleDownload = () => {
    const html = buildSocialWidgetHtml(cfg);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "social_rotator.html";
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
              title="Preview-only: cycles every 4 seconds so you can see the transition"
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
              className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-[0.2em] uppercase transition hover:scale-105"
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
              title="Social widget preview"
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
              onClick={() => { setPreviewBgImage(""); setPreviewBg("default"); }}
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
          Tip: this widget is always on screen — it never pops in or out. It just cross-fades to the
          next platform every few minutes while the sakura keeps spinning.
        </p>
      </div>

      {/* EDITOR */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-6 border"
        style={{ background: PANEL, borderColor: LINE, color: INK }}
      >
        {/* Platforms */}
        <div>
          <SectionTitle kanji="縁">Platforms</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {cfg.items.map((item, i) => (
              <div key={item.id} className="rounded-xl border overflow-hidden" style={{ borderColor: LINE, background: CARD }}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => setOpenItem(openItem === i ? -1 : i)}
                    className="flex-1 flex items-center gap-2.5 text-left"
                  >
                    <span
                      className="w-7 h-7 rounded-md flex-shrink-0"
                      style={{
                        background: item.iconPanelColor,
                        opacity: item.iconPanelOpacity,
                        WebkitMaskImage: `url(${item.icon})`,
                        maskImage: `url(${item.icon})`,
                        WebkitMaskSize: "70%",
                        maskSize: "70%",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                      }}
                    />
                    <span className="text-xs uppercase tracking-[0.2em]" style={{ color: BRIGHT }}>{item.name}</span>
                    <span className="text-[10px] opacity-60">{openItem === i ? "▲" : "▼"}</span>
                  </button>
                  <Toggle
                    on={item.enabled}
                    onClick={() => setItem(i, "enabled", !item.enabled)}
                    label={item.enabled ? "On" : "Off"}
                  />
                </div>
                {openItem === i && (
                  <div className="px-3 pb-3.5 flex flex-col gap-3 border-t pt-3" style={{ borderColor: LINE }}>
                    <TextField label="Small text" value={item.label} onChange={(v) => setItem(i, "label", v)} />
                    <TextField label="Username" value={item.username} onChange={(v) => setItem(i, "username", v)} />
                    <div className="grid grid-cols-2 gap-2.5">
                      <ColorField label="Logo panel" value={item.iconPanelColor} onChange={(v) => setItem(i, "iconPanelColor", v)} />
                      <ColorField label="Logo colour" value={item.iconColor} onChange={(v) => setItem(i, "iconColor", v)} />
                      <ColorField label="Card colour" value={item.cardColor} onChange={(v) => setItem(i, "cardColor", v)} />
                      <ColorField label="Small text" value={item.labelColor} onChange={(v) => setItem(i, "labelColor", v)} />
                      <ColorField label="Username" value={item.usernameColor} onChange={(v) => setItem(i, "usernameColor", v)} />
                    </div>
                    <SliderField
                      label="Panel opacity"
                      value={item.iconPanelOpacity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => setItem(i, "iconPanelOpacity", v)}
                    />
                    <SliderField
                      label="Card opacity"
                      value={item.cardOpacity}
                      min={0} max={1} step={0.05}
                      onChange={(v) => setItem(i, "cardOpacity", v)}
                    />
                    <IconUpload
                      current={item.icon}
                      onPick={(url) => setItem(i, "icon", url)}
                      onReset={() => setItem(i, "icon", DEFAULT_SOCIAL_CONFIG.items[i]?.icon ?? item.icon)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <SectionTitle kanji="巡">Rotation</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField
              label="Switch every (min)"
              hint="Time each platform stays on screen"
              value={+(cfg.rotateMs / 60000).toFixed(2)}
              step={0.5} min={0.02}
              onChange={(v) => set("rotateMs", Math.max(1000, Math.round(v * 60000)))}
            />
            <NumberField
              label="Fade time (sec)"
              hint="Cross-fade between platforms"
              value={+(cfg.fadeMs / 1000).toFixed(2)}
              step={0.1} min={0}
              onChange={(v) => set("fadeMs", Math.max(0, Math.round(v * 1000)))}
            />
          </div>
        </div>

        {/* Card shape & position */}
        <div>
          <SectionTitle kanji="形">Card & position</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField label="Width (px)" value={cfg.cardWidth} step={10} min={200} onChange={(v) => set("cardWidth", v)} />
            <NumberField label="Height (px)" value={cfg.cardHeight} step={5} min={80} onChange={(v) => set("cardHeight", v)} />
            <NumberField label="Corner radius" value={cfg.radius} step={2} min={0} onChange={(v) => set("radius", v)} />
            <NumberField label="Logo size (px)" hint="Same for every platform" value={cfg.iconSize} step={2} min={20} onChange={(v) => set("iconSize", v)} />
            <NumberField label="From left (px)" value={cfg.offsetX} step={10} min={-500} onChange={(v) => set("offsetX", v)} />
            <NumberField label="From bottom (px)" value={cfg.offsetY} step={10} min={-500} onChange={(v) => set("offsetY", v)} />
            <NumberField label="Small text size" value={cfg.labelSize} step={1} min={8} onChange={(v) => set("labelSize", v)} />
            <NumberField label="Username size" value={cfg.usernameSize} step={1} min={10} onChange={(v) => set("usernameSize", v)} />
          </div>
        </div>

        {/* Sakura */}
        <div>
          <SectionTitle kanji="桜">Sakura flower</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField label="Size (px)" value={cfg.sakuraSize} step={4} min={0} onChange={(v) => set("sakuraSize", v)} />
            <NumberField label="Spin (sec / turn)" value={cfg.sakuraSpinSeconds} step={1} min={1} onChange={(v) => set("sakuraSpinSeconds", v)} />
            <NumberField label="X on card (px)" value={cfg.sakuraOffsetX} step={5} min={-600} onChange={(v) => set("sakuraOffsetX", v)} />
            <NumberField label="Y overlap (px)" hint="Negative hangs below the card" value={cfg.sakuraOffsetY} step={2} min={-300} onChange={(v) => set("sakuraOffsetY", v)} />
          </div>
          <div className="mt-3">
            <SliderField label="Opacity" value={cfg.sakuraOpacity} min={0} max={1} step={0.05} onChange={(v) => set("sakuraOpacity", v)} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => sakuraInputRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-[0.2em] transition hover:scale-[1.02]"
              style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,200,215,0.4)" }}
            >
              {cfg.sakuraImage ? "Replace flower" : "Use my own flower"}
            </button>
            {cfg.sakuraImage && (
              <button
                onClick={() => set("sakuraImage", "")}
                className="px-3 py-2 rounded-lg text-[11px] uppercase tracking-[0.2em] transition hover:bg-white/5"
                style={{ background: "transparent", color: "#ffd0dc", border: `1px solid ${LINE_STRONG}` }}
              >
                Default
              </button>
            )}
            <input
              ref={sakuraInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set("sakuraImage", await readFileAsDataUrl(f));
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_SOCIAL_CONFIG)}
          className="text-[11px] uppercase tracking-[0.25em] opacity-60 hover:opacity-100 self-start transition"
          style={{ color: INK_SOFT }}
        >
          Reset to defaults
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[10px]">
      <span className="uppercase tracking-[0.18em]" style={{ color: INK_SOFT }}>{label}</span>
      <span
        className="flex items-center gap-2 px-1.5 py-1 rounded-lg"
        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}` }}
      >
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
        />
        <span className="font-mono text-[10px] opacity-80" style={{ color: "#fff" }}>{value}</span>
      </span>
    </label>
  );
}

function SliderField({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[10px]">
      <span className="uppercase tracking-[0.18em] flex justify-between" style={{ color: INK_SOFT }}>
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-pink-400"
      />
    </label>
  );
}

function NumberField({
  label, hint, value, step, min, onChange,
}: { label: string; hint?: string; value: number; step: number; min: number; onChange: (v: number) => void }) {
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

function IconUpload({
  current, onPick, onReset,
}: { current: string; onPick: (url: string) => void; onReset: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-9 h-9 rounded-lg flex-shrink-0"
        style={{
          background: `url(${current}) center/70% no-repeat, rgba(255,255,255,0.06)`,
          border: `1px solid ${LINE}`,
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        className="flex-1 px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.2em] transition hover:bg-white/5"
        style={{ background: "transparent", color: BRIGHT, border: `1px solid ${LINE_STRONG}` }}
      >
        Replace logo
      </button>
      <button
        onClick={onReset}
        className="px-3 py-2 rounded-lg text-[10px] uppercase tracking-[0.2em] opacity-70 hover:opacity-100"
        style={{ color: "#ffd0dc" }}
      >
        Reset
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPick(await readFileAsDataUrl(f));
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
