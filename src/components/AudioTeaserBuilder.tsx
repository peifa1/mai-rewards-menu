import { useCallback, useEffect, useRef, useState } from "react";
import { loadAudioTeaserTemplate } from "@/lib/audioTeaserTemplate";
import {
  buildAudioTeaserHtml,
  DEFAULT_AUDIO_TEASER_CONFIG,
  normalizeAudioTeaserConfig,
  type AudioTeaserConfig,
  type TeaserStyle,
} from "@/lib/buildAudioTeaser";

// ── Palette ──────────────────────────────────────────────────────────────
const INK        = "#fbe0e7";
const INK_SOFT   = "#f0a8b8";
const KANJI      = "#ffb8c8";
const LINE       = "rgba(255,180,200,0.16)";
const LINE_STR   = "rgba(255,180,200,0.30)";
const PANEL      = "rgba(20,5,12,0.5)";
const FIELD      = "rgba(20,5,12,0.7)";
const SEAL       = "linear-gradient(135deg,#c8132a,#8a0a1c)";

// ── Template natural dimensions ──────────────────────────────────────────
const DIMS: Record<TeaserStyle, { w: number; h: number }> = {
  waveform:   { w: 390, h: 693 },
  nowplaying: { w: 390, h: 693 },
  soundorb:   { w: 1080, h: 1350 },
};

// ── Style metadata ───────────────────────────────────────────────────────
const STYLES: { key: TeaserStyle; kanji: string; label: string; desc: string }[] = [
  { key: "waveform",   kanji: "波",  label: "WAVEFORM",    desc: "9:16 · Animated waveform bars" },
  { key: "nowplaying", kanji: "再",  label: "NOW PLAYING", desc: "9:16 · Spinning sakura + seek bar" },
  { key: "soundorb",   kanji: "球",  label: "SOUND ORB",   desc: "4:5  · Circular portrait + pulse rings" },
];

// ── Storage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "audio-teaser-cfg";
function loadStored(): AudioTeaserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeAudioTeaserConfig(JSON.parse(raw));
  } catch {}
  return { ...DEFAULT_AUDIO_TEASER_CONFIG };
}
function saveStored(cfg: AudioTeaserConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
}

// ── Section heading component ─────────────────────────────────────────────
function SectionTitle({ kanji, label }: { kanji: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 18, color: KANJI, fontFamily: "serif", lineHeight: 1 }}>{kanji}</span>
      <span style={{ fontSize: 9, letterSpacing: "0.32em", color: INK_SOFT, textTransform: "uppercase", fontFamily: "sans-serif", fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────
function FieldLabel({ kanji, label }: { kanji: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: KANJI, fontFamily: "serif" }}>{kanji}</span>
      <span style={{ fontSize: 9, letterSpacing: "0.28em", color: INK_SOFT, textTransform: "uppercase", fontFamily: "sans-serif" }}>{label}</span>
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────
function Field({ kanji, label, value, onChange, placeholder }: {
  kanji: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <FieldLabel kanji={kanji} label={label} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "7px 10px",
          background: FIELD, border: `1px solid ${LINE_STR}`,
          borderRadius: 6, color: INK, fontSize: 13,
          fontFamily: "serif", outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ── OBS guide ─────────────────────────────────────────────────────────────
const OBS_STEPS = [
  { n: "01", title: "Download the HTML", body: "Click DOWNLOAD HTML to save the file to your computer." },
  { n: "02", title: "Add Browser Source", body: 'In OBS, add a new "Browser" source in your scene.' },
  { n: "03", title: "Load local file", body: 'Check "Local file" and select your downloaded HTML file.' },
  { n: "04", title: "Set dimensions", body: "Waveform / Now Playing: 390 × 693. Sound Orb: 1080 × 1350." },
  { n: "05", title: "Transparent background", body: "Keep OBS background transparent — the HTML has no white background." },
];

function OBSGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "9px 14px", background: "transparent",
          border: `1px solid ${LINE_STR}`, borderRadius: 8, color: INK_SOFT,
          fontSize: 9, letterSpacing: "0.32em", textTransform: "uppercase",
          fontFamily: "sans-serif", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span><span style={{ color: KANJI, fontFamily: "serif", fontSize: 14, marginRight: 8 }}>配</span>OBS SETUP GUIDE</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, paddingLeft: 4, position: "relative" }}>
          {/* Vertical timeline line */}
          <div style={{ position: "absolute", left: 16, top: 0, bottom: 0, width: 1, background: LINE }} />
          {OBS_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, position: "relative" }}>
              <div style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                background: i === 0 ? SEAL : PANEL,
                border: `1px solid ${LINE_STR}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: INK_SOFT, fontFamily: "sans-serif", fontWeight: 700,
                zIndex: 1,
              }}>{step.n}</div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 11, color: INK, fontWeight: 600, fontFamily: "sans-serif", marginBottom: 3 }}>{step.title}</div>
                <div style={{ fontSize: 11, color: INK_SOFT, fontFamily: "sans-serif", lineHeight: 1.5 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main builder ──────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(loadStored);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [previewBg, setPreviewBg] = useState<"dark" | "light">("dark");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobRef = useRef<string>("");

  const set = useCallback(<K extends keyof AudioTeaserConfig>(key: K, val: AudioTeaserConfig[K]) => {
    setCfg(prev => {
      const next = { ...prev, [key]: val };
      saveStored(next);
      return next;
    });
  }, []);

  // Build and show preview
  const buildPreview = useCallback(async (c: AudioTeaserConfig) => {
    setBuilding(true);
    setError(null);
    try {
      const tpl = await loadAudioTeaserTemplate(c.style);
      const html = buildAudioTeaserHtml(tpl, c);
      const blob = new Blob([html], { type: "text/html" });
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = URL.createObjectURL(blob);
      setPreviewSrc(blobRef.current);
    } catch (e) {
      setError(String(e));
    } finally {
      setBuilding(false);
    }
  }, []);

  // Rebuild on config change (debounced)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buildPreview(cfg), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [cfg, buildPreview]);

  // Download
  const download = useCallback(async () => {
    const tpl = await loadAudioTeaserTemplate(cfg.style);
    const html = buildAudioTeaserHtml(tpl, cfg);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audio_teaser_${cfg.style}.html`;
    a.click(); URL.revokeObjectURL(url);
  }, [cfg]);

  // Image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("image", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);

  // Preview dimensions
  const dims = DIMS[cfg.style];
  const maxW = 330;
  const maxH = 520;
  const scale = Math.min(maxW / dims.w, maxH / dims.h);
  const displayW = Math.round(dims.w * scale);
  const displayH = Math.round(dims.h * scale);

  return (
    <div style={{ padding: "20px 24px 40px", display: "flex", gap: 24, alignItems: "flex-start", minHeight: "100vh" }}>

      {/* ── Left: Editor ── */}
      <div style={{ flex: "0 0 340px", display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Style selector */}
        <div style={{ marginBottom: 24 }}>
          <SectionTitle kanji="型" label="STYLE" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STYLES.map(s => {
              const active = cfg.style === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => set("style", s.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: active ? SEAL : PANEL,
                    border: `1px solid ${active ? "rgba(200,19,42,0.5)" : LINE_STR}`,
                    cursor: "pointer", textAlign: "left", transition: "opacity 0.15s",
                  }}
                >
                  <span style={{ fontSize: 22, color: active ? "#fff0f4" : KANJI, fontFamily: "serif", minWidth: 24, textAlign: "center" }}>{s.kanji}</span>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.32em", color: active ? "#fff0f4" : INK, fontFamily: "sans-serif", fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: active ? "rgba(255,240,244,0.65)" : INK_SOFT, fontFamily: "sans-serif", marginTop: 2 }}>{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cover image */}
        <div style={{ marginBottom: 24 }}>
          <SectionTitle kanji="絵" label="COVER IMAGE" />
          <label style={{ display: "block", cursor: "pointer" }}>
            <div style={{
              minHeight: 120, borderRadius: 10, border: `1px dashed ${LINE_STR}`,
              background: cfg.image ? "transparent" : PANEL,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative",
            }}>
              {cfg.image ? (
                <img src={cfg.image} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontSize: 24, color: LINE_STR, marginBottom: 6 }}>＋</div>
                  <div style={{ fontSize: 10, color: INK_SOFT, letterSpacing: "0.2em", fontFamily: "sans-serif" }}>UPLOAD IMAGE</div>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          </label>
          {cfg.image && (
            <button
              onClick={() => set("image", "")}
              style={{ marginTop: 6, fontSize: 10, color: INK_SOFT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.2em", fontFamily: "sans-serif" }}
            >
              ✕ RESET TO DEFAULT
            </button>
          )}
        </div>

        {/* Text fields */}
        <div style={{ marginBottom: 24 }}>
          <SectionTitle kanji="文" label="TEXT" />
          <Field kanji="題" label="TITLE" value={cfg.title} onChange={v => set("title", v)} placeholder="Whisper & Rain" />
          <Field kanji="眉" label="EYEBROW" value={cfg.eyebrow} onChange={v => set("eyebrow", v)} placeholder="New Drop" />
          <Field kanji="音" label="ASMR LABEL" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          <Field kanji="体" label="GENRE" value={cfg.genre} onChange={v => set("genre", v)} placeholder="ASMR Roleplay" />
          <Field kanji="章" label="BADGE" value={cfg.badge} onChange={v => set("badge", v)} placeholder="Exclusive" />
          <Field kanji="時" label="DURATION (MIN)" value={cfg.minutes} onChange={v => set("minutes", v)} placeholder="24" />

          {/* Waveform-only */}
          {cfg.style === "waveform" && (
            <Field kanji="符" label="CARD LABEL" value={cfg.cardLabel} onChange={v => set("cardLabel", v)} placeholder="RP AUDIO" />
          )}

          {/* Now Playing-only */}
          {cfg.style === "nowplaying" && (
            <Field kanji="分" label="TIME START" value={cfg.timeStart} onChange={v => set("timeStart", v)} placeholder="03:12" />
          )}
        </div>

        {/* OBS guide */}
        <OBSGuide />
      </div>

      {/* ── Right: Preview ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "serif", fontSize: 13, color: KANJI }}>実演</span>
            <span style={{ fontFamily: "sans-serif", fontSize: 12, color: INK_SOFT, letterSpacing: "0.15em", fontStyle: "italic" }}>Live Preview</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Replay */}
            <button
              onClick={() => buildPreview(cfg)}
              style={{
                padding: "6px 14px", borderRadius: 20,
                background: "transparent", border: `1px solid ${LINE_STR}`,
                color: INK_SOFT, fontSize: 10, letterSpacing: "0.28em",
                fontFamily: "sans-serif", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 12 }}>↺</span> REPLAY
            </button>
            {/* Download */}
            <button
              onClick={download}
              style={{
                padding: "6px 18px", borderRadius: 20,
                background: SEAL, border: "none",
                color: "#fff0f4", fontSize: 10, letterSpacing: "0.28em",
                fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer",
              }}
            >
              DOWNLOAD HTML
            </button>
          </div>
        </div>

        {/* Preview BG toggle */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "serif", fontSize: 12, color: KANJI }}>背</span>
          <span style={{ fontSize: 9, color: INK_SOFT, letterSpacing: "0.22em", fontFamily: "sans-serif", textTransform: "uppercase" }}>Preview BG</span>
          {(["dark", "light"] as const).map(bg => (
            <button
              key={bg}
              onClick={() => setPreviewBg(bg)}
              style={{
                padding: "4px 12px", borderRadius: 12,
                background: previewBg === bg ? SEAL : "transparent",
                border: `1px solid ${LINE_STR}`,
                color: previewBg === bg ? "#fff0f4" : INK_SOFT,
                fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "sans-serif", cursor: "pointer",
              }}
            >{bg}</button>
          ))}
        </div>

        {/* iframe container */}
        <div style={{
          width: displayW, height: displayH,
          borderRadius: 12, overflow: "hidden",
          border: `1px solid ${LINE}`,
          background: previewBg === "light" ? "#f0ebe8" : "#0c0608",
          position: "relative",
          flexShrink: 0,
        }}>
          {building && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "rgba(12,6,8,0.7)", zIndex: 10,
            }}>
              <span style={{ fontSize: 10, color: INK_SOFT, letterSpacing: "0.3em", fontFamily: "sans-serif" }}>RENDERING…</span>
            </div>
          )}
          {error && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center", padding: 16,
              background: "rgba(12,6,8,0.9)", zIndex: 10,
            }}>
              <span style={{ fontSize: 10, color: "#ff8888", fontFamily: "monospace" }}>{error}</span>
            </div>
          )}
          {previewSrc && (
            <iframe
              key={previewSrc}
              src={previewSrc}
              style={{
                width: dims.w,
                height: dims.h,
                border: "none",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                display: "block",
              }}
              sandbox="allow-scripts"
            />
          )}
        </div>

        {/* Dimension note */}
        <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: "sans-serif", letterSpacing: "0.15em", opacity: 0.7 }}>
          {dims.w} × {dims.h}px native · scaled {Math.round(scale * 100)}% for preview
        </div>
      </div>
    </div>
  );
}
