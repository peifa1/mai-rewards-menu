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
const INK      = "#fbeaea";
const INK_DIM  = "#c08898";
const ROSE     = "#e8a0b4";
const KANJI    = "#ffb8c8";
const LINE     = "rgba(255,150,180,0.10)";
const LINE_STR = "rgba(255,150,180,0.22)";
const PANEL    = "rgba(10,2,6,0.80)";
const FIELD_BG = "rgba(255,140,170,0.04)";
const SERIF    = "Georgia, 'Times New Roman', serif";
const SANS     = "ui-sans-serif, system-ui, sans-serif";

// ── All styles ────────────────────────────────────────────────────────────
const STYLES: { key: TeaserStyle; kanji: string; label: string }[] = [
  { key: "waveform",   kanji: "波", label: "Waveform"    },
  { key: "nowplaying", kanji: "再", label: "Now Playing" },
  { key: "soundorb",   kanji: "球", label: "Sound Orb"   },
];

// 4:5 ratio (final output: 1080×1350)
const CARD_W = 390;
const CARD_H = 488;

// ── Storage ───────────────────────────────────────────────────────────────
function storageKey(s: TeaserStyle) { return `audio-teaser-cfg-${s}`; }
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

// ── Field (underline style) ───────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{
        fontSize: 7.5, letterSpacing: "0.38em", textTransform: "uppercase",
        fontFamily: SANS, color: focused ? ROSE : INK_DIM,
        marginBottom: 5, transition: "color 0.18s",
      }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "3px 0 6px",
          background: "transparent", border: "none",
          borderBottom: `1px solid ${focused ? ROSE : LINE_STR}`,
          color: INK, fontSize: 13, fontFamily: SERIF,
          outline: "none", boxSizing: "border-box",
          boxShadow: focused ? `0 1px 0 ${ROSE}` : "none",
          transition: "border-color 0.18s, box-shadow 0.18s",
        }}
      />
    </div>
  );
}

// ── Section box ───────────────────────────────────────────────────────────
function Section({ title, accent, children }: {
  title: string; accent?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: accent ? "rgba(255,140,170,0.06)" : FIELD_BG,
      border: `1px solid ${accent ? "rgba(255,150,180,0.18)" : LINE}`,
      borderRadius: 10,
      padding: "12px 14px 4px",
      marginBottom: 8,
    }}>
      <div style={{
        fontSize: 7, letterSpacing: "0.52em", textTransform: "uppercase",
        fontFamily: SANS, color: accent ? KANJI : INK_DIM,
        marginBottom: 12, display: "flex", alignItems: "center", gap: 7,
      }}>
        <span style={{ opacity: accent ? 1 : 0.6 }}>{title}</span>
        <div style={{ flex: 1, height: "1px", background: accent ? LINE_STR : LINE }} />
      </div>
      {children}
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

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("image", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);

  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);

  return (
    <div style={{ flex: "0 0 290px", display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontSize: 20, color: KANJI, fontFamily: SERIF, lineHeight: 1 }}>{kanji}</span>
        <span style={{
          fontSize: 10, letterSpacing: "0.4em", color: INK_DIM,
          fontFamily: SANS, textTransform: "uppercase",
        }}>{label}</span>
      </div>

      {/* Preview */}
      <div style={{
        width: colW, height: displayH,
        borderRadius: 11, overflow: "hidden",
        border: `1px solid ${LINE_STR}`,
        background: "#080205",
        flexShrink: 0,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}>
        {previewSrc && (
          <iframe
            key={previewSrc}
            src={previewSrc}
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left", display: "block",
            }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      {/* Editor panel */}
      <div style={{
        background: PANEL,
        border: `1px solid ${LINE_STR}`,
        borderTop: `2px solid rgba(255,150,180,0.35)`,
        borderRadius: 12,
        padding: "16px 14px 10px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 6px 28px rgba(0,0,0,0.5)",
      }}>

        {/* Cover image section */}
        <Section title="Cover Image">
          <label style={{ display: "block", cursor: "pointer", marginBottom: 4 }}>
            <div style={{
              height: cfg.image ? 70 : 42, borderRadius: 7,
              border: `1px dashed ${cfg.image ? "transparent" : LINE_STR}`,
              background: cfg.image ? "transparent" : "rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {cfg.image
                ? <img src={cfg.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                : <span style={{ fontSize: 9, color: INK_DIM, letterSpacing: "0.3em", fontFamily: SANS }}>＋  Upload</span>
              }
            </div>
            <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          </label>
          {cfg.image && (
            <button onClick={() => set("image", "")} style={{
              fontSize: 8, color: INK_DIM, background: "none", border: "none",
              cursor: "pointer", letterSpacing: "0.24em", fontFamily: SANS,
              padding: "2px 0 8px", textAlign: "left", opacity: 0.65,
            }}>✕  Remove</button>
          )}
        </Section>

        {/* Card-internal fields */}
        {style === "waveform" && (
          <Section title="Card Text" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
            <Field label="Card Label" value={cfg.cardLabel} onChange={v => set("cardLabel", v)} placeholder="RP AUDIO" />
          </Section>
        )}
        {style === "nowplaying" && (
          <Section title="Card Text" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
            <Field label="Time Start" value={cfg.timeStart} onChange={v => set("timeStart", v)} placeholder="03:12" />
          </Section>
        )}
        {style === "soundorb" && (
          <Section title="Orb Caption" accent>
            <Field label="ASMR Label" value={cfg.asmrLabel} onChange={v => set("asmrLabel", v)} placeholder="ASMR" />
          </Section>
        )}

        {/* Bottom strip fields */}
        <Section title="Bottom Strip">
          <Field label="Title"          value={cfg.title}   onChange={v => set("title", v)}   placeholder="Whisper & Rain" />
          <Field label="Eyebrow"        value={cfg.eyebrow} onChange={v => set("eyebrow", v)} placeholder="New Drop" />
          <Field label="Genre"          value={cfg.genre}   onChange={v => set("genre", v)}   placeholder="ASMR Roleplay" />
          <Field label="Badge"          value={cfg.badge}   onChange={v => set("badge", v)}   placeholder="Exclusive" />
          <Field label="Duration (min)" value={cfg.minutes} onChange={v => set("minutes", v)} placeholder="24" />
        </Section>

      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  return (
    <div style={{
      padding: "28px 32px 60px",
      display: "flex", gap: 24,
      justifyContent: "center", alignItems: "flex-start",
      flexWrap: "wrap",
    }}>
      {STYLES.map(s => (
        <TeaserCard key={s.key} style={s.key} kanji={s.kanji} label={s.label} />
      ))}
    </div>
  );
}
