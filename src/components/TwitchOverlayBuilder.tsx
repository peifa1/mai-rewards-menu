import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildOverlayHtml,
  DEFAULT_CONFIG,
  htmlToBlobUrl,
  normalizeConfig,
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

// Shared palette — harmonised with the Patreon showcase so both tabs read as one site.
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

export function TwitchOverlayBuilder() {
  const [template, setTemplate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<OverlayConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem("twitch-overlay-cfg");
      if (raw) return normalizeConfig({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
    } catch {}
    return DEFAULT_CONFIG;
  });
  const [activeTier, setActiveTier] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [previewBg, setPreviewBg] = useState<"default" | "image">("default");
  const [previewBgImage, setPreviewBgImage] = useState<string>("");
  const bgInputRef = useRef<HTMLInputElement>(null);
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

  const setAudioSlot = (t: number, slot: number, on: boolean) =>
    setCfg((c) => {
      const audioSlots = c.audioSlots.map((r) => r.slice());
      if (!audioSlots[t]) audioSlots[t] = [false, false, false];
      audioSlots[t][slot] = on;
      return { ...c, audioSlots };
    });

  const setAudioColor = (t: number, slot: number, v: string) =>
    setCfg((c) => {
      const audioColors = c.audioColors.map((r) => r.slice());
      if (!audioColors[t]) audioColors[t] = ["#f8b8cc", "#f8b8cc", "#f8b8cc"];
      audioColors[t][slot] = v;
      return { ...c, audioColors };
    });

  const setAudioText = (t: number, slot: number, key: "top" | "sub", v: string) =>
    setCfg((c) => {
      const audioTexts = c.audioTexts.map((r) => r.map((x) => ({ ...x })));
      if (!audioTexts[t]) audioTexts[t] = [
        { top: "RP AUDIO", sub: "ASMR" },
        { top: "RP AUDIO", sub: "ASMR" },
        { top: "RP AUDIO", sub: "ASMR" },
      ];
      audioTexts[t][slot] = { ...audioTexts[t][slot], [key]: v };
      return { ...c, audioTexts };
    });

  const setShineSlot = (t: number, slot: number, on: boolean) =>
    setCfg((c) => {
      const cardShineSlots = c.cardShineSlots.map((r) => r.slice());
      if (!cardShineSlots[t]) cardShineSlots[t] = [false, false, false];
      cardShineSlots[t][slot] = on;
      return { ...c, cardShineSlots };
    });

  const setShineColor = (t: number, v: string) =>
    setCfg((c) => {
      const cardShineColor = c.cardShineColor.slice();
      cardShineColor[t] = v;
      return { ...c, cardShineColor };
    });

  const setBlur = (t: number, slot: number, on: boolean) =>
    setCfg((c) => {
      const cardBlur = c.cardBlur.map((r) => r.slice());
      if (!cardBlur[t]) cardBlur[t] = [false, false, false];
      cardBlur[t][slot] = on;
      return { ...c, cardBlur };
    });

  const addTier = () =>
    setCfg((c) => {
      if (c.tierNames.length >= 12) return c;
      const lastImgs = c.tierImages[c.tierImages.length - 1] ?? ["", "", ""];
      return {
        ...c,
        tierNames: [...c.tierNames, `Tier ${c.tierNames.length + 1}`],
        tierImages: [...c.tierImages, lastImgs.slice()],
        audioSlots: [...c.audioSlots, [false, false, false]],
        audioColors: [...c.audioColors, ["#f8b8cc", "#f8b8cc", "#f8b8cc"]],
        audioTexts: [...c.audioTexts, [{ top: "RP AUDIO", sub: "ASMR" }, { top: "RP AUDIO", sub: "ASMR" }, { top: "RP AUDIO", sub: "ASMR" }]],
        cardShineSlots: [...c.cardShineSlots, [false, false, false]],
        cardShineColor: [...c.cardShineColor, "#ffb8cc"],
        cardBlur: [...c.cardBlur, [false, false, false]],
      };
    });

  const removeTier = (idx: number) =>
    setCfg((c) => {
      if (c.tierNames.length <= 1) return c;
      const drop = <T,>(a: T[]) => a.filter((_, i) => i !== idx);
      return {
        ...c,
        tierNames: drop(c.tierNames),
        tierImages: drop(c.tierImages),
        audioSlots: drop(c.audioSlots),
        audioColors: drop(c.audioColors),
        audioTexts: drop(c.audioTexts),
        cardShineSlots: drop(c.cardShineSlots),
        cardShineColor: drop(c.cardShineColor),
        cardBlur: drop(c.cardBlur),
      };
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
              title="Restart the preview animation (preview-only — not baked into the download)"
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

        <ObsGuide />
      </div>

      {/* EDITOR */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-6 border"
        style={{ background: PANEL, borderColor: LINE, color: INK }}
      >
        <div>
          <SectionTitle kanji="彩">Global colors</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <ColorField label="Text" value={cfg.textColor} onChange={(v) => updateCfg("textColor", v)} />
          </div>
          <ToggleRow
            label="Show petal rain"
            on={cfg.showPetals ?? true}
            onChange={(v) => updateCfg("showPetals", v)}
          />
          <p className="text-[10px] opacity-60 mt-2 leading-snug" style={{ color: INK_SOFT }}>
            Audio wave / mic color is configured per-tier below.
          </p>
        </div>

        <div>
          <SectionTitle kanji="時">Timing</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <NumberField
              label="Start delay (sec)"
              hint="Empty/transparent pause before the animation begins"
              value={+(cfg.startDelayMs / 1000).toFixed(1)}
              step={0.5}
              min={0}
              onChange={(v) => updateCfg("startDelayMs", Math.max(0, Math.round(v * 1000)))}
            />
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="font-hakkou text-base leading-none" style={{ color: KANJI }}>段</span>
              <span className="text-xs uppercase tracking-[0.25em]" style={{ color: INK_SOFT }}>Tiers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={addTier}
                disabled={cfg.tierNames.length >= 12}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition disabled:opacity-40"
                style={{ background: SEAL, color: BRIGHT, border: "1px solid rgba(255,180,200,0.3)" }}
                title="Add a new tier"
              >
                + Add tier
              </button>
              <button
                onClick={() => {
                  if (cfg.tierNames.length <= 1) return;
                  const newIdx = Math.max(0, Math.min(activeTier, cfg.tierNames.length - 2));
                  removeTier(activeTier);
                  setActiveTier(newIdx);
                }}
                disabled={cfg.tierNames.length <= 1}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition hover:bg-white/5 disabled:opacity-40"
                style={{ background: "transparent", color: "#ffd0dc", border: `1px solid ${LINE_STRONG}` }}
                title="Remove the currently selected tier"
              >
                − Remove
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tierTabs.map((t) => (
              <button
                key={t.idx}
                onClick={() => setActiveTier(t.idx)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition hover:bg-white/5"
                style={{
                  background: activeTier === t.idx ? SEAL : "transparent",
                  border: `1px solid ${activeTier === t.idx ? "rgba(255,180,200,0.4)" : LINE}`,
                  color: activeTier === t.idx ? BRIGHT : INK,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.25em]" style={{ color: INK_SOFT }}>Tier name</span>
            <input
              value={cfg.tierNames[activeTier]}
              onChange={(e) => setTierName(activeTier, e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-300/30"
              style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
              maxLength={32}
            />
          </label>

          <div className="rounded-xl border p-3.5 flex flex-col gap-3" style={{ borderColor: LINE, background: CARD }}>
            <SectionLabel kanji="音">Audio Card</SectionLabel>
            <SlotToggles
              values={cfg.audioSlots[activeTier]}
              onChange={(slot, on) => setAudioSlot(activeTier, slot, on)}
            />

            {SLOT_LABELS.map((slotLabel, slot) => {
              if (!(cfg.audioSlots[activeTier] || [])[slot]) return null;
              return (
                <div key={slot} className="flex flex-col gap-2 text-xs pl-3 border-l-2" style={{ borderColor: LINE_STRONG }}>
                  <span className="uppercase tracking-[0.25em] text-[10px]" style={{ color: INK_SOFT }}>{slotLabel}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <ColorField
                      label="Wave / mic"
                      value={(cfg.audioColors[activeTier] || [])[slot] || "#f8b8cc"}
                      onChange={(v) => setAudioColor(activeTier, slot, v)}
                    />
                    <label className="flex flex-col gap-1">
                      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>Top text</span>
                      <input
                        value={(cfg.audioTexts[activeTier] || [])[slot]?.top ?? "RP AUDIO"}
                        onChange={(e) => setAudioText(activeTier, slot, "top", e.target.value)}
                        className="px-2 py-1.5 rounded-lg outline-none text-sm"
                        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
                        maxLength={24}
                      />
                    </label>
                    <label className="flex flex-col gap-1 col-span-2">
                      <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>Sub text</span>
                      <input
                        value={(cfg.audioTexts[activeTier] || [])[slot]?.sub ?? "ASMR"}
                        onChange={(e) => setAudioText(activeTier, slot, "sub", e.target.value)}
                        className="px-2 py-1.5 rounded-lg outline-none text-sm"
                        style={{ background: FIELD, border: `1px solid ${LINE_STRONG}`, color: "#fff" }}
                        maxLength={24}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border p-3.5 flex flex-col gap-3" style={{ borderColor: LINE, background: CARD }}>
            <SectionLabel kanji="光">Light Shimmer</SectionLabel>
            <SlotToggles
              values={cfg.cardShineSlots[activeTier]}
              onChange={(slot, on) => setShineSlot(activeTier, slot, on)}
            />
          </div>

          <div className="rounded-xl border p-3.5 flex flex-col gap-3" style={{ borderColor: LINE, background: CARD }}>
            <SectionLabel kanji="暈">Blur</SectionLabel>
            <SlotToggles
              values={cfg.cardBlur[activeTier]}
              onChange={(slot, on) => setBlur(activeTier, slot, on)}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <SectionLabel kanji="絵">Card images</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {SLOT_LABELS.map((label, slot) => (
                <CardImageSlot
                  key={slot}
                  label={label}
                  value={cfg.tierImages[activeTier][slot]}
                  isAudioCenter={!!(cfg.audioSlots[activeTier] || [])[slot]}
                  onPick={async (file) => {
                    const url = await readFileAsDataUrl(file);
                    setTierImage(activeTier, slot, url);
                  }}
                  onClear={() => setTierImage(activeTier, slot, "")}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setCfg(DEFAULT_CONFIG)}
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

function SectionLabel({ kanji, children }: { kanji: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="font-hakkou text-sm leading-none" style={{ color: KANJI }}>{kanji}</span>
      <span className="text-xs uppercase tracking-[0.25em]" style={{ color: INK_SOFT }}>{children}</span>
    </span>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className="flex items-center justify-between gap-2 mt-3 px-3 py-2 rounded-lg cursor-pointer select-none transition"
      style={{
        background: on ? SEAL_WASH : "transparent",
        border: `1px solid ${on ? LINE_STRONG : LINE}`,
      }}
    >
      <span className="text-xs uppercase tracking-[0.2em]" style={{ color: on ? BRIGHT : INK }}>{label}</span>
      <span
        role="switch"
        aria-checked={on}
        className="relative inline-block flex-shrink-0"
        style={{ width: 36, height: 20, borderRadius: 999, background: on ? "#c8132a" : "rgba(255,255,255,0.15)", transition: "background 0.15s" }}
      >
        <span
          style={{
            position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
            borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        />
      </span>
      <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SlotToggles({
  values,
  onChange,
}: {
  values: boolean[] | undefined;
  onChange: (slot: number, on: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SLOT_LABELS.map((label, slot) => {
        const on = !!(values || [])[slot];
        return (
          <label
            key={slot}
            className="flex items-center justify-center gap-2 text-[11px] px-2 py-2 rounded-lg cursor-pointer select-none transition hover:bg-white/5"
            style={{
              background: on ? SEAL_WASH : "transparent",
              border: `1px solid ${on ? LINE_STRONG : LINE}`,
            }}
          >
            <span
              className="inline-block flex-shrink-0"
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: on ? "#ff5a78" : "transparent",
                border: on ? "none" : `1px solid ${LINE_STRONG}`,
                boxShadow: on ? "0 0 6px rgba(255,90,120,0.7)" : "none",
              }}
            />
            <span className="uppercase tracking-[0.2em]" style={{ color: on ? BRIGHT : INK }}>{label}</span>
            <input type="checkbox" className="sr-only" checked={on} onChange={(e) => onChange(slot, e.target.checked)} />
          </label>
        );
      })}
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
        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
      />
      <div className="flex flex-col">
        <span className="uppercase tracking-[0.2em]" style={{ color: INK_SOFT }}>{label}</span>
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
      className="rounded-lg overflow-hidden border flex flex-col"
      style={{ borderColor: LINE_STRONG, background: "rgba(0,0,0,0.35)" }}
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] uppercase tracking-[0.2em] text-pink-200">
            Audio
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-2 py-1 text-[10px]">
        <span className="uppercase tracking-[0.2em] opacity-70">{label}</span>
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

function ObsGuide() {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: LINE,
        background: "linear-gradient(135deg, rgba(50,10,22,0.7), rgba(20,4,10,0.55))",
        color: INK,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold tracking-[0.25em] uppercase"
        style={{ borderBottom: open ? `1px solid ${LINE}` : "none" }}
      >
        <span className="flex items-center gap-3">
          <span aria-hidden style={{ color: KANJI, fontSize: 16, lineHeight: 1 }}>⛩</span>
          <span style={{ color: BRIGHT }}>OBS Setup Guide</span>
          <span className="font-hakkou opacity-70 text-sm" style={{ color: KANJI }}>案内</span>
        </span>
        <span className="opacity-70 text-base">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-5 py-4 text-sm leading-relaxed">
          <p className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#ffd0dc" }}>
            <span aria-hidden>❀</span> How to add this to OBS
          </p>
          <ol className="space-y-2.5">
            {[
              "Press DOWNLOAD HTML",
              "A .html file will be saved to your computer",
              "Open OBS",
              "Add a Browser source to your scene",
              "Tick Local File and import the .html file",
              "Set Width: 1920 and Height: 1080",
              "Adjust the size in your scene however you like ♡",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                  style={{ background: SEAL, color: BRIGHT, boxShadow: "0 2px 8px rgba(200,19,42,0.35)" }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <div
            className="mt-4 text-xs leading-snug rounded-xl px-4 py-3 flex gap-3"
            style={{ background: "rgba(255,200,215,0.06)", border: `1px solid ${LINE}` }}
          >
            <span aria-hidden style={{ color: KANJI, fontSize: 14 }}>🌸</span>
            <p>
              <span className="font-semibold tracking-wider uppercase text-[10px] mr-1" style={{ color: KANJI }}>
                Tip
              </span>
              Download 2 files — one with a 0.3s end break for positioning in OBS, and one
              with the real break length you want. The real one stays invisible between plays,
              which makes it hard to align.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
