import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildOverlayHtml,
  DEFAULT_CONFIG,
  htmlToBlobUrl,
  type OverlayConfig,
} from "@/lib/buildOverlay";
import { loadOverlayTemplate } from "@/lib/overlayTemplate";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

const SLOT_LABELS = ["Left", "Center", "Right"] as const;

export function TwitchOverlayBuilder() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<OverlayConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem("twitch-overlay-cfg");
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_CONFIG;
  });
  const [activeTier, setActiveTier] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [previewBg, setPreviewBg] = useState<string>("checker");
  const [previewBgColor, setPreviewBgColor] = useState<string>("#1a1a1a");
  const blobUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    loadOverlayTemplate()
      .then(setTemplate)
      .catch((e) => setLoadError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("twitch-overlay-cfg", JSON.stringify(cfg));
    } catch {}
  }, [cfg]);

  // Rebuild preview blob whenever template or config changes (debounced)
  useEffect(() => {
    if (!template) return;
    const handle = window.setTimeout(() => {
      const html = buildOverlayHtml(template, cfg);
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
    <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) =>
      setCfg((c) => ({ ...c, [key]: value })),
    [],
  );

  const setTierName = (i: number, name: string) =>
    setCfg((c) => {
      const tierNames = c.tierNames.slice();
      tierNames[i] = name;
      return { ...c, tierNames };
    });

  const setTierImage = (t: number, s: number, dataUrl: string) =>
    setCfg((c) => {
      const tierImages = c.tierImages.map((r) => r.slice());
      tierImages[t][s] = dataUrl;
      return { ...c, tierImages };
    });

  const setAudioTier = (t: number, on: boolean) =>
    setCfg((c) => {
      const audioTiers = c.audioTiers.slice();
      audioTiers[t] = on;
      return { ...c, audioTiers };
    });

  const handleDownload = async () => {
    if (!template) return;
    const html = buildOverlayHtml(template, cfg);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iomaya_overlay.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tierTabs = useMemo(
    () =>
      cfg.tierNames.map((n, i) => ({
        label: n || `Tier ${i + 1}`,
        idx: i,
      })),
    [cfg.tierNames],
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* PREVIEW */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold tracking-wide" style={{ color: "#ffe2ec" }}>
              Live Preview
            </h2>
            <p className="text-xs opacity-70" style={{ color: "#ffd0dc" }}>
              Renders the exact HTML you'll download. 1920×1080 scaled to fit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReplayKey((k) => k + 1)}
              disabled={!previewUrl}
              className="px-4 py-2.5 rounded-full text-xs font-semibold tracking-widest uppercase transition hover:scale-105 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#ffe2ec",
                border: "1px solid rgba(255,200,215,0.35)",
              }}
              title="Restart the preview animation (preview-only — not baked into the download)"
            >
              ↻ Replay
            </button>
            <button
              onClick={handleDownload}
              disabled={!template}
              className="px-5 py-2.5 rounded-full text-sm font-semibold tracking-widest uppercase transition hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #c8132a, #8a0a1c)",
                color: "#fff0f4",
                border: "1px solid rgba(255,200,215,0.4)",
                boxShadow: "0 6px 24px rgba(200,19,42,0.45)",
              }}
            >
              Download HTML
            </button>
          </div>
        </div>
        <div
          className="relative w-full rounded-xl overflow-hidden border"
          style={{
            aspectRatio: "16 / 9",
            background:
              "repeating-conic-gradient(#1f0710 0 25%, #2a0a14 0 50%) 50% / 28px 28px",
            borderColor: "rgba(255,180,200,0.18)",
          }}
        >
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-200 p-4 text-center">
              Failed to load overlay template: {loadError}
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
              title="Overlay preview"
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
      </div>

      {/* EDITOR */}
      <div
        className="rounded-xl p-4 flex flex-col gap-4 border"
        style={{
          background: "rgba(20,4,10,0.6)",
          borderColor: "rgba(255,180,200,0.18)",
          color: "#ffe2ec",
        }}
      >
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-80">Colors</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <ColorField label="Text" value={cfg.textColor} onChange={(v) => updateCfg("textColor", v)} />
            <ColorField label="Wave / mic" value={cfg.audioWaveColor} onChange={(v) => updateCfg("audioWaveColor", v)} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-80">Timing</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField
              label="Card hold (sec)"
              hint="How long each tier shows before flipping"
              value={+(cfg.holdMs / 1000).toFixed(1)}
              step={0.1}
              min={0.5}
              onChange={(v) => updateCfg("holdMs", Math.max(500, Math.round(v * 1000)))}
            />
            <NumberField
              label="End break (min)"
              hint="Transparent pause after the animation finishes (plays once, then empty)"
              value={+(cfg.breakMs / 60000).toFixed(2)}
              step={0.25}
              min={0}
              onChange={(v) => updateCfg("breakMs", Math.max(0, Math.round(v * 60000)))}
            />

          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest mb-2 opacity-80">Tier</h3>
          <div className="flex flex-wrap gap-1.5">
            {tierTabs.map((t) => (
              <button
                key={t.idx}
                onClick={() => setActiveTier(t.idx)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                style={{
                  background:
                    activeTier === t.idx
                      ? "linear-gradient(135deg,#c8132a,#8a0a1c)"
                      : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,180,200,0.25)",
                  color: "#fff0f4",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest opacity-80">Tier name</label>
          <input
            value={cfg.tierNames[activeTier]}
            onChange={(e) => setTierName(activeTier, e.target.value)}
            className="px-3 py-2 rounded text-sm bg-black/30 border outline-none focus:ring-2"
            style={{ borderColor: "rgba(255,180,200,0.3)", color: "#fff" }}
            maxLength={32}
          />

          <label className="text-xs uppercase tracking-widest opacity-80 mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.audioTiers[activeTier]}
              onChange={(e) => setAudioTier(activeTier, e.target.checked)}
            />
            Audio card on center slot (mic + waveform)
          </label>

          <label className="text-xs uppercase tracking-widest opacity-80 mt-2">Card images</label>
          <div className="grid grid-cols-3 gap-2">
            {SLOT_LABELS.map((label, slot) => (
              <CardImageSlot
                key={slot}
                label={label}
                value={cfg.tierImages[activeTier][slot]}
                isAudioCenter={slot === 1 && cfg.audioTiers[activeTier]}
                onPick={async (file) => {
                  const url = await readFileAsDataUrl(file);
                  setTierImage(activeTier, slot, url);
                }}
                onClear={() => setTierImage(activeTier, slot, "")}
              />
            ))}
          </div>
          <p className="text-[11px] opacity-60 leading-snug mt-1">
            Tip: when "Audio card" is on, the center slot shows the animated mic+waveform indicator instead of the image —
            you can still upload an image; it just won't be visible on that tier.
          </p>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_CONFIG)}
          className="text-[11px] uppercase tracking-widest opacity-60 hover:opacity-100 mt-1 self-start"
        >
          Reset to template defaults
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded cursor-pointer bg-transparent border-0 p-0"
      />
      <div className="flex flex-col">
        <span className="uppercase tracking-widest opacity-80">{label}</span>
        <span className="text-[10px] opacity-60">{value}</span>
      </div>
    </label>
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
      <span className="uppercase tracking-widest opacity-80">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="px-2 py-1.5 rounded bg-black/30 border outline-none text-sm"
        style={{ borderColor: "rgba(255,180,200,0.3)", color: "#fff" }}
      />
      {hint && <span className="text-[10px] opacity-60 leading-snug">{hint}</span>}
    </label>
  );
}


function CardImageSlot({
  label,
  value,
  isAudioCenter,
  onPick,
  onClear,
}: {
  label: string;
  value: string;
  isAudioCenter: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="rounded-md overflow-hidden border flex flex-col"
      style={{ borderColor: "rgba(255,180,200,0.25)", background: "rgba(0,0,0,0.35)" }}
    >
      <div
        className="aspect-[5/7] relative flex items-center justify-center text-[10px] opacity-70 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        style={{
          background: value ? `url(${value}) center/cover no-repeat` : "rgba(255,255,255,0.04)",
        }}
      >
        {!value && <span>Click to upload</span>}
        {isAudioCenter && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] uppercase tracking-widest text-pink-200">
            Audio
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-2 py-1 text-[10px]">
        <span className="uppercase tracking-widest opacity-70">{label}</span>
        {value && (
          <button onClick={onClear} className="opacity-70 hover:opacity-100">
            clear
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
