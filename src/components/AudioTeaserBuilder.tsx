import { useCallback, useEffect, useRef, useState } from "react";
import { loadAudioTeaserTemplate } from "@/lib/audioTeaserTemplate";
import { useAudioEngine, formatTime } from "@/lib/useAudioEngine";
import {
  buildAudioTeaserHtml,
  DEFAULT_AUDIO_TEASER_CONFIG,
  normalizeAudioTeaserConfig,
  type AudioTeaserConfig,
  type TeaserStyle,
} from "@/lib/buildAudioTeaser";
import { dispatchRenderJob, checkRenderOutput, cleanupRenderFiles } from "@/lib/renderApi";

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

const STYLES: { key: TeaserStyle; kanji: string; label: string }[] = [
  { key: "waveform",   kanji: "波", label: "Waveform"    },
  { key: "nowplaying", kanji: "再", label: "Now Playing" },
  { key: "soundorb",   kanji: "球", label: "Sound Orb"   },
];

const CARD_W = 390;
const CARD_H = 488;

// ── Render state ──────────────────────────────────────────────────────────
type RenderPhase =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "queued"; jobId: string; audioUrl: string; imageUrl: string }
  | { phase: "rendering"; jobId: string; audioUrl: string; imageUrl: string }
  | { phase: "done"; jobId: string; audioUrl: string; imageUrl: string; downloadUrl: string }
  | { phase: "error"; message: string };

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

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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

// ── Render status badge ───────────────────────────────────────────────────
function RenderStatus({ state, onDownload, onDismiss }: {
  state: RenderPhase;
  onDownload: () => void;
  onDismiss: () => void;
}) {
  if (state.phase === "idle") return null;

  const phaseLabel: Record<string, string> = {
    uploading: "Uploading…",
    queued: "Queued — waiting for runner",
    rendering: "Rendering…",
    done: "Ready",
    error: "Failed",
  };

  const isActive = state.phase === "uploading" || state.phase === "queued" || state.phase === "rendering";
  const isDone = state.phase === "done";
  const isError = state.phase === "error";

  return (
    <div style={{
      marginTop: 6,
      padding: "10px 12px",
      borderRadius: 9,
      background: isDone ? "rgba(120,200,140,0.10)" : isError ? "rgba(200,80,80,0.10)" : "rgba(255,140,170,0.06)",
      border: `1px solid ${isDone ? "rgba(120,200,140,0.3)" : isError ? "rgba(200,80,80,0.3)" : LINE_STR}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {/* Spinner or icon */}
      {isActive && (
        <div style={{
          width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${LINE_STR}`,
          borderTopColor: ROSE,
          animation: "spin 0.8s linear infinite",
        }} />
      )}
      {isDone && <span style={{ fontSize: 14, flexShrink: 0 }}>✓</span>}
      {isError && <span style={{ fontSize: 14, flexShrink: 0, color: "#e88" }}>✕</span>}

      {/* Label */}
      <span style={{
        fontFamily: SANS, fontSize: 9, letterSpacing: "0.18em",
        color: isDone ? "rgba(140,220,160,0.9)" : isError ? "#e88" : INK_DIM,
        flex: 1,
      }}>
        {isError ? (state as { phase: "error"; message: string }).message.slice(0, 80) : phaseLabel[state.phase]}
      </span>

      {/* Actions */}
      {isDone && (
        <button
          onClick={onDownload}
          style={{
            padding: "5px 10px", borderRadius: 7,
            border: "1px solid rgba(140,220,160,0.4)",
            background: "rgba(120,200,140,0.12)",
            color: "rgba(160,230,180,0.95)",
            fontSize: 9, letterSpacing: "0.2em", fontFamily: SANS,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          ▼ Download
        </button>
      )}
      <button
        onClick={onDismiss}
        disabled={isActive}
        style={{
          background: "none", border: "none", color: INK_DIM, cursor: isActive ? "default" : "pointer",
          fontSize: 11, padding: 0, opacity: isActive ? 0.3 : 0.6, flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Single card column ────────────────────────────────────────────────────
function TeaserCard({ style, kanji, label, onWindow, audioMinutes, onBroadcast, audioFile, audioDuration }: {
  style: TeaserStyle; kanji: string; label: string;
  onWindow: (style: TeaserStyle, win: Window | null) => void;
  audioMinutes: string | null;
  onBroadcast: (src: string) => void;
  audioFile: File | null;
  audioDuration: number;
}) {
  const [cfg, setCfg] = useState<AudioTeaserConfig>(() => loadStored(style));
  const [previewSrc, setPreviewSrc] = useState("");
  const blobRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [renderState, setRenderState] = useState<RenderPhase>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (audioMinutes && audioMinutes !== cfg.minutes) set("minutes", audioMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioMinutes]);

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("image", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [set]);

  // Stop polling on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const startPolling = useCallback((jobId: string, audioUrl: string, imageUrl: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await checkRenderOutput({ data: { jobId } });
        if (result.status === "error") {
          clearInterval(pollRef.current!);
          setRenderState({ phase: "error", message: "Render failed — check GitHub Actions logs" });
        } else if (result.status === "done" && result.downloadUrl) {
          clearInterval(pollRef.current!);
          setRenderState({ phase: "done", jobId, audioUrl, imageUrl, downloadUrl: result.downloadUrl });
        }
      } catch { /* network blip, try again next tick */ }
    }, 6000);
  }, []);

  const handleRender = useCallback(async () => {
    if (!audioFile) return;
    setRenderState({ phase: "uploading" });

    try {
      const jobId = nanoid();
      const ext = audioFile.name.split(".").pop() ?? "mp3";

      // Dynamic import avoids SSR side-effects from @vercel/blob/client
      const { upload } = await import("@vercel/blob/client");

      // Upload audio directly to Vercel Blob CDN via client upload
      const { url: audioUrl } = await upload(`audio/${jobId}.${ext}`, audioFile, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });

      // Upload image directly to Vercel Blob CDN (if any)
      let imageUrl = "";
      if (cfg.image) {
        const imgBlob = await fetch(cfg.image).then(r => r.blob());
        const imgFile = new File([imgBlob], `${jobId}.webp`, { type: "image/webp" });
        const result = await upload(`images/${jobId}.webp`, imgFile, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        imageUrl = result.url;
      }

      setRenderState({ phase: "queued", jobId, audioUrl, imageUrl });

      await dispatchRenderJob({
        data: {
          jobId, style,
          config: {
            title: cfg.title, eyebrow: cfg.eyebrow, genre: cfg.genre, badge: cfg.badge,
            minutes: cfg.minutes, asmrLabel: cfg.asmrLabel,
            cardLabel: cfg.cardLabel, timeStart: cfg.timeStart,
          },
          audioPath: audioUrl, imagePath: imageUrl, durationSeconds: audioDuration,
        },
      });

      setRenderState({ phase: "rendering", jobId, audioUrl, imageUrl });
      startPolling(jobId, audioUrl, imageUrl);
    } catch (e: unknown) {
      let msg = "Render failed";
      if (e instanceof Error) msg = e.message;
      else if (e && typeof e === "object" && "message" in e) msg = String((e as { message: unknown }).message);
      else if (typeof e === "string") msg = e;
      setRenderState({ phase: "error", message: msg.slice(0, 120) });
    }
  }, [audioFile, cfg, style, audioDuration, startPolling]);

  const handleDownload = useCallback(() => {
    if (renderState.phase !== "done") return;
    const { downloadUrl, jobId, audioUrl, imageUrl } = renderState;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${style}-teaser-${jobId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Cleanup blobs after download (best-effort)
    const toDelete = [downloadUrl, audioUrl];
    if (imageUrl) toDelete.push(imageUrl);
    cleanupRenderFiles({ data: { urls: toDelete } }).catch(() => {});
    setRenderState({ phase: "idle" });
  }, [renderState, style]);

  const handleDismiss = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setRenderState({ phase: "idle" });
  }, []);

  const colW = 290;
  const scale = colW / CARD_W;
  const displayH = Math.round(CARD_H * scale);
  const isRendering = renderState.phase !== "idle" && renderState.phase !== "error" && renderState.phase !== "done";

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
            onLoad={e => onWindow(style, (e.currentTarget as HTMLIFrameElement).contentWindow)}
            style={{
              width: CARD_W, height: CARD_H, border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left", display: "block",
            }}
            sandbox="allow-scripts"
          />
        )}
      </div>

      {/* Broadcast for OBS */}
      <button
        onClick={() => previewSrc && onBroadcast(previewSrc)}
        disabled={!previewSrc}
        style={{
          width: colW, padding: "10px 0", borderRadius: 9,
          border: `1px solid ${ROSE}`, background: "rgba(255,140,170,0.10)",
          color: ROSE, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
          fontFamily: SANS, cursor: previewSrc ? "pointer" : "default",
        }}
      >●  Broadcast for OBS</button>

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

        {/* Render MP4 button */}
        <button
          onClick={() => void handleRender()}
          disabled={!audioFile || isRendering}
          title={!audioFile ? "Upload an audio file first" : undefined}
          style={{
            marginTop: 4,
            width: "100%", padding: "11px 0", borderRadius: 9,
            border: `1px solid ${audioFile && !isRendering ? "rgba(200,160,120,0.5)" : LINE}`,
            background: audioFile && !isRendering ? "rgba(200,160,100,0.10)" : "transparent",
            color: audioFile && !isRendering ? "rgba(230,190,140,0.95)" : INK_DIM,
            fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase",
            fontFamily: SANS, cursor: audioFile && !isRendering ? "pointer" : "default",
            opacity: isRendering ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {!audioFile ? "⬛  Render MP4  (upload audio first)" : isRendering ? "◌  Rendering…" : "▶  Render MP4"}
        </button>

        {/* Render status */}
        <RenderStatus
          state={renderState}
          onDownload={handleDownload}
          onDismiss={handleDismiss}
        />
      </div>
    </div>
  );
}

// ── Transport bar ─────────────────────────────────────────────────────────
function Transport({
  engine,
  onAudioFile,
}: {
  engine: ReturnType<typeof useAudioEngine>;
  onAudioFile: (f: File | null) => void;
}) {
  const { hasAudio, fileName, playing, duration, currentTime, load, toggle, seek } = engine;

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { load(f); onAudioFile(f); }
    e.target.value = "";
  }, [load, onAudioFile]);

  return (
    <div style={{
      width: "100%", maxWidth: 980, margin: "0 auto 6px",
      background: PANEL, border: `1px solid ${LINE_STR}`,
      borderTop: `2px solid rgba(255,150,180,0.35)`,
      borderRadius: 14, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 18,
      boxShadow: "0 6px 28px rgba(0,0,0,0.45)",
    }}>
      {/* Upload */}
      <label style={{ cursor: "pointer", flexShrink: 0 }}>
        <span style={{
          display: "inline-block", padding: "9px 16px", borderRadius: 9,
          background: "rgba(255,140,170,0.10)", border: `1px solid ${LINE_STR}`,
          color: ROSE, fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase",
          fontFamily: SANS,
        }}>♪  {hasAudio ? "Replace Audio" : "Upload Audio"}</span>
        <input type="file" accept="audio/*" onChange={onFile} style={{ display: "none" }} />
      </label>

      {/* Play / pause */}
      <button
        onClick={toggle}
        disabled={!hasAudio}
        style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          border: `1px solid ${hasAudio ? ROSE : LINE_STR}`,
          background: hasAudio ? "rgba(255,140,170,0.12)" : "transparent",
          color: hasAudio ? ROSE : INK_DIM,
          cursor: hasAudio ? "pointer" : "default",
          fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >{playing ? "❚❚" : "▶"}</button>

      {/* Scrubber + time */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, color: INK, fontFamily: SERIF,
          marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {hasAudio ? fileName : <span style={{ color: INK_DIM, fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em" }}>No audio loaded — upload a file to drive all three previews</span>}
        </div>
        <input
          type="range"
          min={0} max={duration || 0} step={0.01} value={currentTime}
          onChange={e => seek(Number(e.target.value))}
          disabled={!hasAudio}
          style={{ width: "100%", accentColor: ROSE, cursor: hasAudio ? "pointer" : "default" }}
        />
      </div>

      <div style={{
        flexShrink: 0, fontFamily: SANS, fontSize: 11, color: INK_DIM,
        letterSpacing: "0.06em", minWidth: 86, textAlign: "right",
      }}>{formatTime(currentTime)} / {formatTime(duration)}</div>
    </div>
  );
}

// ── Broadcast (OBS) overlay ───────────────────────────────────────────────
function overlayBtn(primary: boolean): React.CSSProperties {
  return {
    padding: "8px 14px", borderRadius: 8,
    border: `1px solid ${primary ? ROSE : LINE_STR}`,
    background: primary ? "rgba(255,140,170,0.14)" : "rgba(0,0,0,0.45)",
    color: primary ? ROSE : INK, fontSize: 10, letterSpacing: "0.18em",
    textTransform: "uppercase", fontFamily: SANS, cursor: "pointer",
  };
}

function BroadcastOverlay({ src, engine, onRegister, onClose }: {
  src: string;
  engine: ReturnType<typeof useAudioEngine>;
  onRegister: (win: Window | null) => void;
  onClose: () => void;
}) {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const [showUI, setShowUI] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const poke = useCallback(() => {
    setShowUI(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUI(false), 2600);
  }, []);
  useEffect(() => {
    poke();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [poke]);

  useEffect(() => () => { onRegister(null); }, [onRegister]);

  const ASPECT = CARD_W / CARD_H;
  const targetH = Math.min(vp.h * 0.96, (vp.w * 0.96) / ASPECT);
  const scale = targetH / CARD_H;
  const dispW = Math.round(CARD_W * scale);
  const dispH = Math.round(CARD_H * scale);

  const start = useCallback(() => { engine.seek(0); void engine.play(); }, [engine]);

  return (
    <div
      onMouseMove={poke}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{ width: dispW, height: dispH, position: "relative" }}>
        <iframe
          key={src}
          src={src}
          onLoad={e => onRegister((e.currentTarget as HTMLIFrameElement).contentWindow)}
          style={{
            width: CARD_W, height: CARD_H, border: "none",
            transform: `scale(${scale})`, transformOrigin: "top left", display: "block",
          }}
          sandbox="allow-scripts"
        />
      </div>

      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
        background: "linear-gradient(180deg, rgba(0,0,0,0.78), transparent)",
        opacity: showUI ? 1 : 0, transition: "opacity 0.4s",
        pointerEvents: showUI ? "auto" : "none",
      }}>
        <button onClick={start} style={overlayBtn(true)}>
          {engine.playing ? "⟲  Restart" : "▶  Start from 0:00"}
        </button>
        {engine.playing && (
          <button onClick={engine.pause} style={overlayBtn(false)}>❚❚  Pause</button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: SANS, fontSize: 11, color: INK_DIM, letterSpacing: "0.08em" }}>
          {formatTime(engine.currentTime)} / {formatTime(engine.duration)} · {dispW}×{dispH}px
        </span>
        <button onClick={() => { engine.pause(); onClose(); }} style={overlayBtn(false)}>✕  Exit</button>
      </div>

      <div style={{
        position: "fixed", bottom: 14, left: 0, right: 0, textAlign: "center",
        fontFamily: SANS, fontSize: 10, color: INK_DIM, letterSpacing: "0.12em",
        opacity: showUI ? 0.85 : 0, transition: "opacity 0.4s", pointerEvents: "none",
      }}>
        OBS: capture this window (crop to the {dispW}×{dispH} card) · start OBS recording, then press Start · trim the ends after
      </div>
    </div>
  );
}

// ── CSS keyframes for spinner ─────────────────────────────────────────────
const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ── Main export ───────────────────────────────────────────────────────────
export function AudioTeaserBuilder() {
  const windowsRef = useRef<Map<string, Window>>(new Map());
  const getTargets = useCallback(() => Array.from(windowsRef.current.values()), []);
  const engine = useAudioEngine(getTargets);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const onWindow = useCallback((style: TeaserStyle, win: Window | null) => {
    if (win) windowsRef.current.set(style, win);
    else windowsRef.current.delete(style);
  }, []);

  const registerBroadcast = useCallback((win: Window | null) => {
    if (win) windowsRef.current.set("__broadcast__", win);
    else windowsRef.current.delete("__broadcast__");
  }, []);

  const [broadcastSrc, setBroadcastSrc] = useState<string | null>(null);

  const audioMinutes = engine.duration > 0
    ? String(Math.max(1, Math.ceil(engine.duration / 60)))
    : null;

  return (
    <div style={{ padding: "24px 32px 60px" }}>
      <style>{spinStyle}</style>

      {/* Hidden shared audio element */}
      <audio
        ref={engine.audioRef}
        onLoadedMetadata={engine.onLoadedMetadata}
        onEnded={engine.onEnded}
        style={{ display: "none" }}
      />

      <Transport engine={engine} onAudioFile={setAudioFile} />

      <div style={{
        display: "flex", gap: 24, marginTop: 22,
        justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap",
      }}>
        {STYLES.map(s => (
          <TeaserCard
            key={s.key} style={s.key} kanji={s.kanji} label={s.label}
            onWindow={onWindow} audioMinutes={audioMinutes}
            onBroadcast={setBroadcastSrc}
            audioFile={audioFile}
            audioDuration={engine.duration}
          />
        ))}
      </div>

      {broadcastSrc && (
        <BroadcastOverlay
          src={broadcastSrc}
          engine={engine}
          onRegister={registerBroadcast}
          onClose={() => setBroadcastSrc(null)}
        />
      )}
    </div>
  );
}
