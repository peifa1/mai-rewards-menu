import { useCallback, useEffect, useRef, useState } from "react";
import { loadAudioTeaserTemplate } from "@/lib/audioTeaserTemplate";
import {
  buildAudioTeaserHtml,
  DEFAULT_AUDIO_TEASER_CONFIG,
  normalizeAudioTeaserConfig,
  type AudioTeaserConfig,
  type TeaserStyle,
} from "@/lib/buildAudioTeaser";

// ── Palette ───────────────────────────────────────────────────────────────
const INK      = "#fbe0e7";
const INK_SOFT = "#d49aaa";
const KANJI    = "#ffb8c8";
const LINE     = "rgba(255,160,185,0.12)";
const LINE_STR = "rgba(255,160,185,0.28)";
const PANEL    = "rgba(14,3,8,0.72)";
const FIELD    = "rgba(8,2,5,0.6)";
const SERIF    = "Georgia, 'Times New Roman', serif";

// ── All styles, always shown ──────────────────────────────────────────────
const STYLES: { key: TeaserStyle; kanji: string; label: string }[] = [
  { key: "waveform",   kanji: "波", label: "WAVEFORM"    },
  { key: "nowplaying", kanji: "再", label: "NOW PLAYING" },
  { key: "soundorb",   kanji: "球", label: "SOUND ORB"   },
];

// All templates are 390×488 (4:5 ratio — final output will be 1080×1350)
const CARD_W = 390;
const CARD_H = 488;

// ── Per-style localStorage ────────────────────────────────────────────────
function storageKey(style: TeaserStyle) { return `audio-teaser-cfg-${style}`; }
function loadStored(style: TeaserStyle): AudioTeaserConfig {
  try {
    const raw = localStorage.getItem(storageKey(style));
    if (raw) return normalizeAudioTeaserConfig(JSON.parse(raw));
  } catch {}
  return { ...DEFAULT_AUDIO_TEASER_CONFIG, style };
}
function saveStored(style: TeaserStyle, cfg: AudioTeaserConfig) {
  try { localStorage.setItem(storageKey(style), JSON.stringify(cfg)); } catch {}
}

// ── Compact field ─────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 8, letterSpacing: "0.32em", color: focused ? KANJI : INK_SOFT,
        fontFamily: "sans-serif", textTransform: "uppercase", marginBottom: 4,
        transition: "color 0.2s",
      }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "7px 10px",
          background: FIELD,
          border: `1px solid ${focused ? "rgba(255,160,185,0.55)" : LINE_STR}`,
          borderRadius: 7, color: INK, fontSize: 13,
          fontFamily: SERIF, outline: "none", boxSizing: "border-box",
          boxShadow: focused ? "0 0 0 2px rgba(255,140,170,0.12)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      />
    </div>
  );
}

// ── Section divider inside editor ────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginTop: 6, marginBottom: 10,
    }}>
      <div style={{ flex: 1, height: 1, background: LINE_STR }} />
      <span style={{
        fontSize: 7, letterSpacing: "0.42em", color: KANJI,
        fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: 600,
        whiteSpace: "nowrap",
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: LINE_STR }} />
    </div>
  );
}

// ── Single card column ────────────────────────────────────────────────────
function TeaserCard({ style, kanji, label }: { style: TeaserStyle; kanji: string; label: string }) {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = useState("");
  const blobRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback(<K extends keyof AudioTeaserConfig>(key: K, val: AudioTeaserConfig[K]) => {
    setCfg(prev => {
      const next = { ...prev, [key]: val };
      saveStored(style, next);
      return next;
    });
  }, [style]);

  const buildPreview = useCallback(async (c: AudioTeaserConfig) => {
    try {
      const tpl = await loadAudioTeaserTemplate(c.style);
      const html = buildAudioTeaserHtml(tpl, c);
      const blob = new Blob([html], { type: "text/html" });
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = URL.createObjectURL(blob);
      setPreviewSrc(blobRef.current);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buildPreview(cfg), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [cfg, buildPreview]);

  // Image upload
  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("image", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);

  // Scale to fit ~290px wide column
  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);

  return (
    <div style={{ flex: "0 0 290px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Style label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 2 }}>
        <span style={{ fontSize: 22, color: KANJI, fontFamily: SERIF, lineHeight: 1 }}>{kanji}</span>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.44em", color: INK_SOFT, fontFamily: "sans-serif", textTransform: "uppercase" }}>{label}</div>
        </div>
      </div>

      {/* Preview iframe */}
      <div style={{
        width: colW, height: displayH,
        borderRadius: 10, overflow: "hidden",
        border: `1px solid ${LINE}`,
        background: "#0c0608",
        flexShrink: 0,
      }}>
        {previewSrc && (
          <iframe
            key={previewSrc}
            src={previewSrc}
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              display: "block",
            }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      {/* Editor panel */}
      <div style={{
        background: PANEL,
        border: `1px solid ${LINE_STR}`,
        borderRadius: 12,
        padding: "16px 14px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>

        {/* Cover image */}
        <label style={{ display: "block", marginBottom: cfg.image ? 4 : 12, cursor: "pointer" }}>
          <div style={{ fontSize: 8, letterSpacing: "0.32em", color: INK_SOFT, fontFamily: "sans-serif", textTransform: "uppercase", marginBottom: 5 }}>Cover Image</div>
          <div style={{
            height: cfg.image ? 72 : 46, borderRadius: 8,
            border: `1px dashed ${cfg.image ? "transparent" : LINE_STR}`,
            background: cfg.image ? "transparent" : FIELD,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", transition: "height 0.2s",
          }}>
            {cfg.image
              ? <img src={cfg.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
              : <span style={{ fontSize: 9, color: INK_SOFT, letterSpacing: "0.24em", fontFamily: "sans-serif" }}>＋ Upload</span>
            }
          </div>
          <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        </label>
        {cfg.image && (
          <button onClick={() => set("image", "")} style={{
            fontSize: 8, color: INK_SOFT, background: "none", border: "none",
            cursor: "pointer", letterSpacing: "0.22em", fontFamily: "sans-serif",
            marginBottom: 10, textAlign: "left", padding: 0, opacity: 0.7,
          }}>✕ Remove</button>
        )}

        {/* Card-internal text fields — shown only for waveform / nowplaying */}
        {style === "waveform" && (<>
          <SectionLabel>Card Text</SectionLabel>
          <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          <Field label="Card Label" value={cfg.cardLabel} onChange={v => set("cardLabel", v)} placeholder="RP AUDIO" />
          <SectionLabel>Bottom Strip</SectionLabel>
        </>)}
        {style === "nowplaying" && (<>
          <SectionLabel>Card Text</SectionLabel>
          <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          <Field label="Time Start" value={cfg.timeStart} onChange={v => set("timeStart", v)} placeholder="03:12" />
          <SectionLabel>Bottom Strip</SectionLabel>
        </>)}
        {style === "soundorb" && (<>
          <SectionLabel>Orb Caption</SectionLabel>
          <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          <SectionLabel>Bottom Strip</SectionLabel>
        </>)}

        <Field label="Title"          value={cfg.title}   onChange={v => set("title", v)}   placeholder="Whisper & Rain" />
        <Field label="Eyebrow"        value={cfg.eyebrow} onChange={v => set("eyebrow", v)} placeholder="New Drop" />
        <Field label="Genre"          value={cfg.genre}   onChange={v => set("genre", v)}   placeholder="ASMR Roleplay" />
        <Field label="Badge"          value={cfg.badge}   onChange={v => set("badge", v)}   placeholder="Exclusive" />
        <Field label="Duration (min)" value={cfg.minutes} onChange={v => set("minutes", v)} placeholder="24" />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  return (
    <div style={{
      padding: "28px 32px 60px",
      display: "flex",
      gap: 24,
      justifyContent: "center",
      alignItems: "flex-start",
      flexWrap: "wrap",
    }}>
      {STYLES.map(s => (
        <TeaserCard key={s.key} style={s.key} kanji={s.kanji} label={s.label} />
      ))}
    </div>
  );
}
